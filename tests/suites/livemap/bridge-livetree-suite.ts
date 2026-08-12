// bridge-livetree-suite.ts

import { hson } from "hson-live";
import {
  render_livemap_snap,
  render_livemap_snap_view,
} from "../../../../hson-live/dist/api/livemap/livemap.bridge";
import type { JsonValue, LiveMap, LivePath } from "hson-live/types";
import type { TestCase, TestSuite } from "../../harness/core/test-contracts";
import { equal_row, preview_value } from "./test-helpers";
import { bind_livetree_text, bind_livetree_attr, bind_livetree_input_value } from "../../../../hson-live/dist/api/livemap/livemap.bridge-bindings";
import type { LiveAttrBridgeTarget, LiveInputBridgeTarget, LiveInputListenerResult, LiveSnapViewBridgeTarget, LiveTextBridgeTarget } from "../../../../hson-live/dist/types/bridge.types";

type BridgeMap = LiveMap;
type LiveTreeTextTarget = LiveTextBridgeTarget;
type LiveTreeAttrTarget = LiveAttrBridgeTarget;
type LiveTreeInputTarget = LiveInputBridgeTarget;
type LiveTreeSnapViewTarget = LiveSnapViewBridgeTarget;


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
      make_livetree_snap_view_primitive_case(SUITE),
      make_livetree_snap_view_object_case(SUITE),
      make_livetree_snap_view_array_case(SUITE),
      make_livetree_snap_view_rerender_case(SUITE),
      make_livetree_snap_view_nested_object_paths_case(SUITE),
      make_livetree_snap_view_nested_array_paths_case(SUITE),
      make_livetree_snap_view_null_case(SUITE),
      make_livetree_snap_view_empty_containers_case(SUITE),
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

function make_livetree_snap_view_target(): LiveTreeSnapViewTarget {
  return hson.liveTree.create.div() as unknown as LiveTreeSnapViewTarget;
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
        } satisfies LiveInputListenerResult;
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

      const binding = bind_livetree_text(map.at(["ui", "label"]), tree);

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

      const binding = bind_livetree_text(map.at(["ui", "label"]), tree);
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

      const binding = bind_livetree_text(map.at(["ui", "label"]), tree);
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

      const binding = bind_livetree_attr(map.at(["ui", "tone"]), tree, "data-tone");

      const rows = [equal_row("initial LiveTree attr", tree.attrs.get("data-tone"), "active")];
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

      const binding = bind_livetree_attr(map.at(["ui", "enabled"]), tree, "data-enabled");
      const initial = tree.attrs.get("data-enabled");
      map.set(["ui", "enabled"], false);

      const rows = [
        equal_row("initial LiveTree truthy attr", initial, "true"),
        equal_row("false removes LiveTree attr", tree.attrs.get("data-enabled"), undefined),
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

      const binding = bind_livetree_input_value(tree, map.at(["form", "name"]));

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

      const binding = bind_livetree_input_value(tree, map.at(["form", "name"]));
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

      const binding = bind_livetree_input_value(tree, map.at(["form", "name"]));
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

function make_livetree_snap_view_primitive_case(suite: string): TestCase {
  return {
    suite,
    name: "LiveTree snap view renders primitive kind and text",
    meta: {
      input: preview_value({ ui: { label: "Ready" } }),
      path: preview_value(["ui", "label"]),
    },
    run: () => {
      const map = make_bridge_map({ ui: { label: "Ready" } });
      const tree = make_livetree_snap_view_target();

      render_livemap_snap_view(map, tree, ["ui", "label"]);

      return {
        assertRows: [
          equal_row("primitive snap view kind", tree.attrs.get("data-livemap-snap-kind"), "string"),
          equal_row("primitive snap view path", tree.attrs.get("data-livemap-snap-path"), "ui.label"),
          equal_row("primitive snap view text", tree.text.get(), "Ready"),
        ],
      };
    },
  };
}

function make_livetree_snap_view_object_case(suite: string): TestCase {
  return {
    suite,
    name: "LiveTree snap view renders object key/value rows",
    meta: {
      input: preview_value({ ui: { label: "Ready", enabled: true } }),
      path: preview_value(["ui"]),
    },
    run: () => {
      const map = make_bridge_map({ ui: { label: "Ready", enabled: true } });
      const tree = make_livetree_snap_view_target();

      render_livemap_snap_view(map, tree, ["ui"]);
      const html = tree.content.markup.innerHTML;

      return {
        assertRows: [
          equal_row("object snap view kind", tree.attrs.get("data-livemap-snap-kind"), "object"),
          equal_row("object snap view includes label key", html.includes('data-livemap-snap-key="label"'), true),
          equal_row("object snap view includes enabled key", html.includes('data-livemap-snap-key="enabled"'), true),
          equal_row("object snap view includes Ready value", html.includes("Ready"), true),
          equal_row("object snap view includes true value", html.includes("true"), true),
        ],
      };
    },
  };
}

function make_livetree_snap_view_array_case(suite: string): TestCase {
  return {
    suite,
    name: "LiveTree snap view renders array index/value rows",
    meta: {
      input: preview_value({ items: ["one", "two"] }),
      path: preview_value(["items"]),
    },
    run: () => {
      const map = make_bridge_map({ items: ["one", "two"] });
      const tree = make_livetree_snap_view_target();

      render_livemap_snap_view(map, tree, ["items"]);
      const html = tree.content.markup.innerHTML;

      return {
        assertRows: [
          equal_row("array snap view kind", tree.attrs.get("data-livemap-snap-kind"), "array"),
          equal_row("array snap view includes index 0", html.includes('data-livemap-snap-index="0"'), true),
          equal_row("array snap view includes index 1", html.includes('data-livemap-snap-index="1"'), true),
          equal_row("array snap view includes first value", html.includes("one"), true),
          equal_row("array snap view includes second value", html.includes("two"), true),
        ],
      };
    },
  };
}

function make_livetree_snap_view_rerender_case(suite: string): TestCase {
  return {
    suite,
    name: "LiveTree snap view rerender clears previous static structure",
    meta: {
      input: preview_value({ ui: { label: "Ready" } }),
      path: preview_value(["ui"]),
    },
    run: () => {
      const map = make_bridge_map({ ui: { label: "Ready" } });
      const tree = make_livetree_snap_view_target();

      render_livemap_snap_view(map, tree, ["ui"]);
      map.set(["ui"], { label: "Running" });
      render_livemap_snap_view(map, tree, ["ui"]);
      const html = tree.content.markup.innerHTML;

      return {
        assertRows: [
          equal_row("rerendered snap view includes latest value", html.includes("Running"), true),
          equal_row("rerendered snap view clears old value", html.includes("Ready"), false),
        ],
      };
    },
  };
}

function make_livetree_snap_view_nested_object_paths_case(suite: string): TestCase {
  return {
    suite,
    name: "LiveTree snap view preserves nested object paths",
    meta: {
      input: preview_value({ ui: { panel: { label: "Ready" } } }),
      path: preview_value(["ui"]),
    },
    run: () => {
      const map = make_bridge_map({ ui: { panel: { label: "Ready" } } });
      const tree = make_livetree_snap_view_target();

      render_livemap_snap_view(map, tree, ["ui"]);
      const html = tree.content.markup.innerHTML;

      return {
        assertRows: [
          equal_row("nested object root path", tree.attrs.get("data-livemap-snap-path"), "ui"),
          equal_row("nested object includes panel path", html.includes('data-livemap-snap-path="ui.panel"'), true),
          equal_row("nested object includes label path", html.includes('data-livemap-snap-path="ui.panel.label"'), true),
          equal_row("nested object includes leaf value", html.includes("Ready"), true),
        ],
      };
    },
  };
}

function make_livetree_snap_view_nested_array_paths_case(suite: string): TestCase {
  return {
    suite,
    name: "LiveTree snap view preserves nested array paths",
    meta: {
      input: preview_value({ ui: { items: [{ label: "One" }, { label: "Two" }] } }),
      path: preview_value(["ui"]),
    },
    run: () => {
      const map = make_bridge_map({ ui: { items: [{ label: "One" }, { label: "Two" }] } });
      const tree = make_livetree_snap_view_target();

      render_livemap_snap_view(map, tree, ["ui"]);
      const html = tree.content.markup.innerHTML;

      return {
        assertRows: [
          equal_row("nested array includes items path", html.includes('data-livemap-snap-path="ui.items"'), true),
          equal_row("nested array includes first item path", html.includes('data-livemap-snap-path="ui.items.0"'), true),
          equal_row("nested array includes first label path", html.includes('data-livemap-snap-path="ui.items.0.label"'), true),
          equal_row("nested array includes second label path", html.includes('data-livemap-snap-path="ui.items.1.label"'), true),
        ],
      };
    },
  };
}

function make_livetree_snap_view_null_case(suite: string): TestCase {
  return {
    suite,
    name: "LiveTree snap view renders null as null kind with empty text",
    meta: {
      input: preview_value({ ui: { value: null } }),
      path: preview_value(["ui", "value"]),
    },
    run: () => {
      const map = make_bridge_map({ ui: { value: null } });
      const tree = make_livetree_snap_view_target();

      render_livemap_snap_view(map, tree, ["ui", "value"]);

      return {
        assertRows: [
          equal_row("null snap view kind", tree.attrs.get("data-livemap-snap-kind"), "null"),
          equal_row("null snap view path", tree.attrs.get("data-livemap-snap-path"), "ui.value"),
          equal_row("null snap view text", tree.text.get(), ""),
        ],
      };
    },
  };
}

function make_livetree_snap_view_empty_containers_case(suite: string): TestCase {
  return {
    suite,
    name: "LiveTree snap view renders empty object and array kinds without child rows",
    meta: {
      input: preview_value({ emptyObject: {}, emptyArray: [] }),
    },
    run: () => {
      const objectMap = make_bridge_map({ emptyObject: {} });
      const objectTree = make_livetree_snap_view_target();
      const arrayMap = make_bridge_map({ emptyArray: [] });
      const arrayTree = make_livetree_snap_view_target();

      render_livemap_snap_view(objectMap, objectTree, ["emptyObject"]);
      render_livemap_snap_view(arrayMap, arrayTree, ["emptyArray"]);

      return {
        assertRows: [
          equal_row("empty object snap view kind", objectTree.attrs.get("data-livemap-snap-kind"), "object"),
          equal_row(
            "empty object has no key rows",
            objectTree.content.markup.innerHTML.includes("data-livemap-snap-key"),
            false,
          ),
          equal_row("empty array snap view kind", arrayTree.attrs.get("data-livemap-snap-kind"), "array"),
          equal_row(
            "empty array has no index rows",
            arrayTree.content.markup.innerHTML.includes("data-livemap-snap-index"),
            false,
          ),
        ],
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

      const binding = bind_livetree_attr(map.at(["ui", "count"]), tree, "data-count");

      const rows = [equal_row("zero LiveTree attr", tree.attrs.get("data-count"), "0")];
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

      const binding = bind_livetree_input_value(tree, map.at(["form", "count"]));
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

      const binding = bind_livetree_input_value(tree, map.at(["form", "enabled"]));
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

      const binding = bind_livetree_input_value(tree, map.at(["form", "count"]));
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

      const binding = bind_livetree_input_value(tree, map.at(["form", "name"]));
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

      const firstBinding = bind_livetree_text(map.at(["ui", "label"]), first);
      const secondBinding = bind_livetree_text(map.at(["ui", "label"]), second);
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

      const inputBinding = bind_livetree_input_value(input, map.at(["form", "name"]));
      const textBinding = bind_livetree_text(map.at(["form", "name"]), text);
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

      const firstBinding = bind_livetree_text(map.at(["ui", "label"]), first);
      const secondBinding = bind_livetree_text(map.at(["ui", "label"]), second);
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

      const inputBinding = bind_livetree_input_value(input, map.at(["form", "name"]));
      const textBinding = bind_livetree_text(map.at(["form", "name"]), text);

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
