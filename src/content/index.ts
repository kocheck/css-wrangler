import { TIER_1_PROPERTIES, WRANGLER_CLASS_PREFIX } from "@shared/constants";
import type { ApplyEditMsg, ContentToPanel, PanelToContent, RemoveEditMsg } from "@shared/messages";
import { nanoid } from "@shared/nanoid";
import {
  applyRule,
  clearAllInjected,
  reattachStyleTag,
  rebuildStyleTag,
  removeAllRulesFor,
  tagElement,
} from "./injector";
import {
  clearAllRemembered,
  forgetElement,
  rememberElement,
  startObserver,
  stopObserver,
} from "./observer";
import { startPick, stopPick } from "./picker";
import { captureElementMetadata } from "./selectors";
import { detectStylingSystem } from "./styling-detect";

declare global {
  interface Window {
    __cssWranglerLoaded?: boolean;
  }
}

if (!window.__cssWranglerLoaded) {
  window.__cssWranglerLoaded = true;
  init();
}

function init(): void {
  startObserver();
  // ensure style tag exists at end of head
  reattachStyleTag();
  rebuildStyleTag();

  chrome.runtime.onMessage.addListener((raw, _sender, sendResponse) => {
    const msg = raw as PanelToContent;
    handle(msg, sendResponse);
    return true; // keep channel open for async response
  });

  // announce we're ready
  send({
    type: "content-ready",
    url: location.href,
    stylingSystem: detectStylingSystem(),
  });
}

function send(msg: ContentToPanel): void {
  chrome.runtime.sendMessage(msg).catch(() => {
    // panel may not be open; silent
  });
}

function getComputedSubset(
  el: Element,
): Partial<Record<(typeof TIER_1_PROPERTIES)[number], string>> {
  const cs = getComputedStyle(el);
  const out: Partial<Record<(typeof TIER_1_PROPERTIES)[number], string>> = {};
  for (const prop of TIER_1_PROPERTIES) {
    out[prop] = cs.getPropertyValue(prop).trim();
  }
  return out;
}

function handle(
  msg: PanelToContent,
  respond: (m: ContentToPanel | { ok: true } | { ok: false; error: string }) => void,
): void {
  switch (msg.type) {
    case "ping":
      respond({
        type: "pong",
        url: location.href,
        stylingSystem: detectStylingSystem(),
      });
      return;

    case "detect-styling":
      respond({
        type: "pong",
        url: location.href,
        stylingSystem: detectStylingSystem(),
      });
      return;

    case "start-pick":
      startPick(
        (el) => {
          const wranglerId = `${WRANGLER_CLASS_PREFIX}${nanoid(8)}`;
          tagElement(el, wranglerId);
          const meta = captureElementMetadata(el);
          rememberElement(wranglerId, meta.domPath);
          const elementRef = { wranglerId, ...meta };
          const computed = getComputedSubset(el);
          send({ type: "element-picked", element: elementRef, computed });
        },
        () => send({ type: "pick-cancelled" }),
      );
      respond({ ok: true });
      return;

    case "cancel-pick":
      stopPick();
      respond({ ok: true });
      return;

    case "apply-edit":
      handleApply(msg);
      respond({ ok: true });
      return;

    case "remove-edit":
      handleRemove(msg);
      respond({ ok: true });
      return;

    case "clear-all":
      stopObserver();
      clearAllInjected();
      clearAllRemembered();
      startObserver();
      respond({ ok: true });
      return;
  }
}

function handleApply(msg: ApplyEditMsg): void {
  applyRule(
    {
      wranglerId: msg.wranglerId,
      state: msg.state,
      breakpoint: msg.breakpoint,
      property: msg.property,
    },
    msg.value,
  );
}

function handleRemove(msg: RemoveEditMsg): void {
  removeAllRulesFor(msg.wranglerId);
  const el = document.querySelector(`.${CSS.escape(msg.wranglerId)}`);
  if (el) el.classList.remove(msg.wranglerId);
  forgetElement(msg.wranglerId);
}
