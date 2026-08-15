import type { HostedTestCaseDiagnostic } from "../../../src/shared/hosted-tests/hosted-test-action.types";
import type { HostedTestRunTarget } from "../../../src/shared/hosted-tests/hosted-test-suite-contract";
import type { HostedTestRunId } from "../../../src/shared/hosted-tests/hosted-test-report-wire.types";

export type HostedTestRunIdFactory = () => string;

export type HostedTestCaseInspector = (request: Readonly<{
  runId: HostedTestRunId;
  suite: HostedTestRunTarget;
  caseKey: string;
}>) => Promise<HostedTestCaseDiagnostic>;

export type HostedTestRunRetention = Readonly<{
  retain(runId: HostedTestRunId, suite: HostedTestRunTarget): void;
  get(runId: HostedTestRunId): HostedTestRunTarget | undefined;
  remove(runId: HostedTestRunId): boolean;
  clear(): void;
  size(): number;
}>;

export function make_hosted_test_run_retention(maxRuns = 16): HostedTestRunRetention {
  if (!Number.isInteger(maxRuns) || maxRuns <= 0) throw new Error("Hosted test retention limit must be a positive integer.");
  const runs = new Map<HostedTestRunId, HostedTestRunTarget>();
  return Object.freeze({
    retain(runId, suite) {
      runs.delete(runId);
      runs.set(runId, suite);
      while (runs.size > maxRuns) {
        const oldest = runs.keys().next().value as HostedTestRunId | undefined;
        if (oldest === undefined) break;
        runs.delete(oldest);
      }
    },
    get: (runId) => runs.get(runId),
    remove: (runId) => runs.delete(runId),
    clear: () => runs.clear(),
    size: () => runs.size,
  });
}

export function make_hosted_test_run_id_factory(): HostedTestRunIdFactory {
  let nextRunId = 0;
  return () => {
    nextRunId += 1;
    return `hosted-run-${Date.now().toString(36)}-${nextRunId.toString(36)}`;
  };
}

const defaultHostedTestRunId = make_hosted_test_run_id_factory();

export const make_hosted_test_run_id: HostedTestRunIdFactory = () => defaultHostedTestRunId();
