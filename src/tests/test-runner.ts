// test_runner.ts
// Purpose: deterministic runner. No DOM, no global state, no “clever” chaining.
// Emits events to recorder + console via a single callback.

import { TestRecorder } from "./test-recorder";
import type { TestEvent, TestSummary } from "./tests.types";

export type TestCase = Readonly<{
    name: string;
    run: () => void | Promise<void>;
    meta?: Record<string, string>;
}>;

export type TestSuite = Readonly<{
    name: string;
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
        if (opts.filterSuite && suite.name !== opts.filterSuite) continue;

        const s0 = now();
        emit(rec, onEvent, { t: "suite_begin", suite: suite.name, totalPlanned: suite.cases.length });

        for (const tc of suite.cases) {
            if (opts.filterCase && !tc.name.includes(opts.filterCase)) continue;

            const c0 = now();
            // CHANGED: don't emit `meta: undefined` under exactOptionalPropertyTypes
            const evBase = {
                t: "case_begin",
                suite: suite.name,
                name: tc.name,
            } as const;

            emit(rec, onEvent, tc.meta ? { ...evBase, meta: tc.meta } : evBase);
            try {
                await tc.run();
                emit(rec, onEvent, { t: "case_end", suite: suite.name, name: tc.name, status: "pass", ms: now() - c0 });
            } catch (err) {
                const msg = asErrMsg(err);
                emit(rec, onEvent, { t: "case_end", suite: suite.name, name: tc.name, status: "fail", ms: now() - c0, err: msg });
                if (opts.bail) break;
            }
        }

        emit(rec, onEvent, { t: "suite_end", suite: suite.name, ms: now() - s0 });
        if (opts.bail && rec.summary().fail > 0) break;
    }

    // CHANGED: add total runtime as a synthetic suite_end for easy aggregation
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