import { TIER_1_PROPERTIES, WRANGLER_CLASS_PREFIX } from "@shared/constants";
import type {
  ApplyEditMsg,
  ContentToPanel,
  ForceStateMsg,
  PanelToContent,
  RemoveEditMsg,
  SiblingPayload,
  TagSiblingsMsg,
  TagSiblingsResponse,
} from "@shared/messages";
import { nanoid } from "@shared/nanoid";
import {
  applyRule,
  clearAllInjected,
  reattachStyleTag,
  rebuildStyleTag,
  removeAllRulesFor,
  removeRule,
  setForceStateClass,
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
import { captureElementMetadata, findSimilarSelector } from "./selectors";
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

type ResponsePayload =
  | ContentToPanel
  | { ok: true }
  | { ok: false; error: string }
  | TagSiblingsResponse;

function handle(msg: PanelToContent, respond: (m: ResponsePayload) => void): void {
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
          const similar = findSimilarSelector(meta.selectors);
          send({
            type: "element-picked",
            element: elementRef,
            computed,
            similarSelector: similar.selector,
            similarCount: similar.count,
          });
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

    case "remove-rule":
      removeRule({
        wranglerId: msg.wranglerId,
        state: msg.state,
        breakpoint: msg.breakpoint,
        property: msg.property,
      });
      respond({ ok: true });
      return;

    case "force-state":
      handleForceState(msg);
      respond({ ok: true });
      return;

    case "tag-siblings":
      respond({ ok: true, siblings: handleTagSiblings(msg) });
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

function handleForceState(msg: ForceStateMsg): void {
  setForceStateClass(msg.wranglerId, msg.state);
}

function handleTagSiblings(msg: TagSiblingsMsg): SiblingPayload[] {
  const out: SiblingPayload[] = [];
  let matches: NodeListOf<Element>;
  try {
    matches = document.querySelectorAll(msg.selector);
  } catch {
    return out;
  }
  for (const el of Array.from(matches)) {
    if (el.classList.contains(msg.excludeWranglerId)) continue;
    const alreadyTagged = Array.from(el.classList).some((c) => c.startsWith(WRANGLER_CLASS_PREFIX));
    if (alreadyTagged) continue;
    const wranglerId = `${WRANGLER_CLASS_PREFIX}${nanoid(8)}`;
    tagElement(el, wranglerId);
    const meta = captureElementMetadata(el);
    rememberElement(wranglerId, meta.domPath);
    out.push({
      element: { wranglerId, ...meta },
      computed: getComputedSubset(el),
    });
  }
  return out;
}
