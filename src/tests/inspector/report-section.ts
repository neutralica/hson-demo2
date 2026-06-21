
import type { CaseReport } from "../../app/phases/phase-3-demo/demo-test/tests.types";
import { _freeze } from "../../app/phases/phase-3-demo/demo-test/tests.consts";
import { get_final_artifacts } from "./inspector.helpers";
import type { Artifact, LoopReport } from "hson-live/diagnostics";

type ReportSection = Readonly<{
    title: string;
    bodyText: string;           // for copy
    bodyHtml?: string;          // optional for view (or build html from text)
}>;

type AssertRow = Readonly<{
  ok: boolean;
  label: string;
  actual?: string;
  expected?: string;
}>;

type CaseReportWithAssertRows = CaseReport & Readonly<{
  assertRows?: readonly AssertRow[];
}>;

function assert_rows_to_text(rows: readonly AssertRow[]): string {
  if (!rows.length) return "—";

  return rows.map((row, i) => {
    const head = `${row.ok ? "ok" : "FAIL"}  #${i}  ${row.label}`;
    const actual = row.actual !== undefined ? `\nactual: ${row.actual}` : "";
    const expected = row.expected !== undefined ? `\nexpected: ${row.expected}` : "";
    return `${head}${actual}${expected}`;
  }).join("\n\n");
}

export function loopreport_to_sections(r: LoopReport): readonly ReportSection[] {
  const lines: string[] = [];
  lines.push(`ok: ${r.ok}`);
  lines.push(`entry: ${String(r.entry)}`);
  lines.push(`dir: ${String(r.dir)}`);
  lines.push(`times: ${String(r.times)}`);
  lines.push(`failures: ${String(r.failures?.length ?? 0)}`);
  lines.push(`hash: —`);  // placeholder (post-normalization later)
  lines.push(`norm: —`);  // placeholder (you can thread norms here later)

  const summary = lines.join("\n");

  // Trace (include error text if present)
  const trace = (r.trace ?? []).map((t, i) => {
    const ok = t.ok ? "OK" : "FAIL";
    const step = String(t.step ?? "");
    const err = (t as any).error ? ` — ${(t as any).error}` : "";
    return `${i.toString().padStart(3, " ")}  ${ok}  ${step}${err}`;
  }).join("\n") || "—";

  // Failures (your report already has failures[]; keep it separate)
  const failures = (r.failures ?? []).map((f, i) => {
    const ok = f.ok ? "OK" : "FAIL";
    const step = String(f.step ?? "");
    const err = (f as any).error ? ` — ${(f as any).error}` : "";
    return `${i.toString().padStart(3, " ")}  ${ok}  ${step}${err}`;
  }).join("\n") || "—";

  // Artifacts: stable sort, and derive “finals” from the last lap
  const arts =
    ((r as unknown as { artifacts?: readonly Artifact[] }).artifacts ?? []);

  const sorted = [...arts].sort((a, b) => {
    if (a.lap !== b.lap) return a.lap - b.lap;
    return String(a.fmt).localeCompare(String(b.fmt));
  });

  const artifactsText =
    sorted.length
      ? sorted.map((a) => {
          const label = a.label ?? `lap ${a.lap}`;
          const fmt = String(a.fmt);
          const text = String(a.text ?? "");
          return `=== ${label} (${fmt}) ===\n${text}`;
        }).join("\n\n")
      : "—";

  // Derived finals: last artifact per fmt by max lap
  const finals = (() => {
    if (!sorted.length) return "—";
    const byFmt = new Map<string, Artifact>();
    for (const a of sorted) {
      const fmt = String(a.fmt);
      const prev = byFmt.get(fmt);
      if (!prev || a.lap > prev.lap) byFmt.set(fmt, a);
    }
    const parts: string[] = [];
    for (const fmt of ["json", "hson", "html"]) {
      const a = byFmt.get(fmt);
      if (a) parts.push(`--- final ${fmt} ---\n${String(a.text ?? "")}`);
    }
    return parts.join("\n\n") || "—";
  })();

  return _freeze([
    _freeze({ title: "Summary", bodyText: summary }),
    _freeze({ title: "Trace", bodyText: trace }),
    _freeze({ title: "Failures", bodyText: failures }),
    _freeze({ title: "Final artifacts", bodyText: finals }),
    _freeze({ title: "All artifacts", bodyText: artifactsText }),
  ]);
}

export function report_to_sections(r: CaseReport): readonly ReportSection[] {
  const assertRows = (r as CaseReportWithAssertRows).assertRows ?? [];
  const assertFailCount = assertRows.filter((row) => !row.ok).length;
  const head = [
    `${r.status.toUpperCase()}  ${r.suite} :: ${r.name}`,
    r.ms !== undefined ? `ms: ${r.ms.toFixed(1)}` : `ms: —`,
    r.hashes ? `hash: (pending)` : `hash: —`,
    r.norms?.length ? `norm: ${r.norms.join(" | ")}` : `norm: —`,
    `assertions: ${assertRows.length}`,
    `assertion failures: ${assertFailCount}`,
  ].join("\n");

  const steps = r.steps.map((s) => {
    const line = `${s.ok ? "ok" : "FAIL"}  #${s.i}  ${s.label}`;
    const err = s.err ? `\nERR: ${s.err}` : "";
    const arts = (s.artifacts ?? []).map((a) => {
      const t = a.text ?? "";
      return `\n--- ${a.label ?? a.fmt} (${a.fmt}) ---\n${t}`;
    }).join("");
    return `${line}${err}${arts}`;
  }).join("\n\n");

  // NEW: finals derived from steps (no r.final anywhere)
  const finals = get_final_artifacts(r);
  const finalsText = [
    finals.json ? `--- final json ---\n${finals.json.text}` : "",
    finals.hson ? `--- final hson ---\n${finals.hson.text}` : "",
    finals.html ? `--- final html ---\n${finals.html.text}` : "",
  ].filter(Boolean).join("\n\n") || "—";

  const assertionsText = assert_rows_to_text(assertRows);

  return _freeze([
    _freeze({ title: "Summary", bodyText: head }),
    _freeze({ title: "Trace", bodyText: steps || "—" }),
    _freeze({ title: "Assertions", bodyText: assertionsText }),
    _freeze({ title: "Final artifacts", bodyText: finalsText }),
  ]);
}