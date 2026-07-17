import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { HOSTED_TEST_SUITE_IDS, HOSTED_TEST_VISIBLE_SUITES } from "../../app/hosted-test/hosted-test-suite";
import { DECLARED_DEMO_TEST_SCRIPTS, TEST_SURFACE_CATALOG, TEST_SURFACE_CATEGORIES } from "../../app/hosted-test/test-surface-catalog";
import { make_registered_hosted_test_suite_registry } from "../../hosted-test/registered-hosted-test-suites";

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
expect_surface(
  HOSTED_TEST_VISIBLE_SUITES.map((entry) => `${entry.label}:${entry.id}`).join("|")
    === "all:hosted/all|transform:category/transform|livetree:category/livetree|livemap:category/livemap|livehost:category/livehost|unit:category/unit|dev:category/dev",
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
expect_surface(browserSpecs.length === 3, `expected three owned browser journey specs, found ${browserSpecs.length}`);
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
const hostedAll = TEST_SURFACE_CATALOG.find((entry) => entry.id === "hosted-suite:hosted/all");
expect_surface(hostedAll?.behavior.includes("deterministic") === true && hostedAll.behavior.includes("generated/fuzz") === true, "hosted/all must explicitly exclude separately-run generated/fuzz verification");

for (const category of TEST_SURFACE_CATEGORIES) {
  const entries = TEST_SURFACE_CATALOG.filter((entry) => entry.category === category);
  console.log(`${category}: ${entries.length}`);
  for (const entry of entries) console.log(`  ${entry.id} | ${entry.environment} | ${entry.transport} | ${entry.status}`);
}
console.log(`test surface enumeration: ok (${TEST_SURFACE_CATALOG.length} catalog entries, ${registered.length} hosted suites, ${demoTests.length} demo test scripts, ${approvedPersistentSources.length} reachable approved-root test source files)`);
