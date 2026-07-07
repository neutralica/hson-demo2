// bridge-livetree-suite.ts

import { hson } from "hson-live";
import type { JsonValue, LiveMapCommit, LivePath } from "hson-live/types";
import type { TestCase, TestSuite } from "../../app/demos/test/tests.types";
import { equal_row, preview_value } from "./test-helpers";

type BridgeBinding = Readonly<{
  dispose: () => void;
}>;

type BridgeMap = Readonly<{
  snap: (path?: LivePath) => JsonValue | undefined;
  set: (path: LivePath, value: JsonValue) => LiveMapCommit;
  sub: Readonly<{
    path: (path: LivePath, listener: (next: JsonValue | undefined) => void) => () => void;
  }>;
}>;

type LiveTreeTextTarget = Readonly<{
  text: Readonly<{
    get: () => string;
    set: (value: string) => unknown;
  }>;
}>;

type LiveTreeAttrTarget = Readonly<{
  attr: Readonly<{
    get: (name: string) => string | undefined;
    set: (name: string, value: string) => unknown;
    drop: (name: string) => unknown;
  }>;
}>;

type LiveTreeInputTarget = Readonly<{
  form: Readonly<{
    getValue: () => JsonValue | undefined;
    setValue: (value: JsonValue, options?: { silent?: boolean }) => unknown;
  }>;
  listen: Readonly<{
    onInput: (listener: () => void) => Readonly<{
      off: () => void;
      count: number;
      ok: boolean;
    }>;
  }>;
}>;

// Test-only event shim. Real bridge code should rely on LiveTree listener results.
const TEST_INPUT_LISTENERS = new WeakMap<object, () => void>();

export function livemap_suites_bridge_livetree(): TestSuite {
  const SUITE = "livemap/bridge-livetree";

  return {
    suite: SUITE,
    cases: [
      make_livetree_text_initial_case(SUITE),
      make_livetree_text_update_case(SUITE),
      make_livetree_text_dispose_case(SUITE),
      make_livetree_attr_initial_case(SUITE),
      make_livetree_attr_remove_case(SUITE),
      make_livetree_input_initial_case(SUITE),
      make_livetree_input_writeback_case(SUITE),
      make_livetree_input_external_update_case(SUITE),
      make_livetree_snap_root_case(SUITE),
      make_livetree_snap_path_case(SUITE),
      make_livetree_snap_static_case(SUITE),
      make_livetree_snap_rerender_case(SUITE),
    ] as const,
  };
}

function make_bridge_map(input: JsonValue): BridgeMap {
  return hson.liveMap.fromJson(input) as unknown as BridgeMap;
}

function make_livetree_text_target(): LiveTreeTextTarget {
  return hson.liveTree.create.div() as unknown as LiveTreeTextTarget;
}

function make_livetree_attr_target(): LiveTreeAttrTarget {
  return hson.liveTree.create.div() as unknown as LiveTreeAttrTarget;
}

function make_livetree_input_target(): LiveTreeInputTarget {
  return hson.liveTree.create.input() as unknown as LiveTreeInputTarget;
}

function make_livetree_text_initial_case(suite: string): TestCase {
  return {
    suite,
    name: "LiveTree text binding initializes text from map path",
    meta: {
      input: preview_value({ ui: { label: "Ready" } }),
      path: preview_value(["ui", "label"]),
    },
    run: () => {
      const map = make_bridge_map({ ui: { label: "Ready" } });
      const tree = make_livetree_text_target();

      const binding = bind_livetree_text(map, ["ui", "label"], tree);

      const rows = [equal_row("initial LiveTree text", tree.text.get(), "Ready")];
      binding.dispose();

      return { assertRows: rows };
    },
  };
}

function make_livetree_text_update_case(suite: string): TestCase {
  return {
    suite,
    name: "LiveTree text binding updates text after map path change",
    meta: {
      input: preview_value({ ui: { label: "Ready" } }),
      path: preview_value(["ui", "label"]),
    },
    run: () => {
      const map = make_bridge_map({ ui: { label: "Ready" } });
      const tree = make_livetree_text_target();

      const binding = bind_livetree_text(map, ["ui", "label"], tree);
      map.set(["ui", "label"], "Running");

      const rows = [equal_row("updated LiveTree text", tree.text.get(), "Running")];
      binding.dispose();

      return { assertRows: rows };
    },
  };
}

function make_livetree_text_dispose_case(suite: string): TestCase {
  return {
    suite,
    name: "LiveTree text binding disposer stops later text updates",
    meta: {
      input: preview_value({ ui: { label: "Ready" } }),
      path: preview_value(["ui", "label"]),
    },
    run: () => {
      const map = make_bridge_map({ ui: { label: "Ready" } });
      const tree = make_livetree_text_target();

      const binding = bind_livetree_text(map, ["ui", "label"], tree);
      binding.dispose();
      map.set(["ui", "label"], "Running");

      return {
        assertRows: [equal_row("disposed LiveTree text remains unchanged", tree.text.get(), "Ready")],
      };
    },
  };
}

function make_livetree_attr_initial_case(suite: string): TestCase {
  return {
    suite,
    name: "LiveTree attr binding initializes attr from map path",
    meta: {
      input: preview_value({ ui: { tone: "active" } }),
      path: preview_value(["ui", "tone"]),
    },
    run: () => {
      const map = make_bridge_map({ ui: { tone: "active" } });
      const tree = make_livetree_attr_target();

      const binding = bind_livetree_attr(map, ["ui", "tone"], tree, "data-tone");

      const rows = [equal_row("initial LiveTree attr", tree.attr.get("data-tone"), "active")];
      binding.dispose();

      return { assertRows: rows };
    },
  };
}

function make_livetree_attr_remove_case(suite: string): TestCase {
  return {
    suite,
    name: "LiveTree attr binding removes attr for false value",
    meta: {
      input: preview_value({ ui: { enabled: true } }),
      path: preview_value(["ui", "enabled"]),
    },
    run: () => {
      const map = make_bridge_map({ ui: { enabled: true } });
      const tree = make_livetree_attr_target();

      const binding = bind_livetree_attr(map, ["ui", "enabled"], tree, "data-enabled");
      const initial = tree.attr.get("data-enabled");
      map.set(["ui", "enabled"], false);

      const rows = [
        equal_row("initial LiveTree truthy attr", initial, "true"),
        equal_row("false removes LiveTree attr", tree.attr.get("data-enabled"), undefined),
      ];
      binding.dispose();

      return { assertRows: rows };
    },
  };
}

function make_livetree_input_initial_case(suite: string): TestCase {
  return {
    suite,
    name: "LiveTree input binding initializes form value from map path",
    meta: {
      input: preview_value({ form: { name: "Ada" } }),
      path: preview_value(["form", "name"]),
    },
    run: () => {
      const map = make_bridge_map({ form: { name: "Ada" } });
      const tree = make_livetree_input_target();

      const binding = bind_livetree_input_value(tree, map, ["form", "name"]);

      const rows = [equal_row("initial LiveTree input value", tree.form.getValue(), "Ada")];
      binding.dispose();

      return { assertRows: rows };
    },
  };
}

function make_livetree_input_writeback_case(suite: string): TestCase {
  return {
    suite,
    name: "LiveTree input binding writes input value back to map path",
    meta: {
      input: preview_value({ form: { name: "Ada" } }),
      path: preview_value(["form", "name"]),
    },
    run: () => {
      const map = make_bridge_map({ form: { name: "Ada" } });
      const tree = make_livetree_input_target();

      const binding = bind_livetree_input_value(tree, map, ["form", "name"]);
      tree.form.setValue("Grace", { silent: true });
      emit_input(tree);

      const rows = [equal_row("map receives LiveTree input value", map.snap(), { form: { name: "Grace" } })];
      binding.dispose();

      return { assertRows: rows };
    },
  };
}


function make_livetree_input_external_update_case(suite: string): TestCase {
  return {
    suite,
    name: "LiveTree input binding receives external map path update",
    meta: {
      input: preview_value({ form: { name: "Ada" } }),
      path: preview_value(["form", "name"]),
    },
    run: () => {
      const map = make_bridge_map({ form: { name: "Ada" } });
      const tree = make_livetree_input_target();

      const binding = bind_livetree_input_value(tree, map, ["form", "name"]);
      map.set(["form", "name"], "Grace");

      const rows = [equal_row("LiveTree input receives map value", tree.form.getValue(), "Grace")];
      binding.dispose();

      return { assertRows: rows };
    },
  };
}

function make_livetree_snap_root_case(suite: string): TestCase {
  return {
    suite,
    name: "LiveTree snap render writes root snapshot text",
    meta: {
      input: preview_value({ ui: { label: "Ready", enabled: true } }),
    },
    run: () => {
      const map = make_bridge_map({ ui: { label: "Ready", enabled: true } });
      const tree = make_livetree_text_target();

      render_livemap_snap(map, tree);

      return {
        assertRows: [
          equal_row(
            "root snapshot text",
            tree.text.get(),
            JSON.stringify({ ui: { label: "Ready", enabled: true } }),
          ),
        ],
      };
    },
  };
}

function make_livetree_snap_path_case(suite: string): TestCase {
  return {
    suite,
    name: "LiveTree snap render writes path snapshot text",
    meta: {
      input: preview_value({ ui: { label: "Ready", enabled: true } }),
      path: preview_value(["ui", "label"]),
    },
    run: () => {
      const map = make_bridge_map({ ui: { label: "Ready", enabled: true } });
      const tree = make_livetree_text_target();

      render_livemap_snap(map, tree, ["ui", "label"]);

      return {
        assertRows: [equal_row("path snapshot text", tree.text.get(), "Ready")],
      };
    },
  };
}

function make_livetree_snap_static_case(suite: string): TestCase {
  return {
    suite,
    name: "LiveTree snap render is static until called again",
    meta: {
      input: preview_value({ ui: { label: "Ready" } }),
      path: preview_value(["ui", "label"]),
    },
    run: () => {
      const map = make_bridge_map({ ui: { label: "Ready" } });
      const tree = make_livetree_text_target();

      render_livemap_snap(map, tree, ["ui", "label"]);
      map.set(["ui", "label"], "Running");

      return {
        assertRows: [equal_row("static snapshot remains unchanged", tree.text.get(), "Ready")],
      };
    },
  };
}

function make_livetree_snap_rerender_case(suite: string): TestCase {
  return {
    suite,
    name: "LiveTree snap render updates when called again",
    meta: {
      input: preview_value({ ui: { label: "Ready" } }),
      path: preview_value(["ui", "label"]),
    },
    run: () => {
      const map = make_bridge_map({ ui: { label: "Ready" } });
      const tree = make_livetree_text_target();

      render_livemap_snap(map, tree, ["ui", "label"]);
      map.set(["ui", "label"], "Running");
      render_livemap_snap(map, tree, ["ui", "label"]);

      return {
        assertRows: [equal_row("rerendered snapshot text", tree.text.get(), "Running")],
      };
    },
  };
}

function render_livemap_snap(map: BridgeMap, tree: LiveTreeTextTarget, path?: LivePath): void {
  tree.text.set(value_to_text(map.snap(path)));
}

function bind_livetree_text(map: BridgeMap, path: LivePath, tree: LiveTreeTextTarget): BridgeBinding {
  const sync = (value: JsonValue | undefined) => {
    tree.text.set(value_to_text(value));
  };

  sync(map.snap(path));
  const dispose = map.sub.path(path, sync);

  return { dispose };
}

function bind_livetree_attr(
  map: BridgeMap,
  path: LivePath,
  tree: LiveTreeAttrTarget,
  name: string,
): BridgeBinding {
  const sync = (value: JsonValue | undefined) => {
    if (value === false || value === null || value === undefined) {
      tree.attr.drop(name);
      return;
    }

    tree.attr.set(name, value_to_text(value));
  };

  sync(map.snap(path));
  const dispose = map.sub.path(path, sync);

  return { dispose };
}

function bind_livetree_input_value(
  tree: LiveTreeInputTarget,
  map: BridgeMap,
  path: LivePath,
): BridgeBinding {
  let isSyncing = false;

  const syncFromMap = (value: JsonValue | undefined) => {
    isSyncing = true;
    tree.form.setValue(value_to_text(value), { silent: true });
    isSyncing = false;
  };

  const syncToMap = () => {
    if (isSyncing) return;
    map.set(path, coerce_input_value(tree.form.getValue(), map.snap(path)));
  };

  syncFromMap(map.snap(path));
  const disposePath = map.sub.path(path, syncFromMap);
  const inputListener = tree.listen.onInput(syncToMap);
  TEST_INPUT_LISTENERS.set(tree as object, syncToMap);

  return {
    dispose: () => {
      inputListener.off();
      TEST_INPUT_LISTENERS.delete(tree as object);
      disposePath();
    },
  };
}

// These are bridge-shape probes, not public API.
function emit_input(tree: LiveTreeInputTarget): void {
  const listener = TEST_INPUT_LISTENERS.get(tree as object);
  if (listener !== undefined) {
    listener();
    return;
  }

  const target = event_target_from_livetree(tree);

  if (target !== undefined) {
    target.dispatchEvent(new Event("input", { bubbles: true }));
  }
}

function event_target_from_livetree(tree: LiveTreeInputTarget): EventTarget | undefined {
  const candidate = tree as unknown as Readonly<{
    get?: () => unknown;
    node?: unknown;
    element?: unknown;
    el?: unknown;
    dom?: unknown;
    hostRootNode?: unknown;
  }>;

  const values = [
    typeof candidate.get === "function" ? candidate.get() : undefined,
    candidate.node,
    candidate.element,
    candidate.el,
    candidate.dom,
    candidate.hostRootNode,
  ];

  for (const value of values) {
    const target = as_event_target(value);
    if (target !== undefined) return target;
  }

  return undefined;
}

function as_event_target(value: unknown): EventTarget | undefined {
  if (value instanceof EventTarget) return value;

  if (typeof value !== "object" || value === null) return undefined;

  const boxed = value as Readonly<{
    get?: () => unknown;
    node?: unknown;
    element?: unknown;
    el?: unknown;
    current?: unknown;
  }>;

  if (typeof boxed.get === "function") {
    const target = as_event_target(boxed.get());
    if (target !== undefined) return target;
  }

  return (
    as_event_target(boxed.node) ??
    as_event_target(boxed.element) ??
    as_event_target(boxed.el) ??
    as_event_target(boxed.current)
  );
}

function coerce_input_value(value: JsonValue | undefined, current: JsonValue | undefined): JsonValue {
  if (typeof current === "number") {
    const next = Number(value);
    return Number.isFinite(next) ? next : value_to_text(value);
  }

  if (typeof current === "boolean") return value === true || value === "true";
  if (current === null && value === "null") return null;
  return value ?? "";
}

function value_to_text(value: JsonValue | undefined): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}