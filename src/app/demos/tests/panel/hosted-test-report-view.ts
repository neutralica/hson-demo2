import type { HostedTestCaseDiagnostic, HostedTestPanelRunResult } from "../../../../shared/hosted-tests/hosted-test-action.types";
import type { LiveTree } from "hson-live/livetree";
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
      lines.push("", `[${artifact.label}] lap ${artifact.lap} · ${artifact.format.toUpperCase()}`, artifact.text);
      if (artifact.node !== null) lines.push("node:", artifact.node);
    }
  }
  for (const step of diagnostic.trace) lines.push(`${step.ok ? "OK" : "FAIL"} ${step.step}${step.error ? ` — ${step.error}` : ""}`);
  return lines.join("\n");
}

function transform_circuit(diagnostic: HostedTestCaseDiagnostic): string {
  const trace = diagnostic.trace.length === 0
    ? ""
    : `<details class="trace"><summary>verified circuit trace (${diagnostic.trace.length})</summary><ol>${diagnostic.trace.map((step) => `<li class="${step.ok ? "ok" : "fail"}">${escape_html(step.step)}${step.error === null ? "" : ` — ${escape_html(step.error)}`}</li>`).join("")}</ol></details>`;
  const artifacts = diagnostic.artifacts.length === 0
    ? `<p class="muted">No circuit artifacts were reproduced.</p>`
    : `<div class="artifacts">${diagnostic.artifacts.map((artifact, index) => `<section class="artifact"><h2><span>${index + 1}</span> ${escape_html(artifact.label)}</h2><p class="meta">lap ${artifact.lap} · ${artifact.format}</p><pre>${escape_html(artifact.text)}</pre>${artifact.node === null ? "" : `<details><summary>canonical HsonNode</summary><pre>${escape_html(artifact.node)}</pre></details>`}</section>`).join("")}</div>`;
  return `${trace}${artifacts}`;
}

export function render_hosted_case_diagnostic_html(diagnostic: HostedTestCaseDiagnostic): string {
  const text = serialize_hosted_case_diagnostic(diagnostic);
  const body = diagnostic.type === "transform"
    ? transform_circuit(diagnostic)
    : `<pre>${escape_html(text)}</pre>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escape_html(diagnostic.caseKey)}</title><style>
  :root{color-scheme:dark}body{margin:0;background:#080a09;color:#e8e4d7;font:13px/1.5 "DM Mono",ui-monospace,monospace;padding:28px}header{border-bottom:1px solid #49534d;padding-bottom:14px;margin-bottom:20px}h1{font-size:17px;color:#d7ff70;margin:0 0 6px}h2{font-size:12px;letter-spacing:.06em;color:#7dd8cf;margin:0}.meta{color:#7c817d;margin:2px 0 8px}.status,.ok{color:${diagnostic.status === "pass" ? "#9ddf8b" : "#ff8778"}}.fail{color:#ff8778}pre{white-space:pre-wrap;overflow:auto;max-height:42vh;border-left:1px solid #49534d;padding:10px 12px;margin:0;background:#0c100e}.artifacts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.artifact{min-width:0;border-top:1px solid #354039;padding-top:10px}.artifact h2 span{color:#d7ff70}.muted{color:#7c817d}details{margin-top:8px;color:#b7c3bb}summary{cursor:pointer}.trace{margin:0 0 24px;padding:10px 12px;border:1px solid #354039}.trace ol{columns:2;column-gap:32px}@media(max-width:900px){.artifacts{grid-template-columns:1fr}.trace ol{columns:1}}
  </style></head><body><header><h1>${escape_html(diagnostic.name)}</h1><p>${escape_html(diagnostic.caseKey)}</p><p><span class="status">${diagnostic.status.toUpperCase()}</span> · ${escape_html(format_hosted_test_duration(diagnostic.ms))}</p></header>${body}</body></html>`;
}

export type HostedCaseReportSurface = Readonly<{
  root: LiveTree;
  dispose(): void;
}>;

export function mount_hosted_case_report(host: LiveTree, diagnostic: HostedTestCaseDiagnostic): HostedCaseReportSurface {
  const root = host.create.div()
    .attrs.setMany({
      role: "dialog",
      "aria-modal": "true",
      "aria-label": `Transform report for ${diagnostic.name}`,
      "data-testid": "hosted-case-report",
      "data-case-key": diagnostic.caseKey,
    })
    .css.setMany({
      position: "absolute",
      inset: "0",
      zIndex: "120",
      display: "grid",
      gridTemplateRows: "auto minmax(0, 1fr)",
      minWidth: "0",
      minHeight: "0",
      padding: "1rem",
      boxSizing: "border-box",
      background: "rgba(8, 10, 9, 0.985)",
      color: "#e8e4d7",
      fontFamily: '"DM Mono", ui-monospace, monospace',
      pointerEvents: "auto",
    });
  const header = root.create.header().css.setMany({
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    gap: "1rem",
    alignItems: "start",
    borderBottom: "1px solid #49534d",
    paddingBottom: "0.75rem",
  });
  const identity = header.create.div();
  identity.create.div().text.set(diagnostic.name).css.setMany({ color: "#d7ff70", fontSize: "1rem" });
  identity.create.div().text.set(diagnostic.caseKey).css.setMany({ color: "#b7c3bb", overflowWrap: "anywhere" });
  identity.create.div()
    .text.set(`${diagnostic.status.toUpperCase()} · ${format_hosted_test_duration(diagnostic.ms)}`)
    .css.setMany({ color: diagnostic.status === "pass" ? "#9ddf8b" : "#ff8778" });
  const close = header.create.button()
    .attrs.setMany({ type: "button", "aria-label": "Close Transform report" })
    .text.set("[ close ]")
    .css.setMany({ color: "#d7ff70", border: "1px solid #49534d", padding: "0.35rem 0.6rem", cursor: "pointer" });
  const body = root.create.div().css.setMany({ overflow: "auto", minHeight: "0", paddingTop: "1rem" });

  if (diagnostic.type === "transform") {
    if (diagnostic.trace.length > 0) {
      const trace = body.create.details()
        .attrs.setMany({ open: "", "data-hosted-report-trace": String(diagnostic.trace.length) })
        .css.setMany({ border: "1px solid #354039", padding: "0.65rem", marginBottom: "1rem" });
      trace.create.summary().text.set(`verified circuit trace (${diagnostic.trace.length})`).css.set.cursor("pointer");
      const list = trace.create.ol().css.setMany({ columns: "2", columnGap: "2rem" });
      for (const step of diagnostic.trace) {
        list.create.li()
          .text.set(`${step.step}${step.error === null ? "" : ` — ${step.error}`}`)
          .css.set.color(step.ok ? "#9ddf8b" : "#ff8778");
      }
    }
    const artifacts = body.create.div().css.setMany({
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(min(26rem, 100%), 1fr))",
      gap: "0.9rem",
    });
    diagnostic.artifacts.forEach((artifact, index) => {
      const section = artifacts.create.section()
        .attrs.setMany({
          "data-hosted-report-artifact": String(index + 1),
          "data-artifact-format": artifact.format,
          "data-artifact-lap": String(artifact.lap),
        })
        .css.setMany({ minWidth: "0", borderTop: "1px solid #354039", paddingTop: "0.65rem" });
      section.create.div().text.set(`${index + 1} · ${artifact.label}`).css.setMany({ color: "#7dd8cf", letterSpacing: "0.04em" });
      section.create.div().text.set(`lap ${artifact.lap} · ${artifact.format}`).css.setMany({ color: "#7c817d", marginBottom: "0.4rem" });
      section.create.pre()
        .attrs.set("data-hosted-report-text", String(index + 1))
        .text.set(artifact.text)
        .css.setMany({ whiteSpace: "pre-wrap", overflow: "auto", maxHeight: "24rem", margin: "0", padding: "0.65rem", borderLeft: "1px solid #49534d", background: "#0c100e" });
      if (artifact.node !== null) {
        const node = section.create.details()
          .attrs.set("data-hosted-report-node", String(index + 1))
          .css.setMany({ marginTop: "0.5rem", color: "#b7c3bb" });
        node.create.summary().text.set("canonical HsonNode").css.set.cursor("pointer");
        node.create.pre().text.set(artifact.node).css.setMany({ whiteSpace: "pre-wrap", overflow: "auto", maxHeight: "24rem", padding: "0.65rem", background: "#0c100e" });
      }
    });
  } else {
    body.create.pre().text.set(serialize_hosted_case_diagnostic(diagnostic)).css.setMany({ whiteSpace: "pre-wrap", overflow: "auto" });
  }

  let disposed = false;
  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    closeListener.off();
    if (!root.isDisposed) root.remove();
  };
  const closeListener = close.listen.onClick(dispose);
  return Object.freeze({ root, dispose });
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
