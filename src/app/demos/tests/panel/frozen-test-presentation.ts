import type { LiveTree } from "hson-live/livetree";
import { OKLCH_VIBRANT } from "../../../core/consts/oklch.consts";
import { serialize_hosted_case_diagnostic } from "./hosted-test-report-view";
import { FROZEN_TEST_EXPLORER_CATEGORIES, project_frozen_test_explorer } from "./frozen-test-evidence-client";
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
  const projection = project_frozen_test_explorer(index);
  const lines = [
    "Test reports",
    `deployment: ${index.deployment.hsonDeployCommit}`,
    ...(index.capture?.candidateId === undefined ? [] : [`capture: ${String(index.capture.candidateId)}`]),
    ...(index.capture?.capturedAt === undefined ? [] : [`captured: ${String(index.capture.capturedAt)}`]),
    `totals: ${projection.overall.suites} suites · ${projection.overall.cases} cases · ${projection.overall.pass} pass · ${projection.overall.fail} fail`,
  ];
  for (const categoryId of FROZEN_TEST_EXPLORER_CATEGORIES) {
    const totals = projection.categories[categoryId];
    const category = index.categories.find((entry) => entry.id === categoryId)!;
    lines.push("", `${category.title} · ${category.status.toUpperCase()} · ${totals.suites} suites · ${totals.cases} cases · ${totals.pass} pass · ${totals.fail} fail · ${category.status === "unexecuted" ? "—" : format_frozen_test_duration(category.timing)}`);
  }
  return lines.join("\n");
}

export type FrozenEvidenceSurface = Readonly<{ root: LiveTree; dispose(): void }>;

export function mount_frozen_generic_evidence(
  host: LiveTree,
  artifact: FrozenRowArtifact,
  options: Readonly<{ onClose?: () => void }> = {},
): FrozenEvidenceSurface {
  const id = artifact.owner === "case" ? artifact.caseId : artifact.suiteId;
  const root = host.create.div().attrs.setMany({
    role: "region", "aria-label": `Evidence for ${id}`,
    "data-testid": "frozen-row-evidence", "data-frozen-evidence-owner": artifact.owner,
  }).css.setMany({
    position: "absolute", inset: "0", zIndex: "120", display: "grid", gridTemplateRows: "auto minmax(0,1fr)",
    padding: "1rem", boxSizing: "border-box", background: OKLCH_VIBRANT.voidInk, color: OKLCH_VIBRANT.ghost,
    fontFamily: '"DM Mono",ui-monospace,monospace', pointerEvents: "auto",
  });
  const header = root.create.header().css.setMany({ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: "1rem", borderBottom: `1px solid ${OKLCH_VIBRANT.graphite}`, paddingBottom: ".75rem" });
  const identity = header.create.div();
  identity.create.div().attrs.set("data-testid", "frozen-inspector-navigation")
    .text.set(`Saved ${artifact.owner} evidence · Browser Back returns to the tests explorer`)
    .css.setMany({ color: OKLCH_VIBRANT.cyanGlass, marginBottom: ".35rem" });
  identity.create.div().text.set(id).css.setMany({ color: OKLCH_VIBRANT.cyanGlass, overflowWrap: "anywhere" });
  const close = header.create.button().attrs.setMany({ type: "button", "aria-label": "Close evidence" }).text.set("[ close ]")
    .css.setMany({ color: OKLCH_VIBRANT.cyanGlass, background: OKLCH_VIBRANT.voidInk, border: `1px solid ${OKLCH_VIBRANT.graphite}`, padding: ".35rem .6rem", cursor: "pointer" });
  root.create.pre().attrs.set("data-testid", "frozen-row-evidence-text").text.set(serialize_frozen_row_artifact(artifact))
    .css.setMany({ whiteSpace: "pre-wrap", overflow: "auto", minHeight: "0", margin: "0", paddingTop: "1rem" });
  let disposed = false;
  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    listener.off();
    if (!root.isDisposed) root.remove();
  };
  const listener = close.listen.onClick(() => options.onClose?.() ?? dispose());
  return Object.freeze({ root, dispose });
}

export function frozen_suite_row_timing(suite: FrozenTestSuite): string {
  return format_frozen_test_duration(suite.timing);
}
