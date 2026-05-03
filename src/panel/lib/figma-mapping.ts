import type { PushChangesMsg, TargetRef } from "@shared/bridge-messages";
import type { Edit } from "@shared/types";

export function buildPushFromEdit(edit: Edit): PushChangesMsg {
  return {
    type: "push-changes",
    from: "panel",
    target: targetRefForEdit(edit),
    changes: edit.changes,
  };
}

export function targetRefForEdit(edit: Edit): TargetRef {
  return {
    kind: "dom",
    id: edit.element.wranglerId,
    display: describeElement(edit),
  };
}

function describeElement(edit: Edit): string {
  const tag = edit.element.tag;
  const text = edit.element.text?.trim().slice(0, 24);
  const role = edit.element.role;
  if (text) return `<${tag}> "${text}"`;
  if (role) return `<${tag} role="${role}">`;
  return `<${tag}>`;
}
