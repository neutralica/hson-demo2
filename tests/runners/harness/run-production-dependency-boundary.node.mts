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
  for (const path of [candidate, `${candidate}.ts`, `${candidate}.mts`, resolve(candidate, "index.ts")]) if (await exists(path)) return path;
  if (candidate.startsWith(`${testsRoot}${sep}`)) throw new Error(`PRODUCTION_IMPORT_UNRESOLVED:${relative(root, from)}:${specifier}`);
  return undefined;
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
console.log(JSON.stringify({ suite: "production-dependency-boundary", temporaryExceptions: [...observed].sort() }));
