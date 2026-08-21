import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { make_hosted_test_report } from "../../harness/reporting/hosted/hosted-test-report";
import { hosted_test_projection_summary } from "../../../src/app/demos/tests/panel/hosted-test-report-summary";
import {
  node_selected_verification_metrics,
  run_node_selected_verifications,
  type NodeSelectedVerificationScheduling,
} from "../../harness/runtimes/node/run-node-selected-verifications";
import {
  external_library_launcher_metrics,
  reset_external_library_launcher_metrics,
  resolve_external_library_launchers,
} from "../../harness/runtimes/node/external-library-launchers";
import { make_local_node_locus_executor_registry } from "../../harness/runtimes/node/livehost-node-executor";
import { make_test_executor_discovery } from "../../harness/core/test-discovery";
import { make_test_run_plan } from "../../harness/core/test-run-plan";

type Policy = Readonly<{
  label: string;
  scheduling: NodeSelectedVerificationScheduling;
}>;

type Sample = Readonly<{
  canonicalMs: number;
  externalMs: number;
  totalMs: number;
  maximumOrdinaryConcurrency: number;
  maximumSpecialConcurrency: number;
  launcherStarts: number;
  passedCases: number;
  failedCases: number;
}>;

function argument(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

function policy(value: string): Policy {
  const fixed = /^fixed:(\d+)$/.exec(value);
  if (fixed !== null) {
    const concurrency = Number(fixed[1]);
    return Object.freeze({
      label: value,
      scheduling: Object.freeze({ kind: "fixed", concurrency }),
    });
  }
  const adaptive = /^adaptive:(\d+)->(\d+)$/.exec(value);
  if (adaptive !== null) {
    const lowConcurrency = Number(adaptive[1]);
    const highConcurrency = Number(adaptive[2]);
    return Object.freeze({
      label: value,
      scheduling: Object.freeze({ kind: "adaptive", lowConcurrency, highConcurrency }),
    });
  }
  throw new Error(`Unsupported performance policy: ${value}`);
}

function median(values: readonly number[]): number {
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.floor(ordered.length / 2)]!;
}

async function run_sample(
  selectedPolicy: Policy,
  invocation: "verified" | "tsx",
): Promise<Sample> {
  const registry = make_local_node_locus_executor_registry();
  const availability = await resolve_external_library_launchers();
  const discovery = make_test_executor_discovery(registry, availability.targets);
  const canonicalChecks = registry.catalog.tests.length;
  const externalChecks = availability.targets.reduce(
    (total, target) => total + target.executableChecks,
    0,
  );
  const selectedIds = Object.freeze([
    ...registry.catalog.tests.map((test) => test.id),
    ...availability.targets.map((target) => target.id),
  ]);
  reset_external_library_launcher_metrics();
  const runPlan = make_test_run_plan({
    runId: `hosted-performance-${selectedPolicy.label}`,
    protocolVersion: discovery.protocolVersion,
    catalogVersion: discovery.catalogVersion,
    executorId: discovery.executor.id,
    catalog: discovery.catalog,
    selectedIds,
  });
  const report = make_hosted_test_report(Date.now, undefined, { runPlan });
  const totalStartedAt = performance.now();
  const result = await run_node_selected_verifications(
    registry,
    discovery.catalog,
    availability,
    selectedIds,
    report.reduce,
    { yieldEveryCases: 0, yieldBetweenSuites: false },
    {
      externalScheduling: selectedPolicy.scheduling,
      externalInvocation: invocation,
    },
  );
  const timing = node_selected_verification_metrics();
  report.complete(result, { runnerMs: timing.overlappedTotalMs, hostMs: timing.overlappedTotalMs });
  const totalMs = performance.now() - totalStartedAt;
  const projection = hosted_test_projection_summary(report.map.snap());
  const processMetrics = external_library_launcher_metrics();
  const sample = Object.freeze({
    canonicalMs: timing.canonicalPhaseMs,
    externalMs: timing.externalPhaseMs,
    totalMs,
    maximumOrdinaryConcurrency: timing.maximumOrdinaryLauncherConcurrency,
    maximumSpecialConcurrency: timing.maximumSpecialLauncherConcurrency,
    launcherStarts: processMetrics.directLauncherStarts + processMetrics.packageScriptStarts,
    passedCases: projection.canonical.pass + projection.launchers.passedChecks,
    failedCases: projection.canonical.fail + projection.launchers.fail,
  });
  if (!result.ok) {
    throw new Error(`Inclusive performance sample failed: ${JSON.stringify({
      failures: result.summary.failures,
      externalFailures: report.map.snap().suiteRuns
        .filter((suite) => suite.executionShape === "opaque-aggregate" && suite.status === "fail")
        .map((suite) => ({ id: suite.id, errors: suite.errors, evidence: suite.evidence })),
    })}`);
  }
  report.dispose();
  assert.equal(sample.passedCases, canonicalChecks + externalChecks);
  assert.equal(sample.failedCases, 0);
  assert.equal(sample.launcherStarts, availability.targets.length);
  return sample;
}

const invocationArgument = argument("invocation") ?? "verified";
assert.ok(invocationArgument === "verified" || invocationArgument === "tsx");
const invocation = invocationArgument;
const samplePolicy = argument("sample");
if (samplePolicy !== undefined) {
  const selectedPolicy = policy(samplePolicy);
  console.log(JSON.stringify({
    type: "sample",
    policy: selectedPolicy.label,
    invocation,
    ...(await run_sample(selectedPolicy, invocation)),
  }));
  process.exit(0);
}

const repeats = Number(argument("repeats") ?? "3");
assert.ok(Number.isInteger(repeats) && repeats >= 1);
const policies = (argument("policies") ?? "fixed:1,fixed:2,fixed:3,fixed:4,fixed:5,fixed:6")
  .split(",")
  .map(policy);
const summaries: unknown[] = [];
const scriptPath = fileURLToPath(import.meta.url);
for (const selectedPolicy of policies) {
  const samples: Sample[] = [];
  for (let repeat = 1; repeat <= repeats; repeat += 1) {
    const child = spawnSync(process.execPath, [
      ...process.execArgv,
      scriptPath,
      `--sample=${selectedPolicy.label}`,
      `--invocation=${invocation}`,
    ], {
      cwd: process.cwd(),
      encoding: "utf8",
      maxBuffer: 50 * 1024 * 1024,
    });
    if (child.status !== 0) {
      throw new Error([
        `Performance sample failed for ${selectedPolicy.label}, repeat ${repeat}.`,
        child.stdout.slice(-4_000),
        child.stderr.slice(-4_000),
      ].join("\n"));
    }
    const sampleLine = child.stdout
      .split(/\r?\n/)
      .findLast((line) => line.startsWith('{"type":"sample"'));
    if (sampleLine === undefined) throw new Error(`Performance sample output was absent for ${selectedPolicy.label}.`);
    const sample = JSON.parse(sampleLine) as Sample;
    samples.push(Object.freeze(sample));
    console.log(JSON.stringify({
      type: "sample",
      policy: selectedPolicy.label,
      invocation,
      repeat,
      ...sample,
    }));
  }
  const totalValues = samples.map((sample) => sample.totalMs);
  const summary = Object.freeze({
    type: "summary",
    policy: selectedPolicy.label,
    invocation,
    repeats,
    canonicalMedianMs: median(samples.map((sample) => sample.canonicalMs)),
    externalMedianMs: median(samples.map((sample) => sample.externalMs)),
    inclusiveMedianMs: median(totalValues),
    inclusiveMinMs: Math.min(...totalValues),
    inclusiveMaxMs: Math.max(...totalValues),
    maximumOrdinaryConcurrency: Math.max(...samples.map((sample) => sample.maximumOrdinaryConcurrency)),
    maximumSpecialConcurrency: Math.max(...samples.map((sample) => sample.maximumSpecialConcurrency)),
    launcherStarts: samples[0]!.launcherStarts,
    passedCases: samples[0]!.passedCases,
    failedCases: samples[0]!.failedCases,
  });
  summaries.push(summary);
  console.log(JSON.stringify(summary));
}
console.log(JSON.stringify({ type: "matrix", summaries }));
