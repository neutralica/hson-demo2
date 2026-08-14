import type {
  HostedTestEvidence,
  HostedTestInfrastructureError,
  HostedTestReport,
  HostedTestSuiteRunReport,
} from "../../../../../tests/harness/reporting/hosted/hosted-test-report.types";
import type { TestCollection, TestSubject } from "../../../../../tests/harness/core/test-contracts";
import type { TestLifecycleStatus } from "../../../../../tests/harness/core/test-lifecycle";
import { format_hosted_test_duration } from "../../../../../tests/harness/reporting/hosted/hosted-test-timing";

export const HOSTED_TEST_PRESENTATION_GROUP_ORDER = Object.freeze([
  "transform", "livetree", "livemap", "livehost", "reflect", "unit", "dev",
] as const);

export type HostedTestPresentationGroup = typeof HOSTED_TEST_PRESENTATION_GROUP_ORDER[number] | "other";

const GROUP_LABELS: Readonly<Record<HostedTestPresentationGroup, string>> = Object.freeze({
  transform: "Transform",
  livetree: "LiveTree",
  livemap: "LiveMap",
  livehost: "LiveHost",
  reflect: "Reflect",
  unit: "Unit",
  dev: "Dev",
  other: "Other",
});

const FAILURE_LABELS = Object.freeze({
  assertion: "ASSERTION FAILURE",
  suite: "SUITE ERROR",
  infrastructure: "INFRASTRUCTURE ERROR",
  protocol: "PROTOCOL ERROR",
  timeout: "TIMEOUT",
  cancelled: "CANCELLED",
} as const);

export type HostedTestFailureCard = Readonly<{
  identity: string;
  title: string;
  status: TestLifecycleStatus;
  kind: HostedTestInfrastructureError["kind"];
  label: string;
  message: string;
  expected: string | null;
  actual: string | null;
  stack: string | null;
  executorId: string;
  relevantOutput: string | null;
}>;

export type HostedTestEvidenceSection = Readonly<{
  key: "diagnostics" | "stdout" | "stderr" | "warnings" | "protocol" | "raw" | "artifacts";
  label: string;
  entries: readonly string[];
}>;

export type HostedTestSuitePresentation = Readonly<{
  id: string;
  title: string;
  group: HostedTestPresentationGroup;
  groupLabel: string;
  status: TestLifecycleStatus;
  summary: string;
  duration: string;
  metadata: readonly string[];
  failures: readonly HostedTestFailureCard[];
  evidence: readonly HostedTestEvidenceSection[];
}>;

function collection_group(collections: readonly TestCollection[]): "unit" | "dev" | undefined {
  if (collections.includes("unit")) return "unit";
  if (collections.includes("dev")) return "dev";
  return undefined;
}

export function hosted_test_presentation_group(input: Readonly<{
  subject: TestSubject;
  collections: readonly TestCollection[];
}>): HostedTestPresentationGroup {
  const collection = collection_group(input.collections);
  if (collection !== undefined) return collection;
  return input.subject === "transform" || input.subject === "livetree" || input.subject === "livemap" || input.subject === "livehost" || input.subject === "reflect"
    ? input.subject
    : "other";
}

export function hosted_test_presentation_group_label(group: HostedTestPresentationGroup): string {
  return GROUP_LABELS[group];
}

function terminal_extra(status: TestLifecycleStatus, unsupported: number, cancelled: number): string {
  const extra = [
    ...(unsupported > 0 ? [`${unsupported} unsupported`] : []),
    ...(cancelled > 0 ? [`${cancelled} cancelled`] : []),
  ];
  return extra.length > 0 ? ` · ${extra.join(" · ")}` : status === "unsupported" || status === "cancelled" ? ` · ${status}` : "";
}

export function hosted_test_suite_summary(suite: HostedTestSuiteRunReport): string {
  const counts = suite.counts;
  const total = suite.executionShape === "opaque-aggregate"
    ? (counts.total > 0 ? counts.total : counts.declared)
    : counts.total;
  const noun = suite.executionShape === "opaque-aggregate"
    ? total === 1 ? "check" : "checks"
    : total === 1 ? "case" : "cases";
  return `${total} ${noun} · ${counts.passed} pass · ${counts.failed} fail`
    + (suite.executionShape === "cases" ? ` · ${counts.skipped} skip` : "")
    + terminal_extra(suite.status, counts.unsupported, counts.cancelled);
}

function strip_control_frames(stdout: string): string {
  return stdout
    .split(/(?<=\n)/)
    .filter((line) => !line.replace(/\r?\n$/, "").startsWith("<HSON_LIVE_TEST_COMPLETION>"))
    .join("");
}

function runtime_warning_line(line: string): boolean {
  return /(?:ExperimentalWarning|DeprecationWarning|\[DEP\d+\])/.test(line)
    || /^\(Use `node --trace-(?:warnings|deprecation)/.test(line);
}

export function classify_hosted_test_stderr(stderr: string): Readonly<{
  stderr: string;
  warnings: readonly string[];
}> {
  const ordinary: string[] = [];
  const warnings: string[] = [];
  let previousWasWarning = false;
  for (const line of stderr.split(/\r?\n/)) {
    if (line === "") continue;
    const isWarning: boolean = runtime_warning_line(line)
      || (previousWasWarning && line.includes("register(\"ts-node/esm\""));
    (isWarning ? warnings : ordinary).push(line);
    previousWasWarning = isWarning;
  }
  return Object.freeze({ stderr: ordinary.join("\n"), warnings: Object.freeze(warnings) });
}

function evidence_entry(evidence: HostedTestEvidence): string {
  const metadata = [
    evidence.name,
    `executor: ${evidence.executorId}`,
    ...(evidence.truncated ? ["truncated"] : []),
    ...(evidence.knownBytes === null ? [] : [`known bytes: ${evidence.knownBytes}`]),
    ...(evidence.mediaType === null ? [] : [`type: ${evidence.mediaType}`]),
    ...(evidence.reference === null ? [] : [`reference: ${evidence.reference}`]),
  ];
  return `${metadata.join(" · ")}\n${evidence.content}`.trim();
}

export function hosted_test_evidence_sections(suite: HostedTestSuiteRunReport): readonly HostedTestEvidenceSection[] {
  const buckets = new Map<HostedTestEvidenceSection["key"], string[]>();
  const add = (key: HostedTestEvidenceSection["key"], value: string): void => {
    const trimmed = value.trim();
    if (trimmed === "") return;
    const entries = buckets.get(key) ?? [];
    entries.push(trimmed);
    buckets.set(key, entries);
  };

  for (const evidence of [...suite.evidence].sort((left, right) => left.sequence - right.sequence)) {
    if (evidence.kind === "stdout") {
      add("stdout", strip_control_frames(evidence.content));
      continue;
    }
    if (evidence.kind === "stderr") {
      const classified = classify_hosted_test_stderr(evidence.content);
      add("stderr", classified.stderr);
      for (const warning of classified.warnings) add("warnings", warning);
      continue;
    }
    if (evidence.kind === "runtime_warning") {
      add("warnings", evidence.content);
      continue;
    }
    if (evidence.kind === "protocol_control") {
      add("protocol", evidence_entry(evidence));
      continue;
    }
    if (evidence.kind === "raw_process_output") {
      add("raw", evidence_entry(evidence));
      continue;
    }
    if (evidence.kind === "artifact") {
      add("artifacts", evidence_entry(evidence));
      continue;
    }
    add("diagnostics", evidence_entry(evidence));
  }

  const labels: Readonly<Record<HostedTestEvidenceSection["key"], string>> = Object.freeze({
    diagnostics: "diagnostics",
    stdout: "stdout",
    stderr: "stderr",
    warnings: "warnings",
    protocol: "protocol",
    raw: "raw process evidence",
    artifacts: "artifacts / traces",
  });
  const order: readonly HostedTestEvidenceSection["key"][] = Object.freeze([
    "diagnostics", "stdout", "stderr", "warnings", "protocol", "artifacts", "raw",
  ]);
  return Object.freeze(order.flatMap((key) => {
    const entries = buckets.get(key);
    return entries === undefined || entries.length === 0
      ? []
      : [Object.freeze({ key, label: labels[key], entries: Object.freeze([...entries]) })];
  }));
}

function primary_output(sections: readonly HostedTestEvidenceSection[]): string | null {
  const entry = sections.find((section) => section.key === "stderr")?.entries[0]
    ?? sections.find((section) => section.key === "stdout")?.entries[0];
  return entry === undefined ? null : entry.slice(0, 600);
}

function failure_card(
  identity: string,
  title: string,
  status: TestLifecycleStatus,
  error: HostedTestInfrastructureError,
  relevantOutput: string | null,
): HostedTestFailureCard {
  return Object.freeze({
    identity,
    title,
    status,
    kind: error.kind,
    label: FAILURE_LABELS[error.kind],
    message: error.message,
    expected: error.expected,
    actual: error.actual,
    stack: error.stack,
    executorId: error.executorId,
    relevantOutput,
  });
}

export function hosted_test_failure_cards(
  suite: HostedTestSuiteRunReport,
  sections: readonly HostedTestEvidenceSection[] = hosted_test_evidence_sections(suite),
): readonly HostedTestFailureCard[] {
  const output = primary_output(sections);
  const cards: HostedTestFailureCard[] = suite.errors.map((error) => failure_card(
    suite.id, suite.title, suite.status, error, output,
  ));
  for (const testCase of suite.cases) {
    for (const error of testCase.errors) {
      cards.push(failure_card(testCase.id, testCase.title, testCase.status, error, output));
    }
  }
  if (cards.length === 0 && suite.executionShape === "opaque-aggregate" && suite.status === "fail") {
    cards.push(failure_card(suite.id, suite.title, suite.status, {
      kind: "assertion",
      executorId: suite.executorIds[0] ?? "unassigned",
      message: `${suite.counts.failed} of ${suite.counts.executed} aggregate checks failed; no structured case identity was supplied.`,
      stack: null,
      expected: null,
      actual: null,
    }, output));
  }
  return Object.freeze(cards);
}

export function hosted_test_suite_presentation(suite: HostedTestSuiteRunReport): HostedTestSuitePresentation {
  const group = hosted_test_presentation_group(suite);
  const evidence = hosted_test_evidence_sections(suite);
  return Object.freeze({
    id: suite.id,
    title: suite.title,
    group,
    groupLabel: GROUP_LABELS[group],
    status: suite.status,
    summary: hosted_test_suite_summary(suite),
    duration: suite.durationMs === null ? suite.status : format_hosted_test_duration(suite.durationMs),
    metadata: Object.freeze([
      `id: ${suite.id}`,
      `source: ${suite.provenance}`,
      ...(suite.executorIds.length === 0 ? [] : [`executor: ${suite.executorIds.join(", ")}`]),
      ...(suite.runtime === null ? [] : [`runtime: ${suite.runtime}`]),
    ]),
    failures: hosted_test_failure_cards(suite, evidence),
    evidence,
  });
}

function concise_output(value: string): string {
  const first = value.trim().split(/\r?\n/, 1)[0] ?? "";
  return first.length <= 180 ? first : `${first.slice(0, 177)}…`;
}

function terminal_line(suite: HostedTestSuiteRunReport): string {
  return `${suite.status} ${suite.id} — ${hosted_test_suite_summary(suite)} — ${suite.durationMs === null ? suite.status : format_hosted_test_duration(suite.durationMs)}`;
}

export type HostedTestChronology = Readonly<{
  begin(recovered?: boolean): void;
  ingest(report: HostedTestReport): readonly string[];
  clearPresentation(): void;
}>;

export function make_hosted_test_chronology(): HostedTestChronology {
  let recovered = false;
  let first = true;
  const statuses = new Map<string, TestLifecycleStatus>();
  const evidenceSequences = new Map<string, number>();

  return Object.freeze({
    begin(isRecovery = false) {
      recovered = isRecovery;
      first = true;
      statuses.clear();
      evidenceSequences.clear();
    },
    ingest(report) {
      const lines: string[] = [];
      const chronological: Array<Readonly<{ sequence: number; ordinal: number; line: string }>> = [];
      let ordinal = 0;
      const append = (sequence: number, line: string): void => {
        chronological.push(Object.freeze({ sequence, ordinal: ordinal++, line }));
      };
      const suites = [...report.suiteRuns].sort((left, right) => left.order - right.order);
      if (first && recovered) {
        lines.push(`recovered ${report.run.id ?? report.run.suite} — authoritative ${report.run.status} snapshot`);
      }
      for (const suite of suites) {
        const previous = statuses.get(suite.id);
        if (previous === undefined) {
          if (first && recovered) lines.push(`state ${suite.id} — ${suite.status} — ${hosted_test_suite_summary(suite)}`);
          else {
            const total = suite.executionShape === "opaque-aggregate" ? suite.counts.declared : suite.counts.total;
            const noun = suite.executionShape === "opaque-aggregate"
              ? total === 1 ? "check" : "checks"
              : total === 1 ? "case" : "cases";
            lines.push(`queued ${suite.id} — ${total} ${noun}`);
            if (suite.status === "running") append(suite.lastSequence, `running ${suite.id}`);
            else if (suite.status !== "queued") append(suite.lastSequence, terminal_line(suite));
          }
        } else if (previous !== suite.status) {
          if (suite.status === "running") append(suite.lastSequence, `running ${suite.id}`);
          else if (suite.status !== "queued") append(suite.lastSequence, terminal_line(suite));
        }
        statuses.set(suite.id, suite.status);

        const lastEvidence = evidenceSequences.get(suite.id) ?? 0;
        for (const evidence of [...suite.evidence].sort((left, right) => left.sequence - right.sequence)) {
          if (evidence.sequence <= lastEvidence || (first && recovered)) continue;
          if (evidence.kind === "stdout") {
            const output = concise_output(strip_control_frames(evidence.content));
            if (output !== "") append(evidence.sequence, `stdout ${suite.id} — ${output}`);
          } else if (evidence.kind === "stderr") {
            const classified = classify_hosted_test_stderr(evidence.content);
            const stderr = concise_output(classified.stderr);
            if (stderr !== "") append(evidence.sequence, `stderr ${suite.id} — ${stderr}`);
            if (classified.warnings.length > 0) append(evidence.sequence, `warning ${suite.id} — ${classified.warnings.length} runtime warning line${classified.warnings.length === 1 ? "" : "s"}`);
          } else if (evidence.kind === "runtime_warning") {
            append(evidence.sequence, `warning ${suite.id} — ${concise_output(evidence.content)}`);
          }
        }
        evidenceSequences.set(suite.id, Math.max(lastEvidence, ...suite.evidence.map((entry) => entry.sequence), 0));
      }
      lines.push(...chronological
        .sort((left, right) => left.sequence - right.sequence || left.ordinal - right.ordinal)
        .map((entry) => entry.line));
      first = false;
      return Object.freeze(lines);
    },
    clearPresentation() {
      // Status/evidence cursors deliberately remain. Clear is local display
      // state and must not replay or mutate authoritative report history.
      // Intentionally no cursor mutation.
    },
  });
}
