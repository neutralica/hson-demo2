import type { TestEvent } from "../../core/test-contracts";
import { reduce_status, totals_for, type CaseReport, type SuiteReport, type TerminalStatus } from "./run-report-contract";
import type { LocalRedactor } from "./run-report-redaction";
type MutableCase = Omit<CaseReport, "status" | "endedAt" | "durationMs" | "diagnostics"> & { status?: TerminalStatus; endedAt?: string; durationMs?: number; diagnostics: CaseReport["diagnostics"] };
type MutableSuite = { id: string; title: string; category: string; startedAt: string; endedAt?: string; diagnostics: SuiteReport["diagnostics"]; cases: Map<string, MutableCase> };
export class TestEventAdapter {
  readonly #suites = new Map<string, MutableSuite>();
  constructor(private readonly redactor: LocalRedactor, private readonly now: () => Date = () => new Date()) {}
  ingest(event: TestEvent): void {
    const at = this.now().toISOString();
    if (event.t === "suite_begin") { this.#suites.set(event.suite, { id: event.suite, title: event.suite, category: event.suite.split("/")[0] ?? "", startedAt: at, diagnostics: [], cases: new Map() }); return; }
    const suite = this.#suites.get(event.suite); if (!suite) return;
    if (event.t === "case_begin") { suite.cases.set(event.caseId, { id: event.caseId, title: event.name, startedAt: at, diagnostics: [], artifacts: [] }); return; }
    if (event.t === "case_end" || event.t === "case_cancelled") { const prior = suite.cases.get(event.caseId) ?? { id: event.caseId, title: event.name, startedAt: at, diagnostics: [], artifacts: [] }; if (prior.status !== undefined) return; const failure = event.t === "case_end" && event.err ? [this.redactor.diagnostic("test", event.err)] : []; suite.cases.set(event.caseId, { ...prior, status: event.t === "case_cancelled" ? "cancelled" : event.status, endedAt: at, durationMs: event.ms, diagnostics: failure }); }
    if (event.t === "suite_end") suite.endedAt = at;
  }
  finalize(): readonly SuiteReport[] { return [...this.#suites.values()].map((suite) => { const cases = [...suite.cases.values()].filter((c): c is MutableCase & { status: TerminalStatus; endedAt: string; durationMs: number } => c.status !== undefined && c.endedAt !== undefined && c.durationMs !== undefined).map((c) => ({ ...c, status: c.status, endedAt: c.endedAt, durationMs: c.durationMs })); const status = reduce_status(cases.map((c) => c.status)); return { id: suite.id, title: suite.title, category: suite.category, status, startedAt: suite.startedAt, endedAt: suite.endedAt ?? new Date().toISOString(), durationMs: Math.max(0, Date.parse(suite.endedAt ?? suite.startedAt) - Date.parse(suite.startedAt)), totals: totals_for(cases), diagnostics: suite.diagnostics, artifacts: [], cases }; }); }
}
