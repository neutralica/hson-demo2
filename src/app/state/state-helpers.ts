import type { HsonNode, JsonValue, Primitive } from "hson-live/types";
import { OBJ_TAG, ARR_TAG, STR_TAG, VAL_TAG, ROOT_TAG } from "../../../../hson-live/dist/consts/constants";
import { first_child_by_tag, first_node_child } from "./set-node-path";
import { _CREATE_NODE } from "hson-live/diagnostics";
import { CREATE_NODE } from "../../../../hson-live/dist/consts/factories";
import { is_Node } from "../../../../hson-live/dist/utils/node-utils/node-guards";
import { hson } from "hson-live";
import { clone_node } from "./clone-node";

export function mk_node(tag: string, content: HsonNode[] = []): HsonNode {
  return _CREATE_NODE({
    _tag: tag,
    _content: content,
  });
}
export function unwrap_value_payload(node: HsonNode): HsonNode {
  const kids = Array.isArray(node._content) ? node._content.filter(is_Node) : [];

  // CHANGED: property node usually wraps exactly one payload node
  if (kids.length === 1) {
    const only = kids[0]!;
    if (
      only._tag === OBJ_TAG ||
      only._tag === ARR_TAG ||
      only._tag === STR_TAG ||
      only._tag === VAL_TAG
    ) {
      return only;
    }
  }

  return node;
}
export function ensure_object_container(node: HsonNode): HsonNode | undefined {
  if (node._tag === OBJ_TAG) return node;

  const existing = first_child_by_tag(node, OBJ_TAG);
  if (existing) return existing;

  return undefined;
}
export function ensure_array_container(node: HsonNode): HsonNode | undefined {
  if (node._tag === ARR_TAG) return node;

  const existing = first_child_by_tag(node, ARR_TAG);
  if (existing) return existing;

  return undefined;
}

export function json_equal(a: JsonValue, b: JsonValue): boolean {
  if (Object.is(a, b)) return true;

  if (a === null || b === null) return a === b;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;

    for (let i = 0; i < a.length; i += 1) {
      if (!json_equal(a[i] as JsonValue, b[i] as JsonValue)) return false;
    }
    return true;
  }

  if (typeof a === "object" && typeof b === "object") {
    const aa = a as Record<string, JsonValue>;
    const bb = b as Record<string, JsonValue>;

    const aKeys = Object.keys(aa).sort();
    const bKeys = Object.keys(bb).sort();

    if (aKeys.length !== bKeys.length) return false;

    for (let i = 0; i < aKeys.length; i += 1) {
      if (aKeys[i] !== bKeys[i]) return false;
    }

    for (const k of aKeys) {
      if (!json_equal(aa[k]!, bb[k]!)) return false;
    }

    return true;
  }

  return false;
}

export function assert_json_eq(
  label: string,
  actual: JsonValue,
  expected: JsonValue,
  steps: string[],
): void {
  if (!json_equal(actual, expected)) {
    throw new Error(
      `[state smoke] ${label}\nexpected: ${JSON.stringify(expected)}\nactual:   ${JSON.stringify(actual)}`
    );
  }

  steps.push(`OK  ${label}`);
}

export function node_equal(a: HsonNode, b: HsonNode): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
export function json_value_to_payload_node(value: JsonValue): HsonNode {
  // CHANGED: primitives should become direct payload nodes, not go through rooted JSON parse
  if (typeof value === "string") {
    return _CREATE_NODE({
      _tag: STR_TAG,
      _content: [value],
    });
  }

  if (value === null ||
    typeof value === "number" ||
    typeof value === "boolean") {
    return _CREATE_NODE({
      _tag: VAL_TAG,
      _content: [value],
    });
  }

  // CHANGED: arrays / objects can still use the canonical JSON parser path
  const parsed = hson.fromJson(JSON.stringify(value)).toHson().parse();
  const root = Array.isArray(parsed) ? parsed[0] : parsed;

  if (!root) {
    throw new Error("json_value_to_payload_node(): parse returned no root node");
  }

  if (root._tag !== ROOT_TAG) {
    return clone_node(root);
  }

  const child = first_node_child(root);
  if (!child) {
    throw new Error("json_value_to_payload_node(): root has no payload child");
  }

  return clone_node(child);
}
