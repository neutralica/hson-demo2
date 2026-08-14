import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import { resolve, dirname, relative, sep } from "node:path";
import ts from "typescript";
import { PHASE4A_TEST_COMPATIBILITY_BRIDGES } from "../../harness/core/test-convergence-compatibility";

const root = resolve(import.meta.dirname, "../../..");
const appRoot = resolve(root, "src/app/demos/tests");
const sharedRoot = resolve(root, "src/shared");
const repositoryTestsRoot = resolve(root, "tests");
let checks = 0;

function certify(condition: unknown, message: string): asserts condition {
  assert.ok(condition, message);
  checks += 1;
}

async function source_files(directory: string): Promise<readonly string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? source_files(path) : /\.(?:ts|mts)$/.test(entry.name) ? [path] : [];
  }));
  return files.flat().sort();
}

async function exists(path: string): Promise<boolean> {
  try { await stat(path); return true; } catch { return false; }
}

async function resolve_source(from: string, specifier: string): Promise<string | undefined> {
  if (!specifier.startsWith(".")) return undefined;
  const candidate = resolve(dirname(from), specifier);
  for (const path of [candidate, `${candidate}.ts`, `${candidate}.mts`, resolve(candidate, "index.ts")]) {
    if (await exists(path)) return path;
  }
  throw new Error(`Phase 4A certificate could not resolve ${specifier} from ${relative(root, from)}.`);
}

async function imports(file: string): Promise<readonly string[]> {
  const source = await readFile(file, "utf8");
  return ts.preProcessFile(source, true, true).importedFiles.map((entry) => entry.fileName);
}

const appFiles = await source_files(appRoot);
certify(appFiles.length > 0, "Test LiveDemo application sources are enumerable");

const directViolations: string[] = [];
const reachableTests: string[] = [];
const queue = [...appFiles];
const visited = new Set<string>();
while (queue.length > 0) {
  const file = queue.shift()!;
  if (visited.has(file)) continue;
  visited.add(file);
  for (const specifier of await imports(file)) {
    const imported = await resolve_source(file, specifier);
    if (imported === undefined) continue;
    if (file.startsWith(appRoot) && !imported.startsWith(resolve(root, "src/app")) && !imported.startsWith(sharedRoot)) {
      directViolations.push(`${relative(root, file)} -> ${relative(root, imported)}`);
    }
    if (imported.startsWith(`${repositoryTestsRoot}${sep}`)) reachableTests.push(`${relative(root, file)} -> ${relative(root, imported)}`);
    if (imported.startsWith(resolve(root, "src"))) queue.push(imported);
  }
}
certify(directViolations.length === 0, `Test UI imports only application/presentation or neutral shared sources: ${directViolations.join(", ")}`);
certify(reachableTests.length === 0, `Test UI's complete local import graph excludes repository test implementation: ${reachableTests.join(", ")}`);

const sharedViolations: string[] = [];
for (const file of await source_files(sharedRoot)) {
  const source = await readFile(file, "utf8");
  for (const specifier of ts.preProcessFile(source, true, true).importedFiles.map((entry) => entry.fileName)) {
    const imported = await resolve_source(file, specifier);
    if (imported?.startsWith(`${repositoryTestsRoot}${sep}`)) sharedViolations.push(`${relative(root, file)} -> ${relative(root, imported)}`);
  }
  if (/from\s+["'](?:node:|jsdom|ws)/.test(source)) sharedViolations.push(`${relative(root, file)} imports a test/runtime-only dependency`);
}
certify(sharedViolations.length === 0, `neutral shared contracts are production-safe and do not depend on tests/: ${sharedViolations.join(", ")}`);

const runtimeBackEdges: string[] = [];
for (const directory of [resolve(root, "tests/harness/hosted"), resolve(root, "tests/harness/runtimes")]) {
  for (const file of await source_files(directory)) {
    for (const specifier of await imports(file)) {
      const imported = await resolve_source(file, specifier);
      if (imported?.startsWith(appRoot)) runtimeBackEdges.push(`${relative(root, file)} -> ${relative(root, imported)}`);
    }
  }
}
certify(runtimeBackEdges.length === 0, `hosted runtime does not import Test panel presentation internals: ${runtimeBackEdges.join(", ")}`);

const implementationRoots = [
  "tests/harness/runtimes",
  "tests/runners",
  "tests/suites",
  "tests/fixtures",
].map((path) => resolve(root, path));
certify(
  (await Promise.all(implementationRoots.map(async (directory) => (await source_files(directory)).length > 0))).every(Boolean),
  "runtime adapters, runners, suites, and fixtures remain owned by tests/",
);
certify(
  !(await exists(resolve(root, "src/tests")))
    && !(await exists(resolve(root, "src/test-system")))
    && !(await exists(resolve(root, "src/hosted-test")))
    && !(await exists(resolve(root, "src/app/hosted-test"))),
  "test implementation has not been copied into a production source tree",
);

const relocatedOwners = [
  "tests/harness/core/test-order.ts",
  "tests/harness/core/test-selection.ts",
  "tests/harness/core/test-identity.ts",
  "tests/harness/core/external-launcher-contract.ts",
  "tests/harness/hosted/hosted-test-action.types.ts",
  "tests/harness/hosted/hosted-test-client-action.ts",
  "tests/harness/hosted/hosted-test-action-error.ts",
  "tests/harness/hosted/hosted-test-application.types.ts",
  "tests/harness/hosted/hosted-test-timeline.ts",
  "tests/harness/reporting/hosted/hosted-test-report.types.ts",
  "tests/harness/reporting/hosted/hosted-test-report-wire.types.ts",
  "tests/harness/reporting/hosted/hosted-test-timing.ts",
];
certify(
  (await Promise.all(relocatedOwners.map((path) => exists(resolve(root, path))))).every((present) => !present),
  "relocated neutral contracts have one source owner and no duplicate harness definitions",
);

const appText = (await Promise.all(appFiles.map((file) => readFile(file, "utf8")))).join("\n");
certify(!appText.includes("hson:quid") && !appText.includes("find.byQuid"), "ordinary Test UI action routing contains no DOM/QUID rediscovery bridge");
certify(
  PHASE4A_TEST_COMPATIBILITY_BRIDGES.length === 13
    && new Set(PHASE4A_TEST_COMPATIBILITY_BRIDGES.map((bridge) => bridge.id)).size === 13
    && PHASE4A_TEST_COMPATIBILITY_BRIDGES.every((bridge) => bridge.deletionGate.length > 0),
  "finite Phase 4A compatibility inventory has unique identities, dispositions, and deletion gates",
);

console.log(JSON.stringify({ certificate: "phase-4a-layering", checks, appFiles: appFiles.length, reachableSourceFiles: visited.size }));
