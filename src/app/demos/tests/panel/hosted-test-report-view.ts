import type { HostedTestCaseDiagnostic, HostedTestPanelRunResult } from "../../../../shared/hosted-tests/hosted-test-action.types";
import type { HostedTestReport } from "../../../../shared/hosted-tests/hosted-test-report.types";
import { hosted_test_report_cases } from "../../../../shared/hosted-tests/hosted-test-report.types";
import { format_hosted_test_duration } from "../../../../shared/hosted-tests/hosted-test-timing";
import { hosted_test_projection_summary } from "./hosted-test-report-summary";
import { classify_hosted_test_stderr, hosted_test_suite_presentation } from "./hosted-test-presentation";

function escape_html(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

/**
 * Removes only the known ts-node/esm bootstrap notices from the panel's
 * visible stderr. The report retains the original stderr verbatim.
 */
export function visible_external_launcher_stderr(stderr: string): string {
  const classified = classify_hosted_test_stderr(stderr);
  if (classified.warnings.length > 0) return classified.stderr;
  const lines = stderr.split("\n");
  const visible: string[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (/^\(node:\d+\) ExperimentalWarning: `--experimental-loader` may be removed/.test(line)
      && lines[index + 1]?.includes("register(\"ts-node/esm\"")) {
      index += 1;
      if (lines[index + 1]?.startsWith("(Use `node --trace-warnings")) index += 1;
      continue;
    }
    if (/^\(node:\d+\) \[DEP0180\] DeprecationWarning: fs\.Stats constructor is deprecated\.$/.test(line)) {
      if (lines[index + 1]?.startsWith("(Use `node --trace-deprecation")) index += 1;
      continue;
    }
    visible.push(line);
  }
  return visible.join("\n");
}

export function serialize_hosted_case_diagnostic(diagnostic: HostedTestCaseDiagnostic): string {
  const lines = [
    diagnostic.name,
    `id: ${diagnostic.caseKey}`,
    `${diagnostic.status.toUpperCase()}  ${format_hosted_test_duration(diagnostic.ms)}`,
  ];
  if (diagnostic.error) lines.push("", diagnostic.error);
  for (const assertion of diagnostic.assertions) {
    lines.push(`${assertion.ok ? "OK" : "FAIL"} ${assertion.label}`);
    if (assertion.expected !== null) lines.push(`  expected: ${assertion.expected}`);
    if (assertion.actual !== null) lines.push(`  actual: ${assertion.actual}`);
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
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escape_html(diagnostic.caseKey)}</title><style>
  :root{color-scheme:dark}body{margin:0;background:#080a09;color:#e8e4d7;font:13px/1.5 "DM Mono",ui-monospace,monospace;padding:28px}header{border-bottom:1px solid #49534d;padding-bottom:14px;margin-bottom:20px}h1{font-size:17px;color:#d7ff70;margin:0 0 6px}h2{font-size:12px;text-transform:uppercase;letter-spacing:.12em;color:#7dd8cf}p{margin:0}.status{color:${diagnostic.status === "pass" ? "#9ddf8b" : "#ff8778"}}pre{white-space:pre-wrap;overflow:auto;max-height:68vh;border-left:1px solid #49534d;padding:10px 12px;margin:0;background:#0c100e}.artifacts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.muted{color:#7c817d}details{margin-top:8px;color:#b7c3bb}summary{cursor:pointer}@media(max-width:900px){.artifacts{grid-template-columns:1fr}}
  </style></head><body><header><h1>${escape_html(diagnostic.name)}</h1><p>${escape_html(diagnostic.caseKey)}</p><p><span class="status">${diagnostic.status.toUpperCase()}</span> · ${escape_html(format_hosted_test_duration(diagnostic.ms))}</p></header>${body}</body></html>`;
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
  const summary = hosted_test_projection_summary(report);
  const presentations = report.suiteRuns.map(hosted_test_suite_presentation);
  const lines = [
    `${result.suite} — run ${result.runId}`,
    `${result.ok ? "PASS" : "FAIL"} · round trip ${format_hosted_test_duration(result.timing.roundTripMs)} · runner ${format_hosted_test_duration(result.timing.runnerMs)} · host ${format_hosted_test_duration(result.timing.hostMs)}`,
    `suites: ${report.suiteRuns.length}`,
    ...(summary.canonical.total > 0
      ? [`canonical cases: ${summary.canonical.pass} passed · ${summary.canonical.fail} failed · ${summary.canonical.skip} skipped`]
      : []),
    ...(summary.launchers.total > 0
      ? [`opaque suites: ${summary.launchers.pass}/${summary.launchers.total} passed · ${summary.launchers.fail} failed · ${summary.launchers.declaredChecks} checks`]
      : []),
    ...(summary.certifications.total > 0
      ? [`certifications: ${summary.certifications.pass}/${summary.certifications.total} passed · ${summary.certifications.fail} failed`]
      : []),
    "",
    ...cases.map((testCase) => `${testCase.status.toUpperCase().padEnd(11)} ${testCase.ms === null ? testCase.status.padStart(9) : format_hosted_test_duration(testCase.ms).padStart(9)} ${testCase.id} — ${testCase.title}${testCase.err ? ` — ${testCase.err}` : ""}`),
  ];
  for (const presentation of presentations) {
    lines.push("", `${presentation.status.toUpperCase()} ${presentation.id} — ${presentation.summary} — ${presentation.duration}`);
    lines.push(...presentation.metadata);
    for (const failure of presentation.failures) {
      lines.push("", `${failure.label} — ${failure.identity}`, failure.message, `executor: ${failure.executorId}`);
      if (failure.expected !== null) lines.push(`expected: ${failure.expected}`);
      if (failure.actual !== null) lines.push(`actual: ${failure.actual}`);
      if (failure.stack !== null) lines.push(failure.stack);
    }
    for (const section of presentation.evidence) {
      lines.push("", `[${section.label}]`, ...section.entries);
    }
  }
  const failed = cases.filter((testCase) => testCase.status === "fail");
  for (let offset = 0; offset < failed.length; offset += 4) {
    const batch = failed.slice(offset, offset + 4);
    const diagnostics = await Promise.all(batch.map((testCase) => inspect(testCase.id)));
    for (const diagnostic of diagnostics) lines.push("", "---- failure detail ----", serialize_hosted_case_diagnostic(diagnostic));
  }
  return lines.join("\n");
}
