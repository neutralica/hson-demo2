// schema-suite-2.ts

import { hson } from "hson-live";
import {
  render_livemap_schema_controls_snap,
} from "../../../../hson-live/src/api/livemap/bridge";
import type { JsonValue } from "../../../../hson-live/src/core/types";
import type { LiveMap } from "../../../../hson-live/src/types/livemap.types";
import type { TestCase, TestSuite } from "../../app/demos/test/tests.types";
import { equal_row, preview_value } from "./test-helpers";
import type { LiveControlViewBridgeTarget, LiveInputListenerResult, LiveMapSchemaControlSpec } from "../../../../hson-live/src/api/livemap/bridge.types";

type BridgeMap = LiveMap;
type LiveTreeControlViewTarget = LiveControlViewBridgeTarget &
  Readonly<{
    content: LiveControlViewBridgeTarget["content"];
  }>;

const TEST_INPUT_LISTENERS = new WeakMap<object, () => void>();
const TEST_GENERATED_INPUTS = new WeakMap<object, LiveTreeControlViewTarget[]>();

export function livemap_suites_schema_validation_controls(): TestSuite {
  const SUITE = "livemap/schema-validation-controls";

  return {
    suite: SUITE,
    cases: [
      make_schema_number_max_rejects_writeback_case(SUITE),
      make_schema_number_min_rejects_writeback_case(SUITE),
      make_schema_number_valid_after_invalid_clears_error_case(SUITE),
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
  if (match === undefined) throw new Error("Expected generated schema validation control.");
  return match;
}

function make_bridge_map(value: JsonValue): BridgeMap {
  return hson.liveMap.fromJson(value) as unknown as BridgeMap;
}

function make_number_schema(min: number, max: number): LiveMapSchemaControlSpec {
  return {
    count: {
      kind: "number",
      min,
      max,
      step: 1,
      label: "Count",
    },
  };
}

function make_schema_number_max_rejects_writeback_case(suite: string): TestCase {
  return {
    suite,
    name: "Schema number validation rejects values above max",
    meta: {
      input: preview_value({ count: 5 }),
      schema: preview_value(make_number_schema(0, 10)),
      invalid: preview_value(12),
    },
    run: () => {
      const map = make_bridge_map({ count: 5 });
      const tree = make_control_view_target();
      const binding = render_livemap_schema_controls_snap(map, tree, make_number_schema(0, 10));
      const input = first_schema_control(tree);

      input.form.setValue("12", { silent: true });
      emit_input(input as object);

      const rows = [
        equal_row("schema max rejection leaves map unchanged", map.snap(), { count: 5 }),
        equal_row("schema max rejection marks control invalid", input.attr.get("data-livemap-control-valid"), "false"),
        equal_row("schema max rejection stores error", input.attr.get("data-livemap-control-error"), "Expected number <= 10"),
      ];
      binding.dispose();

      return { assertRows: rows };
    },
  };
}

function make_schema_number_min_rejects_writeback_case(suite: string): TestCase {
  return {
    suite,
    name: "Schema number validation rejects values below min",
    meta: {
      input: preview_value({ count: 5 }),
      schema: preview_value(make_number_schema(0, 10)),
      invalid: preview_value(-1),
    },
    run: () => {
      const map = make_bridge_map({ count: 5 });
      const tree = make_control_view_target();
      const binding = render_livemap_schema_controls_snap(map, tree, make_number_schema(0, 10));
      const input = first_schema_control(tree);

      input.form.setValue("-1", { silent: true });
      emit_input(input as object);

      const rows = [
        equal_row("schema min rejection leaves map unchanged", map.snap(), { count: 5 }),
        equal_row("schema min rejection marks control invalid", input.attr.get("data-livemap-control-valid"), "false"),
        equal_row("schema min rejection stores error", input.attr.get("data-livemap-control-error"), "Expected number >= 0"),
      ];
      binding.dispose();

      return { assertRows: rows };
    },
  };
}

function make_schema_number_valid_after_invalid_clears_error_case(suite: string): TestCase {
  return {
    suite,
    name: "Schema number validation clears error after valid input",
    meta: {
      input: preview_value({ count: 5 }),
      schema: preview_value(make_number_schema(0, 10)),
      invalid: preview_value(12),
      valid: preview_value(7),
    },
    run: () => {
      const map = make_bridge_map({ count: 5 });
      const tree = make_control_view_target();
      const binding = render_livemap_schema_controls_snap(map, tree, make_number_schema(0, 10));
      const input = first_schema_control(tree);

      input.form.setValue("12", { silent: true });
      emit_input(input as object);
      input.form.setValue("7", { silent: true });
      emit_input(input as object);

      const rows = [
        equal_row("schema valid recovery writes number", map.snap(), { count: 7 }),
        equal_row("schema valid recovery marks control valid", input.attr.get("data-livemap-control-valid"), "true"),
        equal_row("schema valid recovery clears error", input.attr.get("data-livemap-control-error"), undefined),
      ];
      binding.dispose();

      return { assertRows: rows };
    },
  };
}
