import type { HostedTestCaseDiagnostic, HostedTestPanelRunResult } from "../../hosted-test/hosted-test-action.types";
import type { HostedTestReport } from "../../hosted-test/hosted-test-report.types";
import { hosted_test_report_cases } from "../../hosted-test/hosted-test-report.types";
import { format_hosted_test_duration } from "../../hosted-test/hosted-test-timing";

function escape_html(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export function serialize_hosted_case_diagnostic(diagnostic: HostedTestCaseDiagnostic): string {
  const lines = [
    `${diagnostic.caseSuite} :: ${diagnostic.name}`,
    `${diagnostic.status.toUpperCase()}  ${format_hosted_test_duration(diagnostic.ms)}`,
  ];
  if (diagnostic.error) lines.push("", diagnostic.error);
  for (const assertion of diagnostic.assertions) {
    lines.push(`${assertion.ok ? "OK" : "FAIL"} ${assertion.label}`);
    if (assertion.actual !== null) lines.push(`  actual: ${assertion.actual}`);
    if (assertion.expected !== null) lines.push(`  expected: ${assertion.expected}`);
  }
  for (const value of diagnostic.values) lines.push("", `${value.label}:`, value.value ?? "unavailable");
  if (diagnostic.type === "transform") {
    for (const artifact of diagnostic.artifacts) {
      lines.push("", `[${artifact.format.toUpperCase()}]`, artifact.text);
      if (artifact.node !== null) lines.push("node:", artifact.node);
    }
  }
  for (const step of diagnostic.trace) lines.push(`${step.ok ? "OK" : "FAIL"} ${step.step}${step.error ? ` — ${step.error}` : ""}`);
  return lines.join("\n");
}

function transform_columns(diagnostic: HostedTestCaseDiagnostic): string {
  const formats = ["hson", "json", "html"] as const;
  return `<div class="artifacts">${formats.map((format) => {
    const matches = diagnostic.artifacts.filter((artifact) => artifact.format === format);
    const artifact = matches.at(-1);
    if (!artifact) return `<section><h2>${format}</h2><p class="muted">unavailable</p></section>`;
    return `<section><h2>${format}</h2><pre>${escape_html(artifact.text)}</pre>${artifact.node === null ? "" : `<details><summary>node</summary><pre>${escape_html(artifact.node)}</pre></details>`}</section>`;
  }).join("")}</div>`;
}

export function render_hosted_case_diagnostic_html(diagnostic: HostedTestCaseDiagnostic): string {
  const text = serialize_hosted_case_diagnostic(diagnostic);
  const body = diagnostic.type === "transform"
    ? transform_columns(diagnostic)
    : `<pre>${escape_html(text)}</pre>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escape_html(diagnostic.caseSuite)} :: ${escape_html(diagnostic.name)}</title><style>
  :root{color-scheme:dark}body{margin:0;background:#080a09;color:#e8e4d7;font:13px/1.5 "DM Mono",ui-monospace,monospace;padding:28px}header{border-bottom:1px solid #49534d;padding-bottom:14px;margin-bottom:20px}h1{font-size:17px;color:#d7ff70;margin:0 0 6px}h2{font-size:12px;text-transform:uppercase;letter-spacing:.12em;color:#7dd8cf}p{margin:0}.status{color:${diagnostic.status === "pass" ? "#9ddf8b" : "#ff8778"}}pre{white-space:pre-wrap;overflow:auto;max-height:68vh;border-left:1px solid #49534d;padding:10px 12px;margin:0;background:#0c100e}.artifacts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.muted{color:#7c817d}details{margin-top:8px;color:#b7c3bb}summary{cursor:pointer}@media(max-width:900px){.artifacts{grid-template-columns:1fr}}
  </style></head><body><header><h1>${escape_html(diagnostic.caseSuite)} :: ${escape_html(diagnostic.name)}</h1><p><span class="status">${diagnostic.status.toUpperCase()}</span> · ${escape_html(format_hosted_test_duration(diagnostic.ms))}</p></header>${body}</body></html>`;
}

export function open_hosted_case_report(diagnostic: HostedTestCaseDiagnostic): void {
  const url = URL.createObjectURL(new Blob([render_hosted_case_diagnostic_html(diagnostic)], { type: "text/html" }));
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  if (opened === null) throw new Error("The browser blocked the diagnostic report tab. Allow popups and try again.");
}

export async function copy_hosted_case_report(diagnostic: HostedTestCaseDiagnostic): Promise<void> {
  await navigator.clipboard.writeText(serialize_hosted_case_diagnostic(diagnostic));
}

export async function serialize_hosted_run_report(
  report: HostedTestReport,
  result: HostedTestPanelRunResult,
  inspect: (caseKey: string) => Promise<HostedTestCaseDiagnostic>,
): Promise<string> {
  const cases = hosted_test_report_cases(report);
  const lines = [
    `${result.suite} :: ${result.runId}`,
    `${result.ok ? "PASS" : "FAIL"} ${result.summary.pass}/${result.summary.cases} · round trip ${format_hosted_test_duration(result.timing.roundTripMs)} · runner ${format_hosted_test_duration(result.timing.runnerMs)} · host ${format_hosted_test_duration(result.timing.hostMs)}`,
    "",
    ...cases.map((testCase) => `${testCase.status.toUpperCase().padEnd(4)} ${format_hosted_test_duration(testCase.ms).padStart(9)} ${testCase.suite} :: ${testCase.name}${testCase.err ? ` — ${testCase.err}` : ""}`),
  ];
  const failed = cases.filter((testCase) => testCase.status === "fail");
  for (let offset = 0; offset < failed.length; offset += 4) {
    const batch = failed.slice(offset, offset + 4);
    const diagnostics = await Promise.all(batch.map((testCase) => inspect(testCase.key)));
    for (const diagnostic of diagnostics) lines.push("", "---- failure detail ----", serialize_hosted_case_diagnostic(diagnostic));
  }
  return lines.join("\n");
}
