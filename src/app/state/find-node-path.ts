import type { HsonNode } from "hson-live/types";
import { ROOT_TAG, OBJ_TAG, ARR_TAG, II_TAG } from "../../../../hson-live/dist/core/constants";
import { is_Node } from "../../../../hson-live/dist/core/node-guards";

export function find_node_at_path(
  root: HsonNode,
  parts: readonly (string | number)[],
): HsonNode | undefined {
  let cur: HsonNode | undefined = root;

  for (const part of parts) {
    if (!cur) return undefined;

    // CHANGED: peel off top-level wrappers when present
    if (cur.$_tag === ROOT_TAG) {
      cur = first_node_child(cur);
      if (!cur) return undefined;
    }

    // -------------------------
    // object/property access
    // -------------------------
    if (typeof part === "string") {
      // If current node is a property node that wraps an object, descend into that object first.
      if (cur.$_tag !== OBJ_TAG) {
        const maybeObj = first_child_by_tag(cur, OBJ_TAG);
        if (maybeObj) cur = maybeObj;
      }

      if (cur.$_tag !== OBJ_TAG) return undefined;
      const hit: HsonNode | undefined = node_children(cur).find((n) => n.$_tag === part);
      if (!hit) return undefined;

      // Property nodes are wrappers; a JSON path resolves to the property's value payload.
      cur = first_node_child(hit) ?? hit;
      continue;
    }

    // -------------------------
    // array index access
    // -------------------------
    if (typeof part === "number") {
      // If current node is a property node that wraps an array, descend into that array first.
      if (cur.$_tag !== ARR_TAG) {
        const maybeArr = first_child_by_tag(cur, ARR_TAG);
        if (maybeArr) cur = maybeArr;
      }

      if (cur.$_tag !== ARR_TAG) return undefined;

      const items = node_children(cur).filter((n) => n.$_tag === II_TAG);
      const ii = items[part];
      if (!ii) return undefined;

      // CHANGED: array slot resolves to the payload inside `_ii`
      cur = first_node_child(ii);
      if (!cur) return undefined;

      continue;
    }

    return undefined;
  }

  return cur;
}

function node_children(node: HsonNode): HsonNode[] {
  if (!Array.isArray(node.$_content)) return [];
  return node.$_content.filter(is_Node);
}

function first_node_child(node: HsonNode): HsonNode | undefined {
  return node_children(node)[0];
}

function first_child_by_tag(node: HsonNode, tag: string): HsonNode | undefined {
  return node_children(node).find((n) => n.$_tag === tag);
}