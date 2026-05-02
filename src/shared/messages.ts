import type { BreakpointKey, CssState, TierProperty } from "./constants";
import type { ElementRef, StylingSystem } from "./types";

/* ------------------------------------------------------------------------- */
/* Panel → Content                                                           */
/* ------------------------------------------------------------------------- */

export interface PingMsg {
  type: "ping";
}

export interface StartPickMsg {
  type: "start-pick";
}

export interface CancelPickMsg {
  type: "cancel-pick";
}

export interface ApplyEditMsg {
  type: "apply-edit";
  wranglerId: string;
  state: CssState;
  breakpoint: BreakpointKey;
  property: TierProperty;
  value: string;
}

export interface RemoveEditMsg {
  type: "remove-edit";
  wranglerId: string;
}

export interface ClearAllMsg {
  type: "clear-all";
}

export interface DetectStylingMsg {
  type: "detect-styling";
}

/* ------------------------------------------------------------------------- */
/* Content → Panel                                                           */
/* ------------------------------------------------------------------------- */

export interface PongMsg {
  type: "pong";
  url: string;
  stylingSystem: StylingSystem;
}

export interface ElementPickedMsg {
  type: "element-picked";
  element: ElementRef;
  computed: Partial<Record<TierProperty, string>>;
}

export interface PickCancelledMsg {
  type: "pick-cancelled";
}

export interface ContentReadyMsg {
  type: "content-ready";
  url: string;
  stylingSystem: StylingSystem;
}

/* ------------------------------------------------------------------------- */
/* Discriminated unions                                                      */
/* ------------------------------------------------------------------------- */

export type PanelToContent =
  | PingMsg
  | StartPickMsg
  | CancelPickMsg
  | ApplyEditMsg
  | RemoveEditMsg
  | ClearAllMsg
  | DetectStylingMsg;

export type ContentToPanel = PongMsg | ElementPickedMsg | PickCancelledMsg | ContentReadyMsg;

export type WranglerMessage = PanelToContent | ContentToPanel;
