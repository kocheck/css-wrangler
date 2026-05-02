import type { ContentToPanel, PanelToContent } from "@shared/messages";

export async function getActiveTab(): Promise<chrome.tabs.Tab | null> {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return tab ?? null;
}

export async function sendToContent<T extends PanelToContent>(msg: T): Promise<unknown> {
  const tab = await getActiveTab();
  if (!tab?.id) throw new Error("No active tab");
  return chrome.tabs.sendMessage(tab.id, msg);
}

type MessageHandler = (msg: ContentToPanel) => void;

const handlers = new Set<MessageHandler>();

chrome.runtime.onMessage.addListener((raw) => {
  const msg = raw as ContentToPanel;
  for (const h of handlers) h(msg);
});

export function onContentMessage(handler: MessageHandler): () => void {
  handlers.add(handler);
  return () => handlers.delete(handler);
}
