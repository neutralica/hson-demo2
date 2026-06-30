import type { HsonNode } from "hson-live/types";
import { find_node_at_path } from "./find-node-path";
import { ensure_array_container, ensure_object_container } from "./state-helpers";
import { ROOT_TAG, II_TAG } from "../../../../hson-live/dist/core/constants";
import  { is_Node } from "../../../../hson-live/dist/core/node-guards";

export function remove_node_at_path(
  root: HsonNode,
  parts: readonly (string | number)[],
): void {
  // CHANGED: whole-root removal = clear payload
  if (parts.length === 0) {
    if (root.$_tag === ROOT_TAG) {
      root.$_content = [];
      return;
    }

    root.$_content = [];
    return;
  }

  const parentPath = parts.slice(0, -1);
  const leaf = parts[parts.length - 1];
  const parent = find_node_at_path(root, parentPath);

  if (!parent) {
    throw new Error(
      `remove_node_at_path(): parent path not found: ${JSON.stringify(parentPath)}`
    );
  }

  // -------------------------
  // object property remove
  // -------------------------
  if (typeof leaf === "string") {
    const obj = ensure_object_container(parent);
    if (!obj) {
      throw new Error(
        `remove_node_at_path(): target parent is not an object for key "${leaf}"`
      );
    }

    if (!Array.isArray(obj.$_content)) return;

    const ix = obj.$_content.findIndex(
      (v) => is_Node(v) && v.$_tag === leaf,
    );

    if (ix >= 0) {
      obj.$_content.splice(ix, 1);
    }

    return;
  }

  // -------------------------
  // array item remove
  // -------------------------
  if (typeof leaf === "number") {
    if (!Number.isInteger(leaf) || leaf < 0) {
      throw new Error(
        `remove_node_at_path(): invalid array index ${String(leaf)}`
      );
    }

    const arr = ensure_array_container(parent);
    if (!arr) {
      throw new Error(
        `remove_node_at_path(): target parent is not an array for index ${String(leaf)}`
      );
    }

    if (!Array.isArray(arr.$_content)) return;

    const itemIndexes: number[] = [];
    for (let i = 0; i < arr.$_content.length; i += 1) {
      const v = arr.$_content[i];
      if (is_Node(v) && v.$_tag === II_TAG) {
        itemIndexes.push(i);
      }
    }

    const realIx = itemIndexes[leaf];
    if (realIx == null) return;

    arr.$_content.splice(realIx, 1);
    return;
  }

  throw new Error(
    `remove_node_at_path(): unsupported path leaf ${String(leaf)}`
  );
}