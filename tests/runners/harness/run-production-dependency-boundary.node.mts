import assert from "node:assert/strict";
import { lstat, readdir, readFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import ts from "typescript";

const root = resolve(import.meta.dirname, "../../..");
const productionRoot = resolve(root, "src");
const testsRoot = resolve(root, "tests");

async function source_files(directory: string): Promise<readonly string[]> {
  const found = await Promise.all((await readdir(directory, { withFileTypes: true })).map(async (entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? source_files(path) : /\.(?:[cm]?[jt]sx?)$/.test(entry.name) ? [path] : [];
  }));
  return found.flat().sort();
}

async function exists(path: string): Promise<boolean> {
  try { await lstat(path); return true; } catch { return false; }
}

async function resolve_import(from: string, specifier: string): Promise<string | undefined> {
  if (!specifier.startsWith(".")) return undefined;
  const candidate = resolve(dirname(from), specifier.replace(/[?#].*$/, ""));
  const sourceCandidate = candidate.replace(/\.(?:[cm]?js)$/, "");
  const extensions = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"] as const;
  const candidates = [
    candidate,
    ...extensions.map((extension) => `${candidate}${extension}`),
    ...extensions.map((extension) => `${sourceCandidate}${extension}`),
    ...extensions.map((extension) => resolve(candidate, `index${extension}`)),
  ];
  for (const path of candidates) if (await exists(path)) return path;
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
const productionFiles = await source_files(productionRoot);
for (const file of productionFiles) {
  const parsed = ts.preProcessFile(await readFile(file, "utf8"), true, true);
  for (const imported of parsed.importedFiles) {
    const target = await resolve_import(file, imported.fileName);
    if (target?.startsWith(`${testsRoot}${sep}`)) observed.add(`${relative(root, file)} -> ${relative(root, target)}`);
  }
}
assert.deepEqual([...observed].sort(), [], "production source must not import repository-root tests/");

const cloudflareConfig = ts.parseConfigFileTextToJson(
  "tsconfig.cloudflare.json",
  await readFile(resolve(root, "tsconfig.cloudflare.json"), "utf8"),
);
assert.equal(cloudflareConfig.error, undefined, "Cloudflare TypeScript configuration must parse");
const cloudflareIncludes = cloudflareConfig.config?.include;
assert.ok(Array.isArray(cloudflareIncludes), "Cloudflare TypeScript configuration must declare its source boundary");
assert.equal(
  cloudflareIncludes.some((entry: unknown) => typeof entry === "string" && /(^|\/)tests(\/|$)/.test(entry)),
  false,
  "Cloudflare production checks must not include repository-root tests/",
);

const packageManifest = JSON.parse(await readFile(resolve(root, "package.json"), "utf8")) as {
  scripts?: Readonly<Record<string, unknown>>;
};
for (const scriptName of ["build", "build:node-production", "check:cloudflare"] as const) {
  const command = packageManifest.scripts?.[scriptName];
  assert.equal(typeof command, "string", `${scriptName} must remain a declared production command`);
  assert.equal(/(^|[\s'\"])(?:\.\/)?tests(?:\/|[\s'\"]|$)/.test(command), false, `${scriptName} must not resolve through tests/`);
}

const serverFiles = productionFiles.filter((file) => file.startsWith(`${resolve(productionRoot, "server")}${sep}`));
const serverImportSpecifiers = (await Promise.all(serverFiles.map(async (file) =>
  ts.preProcessFile(await readFile(file, "utf8"), true, true).importedFiles.map((entry) => entry.fileName)
))).flat();
for (const forbidden of ["playwright", "local-run-reporter", "test-discovery", "test-selection", "external-library-launchers"]) {
  assert.equal(
    serverImportSpecifiers.some((specifier) => specifier.toLowerCase().includes(forbidden)),
    false,
    `production server must not import test execution infrastructure: ${forbidden}`,
  );
}
const cloudflareSource = (await Promise.all(
  serverFiles.filter((file) => file.includes(`${sep}cloudflare${sep}`)).map((file) => readFile(file, "utf8")),
)).join("\n");
for (const forbidden of ["tests.discover", "tests.runSelected", "cloudflare-test-executor", "hosted-test-report"]) {
  assert.equal(cloudflareSource.includes(forbidden), false, `Cloudflare production runtime must not contain ${forbidden}`);
}

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
  productionTestImports: [...observed].sort(),
  productionSourceFiles: productionFiles.length,
  cloudflareIncludes,
  productionServerModules: serverFiles.length,
  directReportModules: directReportFiles.length,
  frozenPanelModules: frozenPanelFiles.length,
}));
