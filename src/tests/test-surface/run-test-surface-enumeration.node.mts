import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { HOSTED_TEST_SUITE_IDS, HOSTED_TEST_VISIBLE_SUITES } from "../../app/hosted-test/hosted-test-suite";
import {
  DECLARED_DEMO_TEST_SCRIPTS,
  HSON_LIVE_NON_LAUNCHER_TEST_SCRIPT_REASONS,
  TEST_SURFACE_CATALOG,
  TEST_SURFACE_CATEGORIES,
} from "../../app/hosted-test/test-surface-catalog";
import { make_registered_hosted_test_suite_registry } from "../../hosted-test/registered-hosted-test-suites";
import { CANONICAL_TEST_SUBJECT_ORDER } from "../../app/demos/test/tests.types";
import {
  HSON_LIVE_TEST_COMPLETION_REQUIREMENT,
  hson_live_non_launcher_test_scripts,
  hson_live_test_launchers,
} from "hson-live/test-launchers";

function expect_surface(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`test surface enumeration: ${message}`);
}

const here = dirname(fileURLToPath(import.meta.url));
const demoRoot = resolve(here, "../../..");
const liveRoot = resolve(demoRoot, "../hson-live");
const demoPackage = JSON.parse(await readFile(resolve(demoRoot, "package.json"), "utf8")) as { scripts: Record<string, string> };
const livePackage = JSON.parse(await readFile(resolve(liveRoot, "package.json"), "utf8")) as { scripts: Record<string, string> };

const demoTests = Object.keys(demoPackage.scripts).filter((name) => name.startsWith("test:")).sort();
expect_surface(JSON.stringify(demoTests) === JSON.stringify([...DECLARED_DEMO_TEST_SCRIPTS].sort()), "catalog and hson-demo2 test scripts must match exactly");
for (const name of demoTests) {
  const entries = TEST_SURFACE_CATALOG.filter(
    (entry) => entry.repository === "hson-demo2" && entry.runner === `npm run ${name}`,
  );
  expect_surface(entries.length === 1, `package script ${name} must have exactly one command classification`);
}
expect_surface(
  HOSTED_TEST_VISIBLE_SUITES.map((entry) => `${entry.label}:${entry.id}`).join("|")
    === [
      "all:hosted/all",
      ...CANONICAL_TEST_SUBJECT_ORDER
        .filter((subject) => subject !== "reflect")
        .map((subject) => `${subject}:category/${subject}`),
      "unit:category/unit",
      "dev:category/dev",
    ].join("|"),
  "hosted selector must retain exactly the seven lowercase runnable choices",
);

const liveDeclared = new Set(TEST_SURFACE_CATALOG.filter((entry) => entry.repository === "hson-live").map((entry) => entry.runner.slice("npm run ".length)));
for (const name of ["build", "check", ...Object.keys(livePackage.scripts).filter((entry) => entry.startsWith("test:"))]) {
  expect_surface(liveDeclared.has(name), `hson-live runner ${name} is missing from the catalog`);
}

const declaredEntrypoints = new Set(Object.values(demoPackage.scripts).flatMap((command) => {
  const match = command.match(/(?:tsx|node\s+[^ ]+)\s+(src\/[^ ]+\.(?:mts|ts))/);
  return match?.[1] === undefined ? [] : [match[1]];
}));
const browserOwner = demoPackage.scripts["test:browser"];
expect_surface(browserOwner === "playwright test", "browser specs must have test:browser as their aggregate owner");
async function findEntrypoints(dir: string): Promise<string[]> {
  const found: string[] = [];
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const path = resolve(dir, item.name);
    if (item.isDirectory()) found.push(...await findEntrypoints(path));
    else if (/^run-.*\.node\.mts$/.test(item.name) || item.name.endsWith(".test.mts")) found.push(relative(demoRoot, path));
  }
  return found;
}
for (const path of await findEntrypoints(resolve(demoRoot, "src"))) {
  expect_surface(declaredEntrypoints.has(path), `runnable entrypoint ${path} has no package.json script`);
}

const browserRoot = resolve(demoRoot, "tests/browser");
const browserSources = await sourceFiles(browserRoot);
const browserSpecs = browserSources.filter((path) => path.endsWith(".spec.ts"));
expect_surface(browserSpecs.length > 0, "the test:browser aggregate must own at least one browser journey spec");
expect_surface(TEST_SURFACE_CATALOG.some((entry) => entry.runner === "npm run test:browser" && entry.category === "Application / Demo"), "browser aggregate is missing its application/demo catalog owner");
expect_surface(TEST_SURFACE_CATALOG.filter((entry) => entry.runner.startsWith("npm run test:browser")).every((entry) => !entry.appearsInHostedUi), "browser commands must remain outside the Hosted Tests UI");
expect_surface(TEST_SURFACE_CATALOG.find((entry) => entry.id === "hson-demo2:test:amoebi-geometry")?.category === "Application / Demo", "Amoebi geometry must be owned by Application / Demo");
expect_surface(TEST_SURFACE_CATALOG.some((entry) => entry.id === "hson-demo2:test:soft-tile-node" && entry.category === "Application / Demo"), "soft-tile verification needs an explicit application/demo owner");

async function sourceFiles(dir: string): Promise<string[]> {
  const found: string[] = [];
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const path = resolve(dir, item.name);
    if (item.isDirectory()) found.push(...await sourceFiles(path));
    else if (/\.(?:ts|mts)$/.test(item.name)) found.push(path);
  }
  return found;
}
async function resolvableImport(from: string, specifier: string): Promise<string | undefined> {
  if (!specifier.startsWith(".")) return undefined;
  const raw = resolve(dirname(from), specifier.replace(/\.js$/, ""));
  for (const candidate of [raw, `${raw}.ts`, `${raw}.mts`, resolve(raw, "index.ts"), resolve(raw, "index.mts")]) {
    try { if ((await stat(candidate)).isFile()) return candidate; } catch { /* try the next TypeScript resolution */ }
  }
  return undefined;
}
const roots = [...declaredEntrypoints].map((path) => resolve(demoRoot, path));
roots.push(...browserSpecs);
for (const name of await readdir(browserRoot)) {
  if (!name.endsWith(".html")) continue;
  const html = await readFile(resolve(browserRoot, name), "utf8");
  for (const match of html.matchAll(/<script\b[^>]*\bsrc=["']\/([^"']+\.(?:ts|mts))["']/g)) {
    if (match[1] !== undefined) roots.push(resolve(demoRoot, match[1]));
  }
}
roots.push(resolve(demoRoot, "src/hosted-test/registered-hosted-test-suites.ts"));
roots.push(...(await sourceFiles(resolve(demoRoot, "src/tests"))).filter((path) => /compile-tests-.*\.ts$/.test(path)));
const reachable = new Set<string>();
const queue = [...roots];
while (queue.length > 0) {
  const file = queue.pop();
  if (file === undefined || reachable.has(file)) continue;
  reachable.add(file);
  const source = await readFile(file, "utf8");
  for (const match of source.matchAll(/(?:from\s+|import\s*\()?["'](\.[^"']+)["']/g)) {
    const imported = match[1] === undefined ? undefined : await resolvableImport(file, match[1]);
    if (imported !== undefined) queue.push(imported);
  }
}
const testSources = await sourceFiles(resolve(demoRoot, "src/tests"));
const approvedPersistentSources = [...testSources, ...browserSources];
const unreachable = approvedPersistentSources.filter((path) => !reachable.has(path));
expect_surface(unreachable.length === 0, `test source files are unreachable from declared runners or the hosted factory: ${unreachable.map((path) => relative(demoRoot, path)).join(", ")}`);

const registered = make_registered_hosted_test_suite_registry().list().map((entry) => entry.id).sort();
expect_surface(JSON.stringify(registered) === JSON.stringify([...HOSTED_TEST_SUITE_IDS].sort()), "registered hosted suites and declared suite IDs differ");
const catalogSuites = TEST_SURFACE_CATALOG.flatMap((entry) => entry.hostedSuiteId === undefined ? [] : [entry.hostedSuiteId]).sort();
expect_surface(JSON.stringify(catalogSuites) === JSON.stringify([...HOSTED_TEST_SUITE_IDS].sort()), "every hosted suite must appear exactly once in the UI catalog");

const ids = TEST_SURFACE_CATALOG.map((entry) => entry.id);
expect_surface(new Set(ids).size === ids.length, "catalog IDs must be unique");
expect_surface(TEST_SURFACE_CATALOG.every((entry) => entry.status !== "migration-required"), "no permanent suite may remain migration-required");
expect_surface(
  TEST_SURFACE_CATALOG
    .filter((entry) => entry.exposure === "explicitly excluded")
    .every((entry) => entry.role === "developer utility" && (entry.exclusionReason?.trim().length ?? 0) > 0),
  "every intentionally excluded command must be a developer utility with a reason",
);
expect_surface(
  TEST_SURFACE_CATALOG
    .filter((entry) => entry.role === "aggregate verification command")
    .every((entry) => entry.exposure === "command only" && !entry.appearsInHostedUi),
  "aggregate verification commands must not be counted as hosted selectable tests",
);
expect_surface(
  TEST_SURFACE_CATALOG
    .filter((entry) => entry.role === "canonical selectable suite")
    .every((entry) => entry.exposure === "hosted selectable"),
  "canonical selectable suites cannot be mislabeled as aggregates or command-only checks",
);
for (const entry of TEST_SURFACE_CATALOG) {
  if (entry.aliasOf === undefined) continue;
  expect_surface(entry.aliasOf !== entry.id && ids.includes(entry.aliasOf), `catalog alias ${entry.id} must name another catalog entry`);
}
const commandClaims = new Map<string, typeof TEST_SURFACE_CATALOG[number][]>();
for (const entry of TEST_SURFACE_CATALOG.filter((candidate) => candidate.hostedSuiteId === undefined)) {
  const key = `${entry.repository}:${entry.runner}`;
  const claims = commandClaims.get(key) ?? [];
  claims.push(entry);
  commandClaims.set(key, claims);
}
for (const [command, claims] of commandClaims) {
  expect_surface(
    claims.length === 1 || claims.slice(1).every((entry) => entry.aliasOf !== undefined),
    `command ${command} has duplicate catalog owners without an explicit alias`,
  );
}
const externalManifestRunners = new Set(
  hson_live_test_launchers.map((launcher) => `npm run ${launcher.packageScript}`),
);
const externalCatalogEntries = TEST_SURFACE_CATALOG.filter(
  (entry) => entry.repository === "hson-live"
    && entry.role === "external diagnostic launcher",
);
const externalCatalogRunners = new Set(externalCatalogEntries.map((entry) => entry.runner));
expect_surface(
  JSON.stringify([...externalManifestRunners].sort()) === JSON.stringify([...externalCatalogRunners].sort()),
  "external launcher catalog entries must exactly match the manifested diagnostics",
);
const manifestLauncherIds = hson_live_test_launchers.map((launcher) => launcher.id);
const catalogLauncherIds = externalCatalogEntries.flatMap(
  (entry) => entry.externalLauncher === undefined ? [] : [entry.externalLauncher.launcherId],
);
expect_surface(
  new Set(manifestLauncherIds).size === manifestLauncherIds.length,
  `manifest launcher IDs must be unique: ${manifestLauncherIds.join(", ")}`,
);
expect_surface(
  new Set(catalogLauncherIds).size === catalogLauncherIds.length,
  `catalog launcher IDs must be unique: ${catalogLauncherIds.join(", ")}`,
);
for (const launcher of hson_live_test_launchers) {
  const matches = externalCatalogEntries.filter(
    (candidate) => candidate.externalLauncher?.launcherId === launcher.id,
  );
  expect_surface(
    matches.length === 1,
    `launcher ${launcher.id}: manifest checks ${launcher.executableChecks}, catalog entries ${matches.length}`,
  );
  const entry = matches[0]!;
  const catalogLauncher = entry.externalLauncher!;
  expect_surface(
    catalogLauncher.packageScript === launcher.packageScript,
    `launcher ${launcher.id}: manifest script ${launcher.packageScript}, catalog script ${catalogLauncher.packageScript}`,
  );
  expect_surface(
    catalogLauncher.primarySubject === launcher.subject,
    `launcher ${launcher.id}: manifest subject ${launcher.subject}, catalog subject ${catalogLauncher.primarySubject}`,
  );
  expect_surface(
    catalogLauncher.executableChecks === launcher.executableChecks,
    `launcher ${launcher.id}: manifest checks ${launcher.executableChecks}, catalog checks ${catalogLauncher.executableChecks}`,
  );
  expect_surface(
    catalogLauncher.runtime === launcher.runtime,
    `launcher ${launcher.id}: manifest runtime ${launcher.runtime}, catalog runtime ${catalogLauncher.runtime}`,
  );
  expect_surface(
    catalogLauncher.completionRequirement === HSON_LIVE_TEST_COMPLETION_REQUIREMENT,
    `launcher ${launcher.id}: catalog completion requirement must be ${HSON_LIVE_TEST_COMPLETION_REQUIREMENT}`,
  );
  expect_surface(
    catalogLauncher.panelVisible && entry.appearsInHostedUi
      && catalogLauncher.inclusiveEligible && entry.exposure === "hosted selectable",
    `launcher ${launcher.id}: panel visibility and inclusive eligibility must remain explicit`,
  );
  const environmentMatches = launcher.runtime === "node"
    ? entry.environment === "Node"
    : launcher.runtime === "node-synthetic-dom"
      ? entry.environment === "Node + synthetic DOM"
      : launcher.runtime === "node-real-websocket"
        ? entry.environment === "Node" && entry.transport === "real WebSocket"
        : entry.environment === "Node child processes" && entry.transport === "real WebSocket";
  expect_surface(environmentMatches, `external launcher ${launcher.id} has environment metadata inconsistent with ${launcher.runtime}`);
}
for (const entry of externalCatalogEntries) {
  const launcher = hson_live_test_launchers.find(
    (candidate) => candidate.id === entry.externalLauncher?.launcherId,
  );
  expect_surface(
    launcher !== undefined,
    `catalog launcher ${entry.externalLauncher?.launcherId ?? entry.id} has no manifest launcher`,
  );
}
const packageTestScripts = Object.keys(livePackage.scripts)
  .filter((name): name is `test:${string}` => name.startsWith("test:"));
const unmanifestedPackageScripts = packageTestScripts
  .filter((name) => !hson_live_test_launchers.some((launcher) => launcher.packageScript === name))
  .sort();
const declaredNonLauncherScripts = hson_live_non_launcher_test_scripts
  .map((entry) => entry.packageScript)
  .sort();
expect_surface(
  JSON.stringify(unmanifestedPackageScripts) === JSON.stringify(declaredNonLauncherScripts),
  `unmanifested package scripts differ: actual ${unmanifestedPackageScripts.join(", ")}, declared ${declaredNonLauncherScripts.join(", ")}`,
);
for (const script of declaredNonLauncherScripts) {
  expect_surface(
    (HSON_LIVE_NON_LAUNCHER_TEST_SCRIPT_REASONS[script]?.trim().length ?? 0) > 0,
    `non-launcher package script ${script} must retain its manifested exclusion reason`,
  );
}
const jsonIngress = externalCatalogEntries.find(
  (entry) => entry.externalLauncher?.launcherId === "transform.json-ingress",
);
const jsonIngressManifest = hson_live_test_launchers.find(
  (launcher) => launcher.id === "transform.json-ingress",
);
expect_surface(
  jsonIngressManifest !== undefined
    && jsonIngress?.runner === "npm run test:json-ingress"
    && jsonIngress.externalLauncher?.primarySubject === "Transform"
    && jsonIngress.externalLauncher.executableChecks === jsonIngressManifest?.executableChecks
    && jsonIngress.externalLauncher.panelVisible
    && jsonIngress.externalLauncher.inclusiveEligible,
  "launcher transform.json-ingress must be discoverable, selectable, and inclusive through its manifest-derived catalog entry",
);
expect_surface(
  TEST_SURFACE_CATALOG
    .filter((entry) => entry.role === "external diagnostic launcher")
    .every((entry) => entry.hostedSuiteId === undefined),
  "external launchers must not be duplicated as canonical hosted suites",
);
const exactPolicies = new Map(TEST_SURFACE_CATALOG.map((entry) => [entry.id, entry]));
expect_surface(
  exactPolicies.get("hson-demo2:test:node-application-host")?.role === "canonical selectable suite",
  "the node application host command must retain its canonical suite identity",
);
expect_surface(
  exactPolicies.get("hson-demo2:test:livehost-bootstrap-integration")?.role === "integration journey"
    && exactPolicies.get("hson-demo2:test:livehost-bootstrap-integration")?.transport === "real HTTP + WebSocket",
  "the bootstrap integration must be classified explicitly",
);
expect_surface(
  exactPolicies.get("hson-demo2:test:node-production-runtime")?.role === "production artifact verification",
  "the production runtime command must be classified as an artifact verification",
);
expect_surface(
  exactPolicies.get("hson-demo2:test:hosted-performance-node")?.exposure === "explicitly excluded",
  "the performance matrix must be explicitly excluded from ordinary hosted discovery",
);
const hostedAll = TEST_SURFACE_CATALOG.find((entry) => entry.id === "hosted-suite:hosted/all");
expect_surface(hostedAll?.behavior.includes("deterministic") === true && hostedAll.behavior.includes("generated/fuzz") === true, "hosted/all must explicitly exclude separately-run generated/fuzz verification");

for (const category of TEST_SURFACE_CATEGORIES) {
  const entries = TEST_SURFACE_CATALOG.filter((entry) => entry.category === category);
  console.log(`${category}: ${entries.length}`);
  for (const entry of entries) console.log(`  ${entry.id} | ${entry.environment} | ${entry.transport} | ${entry.status}`);
}
console.log(`test surface enumeration: ok (${TEST_SURFACE_CATALOG.length} catalog entries, ${registered.length} hosted suites, ${demoTests.length} demo test scripts, ${approvedPersistentSources.length} reachable approved-root test source files)`);
