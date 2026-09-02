import { resolve } from "node:path";
import { LocalRunReporter } from "../../harness/reporting/local/run-reporter";
import { create_external_library_launcher_service } from "../../harness/runtimes/node/external-library-launchers";
import { create_playwright_browser_executor } from "../../harness/runtimes/node/browser/playwright-browser-executor";
import { discover_direct_report_executables, select_direct_report_ids } from "../../harness/runtimes/node/direct-report-discovery";
import { run_node_selected_verifications } from "../../harness/runtimes/node/run-node-selected-verifications";
import type { TestSelection } from "../../../src/shared/testing/test-selection";
import type { TestSubject } from "../../../src/shared/testing/test-contracts";

function args(argv: readonly string[]): TestSelection {
  const selection: { subject?: TestSubject; suite?: string; test?: string } = {};
  for (let index = 0; index < argv.length; index += 2) {
    const value = argv[index + 1];
    if (!value) throw new Error("Usage: test:report [--subject subject] [--suite suite] [--test suite::case]");
    if (argv[index] === "--subject") selection.subject = value as TestSubject;
    else if (argv[index] === "--suite") selection.suite = value;
    else if (argv[index] === "--test") selection.test = value;
    else throw new Error("Usage: test:report [--subject subject] [--suite suite] [--test suite::case]");
  }
  return selection;
}

const discovered = await discover_direct_report_executables();
const selectedIds = select_direct_report_ids(discovered.catalog, args(process.argv.slice(2)));
if (selectedIds.length === 0) throw new Error("Test report selection matched no executable tests.");
const reporter = new LocalRunReporter(resolve("."), { profile: null, ids: selectedIds });
const launcherService = create_external_library_launcher_service();
const browserExecutor = create_playwright_browser_executor(launcherService.processSupervisor);
try {
  const result = await run_node_selected_verifications(
    discovered.registry, discovered.catalog, discovered.external, selectedIds,
    (event) => reporter.event(event), { yieldEveryCases: 0, yieldBetweenSuites: false },
    { launcherService, browserExecutor },
  );
  const report = await reporter.finalize();
  console.log(JSON.stringify({ runId: report.id, status: report.status, totals: report.totals }));
  if (!result.ok) process.exitCode = 1;
} catch (error) {
  const report = await reporter.finalize();
  console.error(error); console.log(JSON.stringify({ runId: report.id, status: report.status })); process.exitCode = 1;
} finally {
  await browserExecutor.dispose();
  launcherService.terminate();
}
