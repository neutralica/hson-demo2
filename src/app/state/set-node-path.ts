
import { clone_node } from "./clone-node";
import { II_TAG, ROOT_TAG } from "../../../../hson-live/dist/consts/constants";
import { is_Node } from "../../../../hson-live/dist/utils/node-utils/node-guards";
import type { HsonNode } from "hson-live/types";
import { find_node_at_path } from "./find-node-path";
import type { JsonValue } from "../../../../hson-live/dist/types/core.types";
import { ensure_object_container, ensure_array_container, mk_node, json_value_to_payload_node } from "./state-helpers";

export function set_node_at_path(
  root: HsonNode,
  parts: readonly (string | number)[],
  next: JsonValue,
): void {
  // CHANGED: allow whole-root replacement in the simplest possible way
  if (parts.length === 0) {
    const payload = json_value_to_payload_node(next);

    if (root._tag === ROOT_TAG) {
      root._content = [payload];
      return;
    }

    // mutate root in place
    root._tag = payload._tag;
    root._attrs = payload._attrs;
    root._content = clone_node(payload._content ?? []);
    root._meta = clone_node(payload._meta ?? {});
    return;
  }

  const parentPath = parts.slice(0, -1);
  const leaf = parts[parts.length - 1];
  const parent = find_node_at_path(root, parentPath);

  if (!parent) {
    throw new Error(
      `set_node_at_path(): parent path not found: ${JSON.stringify(parentPath)}`
    );
  }

  const payload = json_value_to_payload_node(next);

  // -------------------------
  // object property set
  // -------------------------
  if (typeof leaf === "string") {
    const obj = ensure_object_container(parent);
    if (!obj) {
      throw new Error(
        `set_node_at_path(): target parent is not an object for key "${leaf}"`
      );
    }

    const existing = node_children(obj).find((n) => n._tag === leaf);

    if (existing) {
      existing._content = [payload];
      return;
    }

    const propNode = mk_node(leaf, [payload]);
    if (!Array.isArray(obj._content)) obj._content = [];
    obj._content.push(propNode);
    return;
  }

  // -------------------------
  // array index set
  // -------------------------
  if (typeof leaf === "number") {
    if (!Number.isInteger(leaf) || leaf < 0) {
      throw new Error(
        `set_node_at_path(): invalid array index ${String(leaf)}`
      );
    }

    const arr = ensure_array_container(parent);
    if (!arr) {
      throw new Error(
        `set_node_at_path(): target parent is not an array for index ${String(leaf)}`
      );
    }

    const items = node_children(arr).filter((n) => n._tag === II_TAG);

    if (leaf < items.length) {
      items[leaf]!._content = [payload];
      return;
    }

    if (leaf === items.length) {
      if (!Array.isArray(arr._content)) arr._content = [];
      arr._content.push(mk_node(II_TAG, [payload]));
      return;
    }

    throw new Error(
      `set_node_at_path(): sparse array writes are not supported (index ${String(leaf)}, length ${String(items.length)})`
    );
  }

  throw new Error(`set_node_at_path(): unsupported path leaf ${String(leaf)}`);
}

function node_children(node: HsonNode): HsonNode[] {
  if (!Array.isArray(node._content)) return [];
  return node._content.filter(is_Node);
}

export function first_node_child(node: HsonNode): HsonNode | undefined {
  return node_children(node)[0];
}

export function first_child_by_tag(node: HsonNode, tag: string): HsonNode | undefined {
  return node_children(node).find((n) => n._tag === tag);
}