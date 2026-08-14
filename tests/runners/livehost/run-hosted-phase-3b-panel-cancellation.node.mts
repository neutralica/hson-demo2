import { run_test_suites } from "../../harness/core/test-runner";
import { phase3b_panel_cancellation_suite } from "../../suites/livehost/phase3b-panel-cancellation-suite";

const result = await run_test_suites([phase3b_panel_cancellation_suite()], (event) => {
  if (event.t === "case_end" && event.status === "fail") process.stderr.write(`${event.err ?? "failed"}\n`);
}, { yieldEveryCases: 1 });

if (!result.ok) throw new Error(`Phase 3B panel cancellation failed ${result.summary.fail}/${result.summary.cases} cases.`);
console.log(JSON.stringify({ suites: result.summary.suites, checks: result.summary.cases, pass: result.summary.pass }));
