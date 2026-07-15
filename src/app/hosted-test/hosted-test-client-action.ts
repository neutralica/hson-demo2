import type { HostedTestCaseDiagnostic, HostedTestInspectRequest, HostedTestRunRequest, HostedTestRunResult } from "./hosted-test-action.types";
import type { HostedTestSuiteId } from "./hosted-test-suite";
import { decode_hosted_test_action_error } from "./hosted-test-action-error";

export async function run_hosted_test_action(
  client: Readonly<{ action: (name: "tests.run", payload: HostedTestRunRequest) => Promise<unknown> }>,
  suite: HostedTestSuiteId,
): Promise<HostedTestRunResult> {
  const response = await client.action("tests.run", { suite });
  return decode_hosted_test_run_response(response, suite);
}

export function decode_hosted_test_run_response(
  response: unknown,
  suite: HostedTestSuiteId,
): HostedTestRunResult {
  if (typeof response !== "object" || response === null) {
    throw new Error(`Hosted test action returned an invalid response for ${suite}.`);
  }
  if ((response as { type?: unknown }).type === "error") {
    const remote = (response as { error?: unknown }).error;
    if (
      typeof remote === "object"
      && remote !== null
      && typeof (remote as { message?: unknown }).message === "string"
    ) {
      throw decode_hosted_test_action_error(suite, {
        message: (remote as { message: string }).message,
        ...(typeof (remote as { code?: unknown }).code === "string"
          ? { code: (remote as { code: string }).code }
          : {}),
      });
    }
    throw new Error(`Hosted test action was rejected for ${suite}.`);
  }
  if ((response as { type?: unknown }).type !== "ack") {
    throw new Error(`Hosted test action returned an invalid response for ${suite}.`);
  }
  return (response as { result: HostedTestRunResult }).result;
}

export async function inspect_hosted_test_action(
  client: Readonly<{ action: (name: "tests.inspect", payload: HostedTestInspectRequest) => Promise<unknown> }>,
  request: HostedTestInspectRequest,
): Promise<HostedTestCaseDiagnostic> {
  const response = await client.action("tests.inspect", request);
  return decode_hosted_test_inspect_response(response, request.caseKey);
}

export function decode_hosted_test_inspect_response(
  response: unknown,
  caseKey: string,
): HostedTestCaseDiagnostic {
  if (typeof response !== "object" || response === null || (response as { type?: unknown }).type !== "ack") {
    const message = (response as { error?: { message?: unknown } })?.error?.message;
    throw new Error(typeof message === "string" ? message : `Hosted case inspection failed for ${caseKey}.`);
  }
  return (response as { result: HostedTestCaseDiagnostic }).result;
}
