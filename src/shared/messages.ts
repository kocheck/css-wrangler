import type { BreakpointKey, CssState, TierProperty } from "./constants";
import type { ElementRef, StylingSystem } from "./types";

export interface SiblingPayload {
  element: ElementRef;
  computed: Partial<Record<TierProperty, string>>;
}

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

export interface RemoveRuleMsg {
  type: "remove-rule";
  wranglerId: string;
  state: CssState;
  breakpoint: BreakpointKey;
  property: TierProperty;
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

export interface ForceStateMsg {
  type: "force-state";
  wranglerId: string;
  state: CssState;
}

export interface TagSiblingsMsg {
  type: "tag-siblings";
  excludeWranglerId: string;
  selector: string;
}

export interface TagSiblingsResponse {
  ok: true;
  siblings: SiblingPayload[];
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
  similarSelector: string | null;
  similarCount: number;
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
  | RemoveRuleMsg
  | RemoveEditMsg
  | ClearAllMsg
  | DetectStylingMsg
  | ForceStateMsg
  | TagSiblingsMsg;

export type ContentToPanel = PongMsg | ElementPickedMsg | PickCancelledMsg | ContentReadyMsg;

export type WranglerMessage = PanelToContent | ContentToPanel;
