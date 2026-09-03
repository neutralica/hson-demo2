import type { RunOptions, RunResult, TestEvent, TestSuite } from "../../core/test-contracts";
import type { TestFailure } from "../../../../src/shared/testing/test-contracts";
import { empty_totals, TERMINAL_STATUSES } from "../../../../src/shared/testing/test-run-contract";
import type { TestExecutorRegistry } from "../../core/test-executor";
import {
  NODE_LIVEHOST_HOSTED_TEST_EXECUTOR,
  make_local_node_locus_executor_registry,
  make_node_livehost_hosted_test_executor_registry,
} from "./livehost-node-executor";
import { test_catalog_version } from "../../../../src/shared/testing/test-catalog-contract";
import { selected_test_suites } from "../../core/test-selected-run";
import { run_test_suites } from "../../core/test-runner";
import { with_hosted_dom_runtime, with_hosted_node_globals } from "../dom/hosted-dom-mutex";

type SelectedRuntime = "node" | "synthetic-dom";
type SelectedGroup = Readonly<{ runtime: SelectedRuntime; suites: readonly TestSuite[] }>;

function runtime_for(suite: TestSuite): SelectedRuntime {
  return suite.descriptor?.requirements.includes("synthetic-dom") ? "synthetic-dom" : "node";
}

export function plan_node_selected_test_suites(
  registry: TestExecutorRegistry,
  selectionIds: readonly string[],
): readonly SelectedGroup[] {
  const suites = selected_test_suites(registry, selectionIds);
  const groups: { runtime: SelectedRuntime; suites: TestSuite[] }[] = [];
  for (const suite of suites) {
    const runtime = runtime_for(suite);
    const last = groups.at(-1);
    if (last?.runtime === runtime) last.suites.push(suite);
    else groups.push({ runtime, suites: [suite] });
  }
  return Object.freeze(groups.map((group) => Object.freeze({
    runtime: group.runtime,
    suites: Object.freeze(group.suites),
  })));
}

function combine(results: readonly RunResult[], startedAt: number): RunResult {
  const failures: readonly TestFailure[] = Object.freeze(results.flatMap((result) => result.failures));
  const totals = { ...empty_totals() };
  totals.suites = results.reduce((total, result) => total + result.totals.suites, 0);
  totals.cases = results.reduce((total, result) => total + result.totals.cases, 0);
  for (const status of TERMINAL_STATUSES) {
    totals[status] = results.reduce((total, result) => total + result.totals[status], 0);
  }
  const cancelled = results.some((result) => result.cancelled === true);
  return Object.freeze({
    ok: !cancelled && totals.fail === 0 && totals.error === 0,
    totals: Object.freeze(totals),
    failures,
    durationMs: performance.now() - startedAt,
    ...(cancelled ? { cancelled: true as const } : {}),
  });
}

export async function run_node_selected_test_ids(
  registry: TestExecutorRegistry,
  selectionIds: readonly string[],
  onEvent: (event: TestEvent) => void = () => undefined,
  options: RunOptions = {},
): Promise<RunResult> {
  const startedAt = performance.now();
  const results: RunResult[] = [];
  for (const group of plan_node_selected_test_suites(registry, selectionIds)) {
    if (group.runtime === "node") {
      results.push(await with_hosted_node_globals(() => run_test_suites(group.suites, onEvent, options)));
      continue;
    }
    try {
      results.push(await with_hosted_dom_runtime((runtime) => run_test_suites(
        group.suites,
        (event) => {
          if (event.t === "suite_begin") runtime.reset_document();
          if (event.t === "case_begin") {
            runtime.geometry.clear_all_element_rects();
            runtime.canvas.clear_all_canvases();
          }
          onEvent(event);
        },
        options,
      )));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`HOSTED_TEST_SYNTHETIC_DOM_RUNTIME_FAILURE: ${message}`, { cause: error });
    }
  }
  return combine(results, startedAt);
}

export async function run_fresh_node_selected_test_ids(
  advertisedRegistry: TestExecutorRegistry,
  selectionIds: readonly string[],
  onEvent: (event: TestEvent) => void = () => undefined,
  options: RunOptions = {},
): Promise<RunResult> {
  const registry = advertisedRegistry.executor.id === NODE_LIVEHOST_HOSTED_TEST_EXECUTOR.id
    ? make_node_livehost_hosted_test_executor_registry()
    : make_local_node_locus_executor_registry();
  const advertisedIds = advertisedRegistry.catalog.tests.map((test) => test.id);
  const freshIds = registry.catalog.tests.map((test) => test.id);
  if (
    advertisedRegistry.executor.id !== registry.executor.id
    || test_catalog_version(advertisedRegistry.catalog) !== test_catalog_version(registry.catalog)
    || advertisedIds.length !== freshIds.length
    || advertisedIds.some((id, index) => id !== freshIds[index])
  ) {
    throw new Error("HOSTED_TEST_EXECUTOR_CONFIGURATION_INVALID: fresh Node registry differs from advertised catalog");
  }
  return run_node_selected_test_ids(registry, selectionIds, onEvent, options);
}
