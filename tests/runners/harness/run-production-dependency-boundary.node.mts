import assert from "node:assert/strict";
import { lstat, readdir, readFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import ts from "typescript";

const root = resolve(import.meta.dirname, "../../..");
const productionRoot = resolve(root, "src");
const testsRoot = resolve(root, "tests");
const temporaryPhase7Exceptions = new Set([
  "src/server/public-livehost-server.ts -> tests/harness/runtimes/node/server/node-circuit-verification-application.ts",
  "src/server/public-livehost-server.ts -> tests/harness/runtimes/node/server/node-towl-application.ts",
  "src/server/public-livehost-server.ts -> tests/harness/runtimes/node/server/node-production-security.ts",
]);

async function source_files(directory: string): Promise<readonly string[]> {
  const found = await Promise.all((await readdir(directory, { withFileTypes: true })).map(async (entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? source_files(path) : /\.(?:ts|mts)$/.test(entry.name) ? [path] : [];
  }));
  return found.flat().sort();
}

async function exists(path: string): Promise<boolean> {
  try { await lstat(path); return true; } catch { return false; }
}

async function resolve_import(from: string, specifier: string): Promise<string | undefined> {
  if (!specifier.startsWith(".")) return undefined;
  const candidate = resolve(dirname(from), specifier.replace(/[?#].*$/, ""));
  const sourceCandidate = candidate.replace(/\.js$/, "");
  for (const path of [candidate, `${candidate}.ts`, `${candidate}.mts`, `${sourceCandidate}.ts`, `${sourceCandidate}.mts`, resolve(candidate, "index.ts")]) if (await exists(path)) return path;
  if (candidate.startsWith(`${testsRoot}${sep}`)) throw new Error(`PRODUCTION_IMPORT_UNRESOLVED:${relative(root, from)}:${specifier}`);
  return undefined;
}

async function reachable_from(entry: string): Promise<readonly string[]> {
  const pending = [entry];
  const reached = new Set<string>();
  while (pending.length > 0) {
    const file = pending.pop()!;
    if (reached.has(file)) continue;
    reached.add(file);
    const parsed = ts.preProcessFile(await readFile(file, "utf8"), true, true);
    for (const imported of parsed.importedFiles) {
      const target = await resolve_import(file, imported.fileName);
      if (target !== undefined && !reached.has(target)) pending.push(target);
    }
  }
  return [...reached].sort();
}

const observed = new Set<string>();
for (const file of await source_files(productionRoot)) {
  const parsed = ts.preProcessFile(await readFile(file, "utf8"), true, true);
  for (const imported of parsed.importedFiles) {
    const target = await resolve_import(file, imported.fileName);
    if (target?.startsWith(`${testsRoot}${sep}`)) observed.add(`${relative(root, file)} -> ${relative(root, target)}`);
  }
}
assert.deepEqual([...observed].sort(), [...temporaryPhase7Exceptions].sort(), "production imports tests/ only through the explicit Phase 7 migration targets; remove this exact list in Phase 7");

const directReportFiles = await reachable_from(resolve(root, "tests/runners/harness/run-test-report.node.mts"));
const forbiddenDirectReportPaths = [
  "src/shared/hosted-tests/",
  "tests/harness/reporting/hosted/",
  "tests/harness/hosted/hosted-test-application.ts",
  "tests/harness/runtimes/node/server/hosted-test-server.ts",
  "src/app/demos/tests/hosted-client/browser-websocket-socket.ts",
  "src/app/demos/tests/panel/mount-tp.ts",
];
assert.deepEqual(
  directReportFiles.map((file) => relative(root, file)).filter((file) => forbiddenDirectReportPaths.some((path) => file.startsWith(path))),
  [],
  "test:report must not reach the retired LiveHost/WebSocket report transport",
);

const frozenPanelFiles = await reachable_from(resolve(root, "src/app/demos/tests/panel/mount-test-panels.ts"));
const frozenPanelSource = (await Promise.all(frozenPanelFiles.map((file) => readFile(file, "utf8")))).join("\n");
for (const forbidden of ["TestRunner", "child_process", "playwright", "new WebSocket", "tests.runSelected", "tests.discover"]) {
  assert.equal(frozenPanelSource.includes(forbidden), false, `frozen Tests UI must not contain execution capability: ${forbidden}`);
}

console.log(JSON.stringify({
  suite: "production-dependency-boundary",
  temporaryExceptions: [...observed].sort(),
  directReportModules: directReportFiles.length,
  frozenPanelModules: frozenPanelFiles.length,
}));
