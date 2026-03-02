// test_runner.ts
// Purpose: deterministic runner. No DOM, no global state, no “clever” chaining.
// Emits events to recorder + console via a single callback.

import { _freeze } from "./tests.consts";
import { TestRecorder } from "./test-recorder";
import type { RunOptions, RunResult, TestEvent, TestSuite } from "./tests.types";



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


// export async function run_test_suites(
//   suites: readonly TestSuite[],
//   onEvent: (e: TestEvent) => void,
//   opts: RunOptions = {},
// ): Promise<RunResult> {
//   const rec = new TestRecorder();
//   const t0 = now();

//   for (const suite of suites) {
//     if (opts.filterSuite && suite.suite !== opts.filterSuite) continue;

//     const s0 = now();
//     emit(rec, onEvent, {
//       t: "suite_begin",
//       suite: suite.suite,
//       totalPlanned: suite.cases.length,
//     });

//     for (const tc of suite.cases) {
//       if (opts.filterSuite && tc.suite !== opts.filterSuite) continue;
//       if (opts.filterCase && !tc.name.includes(opts.filterCase)) continue;

//       const c0 = now();

//       const evBase = {
//         t: "case_begin",
//         suite: tc.suite,
//         name: tc.name,
//       } as const;

//       emit(rec, onEvent, tc.meta ? { ...evBase, meta: tc.meta } : evBase);

//       try {
//         // capture optional return (and await works for both sync+async)
//         const ret = await tc.run();
//         const metaPatch =
//           ret && typeof ret === "object" && "metaPatch" in ret
//             ? (ret as { metaPatch?: Record<string, string> }).metaPatch
//             : undefined;

//         // include metaPatch on case_end when present
//         const endBase = {
//           t: "case_end",
//           suite: tc.suite,
//           name: tc.name,
//           status: "pass",
//           ms: now() - c0,
//         } as const;

//         emit(rec, onEvent, metaPatch ? { ...endBase, metaPatch } : endBase);
//       } catch (err) {
//         const msg = asErrMsg(err);

//         emit(rec, onEvent, {
//           t: "case_end",
//           suite: tc.suite,
//           name: tc.name,
//           status: "fail",
//           ms: now() - c0,
//           err: msg,
//         });

//         if (opts.bail) break;
//       }
//     }

//     emit(rec, onEvent, { t: "suite_end", suite: suite.suite, ms: now() - s0 });
//     if (opts.bail && rec.summary().fail > 0) break;
//   }

//   const totalMs = now() - t0;
//   const summary = _freeze({ ...rec.summary(), msTotal: totalMs });

//   return _freeze({ ok: summary.fail === 0, summary });
// }

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

export async function run_test_suites(
  suites: readonly TestSuite[],
  onEvent: (e: TestEvent) => void,
  opts: RunOptions = {},
): Promise<RunResult> {
  const rec = new TestRecorder();
  const t0 = now();

  // CHANGED
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

      try {
        const ret = await tc.run();

        const metaPatch =
          ret && typeof ret === "object" && "metaPatch" in ret
            ? (ret as { metaPatch?: Record<string, string> }).metaPatch
            : undefined;

        const endBase = {
          t: "case_end",
          suite: tc.suite,
          name: tc.name,
          status: "pass",
          ms: now() - c0,
        } as const;

        emit(rec, onEvent, metaPatch ? { ...endBase, metaPatch } : endBase);
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

      // CHANGED: yield periodically so UI can paint + pointer events can run
      caseCounter += 1;
      if (yieldEvery > 0 && caseCounter % yieldEvery === 0) {
        await yield_to_ui();
      }
    }

    emit(rec, onEvent, { t: "suite_end", suite: suite.suite, ms: now() - s0 });

    // CHANGED: optional suite-level yield
    if (opts.yieldBetweenSuites) {
      await yield_to_ui();
    }

    if (opts.bail && rec.summary().fail > 0) break;
  }

  const totalMs = now() - t0;
  const summary = _freeze({ ...rec.summary(), msTotal: totalMs });
  return _freeze({ ok: summary.fail === 0, summary });
}