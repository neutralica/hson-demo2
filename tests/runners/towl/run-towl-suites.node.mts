import { run_test_suites } from "../../harness/core/test-runner";
import { format_cli_test_result } from "../../harness/reporting/format-cli-test-result";
import { all_towl_suites } from "../../suites/towl/suite-registry";

const result = await run_test_suites(all_towl_suites(), () => undefined);
if (!result.ok) {
  for (const failure of result.failures) console.error(failure);
  process.exitCode = 1;
}
console.log(format_cli_test_result("TOWL", result));
