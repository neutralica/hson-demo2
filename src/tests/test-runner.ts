// test_runner.ts
// Purpose: deterministic runner. No DOM, no global state, no “clever” chaining.
// Emits events to recorder + console via a single callback.

import { TestRecorder } from "./test-recorder";
import type { TestEvent, TestSummary } from "./tests.types";

export type TestCase = Readonly<{
  suite: string; // CHANGED: runner inputs align with TestEvent
  name: string;
  run: () => void | Promise<void>;
  meta?: Record<string, string>;
}>;

export type TestSuite = Readonly<{
  suite: string; // CHANGED: not `name`
  cases: readonly TestCase[];
}>;

export type RunOptions = Readonly<{
  bail?: boolean;         // stop on first failure
  filterSuite?: string;   // exact match
  filterCase?: string;    // substring match
}>;

export type RunResult = Readonly<{
  ok: boolean;
  summary: TestSummary;
}>;

export async function run_suites(
  suites: readonly TestSuite[],
  onEvent: (e: TestEvent) => void,
  opts: RunOptions = {},
): Promise<RunResult> {
  const rec = new TestRecorder();
  const t0 = now();

  for (const suite of suites) {
    if (opts.filterSuite && suite.suite !== opts.filterSuite) continue;

    const s0 = now();
    emit(rec, onEvent, {
      t: "suite_begin",
      suite: suite.suite,
      totalPlanned: suite.cases.length,
    });

    for (const tc of suite.cases) {
      // CHANGED: tc already includes suite; enforce consistency if you want:
      // if (tc.suite !== suite.suite) continue; // or throw

      if (opts.filterSuite && tc.suite !== opts.filterSuite) continue;
      if (opts.filterCase && !tc.name.includes(opts.filterCase)) continue;

      const c0 = now();

      const evBase = {
        t: "case_begin",
        suite: tc.suite,
        name: tc.name,
      } as const;

      emit(rec, onEvent, tc.meta ? { ...evBase, meta: tc.meta } : evBase);

      try {
        await tc.run();
        emit(rec, onEvent, {
          t: "case_end",
          suite: tc.suite,
          name: tc.name,
          status: "pass",
          ms: now() - c0,
        });
      } catch (err) {
        const msg = asErrMsg(err);
        emit(rec, onEvent, {
          t: "case_end",
          suite: tc.suite,
          name: tc.name,
          status: "fail",
          ms: now() - c0,
          err: msg,
        });
        if (opts.bail) break;
      }
    }

    emit(rec, onEvent, { t: "suite_end", suite: suite.suite, ms: now() - s0 });
    if (opts.bail && rec.summary().fail > 0) break;
  }

  const totalMs = now() - t0;
  const summary = Object.freeze({ ...rec.summary(), msTotal: totalMs });

  return Object.freeze({ ok: summary.fail === 0, summary });
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