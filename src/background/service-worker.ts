/// <reference types="chrome" />

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((err) => console.error("[wrangler] sidePanel.setPanelBehavior failed", err));
});

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.windowId) return;
  try {
    await chrome.sidePanel.open({ windowId: tab.windowId });
  } catch (err) {
    console.error("[wrangler] sidePanel.open failed", err);
  }
});
