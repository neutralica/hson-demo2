import type { HsonNode } from "hson-live/types";
import type { NodeState, NodeStateSlot, StateChange, StateCommit, StateMutation, StatePath, StateRootInput } from "./state.types";
import type { JsonValue } from "../../../../hson-live/dist/types/core.types";
import { hson } from "hson-live";
import { is_Node } from "../../../../hson-live/dist/utils/node-utils/node-guards";
import { clone_node } from "./clone-node";
import { find_node_at_path } from "./find-node-path";
import { path_to_parts } from "./path-to-parts";
import { set_node_at_path } from "./set-node-path";
import { remove_node_at_path } from "./remove-node-path";
import { json_equal, json_value_to_payload_node, node_equal, unwrap_value_payload } from "./state-helpers";
import { ROOT_TAG } from "../../../../hson-live/dist/consts/constants";

export function jsonify(nod: HsonNode): JsonValue {
  return JSON.parse(
    hson.fromNode(nod).toJson().serialize()
  ) as JsonValue;
}

function emptyCommit(): StateCommit {
  return Object.freeze({ changed: false, changes: Object.freeze([]) });
}

function makeCommit(changes: StateChange[]): StateCommit {
  return Object.freeze({ changed: changes.length > 0, changes: Object.freeze(changes) });
}

function pathParts(path: StatePath): (string | number)[] {
  return typeof path === "string" ? path_to_parts(path) : [...path];
}

function getPathValue(root: HsonNode, parts: readonly (string | number)[]): JsonValue | undefined {
  const hit = find_node_at_path(root, parts);
  if (!hit) return undefined;

  const payload = unwrap_value_payload(hit);
  return jsonify(payload);
}

function maybeJsonEqual(a: JsonValue | undefined, b: JsonValue | undefined): boolean {
  if (a === undefined || b === undefined) return a === b;
  return json_equal(a, b);
}

export function make_state(input: StateRootInput): NodeState {
  const rootNode = normalizeStateRoot(input);
  const listeners = new Set<(next: HsonNode, prev: HsonNode) => void>();
  const changeListeners = new Set<(commit: StateCommit) => void>();

  const emit = (prev: HsonNode): void => {
    for (const fn of listeners) fn(rootNode, prev);
  };

  const emitChange = (commit: StateCommit): void => {
    if (!commit.changed) return;
    for (const fn of changeListeners) fn(commit);
  };

  const commit = (mutations: readonly StateMutation[]): StateCommit => {
    if (mutations.length === 0) return emptyCommit();

    const prevRoot = listeners.size > 0 ? clone_node(rootNode) : undefined;
    const changes: StateChange[] = [];

    for (const mutation of mutations) {
      const parts = pathParts(mutation.path);
      const prev = getPathValue(rootNode, parts);

      if (mutation.kind === "set") {
        if (maybeJsonEqual(prev, mutation.value)) continue;

        set_node_at_path(rootNode, parts, mutation.value);
        const next = getPathValue(rootNode, parts);
        changes.push(Object.freeze({ kind: "set", path: Object.freeze(parts), prev, next }));
        continue;
      }

      if (prev === undefined) continue;

      remove_node_at_path(rootNode, parts);
      changes.push(Object.freeze({ kind: "remove", path: Object.freeze(parts), prev, next: undefined }));
    }

    const result = makeCommit(changes);
    if (!result.changed) return result;

    if (prevRoot) emit(prevRoot);
    emitChange(result);
    return result;
  };

  const emitRootReplacement = (prev: HsonNode): void => {
    const rootChange = makeCommit([
      Object.freeze({
        kind: "replace",
        path: Object.freeze([]),
        prev: jsonify(prev),
        next: jsonify(rootNode),
      }),
    ]);

    emit(prev);
    emitChange(rootChange);
  };

  return {
    root(): HsonNode {
      return rootNode;
    },

    get(): JsonValue {
      return jsonify(rootNode);
    },

    snapshot(): JsonValue {
      return jsonify(rootNode);
    },

    update(mut: (root: HsonNode) => void): void {
      const prev = clone_node(rootNode); // whatever your cheap clone path is
      mut(rootNode);

      if (node_equal(prev, rootNode)) return;
      emitRootReplacement(prev);
    },

    at(path): NodeStateSlot {
      return make_state_slot(rootNode, path, commit);
    },

    commit,

    replaceRoot(next: JsonValue): void {
      this.replace(next);
    },

    replace(next: JsonValue): void {
      const isObj =
        next !== null &&
        typeof next === "object" &&
        !Array.isArray(next);

      const isArr = Array.isArray(next);

      if (!isObj && !isArr) {
        throw new Error(
          `replace(): root replacement currently requires object or array, got ${JSON.stringify(next)}`
        );
      }

      const prev = clone_node(rootNode);
      const payload = json_value_to_payload_node(next);

      if (rootNode.$_tag === ROOT_TAG) {
        rootNode._content = [payload];
      } else {
        rootNode.$_tag = payload.$_tag;
        rootNode.$_attrs = clone_node(payload.$_attrs ?? {});
        rootNode._content = clone_node(payload._content ?? []);
        rootNode.$_meta = clone_node(payload.$_meta ?? {});
      }

      if (node_equal(prev, rootNode)) return;
      emitRootReplacement(prev);
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    subscribe_change(fn) {
      changeListeners.add(fn);
      return () => changeListeners.delete(fn);
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
function normalizeStateRoot(input: StateRootInput): HsonNode {
  if (is_Node(input)) return input;

  const jsonText =
    typeof input === "string"
      ? input
      : JSON.stringify(input);

  return hson.fromJson(jsonText).toHson().parse();
}

export function make_state_slot(
  root: HsonNode,
  path: StatePath,
  commit: (mutations: readonly StateMutation[]) => StateCommit,
): NodeStateSlot {
  const parts = pathParts(path);

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

    set(next: JsonValue): StateCommit {
      return commit([{ kind: "set", path: parts, value: next }]);
    },

    remove(): StateCommit {
      return commit([{ kind: "remove", path: parts }]);
    },
  };
}
