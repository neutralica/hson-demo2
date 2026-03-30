import type { HsonNode } from "hson-live/types";
import type { NodeState, NodeStateSlot, StateRootInput } from "./state.types";
import type { JsonValue } from "../../../../hson-live/dist/types/core.types";
import { hson } from "hson-live";
import { is_Node } from "../../../../hson-live/dist/utils/node-utils/node-guards";
import { clone_node } from "./clone-node";
import { find_node_at_path } from "./find-node-path";
import { path_to_parts } from "./path-to-parts";
import { set_node_at_path } from "./set-node-path";
import { remove_node_at_path } from "./remove-node-path";
import { json_value_to_payload_node, node_equal, unwrap_value_payload } from "./state-helpers";
import { ROOT_TAG } from "../../../../hson-live/dist/consts/constants";

export const jsonify = (nod: HsonNode): JsonValue => {
  return JSON.parse(
    hson.fromNode(nod).toJson().serialize()
  ) as JsonValue;
};

export function make_state(input: StateRootInput): NodeState {
  const rootNode = normalize_state_root(input);
  const listeners = new Set<(next: HsonNode, prev: HsonNode) => void>();

  const emit = (prev: HsonNode): void => {
    for (const fn of listeners) fn(rootNode, prev);
  };

  return {
    root(): HsonNode {
      return rootNode;
    },

    get(): JsonValue {
      return jsonify(rootNode);
    },

    update(mut: (root: HsonNode) => void): void {
      const prev = clone_node(rootNode); // whatever your cheap clone path is
      mut(rootNode);

      if (node_equal(prev, rootNode)) return;
      emit(prev);
    },

    at(path): NodeStateSlot {
      return make_state_slot(rootNode, path, listeners);
    },
    replace(next: JsonValue): void {
      const prev = clone_node(rootNode);
      const payload = json_value_to_payload_node(next);

      if (rootNode._tag === ROOT_TAG) {
        rootNode._content = [payload];
      } else {
        rootNode._tag = payload._tag;
        rootNode._attrs = clone_node(payload._attrs ?? {});
        rootNode._content = clone_node(payload._content ?? []);
        rootNode._meta = clone_node(payload._meta ?? {});
      }

      if (node_equal(prev, rootNode)) return;
      emit(prev);
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    subscribe_sel(sel, onChange) {
      let prevVal = sel(rootNode);

      const wrapped = (next: HsonNode): void => {
        const nextVal = sel(next);
        if (Object.is(nextVal, prevVal)) return;

        const old = prevVal;
        prevVal = nextVal;
        onChange(nextVal, old);
      };

      listeners.add(wrapped);
      return () => listeners.delete(wrapped);
    },
  };
}
function normalize_state_root(input: StateRootInput): HsonNode {
  if (is_Node(input)) return input;

  const jsonText =
    typeof input === "string"
      ? input
      : JSON.stringify(input);

  return hson.fromJson(jsonText).toHson().parse();
}

export function make_state_slot(
  root: HsonNode,
  path: string | readonly (string | number)[],
  listeners: Set<(next: HsonNode, prev: HsonNode) => void>,
): NodeStateSlot {
  const parts = typeof path === "string" ? path_to_parts(path) : [...path];

  return {
    node(): HsonNode | undefined {
      return find_node_at_path(root, parts);
    },

    get(): JsonValue | undefined {
      const hit = find_node_at_path(root, parts);
      if (!hit) return undefined;

      const payload = unwrap_value_payload(hit);
      return jsonify(payload);
    },

    set(next: JsonValue): void {
      const prev = clone_node(root);
      set_node_at_path(root, parts, next);
      for (const fn of listeners) fn(root, prev);
    },

    remove(): void {
      const prev = clone_node(root);
      remove_node_at_path(root, parts);
      for (const fn of listeners) fn(root, prev);
    },
  };
}

function shallow_equal(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}