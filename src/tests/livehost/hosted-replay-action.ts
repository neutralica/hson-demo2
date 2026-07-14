import { create_livehost } from "hson-live";
import type { LiveHostActions, LiveHostSchema } from "hson-live";
import type { JsonValue } from "hson-live/types";
import type { RunResult, TestFailure, TestSummary } from "../../app/demos/test/tests.types";
import { run_livemap_replay_suite } from "../livemap/run-replay-suite";
import { make_hosted_test_report } from "./hosted-test-report";
import type { HostedTestReportController } from "./hosted-test-report";
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
  suite: "livemap/replay";
}>;

export type HostedTestRunResult = Readonly<{
  runId: HostedTestRunId;
  suite: "livemap/replay";
  ok: boolean;
  summary: TestSummary;
}>;

export type HostedTestActions = Readonly<{
  "tests.run": HostedTestRunRequest;
}>;

type ReplayRunner = (
  onEvent?: Parameters<typeof run_livemap_replay_suite>[0],
  options?: Parameters<typeof run_livemap_replay_suite>[1],
) => Promise<RunResult>;

export type HostedTestRunIdFactory = () => string;

let hostedTestRunId = 0;

function make_hosted_test_run_id(): string {
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
    && (value as { suite?: unknown }).suite === "livemap/replay"
  ) {
    return { ok: true, value: { suite: "livemap/replay" } } as const;
  }

  return {
    ok: false,
    issues: ["tests.run requires suite livemap/replay."],
  } as const;
}

export function create_hosted_test_livehost(
  runReplay: ReplayRunner = run_livemap_replay_suite,
  inspectReport?: (report: HostedTestReportController, runId: HostedTestRunId) => void,
  makeRunId: HostedTestRunIdFactory = make_hosted_test_run_id,
) {
  const actions: LiveHostActions<HostedTestActions, undefined> = {
    "tests.run": async (context) => {
      const runId = makeRunId();
      if (!runId) throw new Error("Hosted test run ID must be non-empty.");
      const report = make_hosted_test_report(Date.now, (commit) => {
        const envelope = encode_hosted_test_report_commit(runId, "livemap/replay", commit);
        context.emit_event(
          HOSTED_TEST_REPORT_COMMIT_EVENT,
          envelope as unknown as JsonValue,
        );
      });
      try {
        const initial = encode_hosted_test_report_initial(runId, "livemap/replay", report.map.capture());
        context.emit_event(HOSTED_TEST_REPORT_INITIAL_EVENT, initial as unknown as JsonValue);
        inspectReport?.(report, runId);
      } catch (error) {
        report.dispose();
        throw error;
      }
      let result: RunResult;
      try {
        result = await runReplay(report.reduce, {
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
        suite: "livemap/replay",
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

export async function run_hosted_replay_action(
  client: Readonly<{ action: (name: "tests.run", payload: HostedTestRunRequest) => Promise<unknown> }>,
): Promise<HostedTestRunResult> {
  const response = await client.action("tests.run", { suite: "livemap/replay" });
  if (typeof response !== "object" || response === null || (response as { type?: unknown }).type !== "ack") {
    throw new Error("Hosted replay action was rejected.");
  }
  return (response as { result: HostedTestRunResult }).result;
}
