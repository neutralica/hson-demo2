import { performance } from "node:perf_hooks";
import { hson } from "hson-live";
import {
  begin_livetree_materialization_profile,
  type LiveTreeMaterializationProfile,
} from "hson-live/diagnostics";
import { install_hosted_dom_runtime } from "../../harness/runtimes/dom/hosted-dom-runtime";

type Measurement = Readonly<{
  scenario: "object-primitives" | "keyed-structural-array" | "positional-primitives";
  size: number;
  materializeMs: number;
  disposeMs: number;
  branches: number;
  profile: LiveTreeMaterializationProfile;
}>;

const defaultSizes = [10, 25, 50, 100, 250, 500, 1_000] as const;
const requestedSizes = process.argv.slice(2).map(Number).filter((value) => Number.isInteger(value) && value > 0);
const sizes: readonly number[] = requestedSizes.length === 0 ? defaultSizes : requestedSizes;
const runtime = install_hosted_dom_runtime();
const measurements: Measurement[] = [];
const mountedRoot = hson.liveTree.queryBody().graft();
let checks = 0;

try {
  for (const size of sizes) {
    record(measureObject(size));
    record(measureKeyedArray(size));
    record(measurePositionalArray(size));
  }
} finally {
  runtime.dispose();
}

assertQualitativeScaling();
console.log(JSON.stringify({
  checks,
  measurements: measurements.map(summarize),
}, null, 2));

function measureObject(size: number): Measurement {
  runtime.reset_document();
  const value = Object.fromEntries(Array.from({ length: size }, (_, index) => [`property-${index}`, index]));
  const source = hson.liveMap.fromJson(value);
  const host = makeHost();
  const profiler = begin_livetree_materialization_profile();
  const started = performance.now();
  const inspector = hson.inspect.create({ source, host, initialDepth: 1 });
  const materializeMs = performance.now() - started;
  const profile = profiler.stop();
  const branches = inspector.diagnostics().totalBranchCount;
  const disposeStarted = performance.now();
  inspector.dispose();
  return Object.freeze({
    scenario: "object-primitives",
    size,
    materializeMs,
    disposeMs: performance.now() - disposeStarted,
    branches,
    profile,
  });
}

function measureKeyedArray(size: number): Measurement {
  runtime.reset_document();
  const source = hson.liveMap.fromJson({
    items: Array.from({ length: size }, (_, index) => ({ id: `item-${index}`, value: index })),
  });
  const host = makeHost();
  const profiler = begin_livetree_materialization_profile();
  const started = performance.now();
  const inspector = hson.inspect.create({
    source,
    host,
    initialDepth: 2,
    arrayKey: (item) => (item as { id: string }).id,
  });
  const materializeMs = performance.now() - started;
  const profile = profiler.stop();
  const branches = inspector.diagnostics().totalBranchCount;
  const disposeStarted = performance.now();
  inspector.dispose();
  return Object.freeze({
    scenario: "keyed-structural-array",
    size,
    materializeMs,
    disposeMs: performance.now() - disposeStarted,
    branches,
    profile,
  });
}

function measurePositionalArray(size: number): Measurement {
  runtime.reset_document();
  const source = hson.liveMap.fromJson({ items: Array.from({ length: size }, (_, index) => index) });
  const host = makeHost();
  const profiler = begin_livetree_materialization_profile();
  const started = performance.now();
  const inspector = hson.inspect.create({ source, host, initialDepth: 2 });
  const materializeMs = performance.now() - started;
  const profile = profiler.stop();
  const branches = inspector.diagnostics().totalBranchCount;
  const disposeStarted = performance.now();
  inspector.dispose();
  return Object.freeze({
    scenario: "positional-primitives",
    size,
    materializeMs,
    disposeMs: performance.now() - disposeStarted,
    branches,
    profile,
  });
}

function makeHost() {
  mountedRoot.empty();
  return mountedRoot.create.div();
}

function record(measurement: Measurement): void {
  measurements.push(measurement);
  console.error(JSON.stringify(summarize(measurement)));
}

function summarize(measurement: Measurement) {
  const { profile } = measurement;
  return Object.freeze({
    scenario: measurement.scenario,
    size: measurement.size,
    materializeMs: measurement.materializeMs,
    disposeMs: measurement.disposeMs,
    branches: measurement.branches,
    liveTreeInstances: profile.liveTreeInstances,
    sourceAtCalls: profile.sourceAtCalls,
    objectKeyEnumerations: profile.objectKeyEnumerations,
    appendValidationTargetNodes: profile.appendValidationTargetNodes,
    appendValidationBranchNodes: profile.appendValidationBranchNodes,
    batchAttachmentPasses: profile.batchAttachmentPasses,
    branchesBatchAttached: profile.branchesBatchAttached,
    domAppendOperations: profile.domAppendOperations,
    inspectorRootListeners: profile.inspectorRootListeners,
    inspectorCssRuleSets: profile.inspectorCssRuleSets,
  });
}

function assertQualitativeScaling(): void {
  if (sizes.includes(100) && sizes.includes(1_000)) {
    for (const scenario of ["object-primitives", "keyed-structural-array", "positional-primitives"] as const) {
      const small = mustMeasurement(scenario, 100);
      const large = mustMeasurement(scenario, 1_000);
      assertAtMostRatio(`${scenario}: LiveTree instances`, small.profile.liveTreeInstances, large.profile.liveTreeInstances, 12);
      assertAtMostRatio(`${scenario}: source reads`, small.profile.sourceAtCalls, large.profile.sourceAtCalls, 12);
      assertAtMostRatio(
        `${scenario}: append target validation`,
        small.profile.appendValidationTargetNodes,
        large.profile.appendValidationTargetNodes,
        12,
      );
      assertAtMostRatio(
        `${scenario}: append branch validation`,
        small.profile.appendValidationBranchNodes,
        large.profile.appendValidationBranchNodes,
        12,
      );
      assert(
        large.profile.inspectorRootListeners === small.profile.inspectorRootListeners,
        `${scenario}: listener registration count stays constant`,
      );
      assert(
        large.profile.inspectorCssRuleSets === small.profile.inspectorCssRuleSets,
        `${scenario}: stylesheet registration count stays constant`,
      );
      assert(
        large.profile.domAppendOperations <= small.profile.domAppendOperations + 4,
        `${scenario}: DOM append count stays bounded`,
      );
    }
  }
}

function mustMeasurement(scenario: Measurement["scenario"], size: number): Measurement {
  const measurement = measurements.find((candidate) => candidate.scenario === scenario && candidate.size === size);
  if (!measurement) throw new Error(`missing ${scenario} measurement at size ${size}`);
  return measurement;
}

function assertAtMostRatio(label: string, small: number, large: number, maximum: number): void {
  assert(large <= Math.max(1, small) * maximum, `${label} grows at most ${maximum}x (actual ${large}/${small})`);
}

function assert(condition: boolean, label: string): asserts condition {
  if (!condition) throw new Error(`FAIL: ${label}`);
  checks += 1;
}
