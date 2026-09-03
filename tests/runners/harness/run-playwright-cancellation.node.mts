import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { make_frozen_test_evidence_client } from "../../../src/app/demos/tests/panel/frozen-test-evidence-client";
import type { TestEvent } from "../../harness/core/test-contracts";
import { LocalRunReporter } from "../../harness/reporting/local/run-reporter";
import { create_playwright_browser_executor } from "../../harness/runtimes/node/browser/playwright-browser-executor";
import type { NodeProcessSupervisor } from "../../harness/runtimes/node/node-process-supervisor";
import { discover_direct_report_executables } from "../../harness/runtimes/node/direct-report-discovery";
import { create_external_library_launcher_service } from "../../harness/runtimes/node/external-library-launchers";

const wait_until = async (predicate: () => boolean, timeoutMs: number): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) { if (Date.now() >= deadline) throw new Error("PLAYWRIGHT_CANCELLATION_START_TIMEOUT"); await new Promise((resolve) => setTimeout(resolve, 20)); }
};
const discovery = await discover_direct_report_executables();
const selected = discovery.catalog.tests.find((entry) => entry.suiteId === "livedemo/browser/towl-direct-entry");
assert.ok(selected);
const service = create_external_library_launcher_service();
const executor = create_playwright_browser_executor(service.processSupervisor);
const controller = new AbortController();
const events: TestEvent[] = [];
const reportRoot = await mkdtemp(join(tmpdir(), "hson-playwright-cancellation-"));
const reporter = new LocalRunReporter(reportRoot, { profile: "playwright-cancellation", ids: [selected.id] });
try {
  const pending = executor.run(discovery.catalog, [selected.id], (event) => { events.push(event); reporter.event(event); }, { signal: controller.signal });
  await wait_until(() => executor.metrics().activeJourneys === 1, 30_000);
  controller.abort();
  const result = await pending;
  assert.equal(result.ok, false);
  assert.equal(result.cancelled, true);
  assert.deepEqual(result.totals, { suites: 1, cases: 1, pass: 0, fail: 0, skip: 0, unsupported: 0, cancelled: 1, error: 0 });
  const terminals = events.filter((event) => event.t === "case_end" || event.t === "case_cancelled");
  assert.equal(terminals.length, 1, "reporter interruption and supervisor cancellation produce one terminal case result");
  assert.equal(terminals[0]?.t, "case_cancelled");
  const report = await reporter.finalize();
  assert.equal(report.status, "cancelled");
  assert.deepEqual(report.totals, { suites: 1, cases: 1, pass: 0, fail: 0, skip: 0, unsupported: 0, cancelled: 1, error: 0 });
  assert.equal(report.suites[0]?.cases[0]?.id, selected.caseId);
  assert.equal(report.suites[0]?.cases[0]?.status, "cancelled");
  const runDir = join(reportRoot, ".test-reports", report.id);
  const persisted = JSON.parse(await readFile(join(runDir, "run.json"), "utf8"));
  assert.equal(persisted.suites[0].cases[0].status, "cancelled");
  const site = join(runDir, "site");
  const client = make_frozen_test_evidence_client({
    root: `/test-evidence/${report.id}`,
    fetch: async (url) => {
      const relative = url.slice(`/test-evidence/${report.id}/`.length);
      try { return { ok: true, status: 200, text: async () => readFile(join(site, relative), "utf8") }; }
      catch { return { ok: false, status: 404, text: async () => "missing" }; }
    },
  });
  const index = await client.loadIndex();
  const category = await client.loadCategory(index.categories[0]!);
  const suite = category.suites[0]!;
  const listing = await client.loadSuite(suite);
  const testCase = listing.cases[0]!;
  const detail = await client.loadRowEvidence({ suite, testCase, reference: testCase.evidence });
  assert.equal(index.status, "cancelled");
  assert.equal(testCase.status, "cancelled");
  assert.equal(detail.status, "cancelled");
  assert.equal(executor.metrics().activeProcesses, 0);
  assert.equal(executor.metrics().activeJourneys, 0);
  assert.equal(executor.metrics().cancellations, 1);
  assert.equal(executor.metrics().serverSettlementFailures, 0);
} finally {
  await executor.dispose();
  service.terminate();
  await rm(reportRoot, { recursive: true, force: true });
}
assert.equal(executor.metrics().retainedArtifactRoots, 0);

const cancelledBeforeStart = Object.freeze({
  stdout: "", stderr: "", stdoutBytes: 0, stderrBytes: 0, stdoutTruncated: false, stderrTruncated: false,
  exitCode: null, signal: "SIGTERM" as const, durationMs: 0, timedOut: false, cancelled: true,
  outputLimitExceeded: false, forceKilled: false, ok: false,
});
const preCaseSupervisor: NodeProcessSupervisor = Object.freeze({
  start: () => Object.freeze({ result: Promise.resolve(cancelledBeforeStart), terminate: () => undefined }),
  dispose: () => undefined,
  generation: () => 0,
  metrics: () => Object.freeze({ activeChildren: 0, maximumObservedConcurrentChildren: 0 }),
  resetMetrics: () => undefined,
});
const preCaseExecutor = create_playwright_browser_executor(preCaseSupervisor);
const preCaseEvents: TestEvent[] = [];
try {
  const result = await preCaseExecutor.run(discovery.catalog, [selected.id], (event) => preCaseEvents.push(event));
  assert.equal(result.cancelled, true);
  assert.deepEqual(result.totals, { suites: 1, cases: 0, pass: 0, fail: 0, skip: 0, unsupported: 0, cancelled: 0, error: 0 });
  assert.equal(preCaseEvents.some((event) => event.t === "case_begin" || event.t === "case_end" || event.t === "case_cancelled"), false);
  const preCaseReporter = new LocalRunReporter(reportRoot);
  for (const event of preCaseEvents) preCaseReporter.event(event);
  const suites = preCaseReporter.adapter.finalize();
  assert.equal(suites[0]?.status, "cancelled");
  assert.equal(suites[0]?.cases.length, 0);
} finally {
  await preCaseExecutor.dispose();
}

const missingTerminalResult = Object.freeze({
  ...cancelledBeforeStart,
  exitCode: 1,
  signal: null,
  cancelled: false,
});
const missingTerminalSupervisor: NodeProcessSupervisor = Object.freeze({
  ...preCaseSupervisor,
  start: () => Object.freeze({ result: Promise.resolve(missingTerminalResult), terminate: () => undefined }),
});
const missingTerminalExecutor = create_playwright_browser_executor(missingTerminalSupervisor);
const missingTerminalEvents: TestEvent[] = [];
try {
  const result = await missingTerminalExecutor.run(discovery.catalog, [selected.id], (event) => missingTerminalEvents.push(event));
  assert.deepEqual(result.totals, { suites: 1, cases: 1, pass: 0, fail: 0, skip: 0, unsupported: 0, cancelled: 0, error: 1 });
  const terminal = missingTerminalEvents.filter((event) => event.t === "case_end" || event.t === "case_cancelled");
  assert.equal(terminal.length, 1);
  assert.equal(terminal[0]?.t, "case_end");
  assert.equal(terminal[0]?.t === "case_end" ? terminal[0].status : undefined, "error");
} finally {
  await missingTerminalExecutor.dispose();
}

console.log(JSON.stringify({ suite: "playwright-cancellation", checks: 31 }));
