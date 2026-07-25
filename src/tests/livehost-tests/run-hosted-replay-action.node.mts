import { run_test_suites } from "../../hosted-test/test-runner";
import { hosted_replay_action_in_memory_suite } from "./hosted-replay-action-in-memory-suite";

const result = await run_test_suites([hosted_replay_action_in_memory_suite()], () => undefined, {
  yieldEveryCases: 0,
  yieldBetweenSuites: false,
});
if (!result.ok) throw new Error(result.summary.failures.map((failure) => failure.err).join("\n"));
console.log("hosted replay action: ok");
