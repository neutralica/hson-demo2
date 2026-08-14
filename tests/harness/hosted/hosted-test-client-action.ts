import type {
  HostedTestCaseDiagnostic,
  HostedTestInspectRequest,
  HostedTestRunRequest,
  HostedTestRunResult,
  HostedTestSelectedRunResult,
} from "./hosted-test-action.types";
import type { HostedTestSuiteId } from "./hosted-test-suite";
import { decode_hosted_test_action_error } from "./hosted-test-action-error";
import type { TestExecutorDiscovery, TestExecutorDiscoveryRequest } from "../core/test-discovery";
import { decode_test_executor_discovery } from "../core/test-discovery";
import type { RunSelectedTestsRequest } from "../core/test-selected-run";

export async function discover_hosted_test_executor(
  client: Readonly<{ action: (name: "tests.discover", payload: TestExecutorDiscoveryRequest) => Promise<unknown> }>,
): Promise<TestExecutorDiscovery> {
  return decode_hosted_test_discovery_response(await client.action("tests.discover", {}));
}

export function decode_hosted_test_discovery_response(response: unknown): TestExecutorDiscovery {
  if (typeof response !== "object" || response === null || (response as { type?: unknown }).type !== "ack") {
    const message = (response as { error?: { message?: unknown } })?.error?.message;
    throw new Error(typeof message === "string" ? message : "Hosted test executor discovery failed.");
  }
  const decoded = decode_test_executor_discovery((response as { result?: unknown }).result);
  if (!decoded.ok) throw new Error(decoded.issues.join(" "));
  return decoded.value;
}

export async function run_hosted_test_action(
  client: Readonly<{ action: (name: "tests.run", payload: HostedTestRunRequest) => Promise<unknown> }>,
  suite: HostedTestSuiteId,
): Promise<HostedTestRunResult> {
  const response = await client.action("tests.run", { suite });
  return decode_hosted_test_run_response(response, suite);
}

export async function run_selected_hosted_tests_action(
  client: Readonly<{
    action: (name: "tests.runSelected", payload: RunSelectedTestsRequest) => Promise<unknown>;
  }>,
  testIds: readonly string[],
): Promise<HostedTestSelectedRunResult> {
  const response = await client.action("tests.runSelected", { testIds: [...testIds] });
  return decode_selected_hosted_test_run_response(response);
}

export function decode_selected_hosted_test_run_response(
  response: unknown,
): HostedTestSelectedRunResult {
  if (typeof response !== "object" || response === null) {
    throw new Error("Selected hosted test action returned an invalid response.");
  }
  if ((response as { type?: unknown }).type === "error") {
    const message = (response as { error?: { message?: unknown } }).error?.message;
    throw new Error(typeof message === "string" ? message : "Selected hosted test action was rejected.");
  }
  if ((response as { type?: unknown }).type !== "ack") {
    throw new Error("Selected hosted test action returned an invalid response.");
  }
  const result = (response as { result?: unknown }).result;
  if (
    typeof result !== "object"
    || result === null
    || (result as { suite?: unknown }).suite !== "canonical/selected"
    || typeof (result as { runId?: unknown }).runId !== "string"
    || !(result as { runId: string }).runId
    || typeof (result as { attemptId?: unknown }).attemptId !== "string"
    || !(result as { attemptId: string }).attemptId
    || !Array.isArray((result as { testIds?: unknown }).testIds)
  ) {
    throw new Error("Selected hosted test action returned an invalid result.");
  }
  return result as HostedTestSelectedRunResult;
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
  const result = (response as { result?: unknown }).result;
  if (
    typeof result !== "object"
    || result === null
    || (result as { suite?: unknown }).suite !== suite
    || typeof (result as { runId?: unknown }).runId !== "string"
    || !(result as { runId: string }).runId
    || typeof (result as { attemptId?: unknown }).attemptId !== "string"
    || !(result as { attemptId: string }).attemptId
  ) {
    throw new Error(`Hosted test action returned an invalid result for ${suite}.`);
  }
  return result as HostedTestRunResult;
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
