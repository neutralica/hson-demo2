import type { TestAssertRow, TestEvent, TestFailure, TestSummary } from "../core/test-contracts";
import { normalize_case_end_event } from "./assert-row-status";


export class TestRecorder {
    private suites = 0;
    private cases = 0;
    private pass = 0;
    private fail = 0;
    private skip = 0;
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
            else this.skip += 1;

            // merge metaPatch into stored meta
            if (end.metaPatch) {
                const prev = this.metaByCase.get(k);
                const next = prev ? { ...prev, ...end.metaPatch } : { ...end.metaPatch };
                this.metaByCase.set(k, next);
            }

            if (end.status === "fail") {
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
    }
    
    public summary(): TestSummary {
        if (this.activeCases.size !== 0) {
            throw new Error(`[TEST_RECORDER_INCOMPLETE_CASES] ${[...this.activeCases].join(", ")}`);
        }
        return Object.freeze({
            suites: this.suites,
            cases: this.cases,
            pass: this.pass,
            fail: this.fail,
            skip: this.skip,
            msTotal: this.msTotal,
            failures: Object.freeze([...this.failures]),
        });
    }

    // small accessor for report rendering
    public getAsserts(suite: string, caseId: string): readonly TestAssertRow[] {
        return Object.freeze([...(this.assertsByCase.get(this.key(suite, caseId)) ?? [])]);
    }

    private key(suite: string, caseId: string): string {
        return `${suite}::${caseId}`;
    }
}
