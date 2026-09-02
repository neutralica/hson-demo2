export const TERMINAL_STATUSES = ["pass", "fail", "skip", "unsupported", "cancelled", "error"] as const;
export type TerminalStatus = typeof TERMINAL_STATUSES[number];
export type ReportTotals = Readonly<Record<TerminalStatus, number> & { cases: number; suites: number }>;
export type Diagnostic = Readonly<{ kind: string; message: string; stack?: string; expected?: string; actual?: string; truncated: boolean }>;
export type ArtifactReference = Readonly<{ name: string; mediaType: string; path: string; bytes: number; truncated: boolean }>;
export type SubprocessEvidence = Readonly<{ exitCode: number | null; signal: string | null; timedOut: boolean; cancelled: boolean; forceKilled: boolean; stdout: string; stderr: string; stdoutBytes: number; stderrBytes: number; stdoutTruncated: boolean; stderrTruncated: boolean }>;
export type CaseReport = Readonly<{ id: string; title: string; status: TerminalStatus; startedAt: string; endedAt: string; durationMs: number; diagnostics: readonly Diagnostic[]; artifacts: readonly ArtifactReference[] }>;
export type SuiteReport = Readonly<{ id: string; title: string; category: string; status: TerminalStatus; startedAt: string; endedAt: string; durationMs: number; totals: ReportTotals; diagnostics: readonly Diagnostic[]; artifacts: readonly ArtifactReference[]; cases: readonly CaseReport[]; subprocess?: SubprocessEvidence }>;
export type RunReport = Readonly<{ id: string; startedAt: string; endedAt: string; durationMs: number; status: TerminalStatus; repositories: readonly Readonly<{ name: string; revision: string | null; dirty: boolean | null }>[]; selection: Readonly<{ profile: string | null; ids: readonly string[] }>; totals: ReportTotals; diagnostics: readonly Diagnostic[]; artifacts: readonly ArtifactReference[]; suites: readonly SuiteReport[] }>;

export function empty_totals(): ReportTotals { return { pass: 0, fail: 0, skip: 0, unsupported: 0, cancelled: 0, error: 0, cases: 0, suites: 0 }; }
export function totals_for(cases: readonly CaseReport[], suites: readonly SuiteReport[] = []): ReportTotals { const t = empty_totals() as Record<string, number>; for (const c of cases) t[c.status] = (t[c.status] ?? 0) + 1; t.cases = cases.length; t.suites = suites.length; return t as ReportTotals; }
export function reduce_status(statuses: readonly TerminalStatus[]): TerminalStatus {
  if (statuses.includes("error")) return "error";
  if (statuses.includes("cancelled")) return "cancelled";
  if (statuses.includes("fail")) return "fail";
  if (statuses.includes("pass")) return "pass";
  if (statuses.includes("unsupported")) return "unsupported";
  return "skip";
}
