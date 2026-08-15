import type {
  HostedTestCaseDiagnostic,
  HostedTestCancelRequest,
  HostedTestCancelResult,
  HostedTestInspectRequest,
  HostedTestSelectedRunResult,
} from "./hosted-test-action.types";
import type { TestExecutorDiscovery, TestExecutorDiscoveryRequest } from "../testing/test-discovery-contract";
import { decode_test_executor_discovery, TEST_EXECUTOR_PROTOCOL_VERSION } from "../testing/test-discovery-contract";
import type { RunSelectedTestsRequest } from "../testing/test-run-contract";

type HostedTestStructuralSummary = Readonly<{
  type: string;
  keys?: readonly string[];
  keyCount?: number;
  length?: number;
  itemType?: string;
  itemKeys?: readonly string[];
}>;

export type HostedTestClientFailureDiagnostic = Readonly<{
  kind: "hosted-test-client-failure";
  operation: string;
  expectedContract: string;
  issues: readonly string[];
  received: HostedTestStructuralSummary & Readonly<{
    envelopeType?: string;
    errorCode?: string;
    protocolVersion?: number;
    catalogVersionLength?: number;
    executor?: HostedTestStructuralSummary;
    catalog?: HostedTestStructuralSummary & Readonly<{
      suites?: HostedTestStructuralSummary;
      tests?: HostedTestStructuralSummary;
    }>;
    externalTargets?: HostedTestStructuralSummary;
    result?: HostedTestStructuralSummary;
  }>;
}>;

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function structural_summary(value: unknown): HostedTestStructuralSummary {
  if (Array.isArray(value)) {
    const first = value[0];
    const firstRecord = record(first);
    return Object.freeze({
      type: "array",
      length: value.length,
      ...(first === undefined ? {} : { itemType: Array.isArray(first) ? "array" : first === null ? "null" : typeof first }),
      ...(firstRecord === undefined ? {} : { itemKeys: Object.freeze(Object.keys(firstRecord).sort().slice(0, 24)) }),
    });
  }
  const input = record(value);
  if (input === undefined) return Object.freeze({ type: value === null ? "null" : typeof value });
  const keys = Object.keys(input).sort();
  return Object.freeze({ type: "object", keys: Object.freeze(keys.slice(0, 24)), keyCount: keys.length });
}

export function summarize_hosted_test_protocol_value(value: unknown): HostedTestClientFailureDiagnostic["received"] {
  const envelope = record(value);
  const result = envelope === undefined ? undefined : record(envelope.result);
  const catalog = result === undefined ? undefined : record(result.catalog);
  const error = envelope === undefined ? undefined : record(envelope.error);
  const envelopeType = envelope?.type;
  const errorCode = error?.code;
  return Object.freeze({
    ...structural_summary(value),
    ...(typeof envelopeType === "string" && ["ack", "error"].includes(envelopeType) ? { envelopeType } : {}),
    ...(typeof errorCode === "string" && /^[A-Z][A-Z0-9_]{0,95}$/.test(errorCode) ? { errorCode } : {}),
    ...(result === undefined ? {} : {
      result: structural_summary(result),
      ...(typeof result.protocolVersion === "number" && Number.isSafeInteger(result.protocolVersion)
        ? { protocolVersion: result.protocolVersion }
        : {}),
      ...(typeof result.catalogVersion === "string" ? { catalogVersionLength: result.catalogVersion.length } : {}),
      ...(result.executor === undefined ? {} : { executor: structural_summary(result.executor) }),
      ...(catalog === undefined ? {} : {
        catalog: Object.freeze({
          ...structural_summary(catalog),
          ...(catalog.suites === undefined ? {} : { suites: structural_summary(catalog.suites) }),
          ...(catalog.tests === undefined ? {} : { tests: structural_summary(catalog.tests) }),
        }),
      }),
      ...(result.externalTargets === undefined ? {} : { externalTargets: structural_summary(result.externalTargets) }),
    }),
  });
}

function client_failure(
  message: string,
  operation: string,
  expectedContract: string,
  issues: readonly string[],
  response: unknown,
): Error {
  const cause: HostedTestClientFailureDiagnostic = Object.freeze({
    kind: "hosted-test-client-failure",
    operation,
    expectedContract,
    issues: Object.freeze(issues.slice(0, 32)),
    received: summarize_hosted_test_protocol_value(response),
  });
  return new Error(message, { cause });
}

export function hosted_test_client_failure_diagnostic(error: unknown): HostedTestClientFailureDiagnostic | undefined {
  if (!(error instanceof Error)) return undefined;
  const cause = error.cause;
  if (typeof cause !== "object" || cause === null
    || (cause as { kind?: unknown }).kind !== "hosted-test-client-failure") return undefined;
  return cause as HostedTestClientFailureDiagnostic;
}

export async function discover_hosted_test_executor(
  client: Readonly<{ action: (name: "tests.discover", payload: TestExecutorDiscoveryRequest) => Promise<unknown> }>,
): Promise<TestExecutorDiscovery> {
  return decode_hosted_test_discovery_response(await client.action("tests.discover", {}));
}

export function decode_hosted_test_discovery_response(response: unknown): TestExecutorDiscovery {
  if (typeof response !== "object" || response === null || (response as { type?: unknown }).type !== "ack") {
    const message = (response as { error?: { message?: unknown } })?.error?.message;
    throw client_failure(
      typeof message === "string" ? message : "Hosted test executor discovery failed.",
      "tests.discover",
      `LiveHost ack<TestExecutorDiscovery v${TEST_EXECUTOR_PROTOCOL_VERSION}>`,
      Object.freeze(["$: expected successful LiveHost action acknowledgement"]),
      response,
    );
  }
  const decoded = decode_test_executor_discovery((response as { result?: unknown }).result);
  if (!decoded.ok) {
    throw client_failure(
      decoded.issues[0] ?? "Invalid tests.discover result.",
      "tests.discover",
      `TestExecutorDiscovery v${TEST_EXECUTOR_PROTOCOL_VERSION}`,
      decoded.issues,
      response,
    );
  }
  return decoded.value;
}

export async function run_selected_hosted_tests_action(
  client: Readonly<{
    action: (name: "tests.runSelected", payload: RunSelectedTestsRequest) => Promise<unknown>;
  }>,
  selectionIds: readonly string[],
): Promise<HostedTestSelectedRunResult> {
  const response = await client.action("tests.runSelected", { selectionIds: [...selectionIds] });
  return decode_selected_hosted_test_run_response(response);
}

export async function cancel_hosted_test_action(
  client: Readonly<{ action: (name: "tests.cancel", payload: HostedTestCancelRequest) => Promise<unknown> }>,
  request: HostedTestCancelRequest,
): Promise<HostedTestCancelResult> {
  return decode_hosted_test_cancel_response(await client.action("tests.cancel", request), request);
}

export function decode_hosted_test_cancel_response(
  response: unknown,
  request: HostedTestCancelRequest,
): HostedTestCancelResult {
  if (typeof response !== "object" || response === null || (response as { type?: unknown }).type !== "ack") {
    const message = (response as { error?: { message?: unknown } })?.error?.message;
    throw client_failure(
      typeof message === "string" ? message : "Hosted test cancellation failed.",
      "tests.cancel",
      "LiveHost ack<HostedTestCancelResult>",
      Object.freeze(["$: expected successful LiveHost action acknowledgement"]),
      response,
    );
  }
  const result = (response as { result?: unknown }).result;
  if (typeof result !== "object" || result === null
    || (result as { runId?: unknown }).runId !== request.runId
    || (result as { attemptId?: unknown }).attemptId !== request.attemptId
    || typeof (result as { reportHostId?: unknown }).reportHostId !== "string"
    || typeof (result as { accepted?: unknown }).accepted !== "boolean") {
    throw client_failure(
      "Hosted test cancellation returned an invalid authoritative result.",
      "tests.cancel",
      "HostedTestCancelResult",
      Object.freeze(["$.result: invalid authoritative cancellation result"]),
      response,
    );
  }
  return result as HostedTestCancelResult;
}

export function decode_selected_hosted_test_run_response(
  response: unknown,
): HostedTestSelectedRunResult {
  if (typeof response !== "object" || response === null) {
    throw client_failure(
      "Selected hosted test action returned an invalid response.",
      "tests.runSelected",
      "LiveHost ack<HostedTestSelectedRunResult>",
      Object.freeze(["$: expected LiveHost action response object"]),
      response,
    );
  }
  if ((response as { type?: unknown }).type === "error") {
    const message = (response as { error?: { message?: unknown } }).error?.message;
    throw client_failure(
      typeof message === "string" ? message : "Selected hosted test action was rejected.",
      "tests.runSelected",
      "LiveHost ack<HostedTestSelectedRunResult>",
      Object.freeze(["$: hosted action was rejected"]),
      response,
    );
  }
  if ((response as { type?: unknown }).type !== "ack") {
    throw client_failure(
      "Selected hosted test action returned an invalid response.",
      "tests.runSelected",
      "LiveHost ack<HostedTestSelectedRunResult>",
      Object.freeze(["$.type: expected 'ack'"]),
      response,
    );
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
    || !Array.isArray((result as { selectionIds?: unknown }).selectionIds)
  ) {
    throw client_failure(
      "Selected hosted test action returned an invalid result.",
      "tests.runSelected",
      "HostedTestSelectedRunResult",
      Object.freeze(["$.result: invalid selected-run result"]),
      response,
    );
  }
  return result as HostedTestSelectedRunResult;
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
    throw client_failure(
      typeof message === "string" ? message : `Hosted case inspection failed for ${caseKey}.`,
      "tests.inspect",
      "LiveHost ack<HostedTestCaseDiagnostic>",
      Object.freeze(["$: expected successful LiveHost action acknowledgement"]),
      response,
    );
  }
  return (response as { result: HostedTestCaseDiagnostic }).result;
}
