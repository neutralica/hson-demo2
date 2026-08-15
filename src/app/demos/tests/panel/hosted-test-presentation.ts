import type { HostedTestEvidence, HostedTestInfrastructureError, HostedTestReport, HostedTestSuiteRunReport } from "../../../../shared/hosted-tests/hosted-test-report.types";
import type { TestCollection, TestSubject } from "../../../../shared/testing/test-contracts";
import type { TestLifecycleStatus } from "../../../../shared/testing/test-lifecycle-contract";
import { format_hosted_test_duration } from "../../../../shared/hosted-tests/hosted-test-timing";

export const HOSTED_TEST_PRESENTATION_GROUP_ORDER = Object.freeze([
  "transform", "livetree", "livemap", "livehost", "reflect", "unit", "dev",
] as const);

export type HostedTestPresentationGroup = typeof HOSTED_TEST_PRESENTATION_GROUP_ORDER[number];

const GROUP_LABELS: Readonly<Record<HostedTestPresentationGroup, string>> = Object.freeze({
  transform: "Transform",
  livetree: "LiveTree",
  livemap: "LiveMap",
  livehost: "LiveHost",
  reflect: "Reflect",
  unit: "Unit",
  dev: "Dev",
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
  if (input.subject === "transform" || input.subject === "livetree" || input.subject === "livemap" || input.subject === "livehost" || input.subject === "reflect") {
    return input.subject;
  }
  throw new Error(`Hosted suite subject "${input.subject}" requires explicit Unit or Dev collection metadata.`);
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
  const total = suite.executionShape !== "cases" && suite.executionShape !== "browser-journeys"
    ? (counts.total > 0 ? counts.total : counts.declared)
    : counts.total;
  const noun = suite.executionShape === "opaque-aggregate"
    ? total === 1 ? "check" : "checks"
    : suite.executionShape === "certification-aggregate"
      ? total === 1 ? "certification" : "certifications"
      : total === 1 ? "case" : "cases";
  return `${total} ${noun} · ${counts.passed} pass · ${counts.failed} fail`
    + (suite.executionShape === "cases" || suite.executionShape === "browser-journeys" ? ` · ${counts.skipped} skip` : "")
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

function routine_launcher_bootstrap_warning(line: string): boolean {
  return /ExperimentalWarning: `--experimental-loader` may be removed/.test(line)
    || line.includes("register(\"ts-node/esm\"")
    || /\[DEP0180\] DeprecationWarning: fs\.Stats constructor is deprecated/.test(line)
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
      `planned executor: ${suite.plannedExecutorId}`,
      ...(suite.executionShape === "browser-journeys" ? ["capabilities: Playwright Chromium · real browser DOM/raster"] : []),
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
  return `${suite.status} ${suite.id}${suite.durationMs === null ? "" : ` · ${format_hosted_test_duration(suite.durationMs)}`}`;
}

export type HostedTestChronology = Readonly<{
  begin(recovered?: boolean): void;
  ingest(report: HostedTestReport, changedSuites?: readonly HostedTestSuiteRunReport[]): readonly string[];
  clearPresentation(): void;
}>;

export function make_hosted_test_chronology(): HostedTestChronology {
  let recovered = false;
  let first = true;
  let queuedEmitted = false;
  let runningEmitted = false;
  let runStatus: HostedTestReport["run"]["status"] | undefined;
  const statuses = new Map<string, TestLifecycleStatus>();
  const evidenceSequences = new Map<string, number>();

  return Object.freeze({
    begin(isRecovery = false) {
      recovered = isRecovery;
      first = true;
      queuedEmitted = false;
      runningEmitted = false;
      runStatus = undefined;
      statuses.clear();
      evidenceSequences.clear();
    },
    ingest(report, changedSuites = report.suiteRuns) {
      const lines: string[] = [];
      const chronological: Array<Readonly<{ sequence: number; ordinal: number; line: string }>> = [];
      let ordinal = 0;
      const append = (sequence: number, line: string): void => {
        chronological.push(Object.freeze({ sequence, ordinal: ordinal++, line }));
      };
      const suites = [...changedSuites].sort((left, right) => left.order - right.order);
      if (first && recovered) {
        lines.push(`recovered ${report.run.id ?? report.run.suite} — authoritative ${report.run.status} snapshot`);
      } else if (!queuedEmitted && report.suiteRuns.length > 0) {
        lines.push("queued");
        queuedEmitted = true;
      }
      if (!recovered && !runningEmitted) {
        const running = suites
          .filter((suite) => suite.status === "running" && statuses.get(suite.id) !== "running")
          .sort((left, right) => left.lastSequence - right.lastSequence)[0];
        if (running !== undefined) {
          append(running.lastSequence, `running · ${running.id}`);
          runningEmitted = true;
        }
      }
      for (const suite of suites) {
        const previous = statuses.get(suite.id);
        if (previous === undefined) {
          if (first && recovered && (suite.status === "fail" || suite.status === "cancelled" || suite.status === "unsupported")) {
            lines.push(`state ${suite.id} — ${suite.status}`);
          } else if (!recovered && suite.status !== "queued" && suite.status !== "running" && suite.status !== "pass") {
            append(suite.lastSequence, terminal_line(suite));
          }
        } else if (previous !== suite.status) {
          if (suite.status !== "queued" && suite.status !== "running" && suite.status !== "pass") append(suite.lastSequence, terminal_line(suite));
        }
        if (previous !== suite.status && (suite.status === "fail" || suite.status === "unsupported" || suite.status === "cancelled")) {
          for (const error of suite.errors) append(suite.lastSequence, `${error.kind} ${suite.id} — ${concise_output(error.message)}`);
        }
        statuses.set(suite.id, suite.status);

        const lastEvidence = evidenceSequences.get(suite.id) ?? 0;
        for (const evidence of [...suite.evidence].sort((left, right) => left.sequence - right.sequence)) {
          if (evidence.sequence <= lastEvidence || (first && recovered)) continue;
          if (evidence.kind === "stdout" && suite.status === "fail") {
            const output = concise_output(strip_control_frames(evidence.content));
            if (output !== "") append(evidence.sequence, `stdout ${suite.id} — ${output}`);
          } else if (evidence.kind === "stderr") {
            const classified = classify_hosted_test_stderr(evidence.content);
            const stderr = concise_output(classified.stderr);
            if (stderr !== "") append(evidence.sequence, `stderr ${suite.id} — ${stderr}`);
            const meaningfulWarnings = classified.warnings.filter((line) => !routine_launcher_bootstrap_warning(line));
            if (meaningfulWarnings.length > 0) append(evidence.sequence, `warning ${suite.id} — ${meaningfulWarnings.length} runtime warning line${meaningfulWarnings.length === 1 ? "" : "s"}`);
          } else if (evidence.kind === "runtime_warning") {
            append(evidence.sequence, `warning ${suite.id} — ${concise_output(evidence.content)}`);
          }
        }
        evidenceSequences.set(suite.id, Math.max(lastEvidence, ...suite.evidence.map((entry) => entry.sequence), 0));
      }
      lines.push(...chronological
        .sort((left, right) => left.sequence - right.sequence || left.ordinal - right.ordinal)
        .map((entry) => entry.line));
      if (runStatus !== report.run.status && report.run.status !== "idle" && report.run.status !== "running") {
        const elapsed = report.run.timing?.runnerMs
          ?? (report.run.startedAt !== null && report.run.completedAt !== null ? report.run.completedAt - report.run.startedAt : null);
        lines.push(`${report.run.status}${elapsed === null ? "" : ` · ${format_hosted_test_duration(elapsed)}`}`);
      }
      runStatus = report.run.status;
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
