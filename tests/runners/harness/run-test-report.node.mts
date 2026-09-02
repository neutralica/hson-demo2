import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { LocalRunReporter } from "../../harness/reporting/local/run-reporter";
import { make_local_node_locus_executor_registry } from "../../harness/runtimes/node/livehost-node-executor";
import { run_node_selected_test_ids } from "../../harness/runtimes/node/run-node-selected-test-suites";
import { select_test_descriptors, type TestSelection } from "../../../src/shared/testing/test-selection";
import type { TestSubject } from "../../../src/shared/testing/test-contracts";
function args(argv: readonly string[]): TestSelection { const selection: { subject?: TestSubject; suite?: string; test?: string } = {}; for (let i = 0; i < argv.length; i += 2) { const value = argv[i + 1]; if (!value) throw new Error("Usage: test:report [--subject subject] [--suite suite] [--test suite::case]"); if (argv[i] === "--subject") selection.subject = value as TestSubject; else if (argv[i] === "--suite") selection.suite = value; else if (argv[i] === "--test") selection.test = value; else throw new Error("Usage: test:report [--subject subject] [--suite suite] [--test suite::case]"); } return selection; }
const registry = make_local_node_locus_executor_registry(); const selection = args(process.argv.slice(2)); const selected = select_test_descriptors(registry.catalog.tests, selection); if (!selected.length) throw new Error("Test report selection matched no tests.");
const reporter = new LocalRunReporter(resolve("."), { profile: null, ids: selected.map((s) => s.id) });
try { const result = await run_node_selected_test_ids(registry, selected.map((s) => s.id), (event) => reporter.event(event), { yieldEveryCases: 0, yieldBetweenSuites: false }); const report = await reporter.finalize(); console.log(JSON.stringify({ runId: report.id, status: report.status, totals: report.totals })); if (!result.ok) process.exitCode = 1; } catch (error) { const report = await reporter.finalize(); console.error(error); console.log(JSON.stringify({ runId: report.id, status: report.status })); process.exitCode = 1; }
