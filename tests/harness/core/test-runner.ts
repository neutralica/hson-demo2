// test_runner.ts
// Purpose: deterministic runner. No DOM, no global state, no “clever” chaining.
// Emits events to recorder + console via a single callback.

import { freeze as _freeze } from "../../helpers/freeze";
import { TestRecorder } from "../reporting/test-recorder";
import { assertion_failure_message, normalize_assert_rows } from "../reporting/assert-row-status";
import type { RunCaseRet, RunOptions, RunResult, TestEvent, TestExpected, TestExpectedError, TestSuite } from "./test-contracts";

export const DEFAULT_TEST_CASE_TIMEOUT_MS = 30_000;
export const TEST_FAILURE_DETAIL_LIMIT = 16 * 1024;

// Cooperative macrotask yield so Node can service transports and browsers can
// paint/process input. Prefer the real Node scheduler even when a synthetic DOM
// has installed requestAnimationFrame on globalThis.
async function yield_to_event_loop(): Promise<void> {
  const immediate = (globalThis as typeof globalThis & {
    setImmediate?: (callback: () => void) => unknown;
  }).setImmediate;
  if (typeof immediate === "function") {
    await new Promise<void>((resolve) => immediate(resolve));
    return;
  }
  const raf = globalThis.requestAnimationFrame;
  if (typeof raf === "function") {
    await new Promise<void>((resolve) => raf(() => resolve()));
    return;
  }
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

class TestEventDeliveryError extends Error {
  constructor(readonly cause: unknown) {
    super(`[TEST_EVENT_DELIVERY_FAILED] ${asErrMessage(cause)}`, { cause });
    this.name = "TestEventDeliveryError";
  }
}

function emit(rec: TestRecorder, onEvent: (e: TestEvent) => void, e: TestEvent): void {
  rec.ingest(e);
  try {
    onEvent(e);
  } catch (error) {
    throw new TestEventDeliveryError(error);
  }
}

function default_now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function asErrMsg(err: unknown): string {
  const message = err instanceof Error
    ? err.stack ? `${err.message}\n${err.stack}` : err.message
    : String(err);
  if (message.length <= TEST_FAILURE_DETAIL_LIMIT) return message;
  const marker = `\n<TEST_FAILURE_DETAIL_TRUNCATED:${message.length - TEST_FAILURE_DETAIL_LIMIT} characters omitted>\n`;
  const available = TEST_FAILURE_DETAIL_LIMIT - marker.length;
  const head = Math.ceil(available / 2);
  return `${message.slice(0, head)}${marker}${message.slice(message.length - (available - head))}`;
}

function asErrMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  return value as Record<string, unknown>;
}

function readMetaPatch(value: unknown): Record<string, string> | undefined {
  const record = asRecord(value);
  if (!record) return undefined;

  const metaPatch = record.metaPatch;
  if (typeof metaPatch !== "object" || metaPatch === null || Array.isArray(metaPatch)) return undefined;

  return metaPatch as Record<string, string>;
}

function readAssertRows(value: unknown): unknown {
  const record = asRecord(value);
  if (!record) return undefined;
  return Object.prototype.hasOwnProperty.call(record, "assertRows") ? record.assertRows : undefined;
}

function readExpected(value: unknown): TestExpected {
  const record = asRecord(value);
  return record?.expected === "fail" ? "fail" : "ok";
}

function readExpectedError(value: unknown): TestExpectedError | undefined {
  const record = asRecord(value);
  if (!record) return undefined;

  const expectedError = record.expectedError;
  if (typeof expectedError !== "object" || expectedError === null || Array.isArray(expectedError)) return undefined;

  const errorRecord = expectedError as Record<string, unknown>;
  return {
    ...(typeof errorRecord.message === "string" ? { message: errorRecord.message } : {}),
    ...(typeof errorRecord.includes === "string" ? { includes: errorRecord.includes } : {}),
  };
}

function expected_error_matches(msg: string, expectedError: TestExpectedError | undefined): boolean {
  if (expectedError === undefined) return true;
  if (expectedError.message !== undefined && msg !== expectedError.message) return false;
  if (expectedError.includes !== undefined && !msg.includes(expectedError.includes)) return false;
  return true;
}

function validated_timeout(value: number, label: string): number {
  if (!Number.isFinite(value) || !Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`[TEST_RUNNER_INVALID_TIMEOUT] ${label} must be a positive finite safe integer.`);
  }
  return value;
}

function effective_timeout(
  suite: TestSuite,
  testCase: TestSuite["cases"][number] | undefined,
  options: RunOptions,
): number {
  return validated_timeout(
    testCase?.timeoutMs ?? suite.timeoutMs ?? options.caseTimeoutMs ?? DEFAULT_TEST_CASE_TIMEOUT_MS,
    testCase === undefined ? `Suite "${suite.suite}" timeout` : `Test "${suite.suite}::${testCase.caseId}" timeout`,
  );
}

function validate_run_configuration(suites: readonly TestSuite[], options: RunOptions): void {
  if (options.caseTimeoutMs !== undefined) {
    validated_timeout(options.caseTimeoutMs, "Run default timeout");
  }
  if (options.yieldAfterMs !== undefined && (!Number.isFinite(options.yieldAfterMs) || options.yieldAfterMs <= 0)) {
    throw new Error("[TEST_RUNNER_INVALID_YIELD_BUDGET] yieldAfterMs must be a positive finite number.");
  }
  for (const suite of suites) {
    if (suite.timeoutMs !== undefined) validated_timeout(suite.timeoutMs, `Suite "${suite.suite}" timeout`);
    for (const testCase of suite.cases) {
      if (testCase.suite !== suite.suite) {
        throw new Error(`[TEST_RUNNER_CASE_IDENTITY_INVALID] Case "${testCase.name}" belongs to "${testCase.suite}", not "${suite.suite}".`);
      }
      if (testCase.timeoutMs !== undefined) {
        validated_timeout(testCase.timeoutMs, `Test "${suite.suite}::${testCase.caseId}" timeout`);
      }
    }
  }
}

function deadline_error(kind: "case" | "setup" | "cleanup", id: string, timeoutMs: number): Error {
  const code = kind === "case"
    ? "TEST_CASE_TIMEOUT"
    : kind === "setup"
      ? "TEST_SUITE_SETUP_TIMEOUT"
      : "TEST_CASE_CLEANUP_TIMEOUT";
  return new Error(`[${code}] ${id} exceeded ${timeoutMs}ms.`);
}

function cancelled_error(id: string): Error {
  return new Error(`[TEST_CASE_CANCELLED] ${id} was cancelled before completion.`);
}

function is_cancelled_error(error: unknown): boolean {
  return error instanceof Error && /^\[TEST_CASE_CANCELLED\]/.test(error.message);
}

async function run_bounded<T>(
  run: () => T | Promise<T>,
  timeoutMs: number,
  kind: "case" | "setup" | "cleanup",
  id: string,
  signal?: AbortSignal,
): Promise<T> {
  if (signal?.aborted) throw cancelled_error(id);
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const finish = (complete: () => void): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      complete();
    };
    const abort = (): void => finish(() => reject(cancelled_error(id)));
    const timer = setTimeout(
      () => finish(() => reject(deadline_error(kind, id, timeoutMs))),
      timeoutMs,
    );
    signal?.addEventListener("abort", abort, { once: true });
    Promise.resolve()
      .then(run)
      .then(
        (value) => finish(() => resolve(value)),
        (error) => finish(() => reject(error)),
      );
  });
}

function combined_case_error(runError: unknown, cleanupError: unknown): Error {
  const runMessage = asErrMsg(runError);
  const cleanupMessage = asErrMsg(cleanupError);
  return new Error(
    `[TEST_CASE_CLEANUP_FAILED] ${cleanupMessage}\n[TEST_CASE_ORIGINAL_FAILURE] ${runMessage}`,
  );
}

export async function run_test_suites(
  suites: readonly TestSuite[],
  onEvent: (e: TestEvent) => void,
  opts: RunOptions = {},
): Promise<RunResult> {
  validate_run_configuration(suites, opts);
  const rec = new TestRecorder();
  const now = opts.now ?? default_now;
  const t0 = now();


  const yieldEvery = opts.yieldEveryCases ?? 5;
  const yieldAfterMs = opts.yieldAfterMs;
  let caseCounter = 0;
  let lastYieldAt = now();
  let cancelled = opts.signal?.aborted === true;

  const case_boundary = async (): Promise<void> => {
    caseCounter += 1;
    const countBudgetExpired = yieldEvery > 0 && caseCounter % yieldEvery === 0;
    const timeBudgetExpired = yieldAfterMs !== undefined && now() - lastYieldAt >= yieldAfterMs;
    if (!countBudgetExpired && !timeBudgetExpired) return;
    await yield_to_event_loop();
    lastYieldAt = now();
  };

  suiteLoop: for (const suite of suites) {
    if (opts.signal?.aborted) { cancelled = true; break; }
    if (opts.filterSuite && suite.suite !== opts.filterSuite) continue;
    const selectedCases = suite.cases.filter(
      (testCase) => !opts.filterCase || testCase.name.includes(opts.filterCase),
    );
    if (selectedCases.length === 0) continue;

    const s0 = now();
    emit(rec, onEvent, {
      t: "suite_begin",
      suite: suite.suite,
      totalPlanned: selectedCases.length,
    });

    await yield_to_event_loop();
    lastYieldAt = now();
    if (opts.signal?.aborted) { cancelled = true; break; }

    if (suite.setup !== undefined) {
      try {
        await run_bounded(
          suite.setup,
          effective_timeout(suite, undefined, opts),
          "setup",
          suite.suite,
          opts.signal,
        );
      } catch (error) {
        if (is_cancelled_error(error)) {
          cancelled = true;
          break suiteLoop;
        }
        for (const tc of selectedCases) {
          const c0 = now();
          const begin = { t: "case_begin", suite: tc.suite, caseId: tc.caseId, name: tc.name } as const;
          emit(rec, onEvent, tc.meta ? { ...begin, meta: tc.meta } : begin);
          emit(rec, onEvent, {
            t: "case_end",
            suite: tc.suite,
            caseId: tc.caseId,
            name: tc.name,
            status: "fail",
            ms: now() - c0,
            err: `[TEST_SUITE_SETUP_FAILED] ${asErrMsg(error)}`,
          });
          await case_boundary();
        }
        emit(rec, onEvent, { t: "suite_end", suite: suite.suite, ms: now() - s0 });
        if (opts.bail || opts.signal?.aborted) break;
        continue;
      }
    }

    for (const tc of selectedCases) {
      if (opts.signal?.aborted) { cancelled = true; break; }

      const c0 = now();
      const evBase = { t: "case_begin", suite: tc.suite, caseId: tc.caseId, name: tc.name } as const;
      emit(rec, onEvent, tc.meta ? { ...evBase, meta: tc.meta } : evBase);

      const expected = readExpected(tc);
      const expectedError = readExpectedError(tc);

      try {
        let ret: void | RunCaseRet = undefined;
        let runError: unknown;
        try {
          ret = await run_bounded(
            tc.run,
            effective_timeout(suite, tc, opts),
            "case",
            `${tc.suite}::${tc.caseId}`,
            opts.signal,
          );
        } catch (error) {
          runError = error;
        }
        let cleanupError: unknown;
        if (tc.cleanup !== undefined) {
          try {
            await run_bounded(
              tc.cleanup,
              effective_timeout(suite, tc, opts),
              "cleanup",
              `${tc.suite}::${tc.caseId}`,
            );
          } catch (error) {
            cleanupError = error;
          }
        }
        if (runError !== undefined && cleanupError !== undefined) {
          throw combined_case_error(runError, cleanupError);
        }
        if (cleanupError !== undefined) {
          throw new Error(`[TEST_CASE_CLEANUP_FAILED] ${asErrMsg(cleanupError)}`);
        }
        if (runError !== undefined) throw runError;

        const runRet = (ret && typeof ret === "object")
          ? ret as RunCaseRet
          : undefined;

        const metaPatch = runRet?.metaPatch;
        const assertRowsStatus = normalize_assert_rows(runRet?.assertRows);
        const assertRows = assertRowsStatus.assertRows;
        const failedRows = assertRowsStatus.failedRows;
        const malformedRows = assertRowsStatus.malformedRows;

        if (expected === "fail") {
          const failedAsExpected = failedRows.length > 0 && malformedRows.length === 0;
          const endBase = {
            t: "case_end",
            suite: tc.suite,
            caseId: tc.caseId,
            name: tc.name,
            status: failedAsExpected ? "pass" : "fail",
            ms: now() - c0,
            expected,
            ...(!failedAsExpected
              ? {
                err: failedRows.length
                  ? assertion_failure_message(failedRows)
                  : "Expected case to fail, but it passed.",
              }
              : {}),
          } as const;

          emit(
            rec,
            onEvent,
            !failedAsExpected && (metaPatch || assertRows !== undefined)
              ? {
                ...endBase,
                ...(metaPatch ? { metaPatch } : {}),
                ...(assertRows !== undefined ? { assertRows } : {}),
              }
              : metaPatch
                ? { ...endBase, metaPatch }
                : endBase
          );

          await case_boundary();

          if ((!failedAsExpected && opts.bail) || opts.signal?.aborted) break;
          continue;
        }

        if (failedRows.length > 0) {
          const endBase = {
            t: "case_end",
            suite: tc.suite,
            caseId: tc.caseId,
            name: tc.name,
            status: "fail",
            ms: now() - c0,
            err: assertion_failure_message(failedRows),
          } as const;

          emit(
            rec,
            onEvent,
            metaPatch || assertRows !== undefined
              ? {
                ...endBase,
                ...(metaPatch ? { metaPatch } : {}),
                ...(assertRows !== undefined ? { assertRows } : {}),
              }
              : endBase
          );

          await case_boundary();

          if (opts.bail || opts.signal?.aborted) break;
          continue;
        }

        const endBase = {
          t: "case_end",
          suite: tc.suite,
          caseId: tc.caseId,
          name: tc.name,
          status: "pass",
          ms: now() - c0,
        } as const;

        emit(
          rec,
          onEvent,
          metaPatch || (opts.includePassedDiagnostics && assertRows !== undefined)
            ? {
              ...endBase,
              ...(metaPatch ? { metaPatch } : {}),
              ...(opts.includePassedDiagnostics && assertRows !== undefined ? { assertRows } : {}),
            }
            : endBase
        );
      } catch (err) {
        if (err instanceof TestEventDeliveryError) throw err;
        if (is_cancelled_error(err)) {
          emit(rec, onEvent, {
            t: "case_cancelled",
            suite: tc.suite,
            caseId: tc.caseId,
            name: tc.name,
            ms: now() - c0,
          });
          cancelled = true;
          break;
        }
        const msg = asErrMsg(err);
        const shortMsg = asErrMessage(err);
        const metaPatch = readMetaPatch(err);
        const assertRowsStatus = normalize_assert_rows(readAssertRows(err));
        const assertRows = assertRowsStatus.assertRows;
        const malformedRows = assertRowsStatus.malformedRows;
        const runnerFailure = /^\[(?:TEST_CASE_TIMEOUT|TEST_CASE_CANCELLED|TEST_CASE_CLEANUP_FAILED)\]/.test(shortMsg);

        if (expected === "fail" && !runnerFailure && expected_error_matches(shortMsg, expectedError) && malformedRows.length === 0) {
          const endBase = {
            t: "case_end",
            suite: tc.suite,
            caseId: tc.caseId,
            name: tc.name,
            status: "pass",
            ms: now() - c0,
            expected,
          } as const;

          emit(
            rec,
            onEvent,
            metaPatch ? { ...endBase, metaPatch } : endBase
          );

          await case_boundary();

          continue;
        }

        const endBase = {
          t: "case_end",
          suite: tc.suite,
          caseId: tc.caseId,
          name: tc.name,
          status: "fail",
          ms: now() - c0,
          err: malformedRows.length ? assertion_failure_message(malformedRows) : msg,
          ...(expected === "fail" ? { expected } : {}),
        } as const;

        emit(
          rec,
          onEvent,
          metaPatch || assertRows !== undefined
            ? {
              ...endBase,
              ...(metaPatch ? { metaPatch } : {}),
              ...(assertRows !== undefined ? { assertRows } : {}),
            }
            : endBase
        );

        await case_boundary();

        if (opts.bail || opts.signal?.aborted) break;
        continue;
      }

      // yield periodically so UI can paint + pointer events can run
      await case_boundary();
    }

    if (cancelled || opts.signal?.aborted) {
      cancelled = true;
      break;
    }

    emit(rec, onEvent, { t: "suite_end", suite: suite.suite, ms: now() - s0 });

    // suite-level yield by default so suite_begin/suite_end logs can paint between suites.
    if (opts.yieldBetweenSuites !== false) {
      await yield_to_event_loop();
      lastYieldAt = now();
    }

    if (opts.bail && rec.summary().fail > 0) break;
  }

  const totalMs = now() - t0;
  const summary = _freeze({ ...rec.summary(), msTotal: totalMs });
  return _freeze({ ok: !cancelled && summary.fail === 0, summary, ...(cancelled ? { cancelled: true as const } : {}) });
}
