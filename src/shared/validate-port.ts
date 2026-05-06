export function parsePort(envValue: string | undefined, defaultPort: number): number {
  const port = envValue ? Number(envValue) : defaultPort;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`invalid port: "${envValue ?? defaultPort}"`);
  }
  return port;
}
