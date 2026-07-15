// test_runner.ts
// Purpose: deterministic runner. No DOM, no global state, no “clever” chaining.
// Emits events to recorder + console via a single callback.

import { _freeze } from "../app/demos/test/tests.consts";
import { TestRecorder } from "../app/demos/test/test-recorder";
import { assertion_failure_message, normalize_assert_rows } from "../app/demos/test/assert-row-status";
import type { RunCaseRet, RunOptions, RunResult, TestEvent, TestExpected, TestExpectedError, TestSuite } from "../app/demos/test/tests.types";

// cooperative yield so the browser can paint + process input.
// - requestAnimationFrame - "UI-friendly" yield.
// - fallback to setTimeout for non-DOM contexts.
async function yield_to_ui(): Promise<void> {
  const raf = globalThis.requestAnimationFrame;
  if (typeof raf === "function") {
    await new Promise<void>((resolve) => raf(() => resolve()));
    return;
  }
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

function emit(rec: TestRecorder, onEvent: (e: TestEvent) => void, e: TestEvent): void {
  rec.ingest(e);
  onEvent(e);
}

function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function asErrMsg(err: unknown): string {
  if (err instanceof Error) return err.stack ? `${err.message}\n${err.stack}` : err.message;
  return String(err);
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

export async function run_test_suites(
  suites: readonly TestSuite[],
  onEvent: (e: TestEvent) => void,
  opts: RunOptions = {},
): Promise<RunResult> {
  const rec = new TestRecorder();
  const clearLog = (onEvent as unknown as { clear?: () => void }).clear;
  clearLog?.();
  const t0 = now();


  const yieldEvery = opts.yieldEveryCases ?? 5;
  let caseCounter = 0;

  for (const suite of suites) {
    if (opts.filterSuite && suite.suite !== opts.filterSuite) continue;

    const s0 = now();
    emit(rec, onEvent, {
      t: "suite_begin",
      suite: suite.suite,
      totalPlanned: suite.cases.length,
    });

    await yield_to_ui();

    for (const tc of suite.cases) {
      if (opts.filterSuite && tc.suite !== opts.filterSuite) continue;
      if (opts.filterCase && !tc.name.includes(opts.filterCase)) continue;

      const c0 = now();
      const evBase = { t: "case_begin", suite: tc.suite, name: tc.name } as const;
      emit(rec, onEvent, tc.meta ? { ...evBase, meta: tc.meta } : evBase);

      const expected = readExpected(tc);
      const expectedError = readExpectedError(tc);

      try {
        const ret = await tc.run();

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

          caseCounter += 1;
          if (yieldEvery > 0 && caseCounter % yieldEvery === 0) {
            await yield_to_ui();
          }

          if (!failedAsExpected && opts.bail) break;
          continue;
        }

        if (failedRows.length > 0) {
          const endBase = {
            t: "case_end",
            suite: tc.suite,
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

          caseCounter += 1;
          if (yieldEvery > 0 && caseCounter % yieldEvery === 0) {
            await yield_to_ui();
          }

          if (opts.bail) break;
          continue;
        }

        const endBase = {
          t: "case_end",
          suite: tc.suite,
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
        const msg = asErrMsg(err);
        const shortMsg = asErrMessage(err);
        const metaPatch = readMetaPatch(err);
        const assertRowsStatus = normalize_assert_rows(readAssertRows(err));
        const assertRows = assertRowsStatus.assertRows;
        const malformedRows = assertRowsStatus.malformedRows;

        if (expected === "fail" && expected_error_matches(shortMsg, expectedError) && malformedRows.length === 0) {
          const endBase = {
            t: "case_end",
            suite: tc.suite,
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

          caseCounter += 1;
          if (yieldEvery > 0 && caseCounter % yieldEvery === 0) {
            await yield_to_ui();
          }

          continue;
        }

        const endBase = {
          t: "case_end",
          suite: tc.suite,
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

        caseCounter += 1;
        if (yieldEvery > 0 && caseCounter % yieldEvery === 0) {
          await yield_to_ui();
        }

        if (opts.bail) break;
      }

      // yield periodically so UI can paint + pointer events can run
      caseCounter += 1;
      if (yieldEvery > 0 && caseCounter % yieldEvery === 0) {
        await yield_to_ui();
      }
    }

    emit(rec, onEvent, { t: "suite_end", suite: suite.suite, ms: now() - s0 });

    // suite-level yield by default so suite_begin/suite_end logs can paint between suites.
    if (opts.yieldBetweenSuites !== false) {
      await yield_to_ui();
    }

    if (opts.bail && rec.summary().fail > 0) break;
  }

  const totalMs = now() - t0;
  const summary = _freeze({ ...rec.summary(), msTotal: totalMs });
  return _freeze({ ok: summary.fail === 0, summary });
}
