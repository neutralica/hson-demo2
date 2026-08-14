import assert from "node:assert/strict";
import { hson } from "hson-live";
import { create_livehost } from "hson-live/livehost";
import type { TestRunPlan } from "../../../src/shared/testing/test-run-contract";
import {
  HOSTED_TEST_REPORT_SCHEMA,
  make_hosted_test_report,
  make_initial_hosted_test_report,
} from "../../harness/reporting/hosted/hosted-test-report";
import type { HostedTestReportMap } from "../../../src/shared/hosted-tests/hosted-test-report.types";
import { HOSTED_TEST_SELECTED_RUN_TARGET } from "../../../src/shared/hosted-tests/hosted-test-suite-contract";

const sizeArgument = process.argv.find((argument) => argument.startsWith("--size="));
const size = Number(sizeArgument?.slice("--size=".length) ?? 100);
const captureCommits = !process.argv.includes("--no-capture");
assert.ok(Number.isSafeInteger(size) && size > 0, "--size must be a positive integer");

const suiteId = "scaling/canonical";
const runId = `scaling-${size}`;
const cases = Object.freeze(Array.from({ length: size }, (_, index) => Object.freeze({
  id: `${suiteId}::case-${index.toString().padStart(5, "0")}`,
  caseId: `case-${index.toString().padStart(5, "0")}`,
  title: `case ${index}`,
  order: index,
})));
const runPlan: TestRunPlan = Object.freeze({
  runId,
  protocolVersion: 1,
  catalogVersion: "scaling-v1",
  executorId: "scaling-node",
  selectionIds: Object.freeze(cases.map((testCase) => testCase.id)),
  suites: Object.freeze([Object.freeze({
    id: suiteId,
    title: "Scaling canonical",
    subject: "transform",
    collections: Object.freeze(["unit"] as const),
    provenance: "hson-demo2",
    order: 0,
    executionShape: "cases",
    cases,
  })]),
});

function memory() {
  const usage = process.memoryUsage();
  return Object.freeze({ rss: usage.rss, heapUsed: usage.heapUsed, external: usage.external });
}

globalThis.gc?.();
const baseline = memory();
const initial = make_initial_hosted_test_report(HOSTED_TEST_SELECTED_RUN_TARGET, runId, runPlan);
const initialJson = JSON.stringify(initial);
const map = hson.liveMap.fromJson(JSON.parse(initialJson)).schema.use(HOSTED_TEST_REPORT_SCHEMA) as unknown as HostedTestReportMap;
const host = create_livehost({ map, logicalMapId: `hosted-report:${runId}` });
let canonicalCommits = 0;
let canonicalOperations = 0;
let canonicalBytes = 0;
let evolutionStartedAt = 0;
let terminalCases = 0;
const commitTimeline: Array<Readonly<{ elapsedMs: number; terminalCases: number; operations: number; bytes: number }>> = [];
const sampleOperationShapes: unknown[] = [];
const stopCommits = host.stream.on_commit((commit) => {
  const bytes = Buffer.byteLength(JSON.stringify(commit), "utf8");
  canonicalCommits += 1;
  canonicalOperations += commit.ops.length;
  canonicalBytes += bytes;
  if (sampleOperationShapes.length === 0) {
    sampleOperationShapes.push(...commit.ops.slice(0, 12).map((op) => ({
      kind: "kind" in op ? op.kind : "graph",
      path: "path" in op ? op.path : undefined,
      nextKeys: "next" in op && typeof op.next === "object" && op.next !== null ? Object.keys(op.next) : [],
      nextStatus: "next" in op && typeof op.next === "object" && op.next !== null && "status" in op.next ? op.next.status : undefined,
    })));
  }
  terminalCases += commit.ops.filter((op) => {
    if (!("path" in op)
      || op.path.length !== 4
      || op.path[0] !== "suiteRuns"
      || op.path[2] !== "cases") return false;
    if (!("next" in op) || typeof op.next !== "object" || op.next === null || !("value" in op.next)) return false;
    const value = op.next.value;
    return typeof value === "object" && value !== null && "status" in value
      && (value.status === "pass" || value.status === "fail" || value.status === "skip");
  }).length;
  commitTimeline.push(Object.freeze({
    elapsedMs: performance.now() - evolutionStartedAt,
    terminalCases,
    operations: commit.ops.length,
    bytes,
  }));
});
const report = make_hosted_test_report(Date.now, undefined, HOSTED_TEST_SELECTED_RUN_TARGET, {
  runId,
  runPlan,
  captureCommits,
  map,
  mutate: (mutation) => host.mutate((draft) => mutation(draft as unknown as HostedTestReportMap)),
});

let peak = memory();
const sample = (): void => {
  const current = memory();
  if (current.rss > peak.rss || current.heapUsed > peak.heapUsed) {
    peak = Object.freeze({
      rss: Math.max(peak.rss, current.rss),
      heapUsed: Math.max(peak.heapUsed, current.heapUsed),
      external: Math.max(peak.external, current.external),
    });
  }
};
const sampler = setInterval(sample, 5);
const startedAt = performance.now();
evolutionStartedAt = startedAt;
report.reduce({ t: "suite_begin", suite: suiteId });
for (let index = 0; index < size; index += 1) {
  report.reduce({
    t: "case_begin",
    suite: suiteId,
    caseId: cases[index]!.caseId,
    name: cases[index]!.title,
  });
  report.reduce({
    t: "case_end",
    suite: suiteId,
    caseId: cases[index]!.caseId,
    name: cases[index]!.title,
    status: "pass",
    ms: 0,
  });
}
report.reduce({ t: "suite_end", suite: suiteId, ms: 0 });
report.complete({
  ok: true,
  summary: { suites: 1, cases: size, pass: size, fail: 0, skip: 0, msTotal: 0, failures: [] },
}, { runnerMs: 0, hostMs: 0 });
await report.settle();
const elapsedMs = performance.now() - startedAt;
clearInterval(sampler);
sample();

const terminal = map.capture();
const terminalJson = JSON.stringify(terminal.value);
const retainedCommits = report.commits();
const retainedCommitBytes = Buffer.byteLength(JSON.stringify(retainedCommits), "utf8");
const completionSegments: Array<Readonly<{ through: number; elapsedMs: number }>> = [];
const completionBatchRates: Array<Readonly<{ from: number; through: number; msPer100: number }>> = [];
let previousThresholdAt = 0;
for (let threshold = 100; threshold <= size; threshold += 100) {
  const reached = commitTimeline.find((entry) => entry.terminalCases >= threshold);
  if (reached === undefined) break;
  completionSegments.push(Object.freeze({ through: threshold, elapsedMs: reached.elapsedMs - previousThresholdAt }));
  previousThresholdAt = reached.elapsedMs;
}
let previousCommitAt = 0;
let previousCommitCases = 0;
for (const entry of commitTimeline) {
  const completed = entry.terminalCases - previousCommitCases;
  if (completed > 0) {
    completionBatchRates.push(Object.freeze({
      from: previousCommitCases,
      through: entry.terminalCases,
      msPer100: ((entry.elapsedMs - previousCommitAt) / completed) * 100,
    }));
  }
  previousCommitAt = entry.elapsedMs;
  previousCommitCases = entry.terminalCases;
}
globalThis.gc?.();
await new Promise<void>((resolve) => setImmediate(resolve));
globalThis.gc?.();
const retained = memory();
console.log(JSON.stringify({
  size,
  captureCommits,
  elapsedMs,
  reducerMutations: canonicalCommits,
  liveMapCommits: retainedCommits.length,
  liveMapOperations: retainedCommits.reduce((total, commit) => total + commit.ops.length, 0),
  canonicalCommits,
  canonicalOperations,
  canonicalBytes,
  initialSnapshotBytes: Buffer.byteLength(initialJson, "utf8"),
  terminalSnapshotBytes: Buffer.byteLength(terminalJson, "utf8"),
  retainedCommitBytes,
  retainedHistory: host.stream.history.debug(),
  commitTimeline,
  sampleOperationShapes,
  completionSegments,
  completionBatchRates,
  memory: { baseline, peak, retained },
}));

report.dispose();
stopCommits();
host.dispose();
