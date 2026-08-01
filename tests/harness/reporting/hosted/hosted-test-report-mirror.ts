/** @deprecated Patch 6 compatibility for event-protocol fixtures only. Production uses the LiveHost client mirror. */
import { hson } from "hson-live";
import type { JsonValue } from "hson-live/types";
import { HOSTED_TEST_REPORT_SCHEMA } from "./hosted-test-report";
import type { HostedTestReport } from "./hosted-test-report.types";
import type { HostedTestReportInitialEnvelope } from "./hosted-test-report-initial.types";
import type {
  HostedTestReportMirror,
  HostedTestReportMirrorFailure,
  HostedTestReportMirrorFailureCode,
  HostedTestReportMirrorStatus,
} from "./hosted-test-report-mirror.types";
import { decode_hosted_test_report_commit } from "./hosted-test-report-wire";
import type { HostedTestReportCommitEnvelope } from "./hosted-test-report-wire.types";

export class HostedTestReportMirrorError extends Error {
  readonly code = "HOSTED_TEST_REPORT_MIRROR_FAILED";

  constructor(readonly failure: HostedTestReportMirrorFailure) {
    super(failure.message);
    this.name = "HostedTestReportMirrorError";
  }
}

export class HostedTestReportMirrorLifecycleError extends Error {
  readonly code = "HOSTED_TEST_REPORT_MIRROR_INACTIVE";

  constructor(readonly status: Exclude<HostedTestReportMirrorStatus, "active">) {
    super(status === "disposed" ? "Hosted test report mirror is disposed." : "Hosted test report mirror has failed.");
    this.name = "HostedTestReportMirrorLifecycleError";
  }
}

function clone_json(value: JsonValue): JsonValue {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(clone_json);
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, clone_json(child)]));
}

function failure(code: HostedTestReportMirrorFailureCode, message: string, details: Omit<HostedTestReportMirrorFailure, "code" | "message"> = {}): HostedTestReportMirrorFailure {
  return Object.freeze({ code, message, ...details });
}

export function make_hosted_test_report_mirror(initial: HostedTestReportInitialEnvelope): HostedTestReportMirror {
  const map = hson.liveMap
    .fromJson(clone_json(initial.value as unknown as JsonValue))
    .schema.use(HOSTED_TEST_REPORT_SCHEMA);
  if (map.rev !== initial.rev) {
    throw new Error(`Hosted test report mirror initial revision mismatch: expected ${initial.rev}, created ${map.rev}.`);
  }

  const runId = initial.runId;
  const suite = initial.suite;
  let status: HostedTestReportMirrorStatus = "active";
  let retainedFailure: HostedTestReportMirrorFailure | undefined;
  const listeners = new Set<(capture: ReturnType<typeof map.capture>) => void>();

  function notify(): void {
    const capture = map.capture();
    for (const listener of [...listeners]) listener(capture);
  }

  function fail(next: HostedTestReportMirrorFailure): never {
    retainedFailure = Object.freeze({ ...next });
    status = "failed";
    throw new HostedTestReportMirrorError(retainedFailure);
  }

  function require_active(): void {
    if (status === "active") return;
    throw new HostedTestReportMirrorLifecycleError(status);
  }

  return Object.freeze({
    runId,
    suite,
    get rev() {
      return map.rev;
    },
    get status() {
      return status;
    },
    get failure() {
      return retainedFailure;
    },
    capture() {
      return map.capture();
    },
    subscribe(listener: (capture: ReturnType<typeof map.capture>) => void) {
      if (status === "disposed") return () => undefined;
      listeners.add(listener);
      listener(map.capture());
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        listeners.delete(listener);
      };
    },
    apply(envelope: HostedTestReportCommitEnvelope) {
      require_active();
      if (envelope.runId !== runId) {
        return fail(failure("RUN_MISMATCH", `Expected run ${runId}, received ${envelope.runId}.`, {
          expectedRunId: runId,
          receivedRunId: envelope.runId,
        }));
      }
      if (envelope.suite !== suite) {
        return fail(failure("SUITE_MISMATCH", `Expected suite ${suite}, received ${envelope.suite}.`));
      }
      if (envelope.prevRev !== map.rev) {
        return fail(failure("REVISION_MISMATCH", `Expected previous revision ${map.rev}, received ${envelope.prevRev}.`, {
          expectedRev: map.rev,
          receivedPrevRev: envelope.prevRev,
        }));
      }

      const before = map.capture();
      try {
        const commit = decode_hosted_test_report_commit(envelope);
        map.replay({ prevRev: commit.prevRev, ops: commit.ops });
      } catch (error) {
        const unchanged = map.rev === before.rev
          && JSON.stringify(map.capture().value) === JSON.stringify(before.value);
        return fail(failure(
          "REPLAY_FAILED",
          unchanged
            ? `Hosted test report replay failed: ${error instanceof Error ? error.message : String(error)}`
            : "Hosted test report replay failed after mutating state.",
          { expectedRev: before.rev, receivedPrevRev: envelope.prevRev },
        ));
      }
      if (map.rev !== envelope.rev) {
        return fail(failure("POST_REPLAY_REVISION_MISMATCH", `Expected replay revision ${envelope.rev}, reached ${map.rev}.`, {
          expectedRev: envelope.rev,
          receivedPrevRev: envelope.prevRev,
        }));
      }
      notify();
    },
    dispose() {
      if (status === "disposed") return;
      status = "disposed";
      listeners.clear();
    },
  });
}
