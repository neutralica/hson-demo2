// bridge-livetree-suite.ts

import { hson } from "hson-live";
import {
  bind_livetree_attr,
  bind_livetree_input_value,
  bind_livetree_text,
  render_livemap_snap,
} from "../../../../hson-live/src/api/livemap/bridge";
import type {
  LiveMapBridgeBinding,
  LiveMapBridgeMap,
  LiveTreeAttrBridgeTarget,
  LiveTreeInputBridgeTarget,
  LiveTreeInputListenerResult,
  LiveTreeTextBridgeTarget,
} from "../../../../hson-live/src/api/livemap/bridge";
import type { JsonValue, LivePath } from "hson-live/types";
import type { TestCase, TestSuite } from "../../app/demos/test/tests.types";
import { equal_row, preview_value } from "./test-helpers";

type BridgeMap = LiveMapBridgeMap;
type LiveTreeTextTarget = LiveTreeTextBridgeTarget;
type LiveTreeAttrTarget = LiveTreeAttrBridgeTarget;
type LiveTreeInputTarget = LiveTreeInputBridgeTarget;


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
      make_livetree_attr_zero_case(SUITE),
      make_livetree_input_number_writeback_case(SUITE),
      make_livetree_input_boolean_writeback_case(SUITE),
      make_livetree_input_schema_reject_case(SUITE),
      make_livetree_input_dispose_writeback_case(SUITE),
      make_livetree_text_fanout_case(SUITE),
      make_livetree_input_to_text_loop_case(SUITE),
      make_livetree_text_fanout_partial_dispose_case(SUITE),
      make_livetree_input_loop_repeated_writeback_case(SUITE),
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
  const tree = hson.liveTree.create.input() as unknown as LiveTreeInputTarget;
  let target: LiveTreeInputTarget;

  target = {
    form: tree.form,
    listen: {
      onInput: (listener) => {
        TEST_INPUT_LISTENERS.set(target as object, listener);
        const result = tree.listen.onInput(listener);

        return {
          count: result.count,
          ok: result.ok,
          off: () => {
            result.off();
            TEST_INPUT_LISTENERS.delete(target as object);
          },
        } satisfies LiveTreeInputListenerResult;
      },
    },
  };

  return target;
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

function make_livetree_attr_zero_case(suite: string): TestCase {
  return {
    suite,
    name: "LiveTree attr binding preserves numeric zero as attr value",
    meta: {
      input: preview_value({ ui: { count: 0 } }),
      path: preview_value(["ui", "count"]),
    },
    run: () => {
      const map = make_bridge_map({ ui: { count: 0 } });
      const tree = make_livetree_attr_target();

      const binding = bind_livetree_attr(map, ["ui", "count"], tree, "data-count");

      const rows = [equal_row("zero LiveTree attr", tree.attr.get("data-count"), "0")];
      binding.dispose();

      return { assertRows: rows };
    },
  };
}

function make_livetree_input_number_writeback_case(suite: string): TestCase {
  return {
    suite,
    name: "LiveTree input binding coerces numeric string back to number",
    meta: {
      input: preview_value({ form: { count: 1 } }),
      path: preview_value(["form", "count"]),
    },
    run: () => {
      const map = make_bridge_map({ form: { count: 1 } });
      const tree = make_livetree_input_target();

      const binding = bind_livetree_input_value(tree, map, ["form", "count"]);
      tree.form.setValue("42", { silent: true });
      emit_input(tree);

      const rows = [equal_row("numeric LiveTree input writeback", map.snap(), { form: { count: 42 } })];
      binding.dispose();

      return { assertRows: rows };
    },
  };
}

function make_livetree_input_boolean_writeback_case(suite: string): TestCase {
  return {
    suite,
    name: "LiveTree input binding coerces true string back to boolean",
    meta: {
      input: preview_value({ form: { enabled: false } }),
      path: preview_value(["form", "enabled"]),
    },
    run: () => {
      const map = make_bridge_map({ form: { enabled: false } });
      const tree = make_livetree_input_target();

      const binding = bind_livetree_input_value(tree, map, ["form", "enabled"]);
      tree.form.setValue("true", { silent: true });
      emit_input(tree);

      const rows = [equal_row("boolean LiveTree input writeback", map.snap(), { form: { enabled: true } })];
      binding.dispose();

      return { assertRows: rows };
    },
  };
}

function make_livetree_input_schema_reject_case(suite: string): TestCase {
  return {
    suite,
    name: "LiveTree input binding schema rejection leaves map value stable",
    meta: {
      input: preview_value({ form: { count: 1 } }),
      path: preview_value(["form", "count"]),
    },
    run: () => {
      const schema = hson.liveMap.schema.define((s) => ({
        form: {
          count: s.number,
        },
      }));
      const map = hson.liveMap.fromJson({ form: { count: 1 } }).schema.use(schema) as unknown as BridgeMap;
      const tree = make_livetree_input_target();

      const binding = bind_livetree_input_value(tree, map, ["form", "count"]);
      tree.form.setValue("not-a-number", { silent: true });

      let message = "";
      try {
        emit_input(tree);
      } catch (error) {
        message = error instanceof Error ? error.message : String(error);
      }

      const rows = [
        equal_row("schema rejection mentions number", message.includes("expected number"), true),
        equal_row("schema rejection keeps map stable", map.snap(), { form: { count: 1 } }),
      ];
      binding.dispose();

      return { assertRows: rows };
    },
  };
}

function make_livetree_input_dispose_writeback_case(suite: string): TestCase {
  return {
    suite,
    name: "LiveTree input binding disposer stops later input writeback",
    meta: {
      input: preview_value({ form: { name: "Ada" } }),
      path: preview_value(["form", "name"]),
    },
    run: () => {
      const map = make_bridge_map({ form: { name: "Ada" } });
      const tree = make_livetree_input_target();

      const binding = bind_livetree_input_value(tree, map, ["form", "name"]);
      binding.dispose();
      tree.form.setValue("Grace", { silent: true });
      emit_input(tree);

      return {
        assertRows: [equal_row("disposed LiveTree input does not write back", map.snap(), { form: { name: "Ada" } })],
      };
    },
  };
}

function make_livetree_text_fanout_case(suite: string): TestCase {
  return {
    suite,
    name: "LiveTree bridge fans one map path out to two text targets",
    meta: {
      input: preview_value({ ui: { label: "Ready" } }),
      path: preview_value(["ui", "label"]),
    },
    run: () => {
      const map = make_bridge_map({ ui: { label: "Ready" } });
      const first = make_livetree_text_target();
      const second = make_livetree_text_target();

      const firstBinding = bind_livetree_text(map, ["ui", "label"], first);
      const secondBinding = bind_livetree_text(map, ["ui", "label"], second);
      map.set(["ui", "label"], "Running");

      const rows = [
        equal_row("first text target receives fanout update", first.text.get(), "Running"),
        equal_row("second text target receives fanout update", second.text.get(), "Running"),
      ];
      firstBinding.dispose();
      secondBinding.dispose();

      return { assertRows: rows };
    },
  };
}

function make_livetree_input_to_text_loop_case(suite: string): TestCase {
  return {
    suite,
    name: "LiveTree input writeback updates subscribed text target",
    meta: {
      input: preview_value({ form: { name: "Ada" } }),
      path: preview_value(["form", "name"]),
    },
    run: () => {
      const map = make_bridge_map({ form: { name: "Ada" } });
      const input = make_livetree_input_target();
      const text = make_livetree_text_target();

      const inputBinding = bind_livetree_input_value(input, map, ["form", "name"]);
      const textBinding = bind_livetree_text(map, ["form", "name"], text);
      input.form.setValue("Grace", { silent: true });
      emit_input(input);

      const rows = [
        equal_row("input writeback updates map", map.snap(), { form: { name: "Grace" } }),
        equal_row("input writeback updates subscribed text", text.text.get(), "Grace"),
      ];
      inputBinding.dispose();
      textBinding.dispose();

      return { assertRows: rows };
    },
  };
}

function make_livetree_text_fanout_partial_dispose_case(suite: string): TestCase {
  return {
    suite,
    name: "LiveTree fanout disposing one text binding leaves the other active",
    meta: {
      input: preview_value({ ui: { label: "Ready" } }),
      path: preview_value(["ui", "label"]),
    },
    run: () => {
      const map = make_bridge_map({ ui: { label: "Ready" } });
      const first = make_livetree_text_target();
      const second = make_livetree_text_target();

      const firstBinding = bind_livetree_text(map, ["ui", "label"], first);
      const secondBinding = bind_livetree_text(map, ["ui", "label"], second);
      firstBinding.dispose();
      map.set(["ui", "label"], "Running");

      const rows = [
        equal_row("disposed fanout target remains at previous value", first.text.get(), "Ready"),
        equal_row("active fanout target receives later update", second.text.get(), "Running"),
      ];
      secondBinding.dispose();

      return { assertRows: rows };
    },
  };
}

function make_livetree_input_loop_repeated_writeback_case(suite: string): TestCase {
  return {
    suite,
    name: "LiveTree input loop handles repeated writeback without echo drift",
    meta: {
      input: preview_value({ form: { name: "Ada" } }),
      path: preview_value(["form", "name"]),
    },
    run: () => {
      const map = make_bridge_map({ form: { name: "Ada" } });
      const input = make_livetree_input_target();
      const text = make_livetree_text_target();

      const inputBinding = bind_livetree_input_value(input, map, ["form", "name"]);
      const textBinding = bind_livetree_text(map, ["form", "name"], text);

      input.form.setValue("Grace", { silent: true });
      emit_input(input);
      input.form.setValue("Hopper", { silent: true });
      emit_input(input);

      const rows = [
        equal_row("repeated input writeback leaves map at final value", map.snap(), { form: { name: "Hopper" } }),
        equal_row("repeated input writeback leaves input at final value", input.form.getValue(), "Hopper"),
        equal_row("repeated input writeback leaves text at final value", text.text.get(), "Hopper"),
      ];
      inputBinding.dispose();
      textBinding.dispose();

      return { assertRows: rows };
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
