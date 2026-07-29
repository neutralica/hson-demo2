// generated-control-suite.ts

import { hson } from "hson-live";
import type { JsonValue, LiveMap } from "hson-live/types";
import type { TestCase, TestSuite } from "../../app/demos/test/tests.types";
import { equal_row, preview_value } from "./test-helpers";
import {
  render_livemap_schema_controls_snap,
} from "../../../../hson-live/dist/api/livemap/livemap.bridge";
import type { LiveControlViewBridgeTarget, LiveInputListenerResult, LiveMapSchemaControlSpec } from "../../../../hson-live/dist/types/bridge.types";

type BridgeMap = LiveMap;
type LiveTreeControlViewTarget = LiveControlViewBridgeTarget &
  Readonly<{
    content: LiveControlViewBridgeTarget["content"];
  }>;

const TEST_INPUT_LISTENERS = new WeakMap<object, () => void>();
const TEST_GENERATED_INPUTS = new WeakMap<object, LiveTreeControlViewTarget[]>();

export function livemap_suites_schema_controls(): TestSuite {
  const SUITE = "livemap/schema-controls";

  return {
    suite: SUITE,
    cases: [
      make_schema_control_label_case(SUITE),
      make_schema_control_number_attrs_case(SUITE),
      make_schema_control_enum_select_case(SUITE),
      make_schema_control_boolean_checkbox_case(SUITE),
      make_schema_control_nested_dotted_schema_path_case(SUITE),
      make_schema_control_missing_schema_fallback_case(SUITE),
      make_schema_control_binding_count_case(SUITE),
      make_schema_control_rerender_uses_latest_schema_case(SUITE),
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
            if (tag === "input" || tag === "select") inputs.push(child);
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

function first_schema_control(tree: LiveTreeControlViewTarget): LiveTreeControlViewTarget {
  const match = TEST_GENERATED_INPUTS.get(tree as object)?.[0];
  if (match === undefined) throw new Error("Expected generated schema control.");
  return match;
}

function schema_control_by_path(tree: LiveTreeControlViewTarget, path: string): LiveTreeControlViewTarget {
  const match = TEST_GENERATED_INPUTS.get(tree as object)?.find((input) => input.attrs.get("data-livemap-control-path") === path);
  if (match === undefined) throw new Error(`Expected generated schema control for path ${path}.`);
  return match;
}

function generated_schema_controls(tree: LiveTreeControlViewTarget): readonly LiveTreeControlViewTarget[] {
  return TEST_GENERATED_INPUTS.get(tree as object) ?? [];
}

function clear_generated_schema_controls(tree: LiveTreeControlViewTarget): void {
  const inputs = TEST_GENERATED_INPUTS.get(tree as object);
  if (inputs !== undefined) inputs.length = 0;
}

function make_bridge_map(value: JsonValue): BridgeMap {
  return hson.liveMap.fromJson(value) as unknown as BridgeMap;
}

function make_schema_control_label_case(suite: string): TestCase {
  return {
    suite,
    name: "Schema generated controls render label and description metadata",
    meta: {
      input: preview_value({ title: "Ready" }),
      schema: preview_value({ title: { label: "Title", description: "Displayed heading" } }),
    },
    run: () => {
      const map = make_bridge_map({ title: "Ready" });
      const tree = make_control_view_target();
      const schema: LiveMapSchemaControlSpec = {
        title: {
          label: "Title",
          description: "Displayed heading",
        },
      };
      const binding = render_livemap_schema_controls_snap(map, tree, schema);
      const input = schema_control_by_path(tree, "title");
      const html = tree.content.markup.innerHTML;

      const rows = [
        equal_row("schema control renders input path", input.attrs.get("data-livemap-control-path"), "title"),
        equal_row("schema control carries label attr", input.attrs.get("data-livemap-control-label"), "Title"),
        equal_row("schema control carries description attr", input.attrs.get("data-livemap-control-description"), "Displayed heading"),
        equal_row("schema control markup includes label text", html.includes("Title"), true),
        equal_row("schema control markup includes description text", html.includes("Displayed heading"), true),
      ];
      binding.dispose();

      return { assertRows: rows };
    },
  };
}

function make_schema_control_number_attrs_case(suite: string): TestCase {
  return {
    suite,
    name: "Schema generated number controls render numeric constraint attrs",
    meta: {
      input: preview_value({ count: 1 }),
      schema: preview_value({ count: { kind: "number", min: 0, max: 10, step: 1 } }),
    },
    run: () => {
      const map = make_bridge_map({ count: 1 });
      const tree = make_control_view_target();
      const schema: LiveMapSchemaControlSpec = {
        count: {
          kind: "number",
          min: 0,
          max: 10,
          step: 1,
        },
      };
      const binding = render_livemap_schema_controls_snap(map, tree, schema);
      const input = first_schema_control(tree);

      input.form.setValue("7", { silent: true });
      emit_input(input as object);

      const rows = [
        equal_row("schema number control type", input.attrs.get("type"), "number"),
        equal_row("schema number control min", input.attrs.get("min"), "0"),
        equal_row("schema number control max", input.attrs.get("max"), "10"),
        equal_row("schema number control step", input.attrs.get("step"), "1"),
        equal_row("schema number control writes number", map.snap(), { count: 7 }),
      ];
      binding.dispose();

      return { assertRows: rows };
    },
  };
}

function make_schema_control_enum_select_case(suite: string): TestCase {
  return {
    suite,
    name: "Schema generated enum controls render select and write back",
    meta: {
      input: preview_value({ mode: "draft" }),
      schema: preview_value({ mode: { kind: "enum", choices: ["draft", "published"] } }),
    },
    run: () => {
      const map = make_bridge_map({ mode: "draft" });
      const tree = make_control_view_target();
      const schema: LiveMapSchemaControlSpec = {
        mode: {
          kind: "enum",
          choices: ["draft", "published"],
        },
      };
      const binding = render_livemap_schema_controls_snap(map, tree, schema);
      const select = first_schema_control(tree);
      const html = tree.content.markup.innerHTML;

      select.form.setValue("published", { silent: true });
      emit_input(select as object);

      const rows = [
        equal_row("schema enum control role", select.attrs.get("data-livemap-control-role"), "select"),
        equal_row("schema enum control kind", select.attrs.get("data-livemap-control-kind"), "enum"),
        equal_row("schema enum markup includes first option", html.includes("draft"), true),
        equal_row("schema enum markup includes second option", html.includes("published"), true),
        equal_row("schema enum control writes value", map.snap(), { mode: "published" }),
      ];
      binding.dispose();

      return { assertRows: rows };
    },
  };
}

function make_schema_control_boolean_checkbox_case(suite: string): TestCase {
  return {
    suite,
    name: "Schema generated boolean controls preserve checkbox writeback",
    meta: {
      input: preview_value({ enabled: true }),
      schema: preview_value({ enabled: { kind: "boolean", label: "Enabled" } }),
    },
    run: () => {
      const map = make_bridge_map({ enabled: true });
      const tree = make_control_view_target();
      const schema: LiveMapSchemaControlSpec = {
        enabled: {
          kind: "boolean",
          label: "Enabled",
        },
      };
      const binding = render_livemap_schema_controls_snap(map, tree, schema);
      const input = first_schema_control(tree);

      if (input.form.setChecked === undefined || input.form.getChecked === undefined) {
        throw new Error("Generated schema boolean control does not expose checked form helpers.");
      }

      input.form.setChecked(false, { silent: true });
      emit_input(input as object);

      const rows = [
        equal_row("schema boolean control type", input.attrs.get("type"), "checkbox"),
        equal_row("schema boolean control label", input.attrs.get("data-livemap-control-label"), "Enabled"),
        equal_row("schema boolean control writes boolean", map.snap(), { enabled: false }),
      ];
      binding.dispose();

      return { assertRows: rows };
    },
  };
}

function make_schema_control_nested_dotted_schema_path_case(suite: string): TestCase {
  return {
    suite,
    name: "Schema generated controls use dotted schema paths for nested values",
    meta: {
      input: preview_value({ ui: { count: 1 } }),
      schema: preview_value({ "ui.count": { kind: "number", label: "Count", min: 0, max: 10 } }),
    },
    run: () => {
      const map = make_bridge_map({ ui: { count: 1 } });
      const tree = make_control_view_target();
      const schema: LiveMapSchemaControlSpec = {
        "ui.count": {
          kind: "number",
          label: "Count",
          min: 0,
          max: 10,
        },
      };
      const binding = render_livemap_schema_controls_snap(map, tree, schema);
      const input = schema_control_by_path(tree, "ui.count");

      input.form.setValue("7", { silent: true });
      emit_input(input as object);

      const rows = [
        equal_row("nested dotted schema control type", input.attrs.get("type"), "number"),
        equal_row("nested dotted schema control label", input.attrs.get("data-livemap-control-label"), "Count"),
        equal_row("nested dotted schema control min", input.attrs.get("min"), "0"),
        equal_row("nested dotted schema control max", input.attrs.get("max"), "10"),
        equal_row("nested dotted schema control writes number", map.snap(), { ui: { count: 7 } }),
      ];
      binding.dispose();

      return { assertRows: rows };
    },
  };
}

function make_schema_control_missing_schema_fallback_case(suite: string): TestCase {
  return {
    suite,
    name: "Schema generated controls fall back when schema node is missing",
    meta: {
      input: preview_value({ ui: { label: "Ready", count: 1 } }),
      schema: preview_value({ count: { kind: "number", min: 0 } }),
    },
    run: () => {
      const map = make_bridge_map({ ui: { label: "Ready", count: 1 } });
      const tree = make_control_view_target();
      const schema: LiveMapSchemaControlSpec = {
        count: {
          kind: "number",
          min: 0,
        },
      };
      const binding = render_livemap_schema_controls_snap(map, tree, schema, ["ui"]);
      const labelInput = schema_control_by_path(tree, "ui.label");
      const countInput = schema_control_by_path(tree, "ui.count");

      labelInput.form.setValue("Running", { silent: true });
      emit_input(labelInput as object);
      countInput.form.setValue("2", { silent: true });
      emit_input(countInput as object);

      const rows = [
        equal_row("missing schema string fallback type", labelInput.attrs.get("type"), "text"),
        equal_row("missing schema string fallback kind", labelInput.attrs.get("data-livemap-control-kind"), "string"),
        equal_row("existing schema number type", countInput.attrs.get("type"), "number"),
        equal_row("existing schema number min", countInput.attrs.get("min"), "0"),
        equal_row("schema fallback writes both values", map.snap(), { ui: { label: "Running", count: 2 } }),
      ];
      binding.dispose();

      return { assertRows: rows };
    },
  };
}

function make_schema_control_binding_count_case(suite: string): TestCase {
  return {
    suite,
    name: "Schema generated controls return one binding per primitive leaf",
    meta: {
      input: preview_value({ ui: { label: "Ready", count: 1, enabled: true } }),
      schema: preview_value({
        "ui.label": { label: "Label" },
        "ui.count": { kind: "number", min: 0 },
        "ui.enabled": { kind: "boolean", label: "Enabled" },
      }),
    },
    run: () => {
      const map = make_bridge_map({ ui: { label: "Ready", count: 1, enabled: true } });
      const tree = make_control_view_target();
      const schema: LiveMapSchemaControlSpec = {
        "ui.label": { label: "Label" },
        "ui.count": { kind: "number", min: 0 },
        "ui.enabled": { kind: "boolean", label: "Enabled" },
      };
      const binding = render_livemap_schema_controls_snap(map, tree, schema, ["ui"]);

      const rows = [
        equal_row("schema generated control count", generated_schema_controls(tree).length, 3),
        equal_row("schema generated binding count", binding.bindings.length, 3),
        equal_row("schema generated label control exists", schema_control_by_path(tree, "ui.label").attrs.get("data-livemap-control-label"), "Label"),
        equal_row("schema generated number control exists", schema_control_by_path(tree, "ui.count").attrs.get("type"), "number"),
        equal_row("schema generated boolean control exists", schema_control_by_path(tree, "ui.enabled").attrs.get("type"), "checkbox"),
      ];
      binding.dispose();

      return { assertRows: rows };
    },
  };
}

function make_schema_control_rerender_uses_latest_schema_case(suite: string): TestCase {
  return {
    suite,
    name: "Schema generated controls rerender uses latest schema metadata",
    meta: {
      input: preview_value({ count: 1 }),
      schema: preview_value({ count: { kind: "number", label: "First", min: 0 } }),
    },
    run: () => {
      const map = make_bridge_map({ count: 1 });
      const tree = make_control_view_target();
      const firstSchema: LiveMapSchemaControlSpec = {
        count: {
          kind: "number",
          label: "First",
          min: 0,
        },
      };
      const firstBinding = render_livemap_schema_controls_snap(map, tree, firstSchema);
      const firstInput = first_schema_control(tree);

      firstBinding.dispose();
      clear_generated_schema_controls(tree);

      const secondSchema: LiveMapSchemaControlSpec = {
        count: {
          kind: "number",
          label: "Second",
          min: 5,
          max: 10,
        },
      };
      const secondBinding = render_livemap_schema_controls_snap(map, tree, secondSchema);
      const secondInput = first_schema_control(tree);

      const rows = [
        equal_row("schema rerender old input label remains detached", firstInput.attrs.get("data-livemap-control-label"), "First"),
        equal_row("schema rerender latest input label", secondInput.attrs.get("data-livemap-control-label"), "Second"),
        equal_row("schema rerender latest min", secondInput.attrs.get("min"), "5"),
        equal_row("schema rerender latest max", secondInput.attrs.get("max"), "10"),
        equal_row("schema rerender latest markup", tree.content.markup.innerHTML.includes("Second"), true),
        equal_row("schema rerender clears old markup", tree.content.markup.innerHTML.includes("First"), false),
      ];
      secondBinding.dispose();

      return { assertRows: rows };
    },
  };
}
