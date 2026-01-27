import type { TestEvent, TestFailure, TestSummary } from "./tests.types";

export class TestRecorder {
    private suites = 0;
    private cases = 0;
    private pass = 0;
    private fail = 0;
    private skip = 0;
    private msTotal = 0;
    private readonly failures: TestFailure[] = [];
    private readonly metaByCase = new Map<string, Record<string, string> | undefined>();

    public ingest(e: TestEvent): void {
        if (e.t === "suite_begin") this.suites += 1;
        if (e.t === "suite_end") this.msTotal += e.ms;

        if (e.t === "case_begin") {
            this.cases += 1;
            this.metaByCase.set(this.key(e.suite, e.name), e.meta);
            return;
        }

        if (e.t === "case_end") {
            if (e.status === "pass") this.pass += 1;
            else if (e.status === "fail") this.fail += 1;
            else this.skip += 1;

            if (e.status === "fail") {
                const meta = this.metaByCase.get(this.key(e.suite, e.name));

                // CHANGED: with exactOptionalPropertyTypes, do NOT set `meta: undefined`.
                const base = {
                    suite: e.suite,
                    name: e.name,
                    err: e.err ?? "Unknown error",
                    ms: e.ms,
                } as const;

                this.failures.push(meta ? { ...base, meta } : base);
            }
        }
    }

    public summary(): TestSummary {
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

    private key(suite: string, name: string): string {
        return `${suite}::${name}`;
    }
}