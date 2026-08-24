import type { LiveTree } from "hson-live/livetree";
import { serialize_hosted_case_diagnostic } from "./hosted-test-report-view";
import type {
  FrozenRowArtifact,
  FrozenTestEvidenceIndex,
  FrozenTestSuite,
  FrozenTestTiming,
} from "./frozen-test-evidence-client";

export function format_frozen_evidence_size(rawBytes: number): string {
  if (rawBytes < 1_000) return `${rawBytes} B`;
  if (rawBytes < 1_000_000) return `${(rawBytes / 1_000).toFixed(1)} kB`;
  return `${(rawBytes / 1_000_000).toFixed(1)} MB`;
}

export function format_frozen_test_duration(timing: FrozenTestTiming): string {
  const value = timing.ms ?? timing.durationMs ?? timing.runnerMs ?? timing.hostMs;
  if (value === null || value === undefined) return "—";
  if (value < 1) return `${value.toFixed(2)} ms`;
  if (value < 1_000) return `${value.toFixed(1)} ms`;
  return `${(value / 1_000).toFixed(2)} s`;
}

function error_text(error: Readonly<Record<string, unknown>>): string {
  const message = typeof error.message === "string" ? error.message : JSON.stringify(error);
  const identity = typeof error.kind === "string" ? `${error.kind}: ` : "";
  const fields = [
    typeof error.expected === "string" ? `expected: ${error.expected}` : "",
    typeof error.actual === "string" ? `actual: ${error.actual}` : "",
    typeof error.stack === "string" ? error.stack : "",
  ].filter(Boolean);
  return `${identity}${message}${fields.length === 0 ? "" : `\n${fields.join("\n")}`}`;
}

export function serialize_frozen_row_artifact(artifact: FrozenRowArtifact): string {
  if (artifact.owner === "case" && artifact.diagnostic !== null) return serialize_hosted_case_diagnostic(artifact.diagnostic);
  const source = artifact.owner === "case" ? artifact.testCase : artifact.suite;
  const title = typeof source.title === "string" ? source.title : artifact.owner === "case" ? artifact.caseId : artifact.suiteId;
  const status = typeof source.status === "string" ? source.status.toUpperCase() : "FROZEN";
  const lines = [title, `id: ${artifact.owner === "case" ? artifact.caseId : artifact.suiteId}`, `${status} · ${artifact.category}`];
  for (const error of artifact.errors) lines.push("", "[error]", error_text(error));
  for (const evidence of artifact.evidence) {
    const meta = [evidence.kind, evidence.mediaType, evidence.truncated ? "truncated" : ""].filter(Boolean).join(" · ");
    lines.push("", `[${evidence.name}] ${meta}`, evidence.content);
    if (evidence.reference !== null) lines.push(`attachment: ${evidence.reference}`);
  }
  return lines.join("\n");
}

export function serialize_frozen_index_summary(index: FrozenTestEvidenceIndex): string {
  const totalCases = index.suites.reduce((total, suite) => total + suite.cases.length, 0);
  const lines = [
    "Frozen test inventory",
    `deployment: ${index.deployment.hsonDeployCommit}`,
    ...(index.capture?.candidateId === undefined ? [] : [`capture: ${String(index.capture.candidateId)}`]),
    ...(index.capture?.capturedAt === undefined ? [] : [`captured: ${String(index.capture.capturedAt)}`]),
    `totals: ${index.suites.length} suites · ${totalCases} cases`,
  ];
  for (const category of index.categories) {
    lines.push("", `${category.id.toUpperCase()} · ${category.status.toUpperCase()} · ${category.suiteCounts.total} suites · ${category.caseCounts.total} cases · ${format_frozen_test_duration(category.timing)}`);
    const suites = index.suites.filter((suite) => suite.category === category.id).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
    for (const suite of suites) {
      lines.push(`${suite.status.toUpperCase().padEnd(5)} ${format_frozen_test_duration(suite.timing).padStart(10)} ${suite.id} — ${suite.title} — ${suite.counts.passed} pass · ${suite.counts.failed} fail · ${suite.counts.skipped} skip`);
      for (const item of [...suite.cases].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))) {
        lines.push(`  ${item.status.toUpperCase().padEnd(5)} ${format_frozen_test_duration(item.timing).padStart(10)} ${item.id} — ${item.title}`);
      }
    }
  }
  return lines.join("\n");
}

export type FrozenEvidenceSurface = Readonly<{ root: LiveTree; dispose(): void }>;

export function mount_frozen_generic_evidence(host: LiveTree, artifact: FrozenRowArtifact): FrozenEvidenceSurface {
  const id = artifact.owner === "case" ? artifact.caseId : artifact.suiteId;
  const root = host.create.div().attrs.setMany({
    role: "dialog", "aria-modal": "true", "aria-label": `Frozen evidence for ${id}`,
    "data-testid": "frozen-row-evidence", "data-frozen-evidence-owner": artifact.owner,
  }).css.setMany({
    position: "absolute", inset: "0", zIndex: "120", display: "grid", gridTemplateRows: "auto minmax(0,1fr)",
    padding: "1rem", boxSizing: "border-box", background: "rgba(8,10,9,.985)", color: "#e8e4d7",
    fontFamily: '"DM Mono",ui-monospace,monospace', pointerEvents: "auto",
  });
  const header = root.create.header().css.setMany({ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: "1rem", borderBottom: "1px solid #49534d", paddingBottom: ".75rem" });
  header.create.div().text.set(id).css.setMany({ color: "#d7ff70", overflowWrap: "anywhere" });
  const close = header.create.button().attrs.setMany({ type: "button", "aria-label": "Close frozen evidence" }).text.set("[ close ]")
    .css.setMany({ color: "#d7ff70", border: "1px solid #49534d", padding: ".35rem .6rem", cursor: "pointer" });
  root.create.pre().attrs.set("data-testid", "frozen-row-evidence-text").text.set(serialize_frozen_row_artifact(artifact))
    .css.setMany({ whiteSpace: "pre-wrap", overflow: "auto", minHeight: "0", margin: "0", paddingTop: "1rem" });
  let disposed = false;
  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    listener.off();
    if (!root.isDisposed) root.remove();
  };
  const listener = close.listen.onClick(dispose);
  return Object.freeze({ root, dispose });
}

export function frozen_suite_row_timing(suite: FrozenTestSuite): string {
  return format_frozen_test_duration(suite.timing);
}
