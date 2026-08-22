import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { lstat, readFile, readdir, rm } from "node:fs/promises";
import { dirname, extname, join, relative, resolve, sep } from "node:path";

export const H2C_VERIFICATION_IDS = Object.freeze([
  "hson-live:build",
  "hson-live:check",
  "hson-live:check:source",
  "hson-live:check:tests",
  "hson-live:check:entrypoints",
  "hson-live:test:diagnostics-inventory",
  "hson-demo2:build",
  "hson-demo2:check",
  "hson-demo2:build:node-production",
  "hson-demo2:check:cloudflare",
  "hson-demo2:cloudflare:types",
] as const);

export type H2CVerificationId = typeof H2C_VERIFICATION_IDS[number];
export type H2ArtifactManifestEntry = Readonly<{
  relativePath: string;
  fileType: "file";
  byteLength: number;
  sha256: string;
  executable: boolean;
}>;

type TreeContract = "typescript-output" | "vite-output" | "exact-required";

type ArtifactPolicy =
  | Readonly<{ kind: "none" }>
  | Readonly<{ kind: "tree"; root: string; required: readonly string[]; clean: readonly string[]; contract: TreeContract }>
  | Readonly<{ kind: "files"; required: readonly string[]; clean: readonly string[] }>;

export type H2CDescriptor = Readonly<{
  id: H2CVerificationId;
  repository: "hson-live" | "hson-demo2";
  script: string;
  directModule?: string;
  claim: "type-only" | "build-producing" | "package-export" | "generated-artifact-inspection";
  artifact: ArtifactPolicy;
}>;

const descriptors: readonly H2CDescriptor[] = Object.freeze([
  // Hybrid contract: every emitted TypeScript output must correspond to source,
  // while package.json supplies the required public runtime/declaration targets.
  { id: "hson-live:build", repository: "hson-live", script: "build", claim: "package-export", artifact: { kind: "tree", root: "dist", required: [], clean: ["dist"], contract: "typescript-output" } },
  { id: "hson-live:check", repository: "hson-live", script: "check", claim: "type-only", artifact: { kind: "none" } },
  { id: "hson-live:check:source", repository: "hson-live", script: "check:source", claim: "type-only", artifact: { kind: "none" } },
  { id: "hson-live:check:tests", repository: "hson-live", script: "check:tests", claim: "type-only", artifact: { kind: "none" } },
  { id: "hson-live:check:entrypoints", repository: "hson-live", script: "check:entrypoints", claim: "type-only", artifact: { kind: "none" } },
  { id: "hson-live:test:diagnostics-inventory", repository: "hson-live", script: "test:diagnostics-inventory", directModule: "tests/diagnostics-inventory.acceptance.mts", claim: "generated-artifact-inspection", artifact: { kind: "files", required: ["dist/diagnostics/index.js", "dist/diagnostics/index.d.ts", "dist/index.d.ts", "dist/api/livemap/index.d.ts", "dist/types/livemap.types.d.ts", "dist/types/constructor.types.d.ts"], clean: [] } },
  // Hybrid contract: Vite may vary content hashes, but only its hashed asset
  // family plus checked-in public files and index.html belong in dist.
  { id: "hson-demo2:build", repository: "hson-demo2", script: "build", claim: "build-producing", artifact: { kind: "tree", root: "dist", required: ["index.html"], clean: ["dist"], contract: "vite-output" } },
  { id: "hson-demo2:check", repository: "hson-demo2", script: "check", claim: "type-only", artifact: { kind: "none" } },
  { id: "hson-demo2:build:node-production", repository: "hson-demo2", script: "build:node-production", claim: "build-producing", artifact: { kind: "tree", root: "dist-node", required: ["livehost-server.mjs", "circuit-verification-worker.mjs"], clean: ["dist-node"], contract: "exact-required" } },
  { id: "hson-demo2:check:cloudflare", repository: "hson-demo2", script: "check:cloudflare", claim: "type-only", artifact: { kind: "none" } },
  { id: "hson-demo2:cloudflare:types", repository: "hson-demo2", script: "cloudflare:types", claim: "build-producing", artifact: { kind: "files", required: ["tests/harness/runtimes/cloudflare/worker-configuration.d.ts"], clean: ["tests/harness/runtimes/cloudflare/worker-configuration.d.ts"] } },
]);

const registry: ReadonlyMap<H2CVerificationId, H2CDescriptor> = new Map(descriptors.map((entry) => [entry.id, entry]));

export function resolve_h2c_descriptor(id: string): H2CDescriptor {
  const descriptor = registry.get(id as H2CVerificationId);
  if (descriptor === undefined) throw new Error(`UNKNOWN_H2C_VERIFICATION_ID: ${id}`);
  return descriptor;
}

function inside(root: string, candidate: string): boolean {
  const value = relative(root, candidate);
  return value === "" || (value !== ".." && !value.startsWith(`..${sep}`));
}

function owned_path(root: string, path: string): string {
  const candidate = resolve(root, path);
  if (!inside(root, candidate)) throw new Error(`H2C_ARTIFACT_PATH_ESCAPE: ${path}`);
  return candidate;
}

async function file_entry(root: string, path: string): Promise<H2ArtifactManifestEntry> {
  const absolute = owned_path(root, path);
  const info = await lstat(absolute);
  if (!info.isFile() || info.isSymbolicLink()) throw new Error(`H2C_ARTIFACT_NOT_FILE: ${path}`);
  const bytes = await readFile(absolute);
  return Object.freeze({
    relativePath: path.replaceAll("\\", "/"),
    fileType: "file",
    byteLength: bytes.byteLength,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    executable: (info.mode & 0o111) !== 0,
  });
}

async function tree_files(root: string, directory: string): Promise<string[]> {
  const found: string[] = [];
  for (const entry of await readdir(owned_path(root, directory), { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`H2C_ARTIFACT_SYMLINK: ${path}`);
    if (entry.isDirectory()) found.push(...await tree_files(root, path));
    else if (entry.isFile()) found.push(path);
    else throw new Error(`H2C_ARTIFACT_UNSUPPORTED_TYPE: ${path}`);
  }
  return found;
}

async function source_files(root: string, directory: string): Promise<string[]> {
  const found: string[] = [];
  for (const entry of await readdir(owned_path(root, directory), { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`H2C_SOURCE_SYMLINK: ${path}`);
    if (entry.isDirectory()) found.push(...await source_files(root, path));
    else if (entry.isFile()) found.push(path);
  }
  return found;
}

async function allowed_typescript_outputs(root: string, artifactRoot: string): Promise<ReadonlySet<string>> {
  const source = await source_files(root, "src");
  const allowed = new Set<string>();
  for (const path of source) {
    if (!path.endsWith(".ts")) continue;
    const output = join(artifactRoot, path.slice("src/".length, -".ts".length));
    for (const suffix of [".js", ".js.map", ".d.ts", ".d.ts.map"]) allowed.add(`${output}${suffix}`);
  }
  return allowed;
}

async function allowed_vite_public_files(root: string, artifactRoot: string): Promise<ReadonlySet<string>> {
  const allowed = new Set<string>([join(artifactRoot, "index.html")]);
  try {
    for (const path of await source_files(root, "public")) allowed.add(join(artifactRoot, path.slice("public/".length)));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  return allowed;
}

type ViteAssetGraph = Readonly<{
  references: readonly string[];
  existing: readonly string[];
  missing: readonly string[];
  unreferenced: readonly string[];
}>;

function vite_asset_target(from: string, reference: string, artifactRoot: string): string | undefined {
  const pathname = reference.replace(/[?#].*$/, "");
  if (pathname === "" || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(pathname)) return undefined;
  if (!pathname.startsWith("/assets/") && !pathname.startsWith("assets/") && !pathname.startsWith("./") && !pathname.startsWith("../")) return undefined;
  const root = resolve(artifactRoot);
  const candidate = pathname.startsWith("/")
    ? resolve(root, `.${pathname}`)
    : resolve(dirname(from), pathname);
  if (!inside(root, candidate)) throw new Error(`H2C_ARTIFACT_PATH_ESCAPE: ${reference}`);
  if (!inside(join(root, "assets"), candidate)) return undefined;
  return join(artifactRoot, relative(root, candidate)).replaceAll("\\", "/");
}

function vite_asset_references(from: string, text: string, artifactRoot: string): readonly string[] {
  const references = new Set<string>();
  const add = (reference: string): void => {
    const target = vite_asset_target(from, reference.trim(), artifactRoot);
    if (target !== undefined) references.add(target);
  };
  const quoted = (pattern: RegExp): void => {
    for (const match of text.matchAll(pattern)) add(match[1] ?? match[2] ?? "");
  };
  if (from.endsWith(".html")) quoted(/(?:src|href)\s*=\s*(?:"([^"]+)"|'([^']+)')/gi);
  if (from.endsWith(".js")) {
    quoted(/\bimport\s*(?:\(\s*)?(?:"([^"]+)"|'([^']+)')/g);
    quoted(/\bfrom\s*(?:"([^"]+)"|'([^']+)')/g);
    quoted(/\bnew\s+URL\s*\(\s*(?:"([^"]+)"|'([^']+)')\s*,\s*import\.meta\.url\s*\)/g);
  }
  if (from.endsWith(".css")) {
    quoted(/@import\s*(?:"([^"]+)"|'([^']+)')/gi);
    for (const match of text.matchAll(/url\(\s*([^\s)'"`][^\s)]*)\s*\)/gi)) add(match[1]!);
  }
  return Object.freeze([...references].sort());
}

async function vite_asset_graph(root: string, artifactRoot: string, paths: readonly string[]): Promise<ViteAssetGraph> {
  const assets = new Set(paths.filter((path) => path.startsWith(`${artifactRoot}/assets/`)));
  const roots = paths.filter((path) => extname(path) === ".html");
  const reachable = new Set<string>();
  const references = new Set<string>();
  const pending = [...roots];
  while (pending.length > 0) {
    const from = pending.pop();
    if (from === undefined || !/\.(?:html|js|css)$/.test(from)) continue;
    const text = await readFile(owned_path(root, from), "utf8");
    for (const target of vite_asset_references(from, text, artifactRoot)) {
      references.add(target);
      if (!assets.has(target) || reachable.has(target)) continue;
      reachable.add(target);
      pending.push(target);
    }
  }
  const existing = [...references].filter((path) => assets.has(path)).sort();
  const missing = [...references].filter((path) => !assets.has(path)).sort();
  const unreferenced = [...assets].filter((path) => !reachable.has(path)).sort();
  return Object.freeze({ references: Object.freeze([...references].sort()), existing: Object.freeze(existing), missing: Object.freeze(missing), unreferenced: Object.freeze(unreferenced) });
}

async function verify_tree_contract(root: string, artifact: Extract<ArtifactPolicy, { kind: "tree" }>, paths: readonly string[]): Promise<void> {
  if (artifact.contract === "exact-required") {
    const expected = artifact.required.map((path) => join(artifact.root, path)).sort();
    if (JSON.stringify([...paths].sort()) !== JSON.stringify(expected)) throw new Error("H2C_UNEXPECTED_ARTIFACT");
    return;
  }
  const allowed = artifact.contract === "typescript-output"
    ? await allowed_typescript_outputs(root, artifact.root)
    : await allowed_vite_public_files(root, artifact.root);
  const viteGraph = artifact.contract === "vite-output"
    ? await vite_asset_graph(root, artifact.root, paths)
    : undefined;
  if (viteGraph !== undefined && viteGraph.missing.length > 0) {
    throw new Error(`H2C_VITE_MISSING_REFERENCE: ${viteGraph.missing.join(", ")}`);
  }
  if (viteGraph !== undefined && viteGraph.unreferenced.length > 0) {
    throw new Error(`H2C_UNEXPECTED_ARTIFACT: ${viteGraph.unreferenced.join(", ")}`);
  }
  const viteAssets = new Set(viteGraph?.existing ?? []);
  for (const path of paths) {
    const permitted = allowed.has(path) || viteAssets.has(path);
    if (!permitted) throw new Error(`H2C_UNEXPECTED_ARTIFACT: ${path}`);
  }
}

export async function collect_h2_artifact_manifest(root: string, paths: readonly string[]): Promise<readonly H2ArtifactManifestEntry[]> {
  const entries = await Promise.all([...paths].sort().map((path) => file_entry(root, path)));
  return Object.freeze(entries.sort((left, right) => left.relativePath.localeCompare(right.relativePath)));
}

export async function verify_h2_artifact_manifest(root: string, expected: readonly H2ArtifactManifestEntry[]): Promise<void> {
  const actual = await collect_h2_artifact_manifest(root, expected.map((entry) => entry.relativePath));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error("H2C_ARTIFACT_MANIFEST_MISMATCH");
}

async function package_export_targets(root: string): Promise<readonly string[]> {
  const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8")) as { main?: unknown; types?: unknown; exports?: unknown };
  const targets = new Set<string>();
  const visit = (value: unknown): void => {
    if (typeof value === "string" && value.startsWith("./dist/")) targets.add(value.slice(2));
    else if (typeof value === "object" && value !== null) for (const nested of Object.values(value)) visit(nested);
  };
  visit(pkg.main); visit(pkg.types); visit(pkg.exports);
  if (targets.size === 0) throw new Error("H2C_PACKAGE_EXPORT_TARGETS_MISSING");
  return Object.freeze([...targets].sort());
}

async function run_npm(root: string, npmCli: string, script: string): Promise<void> {
  const code = await new Promise<number | null>((resolveCode, reject) => {
    const child = spawn(process.execPath, [npmCli, "run", script], { cwd: root, env: process.env, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", resolveCode);
  });
  if (code !== 0) throw new Error(`H2C_COMMAND_FAILED: ${script} (${String(code)})`);
}

async function run_direct_module(root: string, module: string): Promise<void> {
  const code = await new Promise<number | null>((resolveCode, reject) => {
    const child = spawn(process.execPath, ["--import", "tsx", owned_path(root, module)], { cwd: root, env: process.env, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", resolveCode);
  });
  if (code !== 0) throw new Error(`H2C_COMMAND_FAILED: ${module} (${String(code)})`);
}

export type H2CArtifactCertificate = Readonly<{
  certificate: H2CVerificationId;
  status: "pass";
  claim: H2CDescriptor["claim"];
  command: string;
  checks: readonly string[];
  artifacts: readonly H2ArtifactManifestEntry[];
  exportTargets?: readonly string[];
}>;

export type H2CTerminalCertificate = Readonly<{
  certificate: H2CVerificationId;
  status: "pass";
  claim: H2CDescriptor["claim"];
  command: string;
  checks: readonly string[];
  artifactEvidence: Readonly<{
    fileCount: number;
    byteLength: number;
    manifestSha256: string;
    required: readonly H2ArtifactManifestEntry[];
  }>;
  exportTargets?: readonly string[];
}>;

export async function run_h2c_artifact_certification(options: Readonly<{
  id: string;
  hsonLiveRoot: string;
  hsonDemo2Root: string;
  npmCli: string;
}>): Promise<H2CArtifactCertificate> {
  await clean_h2c_owned_outputs(options);
  const descriptor = resolve_h2c_descriptor(options.id);
  const root = descriptor.repository === "hson-live" ? options.hsonLiveRoot : options.hsonDemo2Root;
  if (descriptor.directModule === undefined) await run_npm(root, options.npmCli, descriptor.script);
  else await run_direct_module(root, descriptor.directModule);
  return inspect_h2c_artifacts(options);
}

export async function clean_h2c_owned_outputs(options: Readonly<{
  id: string;
  hsonLiveRoot: string;
  hsonDemo2Root: string;
}>): Promise<void> {
  const descriptor = resolve_h2c_descriptor(options.id);
  const root = descriptor.repository === "hson-live" ? options.hsonLiveRoot : options.hsonDemo2Root;
  const clean = descriptor.artifact.kind === "none" ? [] : descriptor.artifact.clean;
  for (const path of clean) await rm(owned_path(root, path), { recursive: true, force: true });
}

export async function inspect_h2c_artifacts(options: Readonly<{
  id: string;
  hsonLiveRoot: string;
  hsonDemo2Root: string;
}>): Promise<H2CArtifactCertificate> {
  const descriptor = resolve_h2c_descriptor(options.id);
  const root = descriptor.repository === "hson-live" ? options.hsonLiveRoot : options.hsonDemo2Root;
  let artifacts: readonly H2ArtifactManifestEntry[] = Object.freeze([]);
  const checks = [`command:${descriptor.script}`, `claim:${descriptor.claim}`];
  const exportTargets = descriptor.id === "hson-live:build" ? await package_export_targets(root) : undefined;
  if (descriptor.artifact.kind === "tree") {
    const artifact = descriptor.artifact;
    const paths = await tree_files(root, artifact.root);
    for (const required of artifact.required) {
      const path = join(artifact.root, required);
      if (!paths.includes(path)) throw new Error(`H2C_REQUIRED_ARTIFACT_MISSING: ${path}`);
    }
    if (exportTargets !== undefined) for (const target of exportTargets) {
      if (!paths.includes(target)) throw new Error(`H2C_REQUIRED_ARTIFACT_MISSING: ${target}`);
    }
    await verify_tree_contract(root, artifact, paths);
    artifacts = await collect_h2_artifact_manifest(root, paths);
    checks.push(`tree:${artifact.root}`, `files:${artifacts.length}`);
  } else if (descriptor.artifact.kind === "files") {
    artifacts = await collect_h2_artifact_manifest(root, descriptor.artifact.required);
    checks.push(`files:${artifacts.length}`);
  } else {
    checks.push("typecheck:no-artifact-claim");
  }
  await verify_h2_artifact_manifest(root, artifacts);
  if (exportTargets !== undefined) checks.push(`package-exports:${exportTargets.length}`);
  return Object.freeze({
    certificate: descriptor.id,
    status: "pass",
    claim: descriptor.claim,
    command: descriptor.directModule === undefined ? `npm run ${descriptor.script}` : `node --import tsx ${descriptor.directModule}`,
    checks: Object.freeze(checks),
    artifacts,
    ...(exportTargets === undefined ? {} : { exportTargets }),
  });
}

export function h2c_terminal_certificate(value: H2CArtifactCertificate): H2CTerminalCertificate {
  const descriptor = resolve_h2c_descriptor(value.certificate);
  const artifact = descriptor.artifact;
  let requiredPaths: readonly string[];
  if (artifact.kind === "none") requiredPaths = [];
  else if (artifact.kind === "files") requiredPaths = artifact.required;
  else if (value.exportTargets !== undefined) requiredPaths = value.exportTargets;
  else requiredPaths = artifact.required.map((path) => join(artifact.root, path));
  const required = value.artifacts.filter((entry) => requiredPaths.includes(entry.relativePath));
  return Object.freeze({
    certificate: value.certificate,
    status: "pass",
    claim: value.claim,
    command: value.command,
    checks: value.checks,
    artifactEvidence: Object.freeze({
      fileCount: value.artifacts.length,
      byteLength: value.artifacts.reduce((total, entry) => total + entry.byteLength, 0),
      manifestSha256: createHash("sha256").update(JSON.stringify(value.artifacts)).digest("hex"),
      required: Object.freeze(required),
    }),
    ...(value.exportTargets === undefined ? {} : { exportTargets: value.exportTargets }),
  });
}

export function h2c_certificate_valid(record: Record<string, unknown>, id: string): boolean {
  if (!H2C_VERIFICATION_IDS.includes(id as H2CVerificationId)) return false;
  const evidence = record.artifactEvidence;
  return record.certificate === id
    && record.status === "pass"
    && typeof record.command === "string"
    && typeof record.claim === "string"
    && Array.isArray(record.checks) && record.checks.length >= 3 && record.checks.every((entry) => typeof entry === "string")
    && typeof evidence === "object" && evidence !== null
    && typeof (evidence as Record<string, unknown>).fileCount === "number"
    && typeof (evidence as Record<string, unknown>).byteLength === "number"
    && /^[a-f0-9]{64}$/.test(String((evidence as Record<string, unknown>).manifestSha256))
    && Array.isArray((evidence as Record<string, unknown>).required)
    && ((evidence as Record<string, unknown>).required as readonly unknown[]).every((entry) => typeof entry === "object" && entry !== null
      && typeof (entry as Record<string, unknown>).relativePath === "string"
      && (entry as Record<string, unknown>).fileType === "file"
      && typeof (entry as Record<string, unknown>).byteLength === "number"
      && /^[a-f0-9]{64}$/.test(String((entry as Record<string, unknown>).sha256))
      && typeof (entry as Record<string, unknown>).executable === "boolean");
}
