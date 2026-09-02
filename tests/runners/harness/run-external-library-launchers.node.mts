import { strict as assert } from "node:assert";
import { mkdtemp, realpath, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { hson_live_test_launchers } from "hson-live/diagnostics";
import {
  classify_external_library_launcher_invocation,
  external_library_launcher_metrics,
  external_library_launcher_termination_generation,
  external_library_target_id,
  reset_external_library_launcher_metrics,
  resolve_external_library_launchers,
  run_external_library_launcher,
  terminate_external_library_launchers,
  type ExternalLibraryLauncherResult,
} from "../../harness/runtimes/node/external-library-launchers";
import {
  EXTERNAL_LIBRARY_LAUNCHER_CONCURRENCY,
  run_external_library_launcher_pool,
  run_node_verification_phases,
} from "../../harness/runtimes/node/run-node-selected-verifications";
import {
  hosted_test_panel_primary_choices,
  hosted_test_panel_selection_case_count,
  hosted_test_panel_selected_ids,
  hosted_test_panel_suite_choices,
  hosted_test_panel_test_choices,
} from "../../../src/app/demos/tests/panel/hosted-test-panel-selection";
import { CANONICAL_TEST_SUBJECT_ORDER, TEST_SUBJECT_IDENTIFIERS } from "../../../src/shared/testing/test-contracts";
import { make_local_node_locus_executor_registry } from "../../harness/runtimes/node/livehost-node-executor";
import { visible_external_launcher_stderr } from "../../../src/app/demos/tests/panel/hosted-test-report-view";
import { external_launcher_suite_descriptor } from "../../../src/shared/testing/external-launcher-contract";
import { assert_external_launcher_stdout_parity } from "../../harness/runtimes/node/external-launcher-stdout-parity";

const all = process.argv.includes("--all");
const parityLauncherId = "livemap.aggregate-library-transitions";
const completion = '<HSON_LIVE_TEST_COMPLETION>{"version":1,"launcherId":"livemap.aggregate-library-transitions","executed":1,"passed":1,"failed":0}\n';
const parityOutput = (singleMs: string, aggregateMs: string, candidates = 2): string => [
  "ok 1 - deterministic assertion",
  `telemetry single-library=${singleMs}ms aggregate-two-library=${aggregateMs}ms candidates=${candidates} revisions=1 publications=1`,
  "1..1",
  completion.trimEnd(),
  "",
].join("\n");
const parityLeft = parityOutput("0.095", "0.151");
const parityRight = parityOutput("0.090", "0.132");
assert.doesNotThrow(
  () => assert_external_launcher_stdout_parity(parityLauncherId, parityLeft, parityRight),
  "observational timing values do not participate in launcher stdout parity",
);
assert.throws(
  () => assert_external_launcher_stdout_parity(parityLauncherId, parityLeft, parityOutput("0.090", "0.132", 3)),
  /EXTERNAL_LAUNCHER_STDOUT_PARITY_FAILED/,
  "deterministic telemetry fields remain exact parity inputs",
);
assert.throws(
  () => assert_external_launcher_stdout_parity(parityLauncherId, parityLeft.replace("0.095ms", "not-a-number-ms"), parityRight),
  /EXTERNAL_LAUNCHER_TELEMETRY_INVALID/,
  "malformed telemetry is rejected",
);
assert.throws(
  () => assert_external_launcher_stdout_parity(parityLauncherId, parityLeft.replace(/^telemetry.*\n/m, ""), parityRight),
  /missing telemetry record/,
  "required telemetry cannot be omitted",
);
assert.throws(
  () => assert_external_launcher_stdout_parity(parityLauncherId, parityLeft, parityRight.replace("1..1\n", "unexpected output\n1..1\n")),
  /EXTERNAL_LAUNCHER_STDOUT_PARITY_FAILED/,
  "unexpected output remains a parity failure",
);
assert.throws(
  () => assert_external_launcher_stdout_parity(parityLauncherId, parityLeft, parityRight.replace('"passed":1', '"passed":0')),
  /EXTERNAL_LAUNCHER_STDOUT_PARITY_FAILED/,
  "completion records remain exact parity inputs",
);
const analyzerLauncherId = "hson-schema-analyzer";
const analyzerTelemetry = (schemas: number, analyzerColdMs: number, checkerHeapBytes: number): string => `${JSON.stringify({
  hsonSchema: "verify",
  schemas,
  defs: 2,
  refs: 3,
  recursiveSccs: 1,
  documentRepeatNodes: 4,
  documentExactCountNodes: 5,
  canonicalNodes: 6,
  canonicalDocumentNodes: 7,
  refinementCount: 8,
  generatedDeclarationBytes: 9,
  proofNodes: 10,
  staticHsonValidations: 11,
  staticDocumentValidations: 12,
  freshnessArtifactBytes: 13,
  sourceProvenanceBytes: 14,
  analyzerColdMs,
  analyzerWarmMs: 0.2,
  staticValidationMs: 0.3,
  typescriptColdMs: 0.4,
  typescriptIncrementalMs: 0.5,
  totalMs: 0.6,
  checkerHeapBytes,
  checkerRssBytes: checkerHeapBytes + 1,
})}\n`;
const analyzerCompletion = '<HSON_LIVE_TEST_COMPLETION>{"version":1,"launcherId":"hson-schema-analyzer","executed":1,"passed":1,"failed":0}\n';
assert.doesNotThrow(
  () => assert_external_launcher_stdout_parity(
    analyzerLauncherId,
    `${analyzerTelemetry(1, 0.1, 100)}${analyzerCompletion}`,
    `${analyzerTelemetry(1, 9.9, 999)}${analyzerCompletion}`,
  ),
  "analyzer timing and process-memory observations do not participate in parity",
);
assert.throws(
  () => assert_external_launcher_stdout_parity(
    analyzerLauncherId,
    `${analyzerTelemetry(1, 0.1, 100)}${analyzerCompletion}`,
    `${analyzerTelemetry(2, 9.9, 999)}${analyzerCompletion}`,
  ),
  /EXTERNAL_LAUNCHER_STDOUT_PARITY_FAILED/,
  "deterministic analyzer-build telemetry fields remain exact when both invocations emit them",
);
assert.doesNotThrow(
  () => assert_external_launcher_stdout_parity(
    analyzerLauncherId,
    `${analyzerTelemetry(1, 0.1, 100)}${analyzerCompletion}`,
    analyzerCompletion,
  ),
  "the validated analyzer build prelude is optional for a direct launcher invocation",
);
const availability = await resolve_external_library_launchers();
const catalogSuites = Object.freeze(availability.targets.map(external_launcher_suite_descriptor));
const manifestIds = hson_live_test_launchers.map((launcher) => launcher.id);
assert.equal(
  new Set(manifestIds).size,
  manifestIds.length,
  "the exported diagnostics manifest has unique launcher IDs",
);
assert.ok(availability.repositoryRoot, "linked repository root resolves from the imported subpath");
assert.equal(await realpath(availability.repositoryRoot!), availability.repositoryRoot);
assert.deepEqual(
  availability.targets.map((target) => target.launcherId),
  manifestIds,
  "every exported diagnostics launcher resolves in manifest order",
);
assert.equal(availability.unavailable.length, 0, "no exported diagnostics launcher is unavailable");
assert.deepEqual(
  Object.keys(availability.invocations ?? {}).sort(),
  availability.targets.map((target) => target.id).sort(),
  "every available launcher has one resolved invocation",
);
for (const launcher of hson_live_test_launchers) {
  const target = availability.targets.find((candidate) => candidate.launcherId === launcher.id);
  assert.ok(target, `exported launcher resolves: ${launcher.id}`);
  assert.equal(target.runtime, launcher.runtime);
  assert.deepEqual(target.tags, launcher.collections);
  assert.equal(target.collections.every((collection) => collection === "unit" || collection === "dev"), true);
}
for (const requiredId of [
  "core.hson-node-quid",
  "transform.hson-node-quid-ingress",
  "transform.hson-node-quid-egress",
  "livetree.quid-eligibility",
]) {
  assert.equal(manifestIds.includes(requiredId), true, `required canonical launcher is exported: ${requiredId}`);
}
assert.equal(
  classify_external_library_launcher_invocation(
    hson_live_test_launchers[0]!,
    "CUSTOM_ENV=true node --loader ts-node/esm tests/custom.mts",
  ).kind,
  "package-script",
  "unsupported script shapes retain package-script semantics",
);
const directShapeLauncher = hson_live_test_launchers[0]!;
assert.equal(
  classify_external_library_launcher_invocation(
    directShapeLauncher,
    `node --import=tsx ${directShapeLauncher.repositoryModule}`,
  ).kind,
  "direct",
  "current node --import=tsx launcher scripts retain direct execution",
);
const analyzerLauncher = hson_live_test_launchers.find((launcher) => launcher.id === analyzerLauncherId)!;
assert.equal(
  classify_external_library_launcher_invocation(
    analyzerLauncher,
    `npm run build && node --import=tsx ${analyzerLauncher.repositoryModule}`,
  ).kind,
  "direct",
  "the analyzer's validated build prelude is omitted during direct hosted execution",
);
assert.equal(
  availability.targets.every((target) => availability.invocations?.[target.id]?.kind === "direct"),
  true,
  "the current verified manifest has no package-script fallback that can mutate hson-live during canonical execution",
);
assert.deepEqual(
  [...new Set(availability.targets.map((target) => target.runtime))].sort(),
  [...new Set(hson_live_test_launchers.map((launcher) => launcher.runtime))].sort(),
);
const categoryTargets = new Map<string, typeof availability.targets>();
for (const target of availability.targets) {
  const category = target.subject;
  categoryTargets.set(category, Object.freeze([...(categoryTargets.get(category) ?? []), target]));
}
assert.equal(
  [...categoryTargets.values()].reduce((total, targets) => total + targets.length, 0),
  hson_live_test_launchers.length,
  "semantic subject buckets account for every exported launcher exactly once",
);
assert.equal(
  categoryTargets.get("transform")?.some((target) => target.launcherId === "core.hson-number"),
  true,
);
assert.equal(
  categoryTargets.get("transform")?.some((target) => target.launcherId === "core.canonical-hson-equality"),
  true,
);
assert.equal(
  categoryTargets.get("integration")?.some((target) => target.launcherId === "core.public-boundaries"),
  true,
);
assert.equal(
  availability.targets.find((target) => target.launcherId === "core.public-boundaries")?.collections.includes("dev"),
  true,
  "Dev membership remains collection metadata independent of semantic subject",
);

const nodeRegistry = make_local_node_locus_executor_registry();
const primary = hosted_test_panel_primary_choices(nodeRegistry.catalog.tests, catalogSuites);
assert.deepEqual(
  CANONICAL_TEST_SUBJECT_ORDER,
  ["transform", "livetree", "livemap", "livehost", "reflect"],
  "the canonical selectable-subject order has one explicit contract owner",
);
assert.equal(
  new Set(TEST_SUBJECT_IDENTIFIERS).size,
  TEST_SUBJECT_IDENTIFIERS.length,
  "every known subject identifier appears exactly once in the protocol vocabulary",
);
assert.deepEqual(
  primary
    .filter((choice) => choice.selection.kind === "subject")
    .map((choice) => choice.selection.kind === "subject" ? choice.selection.subject : undefined),
  CANONICAL_TEST_SUBJECT_ORDER,
  "panel subject choices preserve the canonical subject order",
);
assert.deepEqual(
  hosted_test_panel_primary_choices(
    [...nodeRegistry.catalog.tests].reverse(),
    [...catalogSuites].reverse(),
  )
    .filter((choice) => choice.selection.kind === "subject")
    .map((choice) => choice.selection.kind === "subject" ? choice.selection.subject : undefined),
  CANONICAL_TEST_SUBJECT_ORDER,
  "suite registration, launcher discovery, and completion order cannot reorder subjects",
);
for (const choice of primary) {
  const count = hosted_test_panel_selection_case_count(
    nodeRegistry.catalog.tests,
    choice.selection,
    catalogSuites,
  );
  assert.equal(choice.label.endsWith(`(${count})`), true, `${choice.label} derives its current case count`);
}
assert.equal(primary.some((choice) => choice.label.toLowerCase().includes("library verification")), false);
const allSelection = primary[0]!.selection;
const allSelectedIds = hosted_test_panel_selected_ids(
  nodeRegistry.catalog.tests,
  allSelection,
  catalogSuites,
);
assert.equal(new Set(allSelectedIds).size, allSelectedIds.length, "inclusive all selects unique IDs");
for (const target of availability.targets) {
  assert.equal(allSelectedIds.includes(target.id), true, `inclusive all dispatches ${target.id}`);
}
assert.equal(
  hosted_test_panel_selection_case_count(
    nodeRegistry.catalog.tests,
    allSelection,
    catalogSuites,
  ),
  nodeRegistry.catalog.tests.length + availability.targets.length,
  "complete selection counts each selectable external launcher exactly once",
);
const transformSelection = primary.find(
  (choice) => choice.selection.kind === "subject"
    && choice.selection.subject === "transform",
)?.selection;
assert.ok(transformSelection, "Transform remains an exact selectable subject");
const transformCanonicalCount = nodeRegistry.catalog.tests.filter(
  (descriptor) => descriptor.subject === "transform",
).length;
const transformExternalTargets = availability.targets.filter(
  (target) => target.subject === "transform",
);
assert.equal(
  hosted_test_panel_selection_case_count(
    nodeRegistry.catalog.tests,
    transformSelection,
    catalogSuites,
  ),
  transformCanonicalCount + transformExternalTargets.length,
  "Transform selection total derives from canonical cases plus selectable external suites",
);
const jsonIngressTarget = availability.targets.find(
  (target) => target.launcherId === "transform.json-ingress",
);
assert.ok(jsonIngressTarget, "JSON ingress is externally discoverable");
assert.equal(jsonIngressTarget.subject, "transform");
assert.equal(
  hosted_test_panel_selected_ids(
    nodeRegistry.catalog.tests,
    transformSelection,
    catalogSuites,
  ).includes(jsonIngressTarget.id),
  true,
  "JSON ingress is selectable through the Transform projection",
);

const installedRoot = await mkdtemp(join(tmpdir(), "hson-live-installed-"));
await writeFile(join(installedRoot, "package.json"), JSON.stringify({ name: "hson-live", scripts: {} }));
await writeFile(join(installedRoot, "test-launchers.js"), "export {};\n");
const installed = await resolve_external_library_launchers(new URL(`file://${join(installedRoot, "test-launchers.js")}`).href);
assert.equal(installed.targets.length, 0, "installed package without repository launchers is cleanly unavailable");
assert.deepEqual(installed.unavailable.map((entry) => entry.launcherId), manifestIds);

const authorityId = external_library_target_id("locus.authority");
assert.deepEqual(hosted_test_panel_selected_ids([], { kind: "suite", suite: authorityId }, catalogSuites), [authorityId]);
assert.equal(hosted_test_panel_test_choices([], authorityId, catalogSuites).length, 0);
assert.ok(hosted_test_panel_suite_choices([], catalogSuites).find((choice) => choice.key === `suite:${authorityId}`)?.label.endsWith("(checks observed on run)"));

const spawnFailure = await run_external_library_launcher(availability, authorityId, {
  command: join(installedRoot, "missing-npm"),
});
assert.equal(spawnFailure.ok, false, "spawn failure is a failing launcher result");
assert.ok(spawnFailure.spawnError);
const timedOut = await run_external_library_launcher(availability, authorityId, { timeoutMs: 1 });
assert.equal(timedOut.ok, false, "timeout is a failing launcher result");
assert.equal(timedOut.timedOut, true);
const staleTerminationGeneration = external_library_launcher_termination_generation();
terminate_external_library_launchers();
await assert.rejects(
  run_external_library_launcher(availability, authorityId, {
    terminationGeneration: staleTerminationGeneration,
  }),
  /cancelled before start/,
  "server shutdown prevents queued launchers from starting after active children are terminated",
);

const safeFixtures = availability.targets.filter(
  (target) => target.runtime === "node" || target.runtime === "node-synthetic-dom",
).slice(0, 6);
const serializedFixtures = availability.targets.filter(
  (target) => target.runtime === "node-real-websocket" || target.runtime === "node-real-websocket-process",
).slice(0, 2);
const fixtureTargets = Object.freeze([...safeFixtures, ...serializedFixtures]);
let activeSafeFixtures = 0;
let activeSerializedFixtures = 0;
let maximumSerializedFixtures = 0;
let serializedOverlappedSafe = false;
const fixtureLifecycle: string[] = [];
const fixturePool = await run_external_library_launcher_pool(
  fixtureTargets,
  async (target) => {
    const safe = target.runtime === "node" || target.runtime === "node-synthetic-dom";
    if (safe) activeSafeFixtures += 1;
    else {
      activeSerializedFixtures += 1;
      maximumSerializedFixtures = Math.max(maximumSerializedFixtures, activeSerializedFixtures);
      if (activeSafeFixtures !== 0) serializedOverlappedSafe = true;
    }
    await new Promise((resolve) => setTimeout(resolve, safe ? 8 : 2));
    if (safe) activeSafeFixtures -= 1;
    else activeSerializedFixtures -= 1;
    return Object.freeze({ id: target.id, stdout: `${target.id}\n`, ok: target !== fixtureTargets[1] });
  },
  EXTERNAL_LIBRARY_LAUNCHER_CONCURRENCY,
  {
    started(target) { fixtureLifecycle.push(`run:${target.id}`); },
    finished(target) { fixtureLifecycle.push(`done:${target.id}`); },
  },
);
assert.equal(
  EXTERNAL_LIBRARY_LAUNCHER_CONCURRENCY,
  2,
  "ordinary concurrency uses the measured inclusive-performance default",
);
assert.equal(fixturePool.maximumOrdinaryConcurrent, Math.min(EXTERNAL_LIBRARY_LAUNCHER_CONCURRENCY, safeFixtures.length));
assert.equal(fixturePool.maximumSpecialConcurrent, 1);
assert.equal(maximumSerializedFixtures, 1, "real-WebSocket fixture launchers are serialized");
assert.equal(serializedOverlappedSafe, true, "the constrained special lane overlaps rather than blocking the ordinary pool");
assert.ok(
  fixtureLifecycle.findIndex((entry) => entry.startsWith("done:")) < fixtureLifecycle.length - 1,
  "one launcher completion is observable before the whole selection completes",
);
assert.deepEqual(
  fixturePool.results.map((result) => result.id),
  fixtureTargets.map((target) => target.id),
  "pool completion is projected in deterministic selection order",
);
assert.deepEqual(
  fixturePool.results.map((result) => result.stdout),
  fixtureTargets.map((target) => `${target.id}\n`),
  "concurrent launcher stdout remains isolated by target",
);
assert.equal(
  fixturePool.results.length,
  fixtureTargets.length,
  "a controlled launcher failure does not prevent later fixture results",
);

let releaseAdaptiveCapacity = (): void => undefined;
const adaptiveCapacity = new Promise<void>((resolve) => {
  releaseAdaptiveCapacity = resolve;
});
const adaptiveResolvers = new Map<string, () => void>();
const adaptiveStarts: string[] = [];
let adaptiveActive = 0;
let adaptiveMaximum = 0;
const adaptivePoolPromise = run_external_library_launcher_pool(
  safeFixtures,
  async (target) => {
    adaptiveStarts.push(target.id);
    adaptiveActive += 1;
    adaptiveMaximum = Math.max(adaptiveMaximum, adaptiveActive);
    await new Promise<void>((resolve) => {
      adaptiveResolvers.set(target.id, resolve);
    });
    adaptiveActive -= 1;
    return Object.freeze({ id: target.id, stdout: target.id });
  },
  {
    initialConcurrency: 2,
    maximumConcurrency: 5,
    increaseAfter: adaptiveCapacity,
  },
);
await new Promise((resolve) => setImmediate(resolve));
assert.equal(adaptiveStarts.length, 2, "adaptive pool respects its low watermark");
releaseAdaptiveCapacity();
await new Promise((resolve) => setImmediate(resolve));
assert.equal(adaptiveStarts.length, 5, "adaptive pool raises capacity promptly after canonical completion");
for (const id of [...adaptiveStarts]) adaptiveResolvers.get(id)?.();
await new Promise((resolve) => setImmediate(resolve));
assert.equal(adaptiveStarts.length, 6, "remaining launchers begin after an active job releases capacity");
adaptiveResolvers.get(adaptiveStarts[5]!)?.();
const adaptivePool = await adaptivePoolPromise;
assert.equal(adaptiveMaximum, 5, "adaptive pool never exceeds its configured maximum");
assert.deepEqual(
  adaptivePool.results.map((result) => result.id),
  safeFixtures.map((target) => target.id),
  "adaptive results retain selection order",
);
assert.equal(new Set(adaptiveStarts).size, safeFixtures.length, "adaptive scheduling executes every target once");

let rejectCanonicalCapacity = (_error: Error): void => undefined;
const failedCanonicalCapacity = new Promise<void>((_resolve, reject) => {
  rejectCanonicalCapacity = reject;
});
let startsAfterCanonicalFailure = 0;
const failedCanonicalPool = run_external_library_launcher_pool(
  safeFixtures.slice(0, 3),
  async (target) => {
    startsAfterCanonicalFailure += 1;
    await new Promise((resolve) => setImmediate(resolve));
    return target.id;
  },
  {
    initialConcurrency: 1,
    maximumConcurrency: 3,
    increaseAfter: failedCanonicalCapacity,
  },
);
await Promise.resolve();
assert.equal(startsAfterCanonicalFailure, 1);
rejectCanonicalCapacity(new Error("controlled canonical failure"));
const failedCanonicalResults = await failedCanonicalPool;
assert.equal(startsAfterCanonicalFailure, 3, "canonical failure still releases higher external capacity");
assert.equal(failedCanonicalResults.results.length, 3);

const singleAdaptive = await run_external_library_launcher_pool(
  safeFixtures.slice(0, 1),
  async (target) => target.id,
  {
    initialConcurrency: 2,
    maximumConcurrency: 6,
    increaseAfter: Promise.resolve(),
  },
);
assert.equal(singleAdaptive.maximumOrdinaryConcurrent, 1, "single-suite execution remains single-process");

await assert.rejects(
  run_external_library_launcher_pool([fixtureTargets[0]!, fixtureTargets[0]!], async (target) => target.id),
  /Duplicate external launcher execution requested/,
);

let canonicalActive = false;
let externalActive = false;
let releaseCanonical = (): void => undefined;
let releaseExternal = (): void => undefined;
let phasesSettled = false;
const phases = run_node_verification_phases(
  async () => {
    canonicalActive = true;
    await new Promise<void>((resolve) => { releaseCanonical = resolve; });
    return "canonical";
  },
  async () => {
    externalActive = true;
    await new Promise<void>((resolve) => { releaseExternal = resolve; });
    return "external";
  },
).then((value) => {
  phasesSettled = true;
  return value;
});
await Promise.resolve();
assert.equal(canonicalActive && externalActive, true, "canonical and external phases start before either completes");
releaseCanonical();
await Promise.resolve();
assert.equal(phasesSettled, false, "combined completion waits for the external phase");
releaseExternal();
assert.deepEqual(await phases, ["canonical", "external"]);
assert.deepEqual(
  await run_node_verification_phases(
    async () => Object.freeze({ ok: false, source: "canonical" }),
    async () => Object.freeze({ ok: true, source: "external" }),
  ),
  [
    { ok: false, source: "canonical" },
    { ok: true, source: "external" },
  ],
  "a reported failure in one phase does not erase the other phase result",
);

const representativeIds = [
  "locus.authority",
  "livetree.attrs",
  "locus.client-recovery",
  "locus.action-dedupe",
];
const selected = all ? hson_live_test_launchers.map((launcher) => launcher.id) : representativeIds;
const selectedTargets = selected.map((launcherId) => {
  const target = availability.targets.find((entry) => entry.id === external_library_target_id(launcherId));
  assert.ok(target, `selected target is available: ${launcherId}`);
  return target;
});
let sequentialBaselineMs: number | undefined;
let packageScriptResults: readonly ExternalLibraryLauncherResult[] | undefined;
let tsxCandidateMs: number | undefined;
let tsxCandidateResults: readonly ExternalLibraryLauncherResult[] | undefined;
let plainMjsCandidateFailures: number | undefined;
if (all) {
  const sequentialStartedAt = performance.now();
  const sequentialResults = await run_external_library_launcher_pool(
    selectedTargets,
    (target) => run_external_library_launcher(availability, target.id, { forcePackageScript: true }),
    1,
  );
  packageScriptResults = sequentialResults.results;
  sequentialBaselineMs = performance.now() - sequentialStartedAt;
  assert.equal(sequentialResults.results.length, hson_live_test_launchers.length);
  assert.equal(sequentialResults.results.every((result) => result.ok), true);

  const mjsLauncherIds = new Set(
    hson_live_test_launchers
      .filter((launcher) => launcher.repositoryModule.endsWith(".mjs"))
      .map((launcher) => launcher.id),
  );
  const mjsTargets = selectedTargets.filter((target) => mjsLauncherIds.has(target.launcherId));
  const plainMjsResults = await run_external_library_launcher_pool(
    mjsTargets,
    (target) => run_external_library_launcher(availability, target.id, { forcePlainNode: true }),
    EXTERNAL_LIBRARY_LAUNCHER_CONCURRENCY,
  );
  plainMjsCandidateFailures = plainMjsResults.results.filter((result) => !result.ok).length;
  assert.equal(
    plainMjsCandidateFailures,
    mjsTargets.length,
    "runtime-probe .mjs launchers transitively require TypeScript loading and cannot use plain Node",
  );

  const tsxCandidateStartedAt = performance.now();
  const tsxResults = await run_external_library_launcher_pool(
    selectedTargets,
    (target) => run_external_library_launcher(availability, target.id, { forceTsx: true }),
  );
  tsxCandidateMs = performance.now() - tsxCandidateStartedAt;
  tsxCandidateResults = tsxResults.results;
  assert.equal(tsxCandidateResults.every((result) => result.ok), true);
}
reset_external_library_launcher_metrics();
const boundedStartedAt = performance.now();
const pooledResults = await run_external_library_launcher_pool(
  selectedTargets,
  (target) => run_external_library_launcher(availability, target.id, { forceVerifiedDirect: true }),
);
const boundedConcurrencyElapsedMs = performance.now() - boundedStartedAt;
const results = pooledResults.results;
for (const result of results) {
  const launcherId = result.target.launcherId;
  assert.equal(result.ok, true, `${launcherId} passes (${result.stderr})`);
  assert.equal(typeof result.stdout, "string");
  assert.equal(typeof result.stderr, "string");
  assert.equal(result.exitCode, 0);
  assert.equal(result.signal, null);
  assert.equal(result.invocationKind, availability.invocations?.[result.target.id]?.kind);
  assert.equal(result.completion?.version, 1);
  assert.equal(result.completion?.launcherId, launcherId);
  assert.equal(result.completion?.passed, result.completion?.executed);
  assert.equal(result.completion?.failed, 0);
  assert.equal(result.completionError, undefined);
}
assert.equal(new Set(results.map((result) => result.target.id)).size, selected.length, "each selected launcher executes exactly once");
assert.deepEqual(
  results.map((result) => result.target.launcherId),
  selected,
  "all launcher results retain manifest/selection order",
);
const processMetrics = external_library_launcher_metrics();
assert.equal(processMetrics.activeChildren, 0, "bounded execution leaves no active children");
assert.ok(
  processMetrics.maximumObservedConcurrentChildren <= EXTERNAL_LIBRARY_LAUNCHER_CONCURRENCY + 1,
  "bounded execution never exceeds the ordinary cap plus its single special lane",
);
const selectedInvocationKinds = selectedTargets.map((target) => availability.invocations?.[target.id]?.kind);
assert.equal(processMetrics.directLauncherStarts, selectedInvocationKinds.filter((kind) => kind === "direct").length);
assert.equal(processMetrics.packageScriptStarts, selectedInvocationKinds.filter((kind) => kind === "package-script").length);
if (packageScriptResults !== undefined) {
  for (let index = 0; index < results.length; index += 1) {
    const direct = results[index]!;
    const packaged: ExternalLibraryLauncherResult = packageScriptResults[index]!;
    assert.equal(direct.exitCode, packaged.exitCode, `${direct.target.id} direct exit matches package script`);
    assert.doesNotThrow(
      () => assert_external_launcher_stdout_parity(direct.target.launcherId, direct.stdout, packaged.stdout),
      `${direct.target.id} deterministic stdout matches package script`,
    );
    assert.equal(
      visible_external_launcher_stderr(direct.stderr),
      visible_external_launcher_stderr(packaged.stderr),
      `${direct.target.id} meaningful stderr matches package script`,
    );
  }
}
if (tsxCandidateResults !== undefined) {
  for (let index = 0; index < results.length; index += 1) {
    const verified = results[index]!;
    const tsx: ExternalLibraryLauncherResult = tsxCandidateResults[index]!;
    assert.equal(tsx.exitCode, verified.exitCode, `${tsx.target.id} tsx exit matches verified direct form`);
    assert.doesNotThrow(
      () => assert_external_launcher_stdout_parity(tsx.target.launcherId, tsx.stdout, verified.stdout),
      `${tsx.target.id} deterministic stdout matches verified direct form`,
    );
    assert.equal(
      visible_external_launcher_stderr(tsx.stderr),
      visible_external_launcher_stderr(verified.stderr),
      `${tsx.target.id} tsx meaningful stderr matches verified direct form`,
    );
  }
}

console.log(JSON.stringify({
  repositoryRoot: availability.repositoryRoot,
  targets: availability.targets.length,
  observedChecks: results.reduce((total, result) => total + (result.completion?.executed ?? 0), 0),
  executed: results.length,
  ...(sequentialBaselineMs === undefined ? {} : { sequentialBaselineMs }),
  ...(tsxCandidateMs === undefined ? {} : { tsxCandidateMs }),
  ...(plainMjsCandidateFailures === undefined ? {} : { plainMjsCandidateFailures }),
  boundedConcurrencyElapsedMs,
  maximumObservedConcurrentChildren: processMetrics.maximumObservedConcurrentChildren,
  maximumOrdinaryLauncherConcurrency: pooledResults.maximumOrdinaryConcurrent,
  maximumSpecialLauncherConcurrency: pooledResults.maximumSpecialConcurrent,
  directLaunchers: results.filter((result) => result.invocationKind === "direct").length,
  packageScriptFallbacks: results.filter((result) => result.invocationKind === "package-script").length,
  runtimes: Object.fromEntries([...new Set(availability.targets.map((target) => target.runtime))].map((runtime) => [
    runtime,
    availability.targets.filter((target) => target.runtime === runtime).length,
  ])),
}));
