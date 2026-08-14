import { run_test_suites } from "../../harness/core/test-runner";
import {
  all_phase3b_cancellation_suites,
  phase3b_cancellation_measurement,
} from "../../suites/livehost/phase3b-cancellation-suite";

const result = await run_test_suites(all_phase3b_cancellation_suites(), (event) => {
  if (event.t === "case_end" && event.status === "fail") {
    process.stderr.write(`${event.suite}::${event.caseId}: ${event.err ?? "failed"}\n`);
  }
}, { yieldEveryCases: 1 });

if (!result.ok) {
  throw new Error(`Phase 3B cancellation certificate failed ${result.summary.fail}/${result.summary.cases} cases.`);
}

console.log(JSON.stringify({
  suites: result.summary.suites,
  checks: result.summary.cases,
  pass: result.summary.pass,
  fail: result.summary.fail,
  largeCancellation: phase3b_cancellation_measurement(),
}));
