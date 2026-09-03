import type { TestAssertRow, TestEvent } from "../core/test-contracts";
import type { TestFailure } from "../../../src/shared/testing/test-contracts";
import type { ReportTotals } from "../../../src/shared/testing/test-run-contract";
import { normalize_case_end_event } from "./assert-row-status";

export type RecordedTestResult = Readonly<{
    totals: ReportTotals;
    failures: readonly TestFailure[];
    durationMs: number;
}>;

export class TestRecorder {
    private suites = 0;
    private cases = 0;
    private pass = 0;
    private fail = 0;
    private skip = 0;
    private unsupported = 0;
    private cancelled = 0;
    private error = 0;
    private msTotal = 0;
    private readonly failures: TestFailure[] = [];
    private readonly metaByCase = new Map<string, Record<string, string> | undefined>();
    private readonly assertsByCase = new Map<string, TestAssertRow[]>();
    private readonly activeCases = new Set<string>();
    private readonly completedCases = new Set<string>();

    public ingest(e: TestEvent): void {
        if (e.t === "suite_begin") this.suites += 1;
        if (e.t === "suite_end") this.msTotal += e.ms;

        if (e.t === "case_begin") {
            const key = this.key(e.suite, e.caseId);
            if (this.activeCases.has(key) || this.completedCases.has(key)) {
                throw new Error(`[TEST_RECORDER_DUPLICATE_CASE_BEGIN] ${key}`);
            }
            this.cases += 1;
            this.activeCases.add(key);
            this.metaByCase.set(key, e.meta);
            return;
        }

        if (e.t === "case_end") {
            const end = normalize_case_end_event(e);
            const k = this.key(e.suite, e.caseId);
            if (!this.activeCases.delete(k)) {
                throw new Error(`[TEST_RECORDER_CASE_END_WITHOUT_BEGIN] ${k}`);
            }
            if (this.completedCases.has(k)) {
                throw new Error(`[TEST_RECORDER_DUPLICATE_CASE_END] ${k}`);
            }
            this.completedCases.add(k);

            if (end.assertRows !== undefined) {
                this.assertsByCase.set(k, [...end.assertRows]);
            }


            if (end.status === "pass") this.pass += 1;
            else if (end.status === "fail") this.fail += 1;
            else if (end.status === "skip") this.skip += 1;
            else if (end.status === "unsupported") this.unsupported += 1;
            else this.error += 1;

            // merge metaPatch into stored meta
            if (end.metaPatch) {
                const prev = this.metaByCase.get(k);
                const next = prev ? { ...prev, ...end.metaPatch } : { ...end.metaPatch };
                this.metaByCase.set(k, next);
            }

            if (end.status === "fail" || end.status === "error") {
                const meta = this.metaByCase.get(k);
                const base = {
                    suite: end.suite,
                    caseId: end.caseId, name: end.name,
                    err: end.err ?? "Unknown error",
                    ms: end.ms,
                } as const;

                this.failures.push(meta ? { ...base, meta } : base);
            }
        }

        if (e.t === "case_cancelled") {
            const k = this.key(e.suite, e.caseId);
            if (!this.activeCases.delete(k)) {
                throw new Error(`[TEST_RECORDER_CASE_CANCELLED_WITHOUT_BEGIN] ${k}`);
            }
            if (this.completedCases.has(k)) {
                throw new Error(`[TEST_RECORDER_DUPLICATE_CASE_CANCELLED] ${k}`);
            }
            this.completedCases.add(k);
            this.cancelled += 1;
        }
    }

    public result(durationMs = this.msTotal): RecordedTestResult {
        if (this.activeCases.size !== 0) {
            throw new Error(`[TEST_RECORDER_INCOMPLETE_CASES] ${[...this.activeCases].join(", ")}`);
        }
        return Object.freeze({
            totals: Object.freeze({
                suites: this.suites,
                cases: this.cases,
                pass: this.pass,
                fail: this.fail,
                skip: this.skip,
                unsupported: this.unsupported,
                cancelled: this.cancelled,
                error: this.error,
            }),
            durationMs,
            failures: Object.freeze([...this.failures]),
        });
    }

    public hasFailure(): boolean {
        return this.fail > 0 || this.error > 0;
    }

    // small accessor for report rendering
    public getAsserts(suite: string, caseId: string): readonly TestAssertRow[] {
        return Object.freeze([...(this.assertsByCase.get(this.key(suite, caseId)) ?? [])]);
    }

    private key(suite: string, caseId: string): string {
        return `${suite}::${caseId}`;
    }
}
