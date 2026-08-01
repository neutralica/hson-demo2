import { performance } from "node:perf_hooks";
import { run_test_suites } from "../../harness/core/test-runner";
import type { TestSuite } from "../../harness/core/test-contracts";
import {
  all_jsdom_hosted_canvas_suites,
  JSDOM_HOSTED_CANVAS_DEFERRED_CASE_KEYS,
} from "../../harness/runtimes/dom/canvas/jsdom-hosted-canvas-suites";
import {
  HOSTED_CANVAS_MIGRATION_CASES,
  type HostedCanvasMigrationStatus,
} from "../../harness/runtimes/dom/hosted-dom-migration-inventory";
import { with_hosted_dom_runtime } from "../../harness/runtimes/dom/hosted-dom-mutex";
import { install_hosted_dom_runtime } from "../../harness/runtimes/dom/hosted-dom-runtime";
import { all_livetree_suites } from "../../suites/livetree/suite-registry";

function expect_collection(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`hosted canvas collection: ${message}`);
}

const canvasSuiteIds = new Set(HOSTED_CANVAS_MIGRATION_CASES.map((entry) => entry.suite));
const sourceSuites = all_livetree_suites().filter((suite) => canvasSuiteIds.has(suite.suite));
const sourceById = new Map(sourceSuites.map((suite) => [suite.suite, suite]));
const counts = new Map<HostedCanvasMigrationStatus, number>();
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;
console.log = () => undefined;
console.warn = () => undefined;
console.error = () => undefined;

try {
  for (const entry of HOSTED_CANVAS_MIGRATION_CASES) {
    const source = sourceById.get(entry.suite)?.cases[entry.sourceIndex];
    expect_collection(source?.name === entry.name, `missing declaration ${entry.suite}#${entry.sourceIndex}`);
    const isolated: TestSuite = Object.freeze({ suite: entry.suite, cases: Object.freeze([source]) });
    const result = await with_hosted_dom_runtime(() => run_test_suites([isolated], () => undefined, {
      yieldEveryCases: 0,
      yieldBetweenSuites: false,
    }));
    const shouldPass = entry.status.startsWith("MIGRATED_");
    expect_collection(result.ok === shouldPass, `${entry.suite}::${entry.name} disagrees with ${entry.status}`);
    if (!shouldPass) {
      expect_collection(result.summary.failures[0]?.err.includes("HOSTED_CANVAS_UNSUPPORTED") || result.summary.failures[0]?.err.includes("does not support getImageData"), `${entry.suite}::${entry.name} has an unstable deferred failure`);
    }
    counts.set(entry.status, (counts.get(entry.status) ?? 0) + 1);
  }
} finally {
  console.log = originalLog;
  console.warn = originalWarn;
  console.error = originalError;
}

expect_collection(HOSTED_CANVAS_MIGRATION_CASES.length === 69, "inventory classifies all 69 source declarations");
expect_collection(HOSTED_CANVAS_MIGRATION_CASES.filter((entry) => entry.duplicateDeclaration).length === 3, "three repeated source declarations are explicit");
expect_collection(counts.get("DEFERRED_PIXEL_OUTPUT") === 4, "four raster-readback declarations remain deferred");
expect_collection(!counts.has("UNKNOWN"), "no canvas declaration remains UNKNOWN");

const suites = all_jsdom_hosted_canvas_suites();
expect_collection(suites.length === 6, "canonical collection retains six suite identities");
expect_collection(suites.reduce((total, suite) => total + suite.cases.length, 0) === 62, "canonical collection contains 62 unique migratable cases");
expect_collection(JSDOM_HOSTED_CANVAS_DEFERRED_CASE_KEYS.length === 4, "four unique pixel cases are excluded rather than skipped");

let commandCount = 0;
let maximumCommandsPerCase = 0;
const installStarted = performance.now();
const measuredRuntime = install_hosted_dom_runtime();
const installMs = performance.now() - installStarted;
const cleanupStarted = performance.now();
measuredRuntime.dispose();
const cleanupMs = performance.now() - cleanupStarted;
const started = performance.now();
const direct = await with_hosted_dom_runtime((runtime) => run_test_suites(
  suites,
  (event) => {
    if (event.t === "suite_begin") runtime.reset_document();
    if (event.t === "case_begin") {
      runtime.geometry.clear_all_element_rects();
      runtime.canvas.clear_all_canvases();
    }
    if (event.t === "case_end") {
      const current = runtime.canvas.command_count();
      commandCount += current;
      maximumCommandsPerCase = Math.max(maximumCommandsPerCase, current);
    }
  },
  { yieldEveryCases: 0, yieldBetweenSuites: false },
));
const directMs = performance.now() - started;
expect_collection(direct.ok && direct.summary.cases === 62 && direct.summary.pass === 62 && direct.summary.fail === 0, "direct canonical collection passes 62/62");

originalLog(JSON.stringify({
  sourceDeclarations: 69,
  duplicateDeclarations: 3,
  canonicalCases: 66,
  migratedCases: 62,
  deferredCases: 4,
  counts: Object.fromEntries(counts),
  commandCount,
  maximumCommandsPerCase,
  installMs,
  cleanupMs,
  directMs,
}, null, 2));
