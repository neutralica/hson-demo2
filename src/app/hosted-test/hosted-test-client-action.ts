import type { HostedTestRunRequest, HostedTestRunResult } from "./hosted-test-action.types";
import type { HostedTestSuiteId } from "./hosted-test-suite";

export async function run_hosted_test_action(
  client: Readonly<{ action: (name: "tests.run", payload: HostedTestRunRequest) => Promise<unknown> }>,
  suite: HostedTestSuiteId,
): Promise<HostedTestRunResult> {
  const response = await client.action("tests.run", { suite });
  if (typeof response !== "object" || response === null || (response as { type?: unknown }).type !== "ack") {
    throw new Error(`Hosted test action was rejected for ${suite}.`);
  }
  return (response as { result: HostedTestRunResult }).result;
}
