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
assert.ok(native && external && browser);
const selected = select_direct_report_executable_ids(discovered.catalog, [browser.id, external.id, native.id]);
const service = create_external_library_launcher_service();
const browserExecutor = create_playwright_browser_executor(service.processSupervisor);
const reporter = new LocalRunReporter(await mkdtemp(join(tmpdir(), "mixed-direct-report-")), { profile: "mixed-runtime", ids: selected });
try {
  const result = await run_node_selected_verifications(discovered.registry, discovered.catalog, discovered.external, selected, (event) => reporter.event(event), {}, { launcherService: service, browserExecutor });
  const report = await reporter.finalize();
  assert.equal(result.ok, true);
  assert.equal(report.status, "pass");
  const nativeSuite = report.suites.find((suite) => suite.id === native.suiteId)!;
  const externalSuite = report.suites.find((suite) => suite.id === external.id)!;
  const browserSuite = report.suites.find((suite) => suite.id === browser.suiteId)!;
  assert.equal(nativeSuite.cases[0]?.id, native.caseId);
  assert.ok(externalSuite.cases.length > 1);
  assert.equal(browserSuite.cases[0]?.id, browser.caseId);
  assert.equal(nativeSuite.category, native.subject);
  assert.equal(externalSuite.category, external.category);
  assert.equal(browserSuite.category, browser.subject);
  assert.equal(report.totals.cases, report.suites.reduce((total, suite) => total + suite.cases.length, 0));
  assert.equal(result.summary.cases, report.totals.cases);
  assert.equal(browserExecutor.metrics().activeProcesses, 0);
} finally {
  await browserExecutor.dispose();
  service.terminate();
}
console.log(JSON.stringify({ suite: "mixed-direct-report", checks: 12 }));
