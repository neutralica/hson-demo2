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

const all = process.argv.includes("--all");
const availability = await resolve_external_library_launchers();
const catalogSuites = Object.freeze(availability.targets.map(external_launcher_suite_descriptor));
const manifestIds = hson_live_test_launchers.map((launcher) => launcher.id);
const manifestCheckCount = hson_live_test_launchers.reduce(
  (total, launcher) => total + launcher.executableChecks,
  0,
);
assert.equal(
  new Set(manifestIds).size,
  manifestIds.length,
  "the exported diagnostics manifest has unique launcher IDs",
);
assert.ok(availability.repositoryRoot, "linked repository root resolves from the imported subpath");
assert.equal(await realpath(availability.repositoryRoot!), availability.repositoryRoot);
assert.equal(
  availability.targets.length,
  hson_live_test_launchers.length,
  "discovered launcher count matches the exported diagnostics manifest",
);
assert.deepEqual(
  availability.targets.map((target) => target.launcherId),
  manifestIds,
  "every exported diagnostics launcher resolves in manifest order",
);
assert.equal(availability.unavailable.length, 0, "no exported diagnostics launcher is unavailable");
assert.equal(
  Object.values(availability.invocations ?? {}).filter((invocation) => invocation.kind === "direct").length,
  hson_live_test_launchers.length,
  "all current package scripts match the audited direct invocation shape",
);
for (const launcher of hson_live_test_launchers) {
  const target = availability.targets.find((candidate) => candidate.launcherId === launcher.id);
  assert.ok(target, `exported launcher resolves: ${launcher.id}`);
  assert.equal(target.executableChecks, launcher.executableChecks);
  assert.equal(target.runtime, launcher.runtime);
  assert.deepEqual(target.tags, launcher.collections);
  assert.equal(target.collections.every((collection) => collection === "unit" || collection === "dev"), true);
}
for (const requiredId of [
  "core.hson-node-quid",
  "transform.hson-node-quid-ingress",
  "transform.hson-node-quid-egress",
  "livetree.quid-eligibility",
  "livemap.path-handle",
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
assert.equal(
  availability.targets.reduce((total, target) => total + target.executableChecks, 0),
  manifestCheckCount,
  "discovered declared checks agree with the diagnostics manifest",
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
  categoryTargets.get("livemap")?.some((target) => target.launcherId === "livemap.path-handle"),
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
  nodeRegistry.catalog.tests.length + manifestCheckCount,
  "complete selection derives canonical plus each manifested external check exactly once",
);
assert.equal(
  [...categoryTargets.values()].reduce(
    (total, targets) => total + targets.reduce(
      (categoryTotal, target) => categoryTotal + target.executableChecks,
      0,
    ),
    0,
  ),
  manifestCheckCount,
  "semantic subject buckets do not inflate the complete external total",
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
const transformExternalCount = transformExternalTargets.reduce(
  (total, target) => total + target.executableChecks,
  0,
);
assert.equal(
  hosted_test_panel_selection_case_count(
    nodeRegistry.catalog.tests,
    transformSelection,
    catalogSuites,
  ),
  transformCanonicalCount + transformExternalCount,
  "Transform total derives from canonical cases plus semantic external subjects",
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
assert.equal(installed.unavailable.length, hson_live_test_launchers.length);

const authorityId = external_library_target_id("locus.authority");
assert.deepEqual(hosted_test_panel_selected_ids([], { kind: "suite", suite: authorityId }, catalogSuites), [authorityId]);
assert.equal(hosted_test_panel_test_choices([], authorityId, catalogSuites).length, 0);
assert.ok(hosted_test_panel_suite_choices([], catalogSuites).find((choice) => choice.key === `suite:${authorityId}`)?.label.endsWith("(21)"));

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
  assert.equal(result.invocationKind, "direct");
  assert.deepEqual(result.completion, {
    version: 1,
    launcherId,
    executed: result.target.executableChecks,
    passed: result.target.executableChecks,
    failed: 0,
  });
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
assert.equal(processMetrics.directLauncherStarts, selected.length);
assert.equal(processMetrics.packageScriptStarts, 0);
if (packageScriptResults !== undefined) {
  for (let index = 0; index < results.length; index += 1) {
    const direct = results[index]!;
    const packaged: ExternalLibraryLauncherResult = packageScriptResults[index]!;
    assert.equal(direct.exitCode, packaged.exitCode, `${direct.target.id} direct exit matches package script`);
    assert.equal(direct.stdout, packaged.stdout, `${direct.target.id} direct stdout matches package script`);
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
    assert.equal(tsx.stdout, verified.stdout, `${tsx.target.id} tsx stdout matches verified direct form`);
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
  declaredCases: availability.targets.reduce((total, target) => total + target.executableChecks, 0),
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
