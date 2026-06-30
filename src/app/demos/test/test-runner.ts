// test_runner.ts
// Purpose: deterministic runner. No DOM, no global state, no “clever” chaining.
// Emits events to recorder + console via a single callback.

import { _freeze } from "./tests.consts";
import { TestRecorder } from "./test-recorder";
import type { RunCaseRet, RunOptions, RunResult, TestAssertRow, TestEvent, TestSuite } from "./tests.types";

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

function readAssertRows(value: unknown): readonly TestAssertRow[] | undefined {
  const record = asRecord(value);
  if (!record) return undefined;

  const assertRows = record.assertRows;
  if (!Array.isArray(assertRows)) return undefined;

  return assertRows as readonly TestAssertRow[];
}

function readExpected(value: unknown): "ok" | "fail" {
  const record = asRecord(value);
  return record?.expected === "fail" ? "fail" : "ok";
}

function readExpectedError(value: unknown): { message?: string; includes?: string } | undefined {
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

function expected_error_matches(msg: string, expectedError: { message?: string; includes?: string } | undefined): boolean {
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
  const t0 = now();


  const yieldEvery = opts.yieldEveryCases ?? 1;
  let caseCounter = 0;

  for (const suite of suites) {
    if (opts.filterSuite && suite.suite !== opts.filterSuite) continue;

    const s0 = now();
    emit(rec, onEvent, {
      t: "suite_begin",
      suite: suite.suite,
      totalPlanned: suite.cases.length,
    });

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
        const assertRows = runRet?.assertRows;

        if (expected === "fail") {
          const endBase = {
            t: "case_end",
            suite: tc.suite,
            name: tc.name,
            status: "fail",
            ms: now() - c0,
            err: "Expected case to fail, but it passed.",
          } as const;

          emit(
            rec,
            onEvent,
            metaPatch || assertRows?.length
              ? {
                ...endBase,
                ...(metaPatch ? { metaPatch } : {}),
                ...(assertRows?.length ? { assertRows } : {}),
              }
              : endBase
          );

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
          metaPatch || assertRows?.length
            ? {
              ...endBase,
              ...(metaPatch ? { metaPatch } : {}),
              ...(assertRows?.length ? { assertRows } : {}),
            }
            : endBase
        );
      } catch (err) {
        const msg = asErrMsg(err);
        const shortMsg = asErrMessage(err);
        const metaPatch = readMetaPatch(err);
        const assertRows = readAssertRows(err);

        if (expected === "fail" && expected_error_matches(shortMsg, expectedError)) {
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
            metaPatch || assertRows?.length
              ? {
                ...endBase,
                ...(metaPatch ? { metaPatch } : {}),
                ...(assertRows?.length ? { assertRows } : {}),
              }
              : endBase
          );

          continue;
        }

        const endBase = {
          t: "case_end",
          suite: tc.suite,
          name: tc.name,
          status: "fail",
          ms: now() - c0,
          err: msg,
        } as const;

        emit(
          rec,
          onEvent,
          metaPatch || assertRows?.length
            ? {
              ...endBase,
              ...(metaPatch ? { metaPatch } : {}),
              ...(assertRows?.length ? { assertRows } : {}),
            }
            : endBase
        );

        if (opts.bail) break;
      }

      // yield periodically so UI can paint + pointer events can run
      caseCounter += 1;
      if (yieldEvery > 0 && caseCounter % yieldEvery === 0) {
        await yield_to_ui();
      }
    }

    emit(rec, onEvent, { t: "suite_end", suite: suite.suite, ms: now() - s0 });

    // optional suite-level yield
    if (opts.yieldBetweenSuites) {
      await yield_to_ui();
    }

    if (opts.bail && rec.summary().fail > 0) break;
  }

  const totalMs = now() - t0;
  const summary = _freeze({ ...rec.summary(), msTotal: totalMs });
  return _freeze({ ok: summary.fail === 0, summary });
}