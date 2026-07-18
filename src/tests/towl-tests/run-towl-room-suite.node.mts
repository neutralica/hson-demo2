import { run_test_suites } from "../../hosted-test/test-runner";
import { towl_room_suite } from "./towl-room-suite";

const result = await run_test_suites([towl_room_suite()], () => undefined);
if (!result.ok) {
  for (const failure of result.summary.failures) console.error(failure);
  process.exitCode = 1;
} else {
  console.log(`TOWL rooms: ${result.summary.pass}/${result.summary.cases} passed.`);
}
