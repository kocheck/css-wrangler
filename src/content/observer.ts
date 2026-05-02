import { reapplyClassesFromMap, reattachStyleTag } from "./injector";

let observer: MutationObserver | null = null;
let scheduled = false;
const wranglerMap = new Map<string, string>(); // wranglerId -> domPath

export function rememberElement(wranglerId: string, domPath: string): void {
  wranglerMap.set(wranglerId, domPath);
}

export function forgetElement(wranglerId: string): void {
  wranglerMap.delete(wranglerId);
}

export function clearAllRemembered(): void {
  wranglerMap.clear();
}

export function startObserver(): void {
  if (observer) return;
  observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      reapplyClassesFromMap(wranglerMap);
      reattachStyleTag();
    });
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class"],
  });
}

export function stopObserver(): void {
  observer?.disconnect();
  observer = null;
}

window.addEventListener("pagehide", () => stopObserver(), { once: true });
