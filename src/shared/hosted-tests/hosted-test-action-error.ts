import type { HostedTestSuiteId } from "./hosted-test-suite-contract";

export const HOSTED_TEST_UNKNOWN_SUITE_ERROR_CODE = "HOSTED_TEST_UNKNOWN_SUITE" as const;
const UNKNOWN_SUITE_PROTOCOL_PREFIX = `[${HOSTED_TEST_UNKNOWN_SUITE_ERROR_CODE}] `;

export function hosted_test_unknown_suite_message(suite: HostedTestSuiteId): string {
  return `Hosted test suite "${suite}" is unavailable on the connected server. Restart or update the hosted-test server.`;
}

export class HostedTestUnknownSuiteError extends Error {
  readonly code = HOSTED_TEST_UNKNOWN_SUITE_ERROR_CODE;

  constructor(
    readonly requestedSuite: HostedTestSuiteId,
    protocolMessage = false,
  ) {
    const message = hosted_test_unknown_suite_message(requestedSuite);
    super(protocolMessage ? `${UNKNOWN_SUITE_PROTOCOL_PREFIX}${message}` : message);
    this.name = "HostedTestUnknownSuiteError";
  }
}

export class HostedTestActionRejectedError extends Error {
  constructor(
    readonly suite: HostedTestSuiteId,
    readonly code: string | undefined,
    message: string,
  ) {
    super(message);
    this.name = "HostedTestActionRejectedError";
  }
}

export function decode_hosted_test_action_error(
  suite: HostedTestSuiteId,
  error: Readonly<{ message: string; code?: string }>,
): Error {
  const staleSchemaRejection = error.code === "LIVEHOST_SCHEMA_INVALID_PAYLOAD"
    && error.message.includes("registered hosted-test suite ID");
  if (error.message.startsWith(UNKNOWN_SUITE_PROTOCOL_PREFIX) || staleSchemaRejection) {
    return new HostedTestUnknownSuiteError(suite);
  }
  return new HostedTestActionRejectedError(
    suite,
    error.code,
    error.message || `Hosted test action was rejected for ${suite}.`,
  );
}

export function hosted_test_action_error_message(error: unknown, suite: HostedTestSuiteId): string {
  if (error instanceof HostedTestUnknownSuiteError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return `Hosted test suite "${suite}" failed before reporting began.`;
}
