import type { TestEvent } from "./test-contracts";
import type { TestRunPlan } from "../../../src/shared/testing/test-run-contract";
import type {
  TestErrorKind,
  TestLifecycleCounts,
  TestLifecycleError,
  TestLifecycleEvent,
  TestLifecycleEventBase,
  TestLifecycleTerminalStatus,
  TestOpaqueExecutionEvidence,
} from "../../../src/shared/testing/test-lifecycle-contract";

export type TestLifecycleAdapter = Readonly<{
  accept(event: TestEvent): void;
  finishRun(status: "pass" | "fail" | "cancelled", durationMs: number): void;
  cancelRemaining(durationMs: number): void;
  infrastructureError(error: unknown): void;
  sequence(): number;
}>;

function error_message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function infrastructure_error(error: unknown): TestLifecycleError {
  return Object.freeze({
    kind: "infrastructure",
    message: error_message(error),
    ...(error instanceof Error && error.stack !== undefined ? { stack: error.stack } : {}),
  });
}

function classify_case_error(message: string): TestErrorKind {
  if (/^\[BROWSER_TIMEOUT\]/.test(message)) return "timeout";
  if (/^\[BROWSER_INFRASTRUCTURE\]/.test(message)) return "infrastructure";
  if (/^\[TEST_CASE_TIMEOUT\]/.test(message)) return "timeout";
  if (/^\[TEST_CASE_CANCELLED\]/.test(message)) return "cancelled";
  if (/^\[TEST_SUITE_(?:SETUP|TEARDOWN)_FAILED\]/.test(message)) return "suite";
  if (/^\[TEST_CASE_CLEANUP_FAILED\]/.test(message)) return "suite";
  return "assertion";
}

function terminal_from_cases(statuses: ReadonlyMap<string, TestLifecycleTerminalStatus>): TestLifecycleTerminalStatus {
  const values = [...statuses.values()];
  if (values.some((status) => status === "fail")) return "fail";
  if (values.some((status) => status === "cancelled")) return "cancelled";
  if (values.length > 0 && values.every((status) => status === "unsupported")) return "unsupported";
  if (values.length > 0 && values.every((status) => status === "skip")) return "skip";
  return "pass";
}

function strip_completion_control_frames(stdout: string): string {
  return stdout
    .split(/(?<=\n)/)
    .filter((line) => !line.replace(/\r?\n$/, "").startsWith("<HSON_LIVE_TEST_COMPLETION>"))
    .join("");
}

function external_error(event: Extract<TestEvent, { t: "external_end" }>): TestLifecycleError | undefined {
  if (event.status === "cancelled") return Object.freeze({ kind: "cancelled", message: "External library launcher was cancelled." });
  if (event.completionAcceptedBeforeCancellation) {
    return event.completion !== undefined && event.completion.failed > 0
      ? Object.freeze({ kind: "assertion", message: `External launcher reported ${event.completion.failed} failed checks.` })
      : undefined;
  }
  if (event.timedOut) return Object.freeze({ kind: "timeout", message: "External library launcher timed out." });
  if (event.spawnError) return Object.freeze({ kind: "infrastructure", message: event.spawnError });
  if (event.completionError) return Object.freeze({ kind: "protocol", message: event.completionError });
  if (event.signal !== null) return Object.freeze({ kind: "infrastructure", message: `External launcher exited from signal ${event.signal}.` });
  if (event.exitCode !== 0) return Object.freeze({ kind: "infrastructure", message: `External launcher exited with code ${event.exitCode ?? "none"}.` });
  if (event.completion && event.completion.failed > 0) {
    return Object.freeze({
      kind: "assertion",
      message: `External launcher reported ${event.completion.failed} failed checks.`,
    });
  }
  return undefined;
}

export function make_test_lifecycle_adapter(options: Readonly<{
  runId: string;
  executorId: string;
  runPlan?: TestRunPlan;
  initialSequence?: number;
  now?: () => number;
  emit: (event: TestLifecycleEvent) => void;
}>): TestLifecycleAdapter {
  let sequence = options.initialSequence ?? 0;
  const clock = options.now ?? Date.now;
  const shapes = new Map(options.runPlan?.suites.map((suite) => [suite.id, suite.executionShape]) ?? []);
  const startedSuites = new Set<string>();
  const terminalSuites = new Set<string>();
  const suiteStatuses = new Map<string, TestLifecycleTerminalStatus>();
  const caseStatuses = new Map<string, Map<string, TestLifecycleTerminalStatus>>();
  const suiteErrors = new Map<string, TestLifecycleError[]>();
  const suiteExecutors = new Map(options.runPlan?.suites.map((suite) => [suite.id, suite.executorId ?? options.executorId]) ?? []);
  const caseExecutors = new Map<string, string>();

  type UnsequencedEvent<T> = T extends TestLifecycleEventBase ? Omit<T, keyof TestLifecycleEventBase> : never;
  const emit = (event: UnsequencedEvent<TestLifecycleEvent>, executorId = options.executorId): void => {
    sequence += 1;
    const observedAt = clock();
    options.emit(Object.freeze({
      ...event,
      runId: options.runId,
      executorId,
      sequence,
      timestamp: Number.isFinite(observedAt) ? observedAt : 0,
    }) as TestLifecycleEvent);
  };

  const startSuite = (suiteId: string, opaque?: TestOpaqueExecutionEvidence, executorId = options.executorId): void => {
    if (startedSuites.has(suiteId) || terminalSuites.has(suiteId)) return;
    startedSuites.add(suiteId);
    emit({ t: "suite_started", suiteId, ...(opaque === undefined ? {} : { opaque }) }, executorId);
  };

  return Object.freeze({
    accept(event) {
      const executorId = event.executorId ?? options.executorId;
      if (event.t === "evidence") {
        if (event.kind === "stdout" || event.kind === "stderr" || event.kind === "runtime_warning") {
          emit({
            t: "output",
            suiteId: event.suite,
            ...(event.caseId === undefined ? {} : { caseId: event.caseId }),
            stream: event.kind,
            text: event.content,
            ...(event.truncated === undefined ? {} : { truncated: event.truncated }),
            ...(event.knownBytes === undefined ? {} : { knownBytes: event.knownBytes }),
          }, executorId);
        } else {
          emit({
            t: "artifact",
            suiteId: event.suite,
            ...(event.caseId === undefined ? {} : { caseId: event.caseId }),
            kind: "artifact",
            name: event.name,
            content: event.content,
            ...(event.reference === undefined ? {} : { reference: event.reference }),
            ...(event.mediaType === undefined ? {} : { mediaType: event.mediaType }),
            ...(event.truncated === undefined ? {} : { truncated: event.truncated }),
            ...(event.knownBytes === undefined ? {} : { knownBytes: event.knownBytes }),
          }, executorId);
        }
        return;
      }
      if (event.t === "suite_begin") {
        if (shapes.get(event.suite) === "cases" || shapes.get(event.suite) === "browser-journeys") startSuite(event.suite, undefined, executorId);
        return;
      }
      if (event.t === "case_begin") {
        caseExecutors.set(`${event.suite}::${event.caseId}`, executorId);
        startSuite(event.suite, undefined, executorId);
        emit({ t: "case_started", suiteId: event.suite, caseId: event.caseId, title: event.name }, executorId);
        return;
      }
      if (event.t === "case_end") {
        caseExecutors.set(`${event.suite}::${event.caseId}`, executorId);
        const status = event.status;
        const message = event.err;
        const error = message === undefined ? undefined : Object.freeze({
          kind: classify_case_error(message),
          message,
        } as const);
        const suiteCases = caseStatuses.get(event.suite) ?? new Map<string, TestLifecycleTerminalStatus>();
        suiteCases.set(event.caseId, status);
        caseStatuses.set(event.suite, suiteCases);
        if (error?.kind === "suite") {
          const errors = suiteErrors.get(event.suite) ?? [];
          errors.push(error);
          suiteErrors.set(event.suite, errors);
        }
        emit({
          t: "case_finished",
          suiteId: event.suite,
          caseId: event.caseId,
          title: event.name,
          status,
          durationMs: event.ms,
          ...(error === undefined ? {} : { error }),
          ...(event.diagnostic === undefined ? {} : { diagnostic: event.diagnostic }),
        }, executorId);
        return;
      }
      if (event.t === "case_cancelled") {
        caseExecutors.set(`${event.suite}::${event.caseId}`, executorId);
        const suiteCases = caseStatuses.get(event.suite) ?? new Map<string, TestLifecycleTerminalStatus>();
        suiteCases.set(event.caseId, "cancelled");
        caseStatuses.set(event.suite, suiteCases);
        emit({
          t: "case_finished",
          suiteId: event.suite,
          caseId: event.caseId,
          title: event.name,
          status: "cancelled",
          durationMs: event.ms,
        }, executorId);
        return;
      }
      if (event.t === "suite_end") {
        if (terminalSuites.has(event.suite)) return;
        terminalSuites.add(event.suite);
        const status = terminal_from_cases(caseStatuses.get(event.suite) ?? new Map());
        suiteStatuses.set(event.suite, status);
        emit({
          t: "suite_finished",
          suiteId: event.suite,
          status,
          durationMs: event.ms,
          ...(suiteErrors.has(event.suite) ? { errors: Object.freeze([...(suiteErrors.get(event.suite) ?? [])]) } : {}),
        }, executorId);
        return;
      }
      const opaque = Object.freeze({
        id: event.id,
        name: event.name,
        subject: event.subject,
        runtime: event.runtime,
        collections: Object.freeze([...event.collections]),
      });
      if (event.t === "external_state") {
        if (event.status === "running") startSuite(event.suite, opaque);
        return;
      }

      startSuite(event.suite, opaque);
      const ordinaryStdout = event.ordinaryStdout ?? strip_completion_control_frames(event.stdout);
      if (ordinaryStdout.length > 0) {
        emit({
          t: "output",
          suiteId: event.suite,
          stream: "stdout",
          text: ordinaryStdout,
          ...(event.stdoutTruncated === undefined ? {} : { truncated: event.stdoutTruncated }),
          ...(event.stdoutBytes === undefined ? {} : { knownBytes: event.stdoutBytes }),
        });
      }
      if (event.stderr.length > 0) {
        emit({
          t: "output",
          suiteId: event.suite,
          stream: "stderr",
          text: event.stderr,
          ...(event.stderrTruncated === undefined ? {} : { truncated: event.stderrTruncated }),
          ...(event.stderrBytes === undefined ? {} : { knownBytes: event.stderrBytes }),
        });
      }
      emit({
        t: "artifact",
        suiteId: event.suite,
        kind: "raw_process_output",
        name: "raw process output",
        content: JSON.stringify({ stdout: event.stdout, stderr: event.stderr }),
        truncated: Boolean(event.stdoutTruncated || event.stderrTruncated),
        knownBytes: (event.stdoutBytes ?? 0) + (event.stderrBytes ?? 0),
      });
      if (event.completion !== undefined || event.completionError !== undefined) {
        emit({
          t: "artifact",
          suiteId: event.suite,
          kind: "protocol_control",
          name: "HSON_LIVE_TEST_COMPLETION",
          content: JSON.stringify(event.completion ?? { error: event.completionError }),
        });
      }
      const classifiedError = external_error(event);
      if (classifiedError !== undefined && classifiedError.kind !== "assertion" && classifiedError.kind !== "cancelled") {
        emit({ t: "infrastructure_error", suiteId: event.suite, error: classifiedError });
      }
      // A completion rejected by protocol reconciliation is evidence, not a
      // trustworthy count source. Counts are observed only from an accepted result.
      const completion = event.status !== "cancelled" && event.completionError === undefined ? event.completion : undefined;
      const certification = shapes.get(event.suite) === "certification-aggregate";
      const counts: TestLifecycleCounts = certification
        ? Object.freeze({
            declared: 1,
            total: 1,
            executed: event.status === "cancelled" ? 0 : 1,
            passed: event.status === "pass" ? 1 : 0,
            failed: event.status === "fail" ? 1 : 0,
            skipped: 0,
            unsupported: 0,
            cancelled: event.status === "cancelled" ? 1 : 0,
          })
        : Object.freeze({
            declared: completion?.executed ?? 0,
            total: completion?.executed ?? 0,
            executed: completion?.executed ?? 0,
            passed: completion?.passed ?? 0,
            failed: completion?.failed ?? 0,
            skipped: 0,
            unsupported: 0,
            cancelled: 0,
          });
      terminalSuites.add(event.suite);
      suiteStatuses.set(event.suite, event.status);
      emit({
        t: "suite_finished",
        suiteId: event.suite,
        status: event.status,
        durationMs: event.ms,
        counts,
        ...(classifiedError === undefined || classifiedError.kind === "cancelled"
          ? {}
          : { errors: Object.freeze([classifiedError]) }),
        opaque: Object.freeze({
          ...opaque,
          stdout: event.stdout,
          stderr: event.stderr,
          exitCode: event.exitCode,
          signal: event.signal,
          timedOut: event.timedOut,
          spawnError: event.spawnError ?? null,
        }),
      });
    },
    finishRun(status, durationMs) {
      emit({ t: "run_finished", status, durationMs });
    },
    cancelRemaining(durationMs) {
      if (options.runPlan === undefined) {
        emit({ t: "run_finished", status: "cancelled", durationMs });
        return;
      }
      for (const suite of options.runPlan.suites) {
        if (terminalSuites.has(suite.id)) continue;
        if (suite.executionShape === "cases" || suite.executionShape === "browser-journeys") {
          const suiteExecutorId = suiteExecutors.get(suite.id) ?? options.executorId;
          const statuses = caseStatuses.get(suite.id) ?? new Map<string, TestLifecycleTerminalStatus>();
          for (const testCase of suite.cases) {
            if (statuses.has(testCase.caseId)) continue;
            statuses.set(testCase.caseId, "cancelled");
            emit({
              t: "case_finished",
              suiteId: suite.id,
              caseId: testCase.caseId,
              title: testCase.title,
              status: "cancelled",
              durationMs: 0,
            }, caseExecutors.get(testCase.id) ?? suiteExecutorId);
          }
          caseStatuses.set(suite.id, statuses);
          const values = [...statuses.values()];
          const status = terminal_from_cases(statuses);
          const counts: TestLifecycleCounts = Object.freeze({
            declared: suite.cases.length,
            total: suite.cases.length,
            executed: values.filter((value) => value !== "cancelled").length,
            passed: values.filter((value) => value === "pass").length,
            failed: values.filter((value) => value === "fail").length,
            skipped: values.filter((value) => value === "skip").length,
            unsupported: values.filter((value) => value === "unsupported").length,
            cancelled: values.filter((value) => value === "cancelled").length,
          });
          terminalSuites.add(suite.id);
          suiteStatuses.set(suite.id, status);
          emit({ t: "suite_finished", suiteId: suite.id, status, durationMs, counts }, suiteExecutorId);
          continue;
        }
        const declared = suite.executionShape === "certification-aggregate"
          ? suite.declaredChecks ?? 0
          : 0;
        const status = "cancelled" as const;
        terminalSuites.add(suite.id);
        suiteStatuses.set(suite.id, status);
        emit({
          t: "suite_finished",
          suiteId: suite.id,
          status,
          durationMs,
          counts: Object.freeze({
            declared,
            total: declared,
            executed: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            unsupported: 0,
            cancelled: declared,
          }),
        });
      }
      const statuses = [...suiteStatuses.values()];
      emit({
        t: "run_finished",
        status: statuses.some((status) => status === "fail") ? "fail" : "cancelled",
        durationMs,
      });
    },
    infrastructureError(error) {
      emit({
        t: "infrastructure_error",
        error: infrastructure_error(error),
      });
    },
    sequence: () => sequence,
  });
}
