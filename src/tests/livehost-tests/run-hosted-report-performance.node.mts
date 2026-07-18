import { performance } from "node:perf_hooks";
import type { JsonValue } from "hson-live/types";
import { make_hosted_test_report } from "../../app/hosted-test/hosted-test-report";
import { encode_hosted_test_report_initial } from "../../app/hosted-test/hosted-test-report-initial";
import { make_hosted_test_report_mirror } from "../../app/hosted-test/hosted-test-report-mirror";
import { decode_hosted_test_report_commit_envelope, encode_hosted_test_report_commit } from "../../app/hosted-test/hosted-test-report-wire";
import type { HostedTestReportCommitEnvelope } from "../../app/hosted-test/hosted-test-report-wire.types";
import { make_registered_hosted_test_suite_registry } from "../../hosted-test/registered-hosted-test-suites";

type Sample = Readonly<{
  batchSize: number;
  runnerMs: number;
  reductionMs: number;
  encodingMs: number;
  mutationCaptureMs: number;
  commits: number;
  caseCommits: number;
  cumulativeBytes: number;
  caseBytes: readonly number[];
  envelopes: readonly HostedTestReportCommitEnvelope[];
  initial: ReturnType<typeof encode_hosted_test_report_initial>;
}>;

function is_case_commit(envelope: HostedTestReportCommitEnvelope): boolean {
  return envelope.ops.some((op) => op.kind === "splice" && op.path.length === 1 && op.path[0] === "cases");
}

async function sample(batchSize: number): Promise<Sample> {
  const envelopes: HostedTestReportCommitEnvelope[] = [];
  const caseBytes: number[] = [];
  let encodingMs = 0;
  let reductionMs = 0;
  const report = make_hosted_test_report(() => 1, (commit) => {
    const started = performance.now();
    const envelope = encode_hosted_test_report_commit(`perf-${batchSize}`, "node/all", commit);
    encodingMs += performance.now() - started;
    envelopes.push(envelope);
    if (is_case_commit(envelope)) caseBytes.push(JSON.stringify(envelope).length);
  }, "node/all", { caseBatchSize: batchSize });
  const initial = encode_hosted_test_report_initial(`perf-${batchSize}`, "node/all", report.map.capture());
  const reduce = report.reduce;
  const onEvent: typeof reduce = (event) => {
    const started = performance.now();
    reduce(event);
    reductionMs += performance.now() - started;
  };
  const runnerStarted = performance.now();
  const result = await make_registered_hosted_test_suite_registry().get("node/all").run(onEvent, { yieldEveryCases: 0, yieldBetweenSuites: false });
  const runnerMs = performance.now() - runnerStarted;
  const completeStarted = performance.now();
  report.complete(result);
  reductionMs += performance.now() - completeStarted;
  const cumulativeBytes = envelopes.reduce((total, envelope) => total + JSON.stringify(envelope).length, 0);
  report.dispose();
  return Object.freeze({
    batchSize,
    runnerMs,
    reductionMs,
    encodingMs,
    mutationCaptureMs: reductionMs - encodingMs,
    commits: envelopes.length,
    caseCommits: caseBytes.length,
    cumulativeBytes,
    caseBytes: Object.freeze(caseBytes),
    envelopes: Object.freeze(envelopes),
    initial,
  });
}

function percentile(values: readonly number[], fraction: number): number {
  return values[Math.floor((values.length - 1) * fraction)] ?? 0;
}

const samples: Sample[] = [];
for (const batchSize of [1, 16, 32, 64]) samples.push(await sample(batchSize));
const before = samples.find((entry) => entry.batchSize === 1)!;
const selected = samples.find((entry) => entry.batchSize === 32)!;

let decodeMs = 0;
const parsed = selected.envelopes.map((envelope) => JSON.parse(JSON.stringify(envelope)) as JsonValue);
const decoded = parsed.map((value) => {
  const started = performance.now();
  const envelope = decode_hosted_test_report_commit_envelope(value);
  decodeMs += performance.now() - started;
  return envelope;
});
const mirror = make_hosted_test_report_mirror(selected.initial);
let notifications = 0;
let subscriptionMs = 0;
const stop = mirror.subscribe((capture) => {
  const started = performance.now();
  void capture.rev;
  void capture.value.summary.cases;
  subscriptionMs += performance.now() - started;
  notifications += 1;
});
const replayStarted = performance.now();
for (const envelope of decoded) mirror.apply(envelope);
const replayMs = performance.now() - replayStarted;

const summarize = (entry: Sample) => ({
  batchSize: entry.batchSize,
  runnerMs: entry.runnerMs,
  reductionMs: entry.reductionMs,
  encodingMs: entry.encodingMs,
  mutationCaptureMs: entry.mutationCaptureMs,
  commits: entry.commits,
  caseCommits: entry.caseCommits,
  cumulativeBytes: entry.cumulativeBytes,
  firstCaseBytes: entry.caseBytes[0] ?? 0,
  medianCaseBytes: percentile(entry.caseBytes, 0.5),
  finalCaseBytes: entry.caseBytes.at(-1) ?? 0,
});

console.log(JSON.stringify({
  samples: samples.map(summarize),
  unbatchedIndexedCaseBytes: {
    case1: before.caseBytes[0],
    case100: before.caseBytes[99],
    case500: before.caseBytes[499],
    case1060: before.caseBytes[1059],
  },
  selectedClient: { decodeMs, replayMs, subscriptionMs, notifications },
}, null, 2));

stop();
mirror.dispose();
