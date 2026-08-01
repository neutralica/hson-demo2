import { run_test_suites } from "../../harness/core/test-runner";
import { all_towl_suites } from "../../suites/towl/suite-registry";

const result = await run_test_suites(all_towl_suites(), () => undefined);
if (!result.ok) {
  for (const failure of result.summary.failures) console.error(failure);
  process.exitCode = 1;
} else {
  console.log(`TOWL: ${result.summary.pass}/${result.summary.cases} passed across ${result.summary.suites} suites.`);
}
