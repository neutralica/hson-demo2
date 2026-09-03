import type { TestEvent } from "./test-contracts";
import type { TestRunPlan } from "../../../src/shared/testing/test-run-contract";
import type {
  TestErrorKind,
  TestLifecycleError,
  TestLifecycleEvent,
  TestLifecycleEventBase,
  TestLifecycleTerminalStatus,
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
  if (values.some((status) => status === "error")) return "error";
  if (values.some((status) => status === "fail")) return "fail";
  if (values.some((status) => status === "cancelled")) return "cancelled";
  if (values.some((status) => status === "pass")) return "pass";
  if (values.length > 0 && values.every((status) => status === "unsupported")) return "unsupported";
  if (values.length > 0 && values.every((status) => status === "skip")) return "skip";
  if (values.some((status) => status === "unsupported")) return "unsupported";
  return "pass";
}

function external_error(event: Extract<TestEvent, { t: "external_end" }>): TestLifecycleError | undefined {
  if (event.status === "cancelled") return Object.freeze({ kind: "cancelled", message: "External library launcher was cancelled." });
  if (event.terminalAcceptedBeforeCancellation) return undefined;
  if (event.timedOut) return Object.freeze({ kind: "timeout", message: "External library launcher timed out." });
  if (event.spawnError) return Object.freeze({ kind: "infrastructure", message: event.spawnError });
  if (event.protocolError) return Object.freeze({ kind: "protocol", message: event.protocolError });
  if (event.signal !== null) return Object.freeze({ kind: "infrastructure", message: `External launcher exited from signal ${event.signal}.` });
  if (event.exitCode !== 0 && event.terminalStatus !== "fail") return Object.freeze({ kind: "infrastructure", message: `External launcher exited with code ${event.exitCode ?? "none"}.` });
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
  const startedSuites = new Set<string>();
  const terminalSuites = new Set<string>();
  const suiteStatuses = new Map<string, TestLifecycleTerminalStatus>();
  const caseStatuses = new Map<string, Map<string, TestLifecycleTerminalStatus>>();
  const suiteErrors = new Map<string, TestLifecycleError[]>();
  const externalStatuses = new Map<string, TestLifecycleTerminalStatus>();
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

  const startSuite = (suiteId: string, executorId = options.executorId): void => {
    if (startedSuites.has(suiteId) || terminalSuites.has(suiteId)) return;
    startedSuites.add(suiteId);
    emit({ t: "suite_started", suiteId }, executorId);
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
        startSuite(event.suite, executorId);
        return;
      }
      if (event.t === "case_begin") {
        caseExecutors.set(`${event.suite}::${event.caseId}`, executorId);
        startSuite(event.suite, executorId);
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
        const cases = caseStatuses.get(event.suite) ?? new Map();
        const errors = suiteErrors.get(event.suite) ?? [];
        const status = errors.length > 0
          ? "fail"
          : cases.size > 0
            ? terminal_from_cases(cases)
            : externalStatuses.get(event.suite) ?? "pass";
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
      if (event.t === "external_state") {
        if (event.status === "running") startSuite(event.suite);
        return;
      }

      startSuite(event.suite);
      const ordinaryStdout = event.ordinaryStdout ?? event.stdout;
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
      const classifiedError = external_error(event);
      if (classifiedError !== undefined && classifiedError.kind !== "assertion" && classifiedError.kind !== "cancelled") {
        const errors = suiteErrors.get(event.suite) ?? [];
        errors.push(classifiedError);
        suiteErrors.set(event.suite, errors);
        emit({ t: "infrastructure_error", suiteId: event.suite, error: classifiedError });
      }
      externalStatuses.set(event.suite, event.terminalStatus ?? event.status);
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
          }, caseExecutors.get(`${suite.id}::${testCase.caseId}`) ?? suiteExecutorId);
        }
        caseStatuses.set(suite.id, statuses);
        const status = statuses.size === 0 ? "cancelled" : terminal_from_cases(statuses);
        terminalSuites.add(suite.id);
        suiteStatuses.set(suite.id, status);
        emit({ t: "suite_finished", suiteId: suite.id, status, durationMs }, suiteExecutorId);
      }
      const statuses = [...suiteStatuses.values()];
      emit({
        t: "run_finished",
        status: statuses.some((status) => status === "fail" || status === "error") ? "fail" : "cancelled",
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
