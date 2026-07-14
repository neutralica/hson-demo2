import { create_livehost } from "hson-live";
import type { LiveHostActions, LiveHostSchema } from "hson-live";
import type { JsonValue } from "hson-live/types";
import type { RunResult, TestFailure, TestSummary } from "../demos/test/tests.types";
import { is_hosted_test_suite_id } from "./hosted-test-suite";
import type { HostedTestSuiteId, HostedTestSuiteRegistry } from "./hosted-test-suite";
import { make_hosted_test_report } from "./hosted-test-report";
import type { HostedTestReportController, HostedTestReportOptions } from "./hosted-test-report";
import {
  encode_hosted_test_report_initial,
  HOSTED_TEST_REPORT_INITIAL_EVENT,
} from "./hosted-test-report-initial";
import {
  encode_hosted_test_report_commit,
  HOSTED_TEST_REPORT_COMMIT_EVENT,
} from "./hosted-test-report-wire";
import type { HostedTestRunId } from "./hosted-test-report-wire.types";

export type HostedTestRunRequest = Readonly<{
  suite: HostedTestSuiteId;
}>;

export type HostedTestRunResult = Readonly<{
  runId: HostedTestRunId;
  suite: HostedTestSuiteId;
  ok: boolean;
  summary: TestSummary;
}>;

export type HostedTestActions = Readonly<{
  "tests.run": HostedTestRunRequest;
}>;

export type HostedTestRunIdFactory = () => string;

let hostedTestRunId = 0;

export function make_hosted_test_run_id(): string {
  hostedTestRunId += 1;
  return `hosted-run-${Date.now().toString(36)}-${hostedTestRunId.toString(36)}`;
}

function finite(value: number, field: string): number {
  if (!Number.isFinite(value)) throw new Error(`Hosted test result has non-finite ${field}.`);
  return value;
}

function normalize_failure(failure: TestFailure): TestFailure {
  return {
    suite: failure.suite,
    name: failure.name,
    err: failure.err,
    ms: finite(failure.ms, "failure.ms"),
  };
}

function normalize_summary(summary: TestSummary): TestSummary {
  return {
    suites: finite(summary.suites, "summary.suites"),
    cases: finite(summary.cases, "summary.cases"),
    pass: finite(summary.pass, "summary.pass"),
    fail: finite(summary.fail, "summary.fail"),
    skip: finite(summary.skip, "summary.skip"),
    msTotal: finite(summary.msTotal, "summary.msTotal"),
    failures: summary.failures.map(normalize_failure),
  };
}

function decode_hosted_test_request(value: unknown) {
  if (
    typeof value === "object"
    && value !== null
    && !Array.isArray(value)
    && Object.keys(value).length === 1
    && is_hosted_test_suite_id((value as { suite?: unknown }).suite)
  ) {
    return { ok: true, value: { suite: (value as { suite: HostedTestSuiteId }).suite } } as const;
  }

  return {
    ok: false,
    issues: ["tests.run requires a registered hosted-test suite ID."],
  } as const;
}

export function create_hosted_test_livehost(
  registry: HostedTestSuiteRegistry,
  inspectReport?: (report: HostedTestReportController, runId: HostedTestRunId) => void,
  makeRunId: HostedTestRunIdFactory = make_hosted_test_run_id,
  reportOptions: HostedTestReportOptions = {},
) {
  const actions: LiveHostActions<HostedTestActions, undefined> = {
    "tests.run": async (context, request) => {
      const descriptor = registry.get(request.suite);
      const runId = makeRunId();
      if (!runId) throw new Error("Hosted test run ID must be non-empty.");
      const report = make_hosted_test_report(Date.now, (commit) => {
        const envelope = encode_hosted_test_report_commit(runId, descriptor.id, commit);
        context.emit_event(
          HOSTED_TEST_REPORT_COMMIT_EVENT,
          envelope as unknown as JsonValue,
        );
      }, descriptor.id, reportOptions);
      try {
        const initial = encode_hosted_test_report_initial(runId, descriptor.id, report.map.capture());
        context.emit_event(HOSTED_TEST_REPORT_INITIAL_EVENT, initial as unknown as JsonValue);
        inspectReport?.(report, runId);
      } catch (error) {
        report.dispose();
        throw error;
      }
      let result: RunResult;
      try {
        result = await descriptor.run(report.reduce, {
          yieldEveryCases: 0,
          yieldBetweenSuites: false,
        });
        report.complete(result);
      } catch (error) {
        report.failInfrastructure(error);
        throw error;
      } finally {
        report.dispose();
      }
      const hostedResult: HostedTestRunResult = {
        runId,
        suite: descriptor.id,
        ok: result.ok,
        summary: normalize_summary(result.summary),
      };
      return JSON.parse(JSON.stringify(hostedResult)) as JsonValue;
    },
  };
  const schema: LiveHostSchema<undefined, HostedTestActions> = {
    actions: {
      "tests.run": { payload: decode_hosted_test_request },
    },
  };

  return create_livehost<undefined, HostedTestActions>({ actions, schema });
}

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
