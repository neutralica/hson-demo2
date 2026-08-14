// bridge-suite.ts

import { hson } from "hson-live";
import type { JsonValue, LiveMapCommit, LivePath } from "hson-live/types";
import type { TestCase, TestSuite } from "../../harness/core/test-contracts";
import { equal_row, preview_value } from "./test-helpers";

type TextTarget = Readonly<{
  getText: () => string;
  setText: (value: string) => void;
}>;

type AttrTarget = Readonly<{
  getAttr: (name: string) => string | undefined;
  setAttr: (name: string, value: string) => void;
  removeAttr: (name: string) => void;
}>;

type InputTarget = Readonly<{
  getValue: () => string;
  setValue: (value: string) => void;
  onInput: (listener: () => void) => () => void;
  emitInput: () => void;
}>;

type BridgeBinding = Readonly<{
  dispose: () => void;
}>;

type BridgeMap = Readonly<{
  snap: (path?: LivePath) => JsonValue | undefined;
  set: (path: LivePath, value: JsonValue) => LiveMapCommit;
  sub: Readonly<{
    path: (path: LivePath, listener: (next: JsonValue | undefined) => void) => () => void;
  }>;
  batch: (write: (tx: { set: (path: LivePath, value: JsonValue) => unknown }) => void) => LiveMapCommit;
}>;

function make_bridge_map(input: JsonValue): BridgeMap {
  return hson.liveMap.fromJson(input) as unknown as BridgeMap;
}

export function livemap_suites_bridge(): TestSuite {
  const SUITE = "livemap/bridge";

  return {
    suite: SUITE,
    cases: [
      make_text_initial_case(SUITE),
      make_text_update_case(SUITE),
      make_text_dispose_case(SUITE),
      make_attr_initial_case(SUITE),
      make_attr_update_case(SUITE),
      make_attr_remove_case(SUITE),
      make_input_initial_case(SUITE),
      make_input_writeback_case(SUITE),
      make_input_external_update_case(SUITE),
      make_input_dispose_case(SUITE),
      make_schema_reject_case(SUITE),
      make_batch_single_update_case(SUITE),
      make_text_object_value_case(SUITE),
      make_text_array_value_case(SUITE),
      make_attr_zero_case(SUITE),
      make_attr_null_initial_case(SUITE),
      make_input_number_writeback_case(SUITE),
      make_input_boolean_writeback_case(SUITE),
      make_input_invalid_number_writeback_case(SUITE),
      make_batch_unrelated_path_case(SUITE),
    ] as const,
  };
}

function make_text_initial_case(suite: string): TestCase {
  return {
    suite,
    caseId: "text-binding-initializes-target-from-map-path", name: "text binding initializes target from map path",
    meta: {
      input: preview_value({ ui: { label: "Ready" } }),
      path: preview_value(["ui", "label"]),
    },
    run: () => {
      const map = make_bridge_map({ ui: { label: "Ready" } });
      const target = make_text_target();

      const binding = bind_text(map, ["ui", "label"], target);

      const rows = [equal_row("initial text", target.getText(), "Ready")];
      binding.dispose();

      return { assertRows: rows };
    },
  };
}

function make_text_update_case(suite: string): TestCase {
  return {
    suite,
    caseId: "text-binding-updates-target-after-map-path-change", name: "text binding updates target after map path change",
    meta: {
      input: preview_value({ ui: { label: "Ready" } }),
      path: preview_value(["ui", "label"]),
    },
    run: () => {
      const map = make_bridge_map({ ui: { label: "Ready" } });
      const target = make_text_target();

      const binding = bind_text(map, ["ui", "label"], target);
      map.set(["ui", "label"], "Running");

      const rows = [equal_row("updated text", target.getText(), "Running")];
      binding.dispose();

      return { assertRows: rows };
    },
  };
}

function make_text_dispose_case(suite: string): TestCase {
  return {
    suite,
    caseId: "text-binding-disposer-stops-later-updates", name: "text binding disposer stops later updates",
    meta: {
      input: preview_value({ ui: { label: "Ready" } }),
      path: preview_value(["ui", "label"]),
    },
    run: () => {
      const map = make_bridge_map({ ui: { label: "Ready" } });
      const target = make_text_target();

      const binding = bind_text(map, ["ui", "label"], target);
      binding.dispose();
      map.set(["ui", "label"], "Running");

      return {
        assertRows: [equal_row("disposed text remains unchanged", target.getText(), "Ready")],
      };
    },
  };
}

function make_attr_initial_case(suite: string): TestCase {
  return {
    suite,
    caseId: "attr-binding-initializes-target-from-map-path", name: "attr binding initializes target from map path",
    meta: {
      input: preview_value({ ui: { tone: "active" } }),
      path: preview_value(["ui", "tone"]),
    },
    run: () => {
      const map = make_bridge_map({ ui: { tone: "active" } });
      const target = make_attr_target();

      const binding = bind_attr(map, ["ui", "tone"], target, "data-tone");

      const rows = [equal_row("initial attr", target.getAttr("data-tone"), "active")];
      binding.dispose();

      return { assertRows: rows };
    },
  };
}

function make_attr_update_case(suite: string): TestCase {
  return {
    suite,
    caseId: "attr-binding-updates-target-after-map-path-change", name: "attr binding updates target after map path change",
    meta: {
      input: preview_value({ ui: { tone: "active" } }),
      path: preview_value(["ui", "tone"]),
    },
    run: () => {
      const map = make_bridge_map({ ui: { tone: "active" } });
      const target = make_attr_target();

      const binding = bind_attr(map, ["ui", "tone"], target, "data-tone");
      map.set(["ui", "tone"], "idle");

      const rows = [equal_row("updated attr", target.getAttr("data-tone"), "idle")];
      binding.dispose();

      return { assertRows: rows };
    },
  };
}

function make_attr_remove_case(suite: string): TestCase {
  return {
    suite,
    caseId: "attr-binding-removes-target-attr-for-false-null-or-undefined", name: "attr binding removes target attr for false null or undefined",
    meta: {
      input: preview_value({ ui: { enabled: true } }),
      path: preview_value(["ui", "enabled"]),
    },
    run: () => {
      const map = make_bridge_map({ ui: { enabled: true } });
      const target = make_attr_target();

      const binding = bind_attr(map, ["ui", "enabled"], target, "data-enabled");
      const initial = target.getAttr("data-enabled");
      map.set(["ui", "enabled"], false);

      const rows = [
        equal_row("initial truthy attr", initial, "true"),
        equal_row("false removes attr", target.getAttr("data-enabled"), undefined),
      ];
      binding.dispose();

      return { assertRows: rows };
    },
  };
}

function make_input_initial_case(suite: string): TestCase {
  return {
    suite,
    caseId: "input-binding-initializes-input-from-map-path", name: "input binding initializes input from map path",
    meta: {
      input: preview_value({ form: { name: "Ada" } }),
      path: preview_value(["form", "name"]),
    },
    run: () => {
      const map = make_bridge_map({ form: { name: "Ada" } });
      const target = make_input_target();

      const binding = bind_input_value(target, map, ["form", "name"]);

      const rows = [equal_row("initial input", target.getValue(), "Ada")];
      binding.dispose();

      return { assertRows: rows };
    },
  };
}

function make_input_writeback_case(suite: string): TestCase {
  return {
    suite,
    caseId: "input-binding-writes-input-event-value-back-to-map-path", name: "input binding writes input event value back to map path",
    meta: {
      input: preview_value({ form: { name: "Ada" } }),
      path: preview_value(["form", "name"]),
    },
    run: () => {
      const map = make_bridge_map({ form: { name: "Ada" } });
      const target = make_input_target();

      const binding = bind_input_value(target, map, ["form", "name"]);
      target.setValue("Grace");
      target.emitInput();

      const rows = [equal_row("map receives input value", map.snap(), { form: { name: "Grace" } })];
      binding.dispose();

      return { assertRows: rows };
    },
  };
}

function make_input_external_update_case(suite: string): TestCase {
  return {
    suite,
    caseId: "input-binding-receives-external-map-path-update", name: "input binding receives external map path update",
    meta: {
      input: preview_value({ form: { name: "Ada" } }),
      path: preview_value(["form", "name"]),
    },
    run: () => {
      const map = make_bridge_map({ form: { name: "Ada" } });
      const target = make_input_target();

      const binding = bind_input_value(target, map, ["form", "name"]);
      map.set(["form", "name"], "Grace");

      const rows = [equal_row("input receives map value", target.getValue(), "Grace")];
      binding.dispose();

      return { assertRows: rows };
    },
  };
}

function make_input_dispose_case(suite: string): TestCase {
  return {
    suite,
    caseId: "input-binding-disposer-stops-map-to-input-and-input-to-map-updates", name: "input binding disposer stops map-to-input and input-to-map updates",
    meta: {
      input: preview_value({ form: { name: "Ada" } }),
      path: preview_value(["form", "name"]),
    },
    run: () => {
      const map = make_bridge_map({ form: { name: "Ada" } });
      const target = make_input_target();

      const binding = bind_input_value(target, map, ["form", "name"]);
      binding.dispose();
      map.set(["form", "name"], "Grace");
      target.setValue("Lovelace");
      target.emitInput();

      return {
        assertRows: [
          equal_row("disposed input remains unchanged by map", target.getValue(), "Lovelace"),
          equal_row("disposed map remains unchanged by input", map.snap(), { form: { name: "Grace" } }),
        ],
      };
    },
  };
}

function make_schema_reject_case(suite: string): TestCase {
  return {
    suite,
    caseId: "input-binding-schema-rejection-leaves-map-value-stable", name: "input binding schema rejection leaves map value stable",
    meta: {
      input: preview_value({ form: { count: 1 } }),
      path: preview_value(["form", "count"]),
    },
    run: () => {
      const schema = hson.liveMap.schema.define((s) => s.object({
        form: s.object({
          count: s.number,
        }),
      }));
      const map = hson.liveMap.fromJson({ form: { count: 1 } }).schema.use(schema) as unknown as BridgeMap;
      const target = make_input_target();

      const binding = bind_input_value(target, map, ["form", "count"]);
      target.setValue("not-a-number");

      let message = "";
      try {
        target.emitInput();
      } catch (error) {
        message = error instanceof Error ? error.message : String(error);
      }

      const rows = [
        equal_row("schema rejection mentions number", message.includes("expected number"), true),
        equal_row("map remains stable", map.snap(), { form: { count: 1 } }),
      ];
      binding.dispose();

      return { assertRows: rows };
    },
  };
}

function make_batch_single_update_case(suite: string): TestCase {
  return {
    suite,
    caseId: "text-binding-receives-one-final-value-from-batch-path-update", name: "text binding receives one final value from batch path update",
    meta: {
      input: preview_value({ ui: { label: "Ready", tone: "idle" } }),
      path: preview_value(["ui", "label"]),
    },
    run: () => {
      const map = make_bridge_map({ ui: { label: "Ready", tone: "idle" } });
      const target = make_text_target();

      const binding = bind_text(map, ["ui", "label"], target);
      map.batch((tx) => {
        tx.set(["ui", "label"], "Running");
        tx.set(["ui", "tone"], "active");
      });

      const rows = [equal_row("batch updates bound text", target.getText(), "Running")];
      binding.dispose();

      return { assertRows: rows };
    },
  };
}

function make_text_object_value_case(suite: string): TestCase {
  return {
    suite,
    caseId: "text-binding-renders-object-value-as-json-text", name: "text binding renders object value as JSON text",
    meta: {
      input: preview_value({ ui: { state: { label: "Ready", count: 2 } } }),
      path: preview_value(["ui", "state"]),
    },
    run: () => {
      const map = make_bridge_map({ ui: { state: { label: "Ready", count: 2 } } });
      const target = make_text_target();

      const binding = bind_text(map, ["ui", "state"], target);

      const rows = [
        equal_row("object value text", target.getText(), JSON.stringify({ label: "Ready", count: 2 })),
      ];
      binding.dispose();

      return { assertRows: rows };
    },
  };
}

function make_text_array_value_case(suite: string): TestCase {
  return {
    suite,
    caseId: "text-binding-renders-array-value-as-json-text", name: "text binding renders array value as JSON text",
    meta: {
      input: preview_value({ ui: { items: ["a", "b", "c"] } }),
      path: preview_value(["ui", "items"]),
    },
    run: () => {
      const map = make_bridge_map({ ui: { items: ["a", "b", "c"] } });
      const target = make_text_target();

      const binding = bind_text(map, ["ui", "items"], target);

      const rows = [
        equal_row("array value text", target.getText(), JSON.stringify(["a", "b", "c"])),
      ];
      binding.dispose();

      return { assertRows: rows };
    },
  };
}

function make_attr_zero_case(suite: string): TestCase {
  return {
    suite,
    caseId: "attr-binding-preserves-numeric-zero-as-attr-value", name: "attr binding preserves numeric zero as attr value",
    meta: {
      input: preview_value({ ui: { count: 0 } }),
      path: preview_value(["ui", "count"]),
    },
    run: () => {
      const map = make_bridge_map({ ui: { count: 0 } });
      const target = make_attr_target();

      const binding = bind_attr(map, ["ui", "count"], target, "data-count");

      const rows = [equal_row("zero attr", target.getAttr("data-count"), "0")];
      binding.dispose();

      return { assertRows: rows };
    },
  };
}

function make_attr_null_initial_case(suite: string): TestCase {
  return {
    suite,
    caseId: "attr-binding-starts-removed-for-null-value", name: "attr binding starts removed for null value",
    meta: {
      input: preview_value({ ui: { label: null } }),
      path: preview_value(["ui", "label"]),
    },
    run: () => {
      const map = make_bridge_map({ ui: { label: null } });
      const target = make_attr_target();

      const binding = bind_attr(map, ["ui", "label"], target, "data-label");

      const rows = [equal_row("null attr absent", target.getAttr("data-label"), undefined)];
      binding.dispose();

      return { assertRows: rows };
    },
  };
}

function make_input_number_writeback_case(suite: string): TestCase {
  return {
    suite,
    caseId: "input-binding-coerces-numeric-string-back-to-number-when-current-value-is-number", name: "input binding coerces numeric string back to number when current value is number",
    meta: {
      input: preview_value({ form: { count: 1 } }),
      path: preview_value(["form", "count"]),
    },
    run: () => {
      const map = make_bridge_map({ form: { count: 1 } });
      const target = make_input_target();

      const binding = bind_input_value(target, map, ["form", "count"]);
      target.setValue("42");
      target.emitInput();

      const rows = [equal_row("number writeback", map.snap(), { form: { count: 42 } })];
      binding.dispose();

      return { assertRows: rows };
    },
  };
}

function make_input_boolean_writeback_case(suite: string): TestCase {
  return {
    suite,
    caseId: "input-binding-coerces-true-string-back-to-boolean-when-current-value-is-boolean", name: "input binding coerces true string back to boolean when current value is boolean",
    meta: {
      input: preview_value({ form: { enabled: false } }),
      path: preview_value(["form", "enabled"]),
    },
    run: () => {
      const map = make_bridge_map({ form: { enabled: false } });
      const target = make_input_target();

      const binding = bind_input_value(target, map, ["form", "enabled"]);
      target.setValue("true");
      target.emitInput();

      const rows = [equal_row("boolean writeback", map.snap(), { form: { enabled: true } })];
      binding.dispose();

      return { assertRows: rows };
    },
  };
}

function make_input_invalid_number_writeback_case(suite: string): TestCase {
  return {
    suite,
    caseId: "input-binding-sends-invalid-numeric-text-as-string-for-schema-to-reject-or-accept", name: "input binding sends invalid numeric text as string for schema to reject or accept",
    meta: {
      input: preview_value({ form: { count: 1 } }),
      path: preview_value(["form", "count"]),
    },
    run: () => {
      const map = make_bridge_map({ form: { count: 1 } });
      const target = make_input_target();

      const binding = bind_input_value(target, map, ["form", "count"]);
      target.setValue("not-a-number");
      target.emitInput();

      const rows = [equal_row("invalid number becomes string", map.snap(), { form: { count: "not-a-number" } })];
      binding.dispose();

      return { assertRows: rows };
    },
  };
}

function make_batch_unrelated_path_case(suite: string): TestCase {
  return {
    suite,
    caseId: "text-binding-ignores-batch-update-when-bound-path-value-is-unchanged", name: "text binding ignores batch update when bound path value is unchanged",
    meta: {
      input: preview_value({ ui: { label: "Ready", tone: "idle" } }),
      path: preview_value(["ui", "label"]),
    },
    run: () => {
      const map = make_bridge_map({ ui: { label: "Ready", tone: "idle" } });
      const target = make_counting_text_target();

      const binding = bind_text(map, ["ui", "label"], target);
      map.batch((tx) => {
        tx.set(["ui", "tone"], "active");
      });

      const rows = [
        equal_row("text value remains unchanged", target.getText(), "Ready"),
        equal_row("text target was only initialized", target.getSetCount(), 1),
      ];
      binding.dispose();

      return { assertRows: rows };
    },
  };
}

function bind_text(map: BridgeMap, path: LivePath, target: TextTarget): BridgeBinding {
  const sync = (value: JsonValue | undefined) => {
    target.setText(value_to_text(value));
  };

  sync(map.snap(path));
  const dispose = map.sub.path(path, sync);

  return { dispose };
}

function bind_attr(map: BridgeMap, path: LivePath, target: AttrTarget, name: string): BridgeBinding {
  const sync = (value: JsonValue | undefined) => {
    if (value === false || value === null || value === undefined) {
      target.removeAttr(name);
      return;
    }

    target.setAttr(name, value_to_text(value));
  };

  sync(map.snap(path));
  const dispose = map.sub.path(path, sync);

  return { dispose };
}

function bind_input_value(target: InputTarget, map: BridgeMap, path: LivePath): BridgeBinding {
  let isSyncing = false;

  const syncFromMap = (value: JsonValue | undefined) => {
    isSyncing = true;
    target.setValue(value_to_text(value));
    isSyncing = false;
  };

  const syncToMap = () => {
    if (isSyncing) return;
    map.set(path, coerce_input_value(target.getValue(), map.snap(path)));
  };

  syncFromMap(map.snap(path));
  const disposePath = map.sub.path(path, syncFromMap);
  const disposeInput = target.onInput(syncToMap);

  return {
    dispose: () => {
      disposeInput();
      disposePath();
    },
  };
}

function coerce_input_value(value: string, current: JsonValue | undefined): JsonValue {
  if (typeof current === "number") {
    const next = Number(value);
    return Number.isFinite(next) ? next : value;
  }

  if (typeof current === "boolean") return value === "true";
  if (current === null && value === "null") return null;
  return value;
}

function value_to_text(value: JsonValue | undefined): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function make_text_target(): TextTarget {
  let text = "";

  return {
    getText: () => text,
    setText: (value) => {
      text = value;
    },
  };
}

function make_counting_text_target(): TextTarget & Readonly<{ getSetCount: () => number }> {
  let text = "";
  let setCount = 0;

  return {
    getText: () => text,
    getSetCount: () => setCount,
    setText: (value) => {
      setCount += 1;
      text = value;
    },
  };
}

function make_attr_target(): AttrTarget {
  const attrs = new Map<string, string>();

  return {
    getAttr: (name) => attrs.get(name),
    setAttr: (name, value) => {
      attrs.set(name, value);
    },
    removeAttr: (name) => {
      attrs.delete(name);
    },
  };
}

function make_input_target(): InputTarget {
  let value = "";
  const listeners = new Set<() => void>();

  return {
    getValue: () => value,
    setValue: (next) => {
      value = next;
    },
    onInput: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    emitInput: () => {
      for (const listener of [...listeners]) listener();
    },
  };
}
