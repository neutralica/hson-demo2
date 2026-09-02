import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LocalRunReporter } from "../../harness/reporting/local/run-reporter";
import { create_playwright_browser_executor } from "../../harness/runtimes/node/browser/playwright-browser-executor";
import { discover_direct_report_executables, select_direct_report_executable_ids } from "../../harness/runtimes/node/direct-report-discovery";
import { create_external_library_launcher_service } from "../../harness/runtimes/node/external-library-launchers";
import { run_node_selected_verifications } from "../../harness/runtimes/node/run-node-selected-verifications";

const discovered = await discover_direct_report_executables();
const native = discovered.catalog.tests.find((entry) => entry.id === "unit/test-harness::elapsed-budget-yields-between-fast-cases");
const external = discovered.external.targets.find((entry) => entry.launcherId === "core.hson-number");
const browser = discovered.catalog.tests.find((entry) => entry.suiteId === "livedemo/browser/small-state-surfaces");
assert.ok(native && external && browser, "mixed proof requires one executable from each runtime");
const selectedIds = select_direct_report_executable_ids(discovered.catalog, [browser.id, external.id, native.id]);
assert.deepEqual(selectedIds, select_direct_report_executable_ids(discovered.catalog, [native.id, browser.id, external.id]), "selection order derives from executable discovery");

const baseService = create_external_library_launcher_service();
const launcherService = Object.freeze({
  async run(...args: Parameters<typeof baseService.run>) {
    const result = await baseService.run(...args);
    return Object.freeze({ ...result, completion: Object.freeze({ version: 1 as const, launcherId: result.target.launcherId, executed: 999_999, passed: 0, failed: 999_999 }) });
  },
  runCommand: baseService.runCommand,
  terminationGeneration: baseService.terminationGeneration,
});
const browserExecutor = create_playwright_browser_executor(baseService.processSupervisor);
const reportRoot = await mkdtemp(join(tmpdir(), "hson-phase2b-mixed-"));
const reporter = new LocalRunReporter(reportRoot, { profile: "phase-2b-mixed", ids: selectedIds });
try {
  const result = await run_node_selected_verifications(
    discovered.registry, discovered.catalog, discovered.external, selectedIds,
    (event) => reporter.event(event), {}, { launcherService, browserExecutor },
  );
  const report = await reporter.finalize();
  assert.equal(result.ok, true); assert.equal(report.status, "pass"); assert.equal(report.suites.length, 3);
  const nativeReport = report.suites.find((suite) => suite.id === native.suiteId)!;
  const externalReport = report.suites.find((suite) => suite.id === external.id)!;
  const browserReport = report.suites.find((suite) => suite.id === browser.suiteId)!;
  assert.equal(nativeReport.cases.length, 1); assert.equal(nativeReport.cases[0]?.id, native.caseId);
  assert.ok(externalReport.cases.length > 1, "external case_end records are inspectable child cases");
  assert.equal(browserReport.cases.length, 1); assert.equal(browserReport.cases[0]?.id, browser.caseId);
  assert.equal(nativeReport.category, native.subject);
  assert.equal(externalReport.category, external.category);
  assert.equal(browserReport.category, browser.subject);
  const actualCases = nativeReport.cases.length + externalReport.cases.length + browserReport.cases.length;
  assert.equal(report.totals.cases, actualCases); assert.equal(result.summary.cases, actualCases);
  assert.notEqual(externalReport.cases.length, 999_999, "legacy aggregate completion is not reconciled with real cases");
  console.log(JSON.stringify({ certificate: "phase2b-mixed-direct-report", selectedIds, totals: report.totals, categories: report.suites.map((suite) => suite.category), externalCases: externalReport.cases.length }));
} finally {
  await browserExecutor.dispose();
  baseService.terminate();
}
