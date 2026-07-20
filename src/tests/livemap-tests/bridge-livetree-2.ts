// bridge-livetree-suite-2.ts

import { hson } from "hson-live";
import {
  render_livemap_controls_snap,
} from "../../../../hson-live/src/api/livemap/livemap.bridge";
import type { JsonValue } from "../../../../hson-live/src/core/types";
import type { LiveMap } from "../../../../hson-live/src/types/livemap.types";
import type { TestCase, TestSuite } from "../../app/demos/test/tests.types";
import { equal_row, preview_value } from "./test-helpers";
import type { LiveControlViewBridgeTarget, LiveInputListenerResult } from "../../../../hson-live/src/types/bridge.types";

type BridgeMap = LiveMap;
type LiveTreeControlViewTarget = LiveControlViewBridgeTarget &
  Readonly<{
    content: LiveControlViewBridgeTarget["content"] &
      Readonly<{
        deep: () => readonly unknown[];
      }>;
  }>;

// Test-only event shim. Real bridge code should rely on LiveTree listener results.
const TEST_INPUT_LISTENERS = new WeakMap<object, () => void>();
const TEST_GENERATED_INPUTS = new WeakMap<object, LiveTreeControlViewTarget[]>();

export function livemap_suites_bridge_livetree_controls(): TestSuite {
  const SUITE = "livemap/bridge-livetree-controls";

  return {
    suite: SUITE,
    cases: [
      make_controls_snap_string_writeback_case(SUITE),
      make_controls_snap_number_writeback_case(SUITE),
      make_controls_snap_nested_writeback_case(SUITE),
      make_controls_snap_dispose_case(SUITE),
      make_controls_snap_markup_attrs_case(SUITE),
      make_controls_snap_binding_count_case(SUITE),
      make_controls_snap_boolean_writeback_case(SUITE),
      make_controls_snap_rerender_replaces_inputs_case(SUITE),
      make_controls_snap_rerender_after_dispose_ignores_old_input_case(SUITE),
      make_controls_snap_dotted_keys_preserve_internal_path_case(SUITE),
      make_controls_snap_number_nonfinite_falls_back_to_text_case(SUITE),
    ] as const,
  };
}

function make_control_view_target(): LiveTreeControlViewTarget {
  const tree = hson.liveTree.create.div() as unknown as LiveTreeControlViewTarget;
  const inputs: LiveTreeControlViewTarget[] = [];
  const wrapped = wrap_control_target(tree, inputs);
  TEST_GENERATED_INPUTS.set(wrapped as object, inputs);
  return wrapped;
}

function wrap_control_target(
  tree: LiveTreeControlViewTarget,
  inputs: LiveTreeControlViewTarget[],
): LiveTreeControlViewTarget {
  let wrapped: LiveTreeControlViewTarget;

  wrapped = new Proxy(tree as object, {
    get: (target, prop, receiver) => {
      if (prop === "create") {
        return {
          ...tree.create,
          div: () => wrap_control_target(tree.create.div() as unknown as LiveTreeControlViewTarget, inputs),
          tag: (tag: string) => {
            const child = wrap_control_target(tree.create.tag(tag) as unknown as LiveTreeControlViewTarget, inputs);
            if (tag === "input") inputs.push(child);
            return child;
          },
        };
      }

      if (prop === "listen") {
        return {
          onInput: (listener: () => void) => {
            TEST_INPUT_LISTENERS.set(wrapped as object, listener);
            const result = tree.listen.onInput(listener);

            return {
              count: result.count,
              ok: result.ok,
              off: () => {
                result.off();
                TEST_INPUT_LISTENERS.delete(wrapped as object);
              },
            } satisfies LiveInputListenerResult;
          },
        };
      }

      return Reflect.get(target, prop, receiver);
    },
  }) as LiveTreeControlViewTarget;

  return wrapped;
}

function emit_input(tree: object): void {
  const listener = TEST_INPUT_LISTENERS.get(tree);
  if (listener === undefined) throw new Error("No test input listener registered.");
  listener();
}
function emit_input_if_registered(tree: object): void {
  TEST_INPUT_LISTENERS.get(tree)?.();
}

function first_control_input(tree: LiveTreeControlViewTarget): LiveTreeControlViewTarget {
  const match = TEST_GENERATED_INPUTS.get(tree as object)?.[0];
  if (match === undefined) throw new Error("Expected generated control input.");
  return match;
}

function control_input_by_path(tree: LiveTreeControlViewTarget, path: string): LiveTreeControlViewTarget {
  const match = TEST_GENERATED_INPUTS.get(tree as object)?.find((input) => input.attrs.get("data-livemap-control-path") === path);
  if (match === undefined) throw new Error(`Expected generated control input for path ${path}.`);
  return match;
}

function generated_inputs(tree: LiveTreeControlViewTarget): readonly LiveTreeControlViewTarget[] {
  return TEST_GENERATED_INPUTS.get(tree as object) ?? [];
}

function clear_generated_inputs(tree: LiveTreeControlViewTarget): void {
  const inputs = TEST_GENERATED_INPUTS.get(tree as object);
  if (inputs !== undefined) inputs.length = 0;
}

function make_bridge_map(value: JsonValue): BridgeMap {
  return hson.liveMap.fromJson(value) as unknown as BridgeMap;
}

function make_controls_snap_string_writeback_case(suite: string): TestCase {
  return {
    suite,
    name: "LiveTree generated string control writes back to LiveMap",
    meta: {
      input: preview_value({ ui: { label: "Ready" } }),
      path: preview_value(["ui", "label"]),
    },
    run: () => {
      const map = make_bridge_map({ ui: { label: "Ready" } });
      const tree = make_control_view_target();
      const binding = render_livemap_controls_snap(map, tree, ["ui", "label"]);
      const input = first_control_input(tree);

      input.form.setValue("Running", { silent: true });
      emit_input(input as object);

      const rows = [
        equal_row("generated string control input type", input.attrs.get("type"), "text"),
        equal_row("generated string control path", input.attrs.get("data-livemap-control-path"), "ui.label"),
        equal_row("generated string control writes back", map.snap(), { ui: { label: "Running" } }),
      ];
      binding.dispose();

      return { assertRows: rows };
    },
  };
}

function make_controls_snap_number_writeback_case(suite: string): TestCase {
  return {
    suite,
    name: "LiveTree generated number control preserves numeric writeback",
    meta: {
      input: preview_value({ count: 1 }),
      path: preview_value(["count"]),
    },
    run: () => {
      const map = make_bridge_map({ count: 1 });
      const tree = make_control_view_target();
      const binding = render_livemap_controls_snap(map, tree, ["count"]);
      const input = first_control_input(tree);

      input.form.setValue("2", { silent: true });
      emit_input(input as object);

      const rows = [
        equal_row("generated number control input type", input.attrs.get("type"), "number"),
        equal_row("generated number control writes number", map.snap(), { count: 2 }),
      ];
      binding.dispose();

      return { assertRows: rows };
    },
  };
}

function make_controls_snap_nested_writeback_case(suite: string): TestCase {
  return {
    suite,
    name: "LiveTree generated nested control writes to correct path",
    meta: {
      input: preview_value({ ui: { panel: { label: "Ready" } } }),
      path: preview_value(["ui"]),
    },
    run: () => {
      const map = make_bridge_map({ ui: { panel: { label: "Ready" } } });
      const tree = make_control_view_target();
      const binding = render_livemap_controls_snap(map, tree, ["ui"]);
      const input = control_input_by_path(tree, "ui.panel.label");

      input.form.setValue("Running", { silent: true });
      emit_input(input as object);

      const rows = [
        equal_row("generated nested control writes correct path", map.snap(), { ui: { panel: { label: "Running" } } }),
      ];
      binding.dispose();

      return { assertRows: rows };
    },
  };
}

function make_controls_snap_dispose_case(suite: string): TestCase {
  return {
    suite,
    name: "LiveTree generated control dispose prevents later writeback",
    meta: {
      input: preview_value({ ui: { label: "Ready" } }),
      path: preview_value(["ui", "label"]),
    },
    run: () => {
      const map = make_bridge_map({ ui: { label: "Ready" } });
      const tree = make_control_view_target();
      const binding = render_livemap_controls_snap(map, tree, ["ui", "label"]);
      const input = first_control_input(tree);

      binding.dispose();
      input.form.setValue("Running", { silent: true });
      emit_input_if_registered(input as object);

      return {
        assertRows: [
          equal_row("disposed generated control leaves map unchanged", map.snap(), { ui: { label: "Ready" } }),
        ],
      };
    },
  };
}

function make_controls_snap_markup_attrs_case(suite: string): TestCase {
  return {
    suite,
    name: "LiveTree generated controls expose structural attrs",
    meta: {
      input: preview_value({ ui: { label: "Ready" } }),
      path: preview_value(["ui"]),
    },
    run: () => {
      const map = make_bridge_map({ ui: { label: "Ready" } });
      const tree = make_control_view_target();
      const binding = render_livemap_controls_snap(map, tree, ["ui"]);
      const input = control_input_by_path(tree, "ui.label");
      const html = tree.content.markup.innerHTML;

      const rows = [
        equal_row("generated control root kind", tree.attrs.get("data-livemap-control-kind"), "object"),
        equal_row("generated control root path", tree.attrs.get("data-livemap-control-path"), "ui"),
        equal_row("generated control markup includes key row", html.includes('data-livemap-control-key="label"'), true),
        equal_row("generated control input role", input.attrs.get("data-livemap-control-role"), "input"),
        equal_row("generated control input kind", input.attrs.get("data-livemap-control-kind"), "string"),
        equal_row("generated control input path", input.attrs.get("data-livemap-control-path"), "ui.label"),
      ];
      binding.dispose();

      return { assertRows: rows };
    },
  };
}

function make_controls_snap_binding_count_case(suite: string): TestCase {
  return {
    suite,
    name: "LiveTree generated controls return one binding per primitive leaf",
    meta: {
      input: preview_value({ ui: { label: "Ready", count: 1, nested: { enabled: true } } }),
      path: preview_value(["ui"]),
    },
    run: () => {
      const map = make_bridge_map({ ui: { label: "Ready", count: 1, nested: { enabled: true } } });
      const tree = make_control_view_target();
      const binding = render_livemap_controls_snap(map, tree, ["ui"]);

      const rows = [
        equal_row("generated primitive input count", generated_inputs(tree).length, 3),
        equal_row("generated primitive binding count", binding.bindings.length, 3),
        equal_row("generated string primitive exists", control_input_by_path(tree, "ui.label").attrs.get("data-livemap-control-kind"), "string"),
        equal_row("generated number primitive exists", control_input_by_path(tree, "ui.count").attrs.get("data-livemap-control-kind"), "number"),
        equal_row("generated boolean primitive exists", control_input_by_path(tree, "ui.nested.enabled").attrs.get("data-livemap-control-kind"), "boolean"),
      ];
      binding.dispose();

      return { assertRows: rows };
    },
  };
}

function make_controls_snap_boolean_writeback_case(suite: string): TestCase {
  return {
    suite,
    name: "LiveTree generated boolean control writes back to LiveMap",
    meta: {
      input: preview_value({ enabled: true }),
      path: preview_value(["enabled"]),
    },
    run: () => {
      const map = make_bridge_map({ enabled: true });
      const tree = make_control_view_target();
      const binding = render_livemap_controls_snap(map, tree, ["enabled"]);
      const input = first_control_input(tree);

      if (input.form.setChecked === undefined || input.form.getChecked === undefined) {
        throw new Error("Generated boolean control does not expose checked form helpers.");
      }

      input.form.setChecked(false, { silent: true });
      emit_input(input as object);

      const rows = [
        equal_row("generated boolean control input type", input.attrs.get("type"), "checkbox"),
        equal_row("generated boolean control kind", input.attrs.get("data-livemap-control-kind"), "boolean"),
        equal_row("generated boolean control writes boolean", map.snap(), { enabled: false }),
      ];
      binding.dispose();

      return { assertRows: rows };
    },
  };
}

function make_controls_snap_rerender_replaces_inputs_case(suite: string): TestCase {
  return {
    suite,
    name: "LiveTree generated controls rerender replaces generated inputs",
    meta: {
      input: preview_value({ ui: { label: "Ready" } }),
      path: preview_value(["ui"]),
    },
    run: () => {
      const map = make_bridge_map({ ui: { label: "Ready" } });
      const tree = make_control_view_target();
      const firstBinding = render_livemap_controls_snap(map, tree, ["ui"]);
      const firstInput = control_input_by_path(tree, "ui.label");

      firstBinding.dispose();
      clear_generated_inputs(tree);
      const secondMap = make_bridge_map({ ui: { count: 1 } });
      const secondBinding = render_livemap_controls_snap(secondMap, tree, ["ui"]);
      const secondInput = control_input_by_path(tree, "ui.count");

      const rows = [
        equal_row("rerender generated controls latest input kind", secondInput.attrs.get("data-livemap-control-kind"), "number"),
        equal_row("rerender generated controls latest input type", secondInput.attrs.get("type"), "number"),
        equal_row("rerender generated controls binding count", secondBinding.bindings.length, 1),
        equal_row("rerender generated controls replaces markup", tree.content.markup.innerHTML.includes('data-livemap-control-key="label"'), false),
        equal_row("rerender generated controls old input remains detached", firstInput.attrs.get("data-livemap-control-path"), "ui.label"),
      ];
      secondBinding.dispose();

      return { assertRows: rows };
    },
  };
}

function make_controls_snap_rerender_after_dispose_ignores_old_input_case(suite: string): TestCase {
  return {
    suite,
    name: "LiveTree generated controls rerender disposed old input does not write back",
    meta: {
      input: preview_value({ ui: { label: "Ready" } }),
      path: preview_value(["ui"]),
    },
    run: () => {
      const map = make_bridge_map({ ui: { label: "Ready" } });
      const tree = make_control_view_target();
      const firstBinding = render_livemap_controls_snap(map, tree, ["ui"]);
      const firstInput = control_input_by_path(tree, "ui.label");

      firstBinding.dispose();
      clear_generated_inputs(tree);
      map.set(["ui", "label"], "Running");
      const secondBinding = render_livemap_controls_snap(map, tree, ["ui"]);
      const secondInput = control_input_by_path(tree, "ui.label");

      firstInput.form.setValue("Stale", { silent: true });
      emit_input_if_registered(firstInput as object);
      secondInput.form.setValue("Fresh", { silent: true });
      emit_input(secondInput as object);

      const rows = [
        equal_row("rerender old disposed input does not write back", map.snap(), { ui: { label: "Fresh" } }),
      ];
      secondBinding.dispose();

      return { assertRows: rows };
    },
  };
}

function make_controls_snap_dotted_keys_preserve_internal_path_case(suite: string): TestCase {
  return {
    suite,
    name: "LiveTree generated controls preserve internal paths for dotted keys",
    meta: {
      input: preview_value({ "ui.panel": { "label.text": "Ready" } }),
      path: preview_value(["ui.panel"]),
    },
    run: () => {
      const map = make_bridge_map({ "ui.panel": { "label.text": "Ready" } });
      const tree = make_control_view_target();
      const binding = render_livemap_controls_snap(map, tree, ["ui.panel"]);
      const input = first_control_input(tree);

      input.form.setValue("Running", { silent: true });
      emit_input(input as object);

      const rows = [
        equal_row("dotted key control readable path is dotted", input.attrs.get("data-livemap-control-path"), "ui.panel.label.text"),
        equal_row("dotted key control writes exact internal path", map.snap(), { "ui.panel": { "label.text": "Running" } }),
        equal_row("dotted key control does not create nested ui key", map.snap(["ui"]), undefined),
        equal_row("dotted key control does not create nested label key", map.snap(["ui.panel", "label"]), undefined),
      ];
      binding.dispose();

      return { assertRows: rows };
    },
  };
}

function make_controls_snap_number_nonfinite_falls_back_to_text_case(suite: string): TestCase {
  return {
    suite,
    name: "LiveTree generated number control falls back to text on non-finite input",
    meta: {
      input: preview_value({ count: 1 }),
      invalid: preview_value("abc"),
    },
    run: () => {
      const map = make_bridge_map({ count: 1 });
      const tree = make_control_view_target();
      const binding = render_livemap_controls_snap(map, tree, ["count"]);
      const input = first_control_input(tree);

      input.form.setValue("abc", { silent: true });
      emit_input(input as object);

      const rows = [
        equal_row("schema-blind number control remains number input", input.attrs.get("type"), "number"),
        equal_row("schema-blind number non-finite write falls back to text", map.snap(), { count: "abc" }),
        equal_row("schema-blind number non-finite write does not mark invalid", input.attrs.get("data-livemap-control-valid"), undefined),
        equal_row("schema-blind number non-finite write does not set error", input.attrs.get("data-livemap-control-error"), undefined),
      ];
      binding.dispose();

      return { assertRows: rows };
    },
  };
}
