import { run_test_suites } from "../../harness/core/test-runner";
import { format_cli_test_result } from "../../harness/reporting/format-cli-test-result";
import { towl_room_suite } from "../../suites/towl/towl-room-suite";

const result = await run_test_suites([towl_room_suite()], () => undefined);
if (!result.ok) {
  for (const failure of result.failures) console.error(failure);
  process.exitCode = 1;
}
console.log(format_cli_test_result("TOWL rooms", result));
