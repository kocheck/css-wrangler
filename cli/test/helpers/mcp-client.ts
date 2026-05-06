import type { ChildProcess } from "node:child_process";

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id?: number;
  result?: unknown;
  error?: { code: number; message: string };
}

/**
 * Tiny stdio JSON-RPC client for talking to an MCP server.
 * Spawn the daemon with `spawnDaemon("mcp")`, then `new McpStdioClient(child)`,
 * call `await client.initialize()`, then call tools/resources.
 */
export class McpStdioClient {
  private nextId = 1;
  private buf = "";
  private readonly responses = new Map<number, JsonRpcResponse>();

  constructor(private readonly child: ChildProcess) {
    child.stdout?.on("data", (chunk: Buffer) => {
      this.buf += chunk.toString();
      let i: number;
      // eslint-disable-next-line no-cond-assign
      while ((i = this.buf.indexOf("\n")) >= 0) {
        const line = this.buf.slice(0, i).trim();
        this.buf = this.buf.slice(i + 1);
        if (!line) continue;
        try {
          const msg = JSON.parse(line) as JsonRpcResponse;
          if (typeof msg.id === "number") this.responses.set(msg.id, msg);
        } catch {
          // ignore non-JSON lines
        }
      }
    });
  }

  private send(payload: object): void {
    this.child.stdin?.write(`${JSON.stringify(payload)}\n`);
  }

  private async waitFor(id: number, timeoutMs = 3000): Promise<JsonRpcResponse> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const r = this.responses.get(id);
      if (r) return r;
      await new Promise((res) => setTimeout(res, 25));
    }
    throw new Error(`timeout waiting for response id=${id}`);
  }

  async call(method: string, params: object = {}): Promise<JsonRpcResponse> {
    const id = this.nextId++;
    this.send({ jsonrpc: "2.0", id, method, params });
    return this.waitFor(id);
  }

  notify(method: string, params: object = {}): void {
    this.send({ jsonrpc: "2.0", method, params });
  }

  async initialize(): Promise<void> {
    await this.call("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "test", version: "0" },
    });
    this.notify("notifications/initialized");
    await new Promise((r) => setTimeout(r, 50));
  }

  async callTool<T = unknown>(name: string, args: object = {}): Promise<T> {
    const r = await this.call("tools/call", { name, arguments: args });
    const content = (r.result as { content?: { text: string }[] } | undefined)?.content;
    const text = content?.[0]?.text ?? "null";
    return JSON.parse(text) as T;
  }

  async listTools(): Promise<{ name: string }[]> {
    const r = await this.call("tools/list");
    return (r.result as { tools: { name: string }[] }).tools;
  }

  async listResources(): Promise<{ uri: string }[]> {
    const r = await this.call("resources/list");
    return (r.result as { resources: { uri: string }[] }).resources;
  }

  async readResource(uri: string): Promise<unknown> {
    const r = await this.call("resources/read", { uri });
    const text = (r.result as { contents: { text: string }[] }).contents[0]?.text ?? "null";
    return JSON.parse(text);
  }

  async listPrompts(): Promise<{ name: string }[]> {
    const r = await this.call("prompts/list");
    return (r.result as { prompts: { name: string }[] }).prompts;
  }

  async getPrompt(name: string): Promise<string> {
    const r = await this.call("prompts/get", { name });
    return (
      (r.result as { messages: { content: { text: string } }[] }).messages[0]?.content.text ?? ""
    );
  }
}
