import { lstat, readFile, readdir } from "node:fs/promises";
import { dirname, extname, join, relative, resolve, sep } from "node:path";

function inside(root: string, candidate: string): boolean {
  const value = relative(root, candidate);
  return value === "" || (value !== ".." && !value.startsWith(`..${sep}`));
}

function owned_path(root: string, path: string): string {
  const candidate = resolve(root, path);
  if (!inside(root, candidate)) throw new Error(`BUILD_ARTIFACT_PATH_ESCAPE:${path}`);
  return candidate;
}

async function tree_files(root: string, directory: string): Promise<readonly string[]> {
  const found: string[] = [];
  for (const entry of await readdir(owned_path(root, directory), { withFileTypes: true })) {
    const path = join(directory, entry.name).replaceAll("\\", "/");
    const info = await lstat(owned_path(root, path));
    if (info.isSymbolicLink()) throw new Error(`BUILD_ARTIFACT_SYMLINK_REJECTED:${path}`);
    if (info.isDirectory()) found.push(...await tree_files(root, path));
    else if (info.isFile()) found.push(path);
    else throw new Error(`BUILD_ARTIFACT_TYPE_REJECTED:${path}`);
  }
  return Object.freeze(found.sort());
}

async function require_files(root: string, required: readonly string[]): Promise<void> {
  for (const path of required) {
    let info;
    try { info = await lstat(owned_path(root, path)); } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") throw new Error(`BUILD_ARTIFACT_REQUIRED_MISSING:${path}`);
      throw error;
    }
    if (!info.isFile() || info.isSymbolicLink()) throw new Error(`BUILD_ARTIFACT_REQUIRED_NOT_FILE:${path}`);
  }
}

export async function validate_required_package_files(root: string, required: Readonly<{
  runtime: readonly string[];
  declarations: readonly string[];
  bins: readonly string[];
}>): Promise<void> {
  await require_files(root, [...required.runtime, ...required.declarations, ...required.bins]);
  for (const path of required.declarations) if (!path.endsWith(".d.ts")) throw new Error(`BUILD_ARTIFACT_DECLARATION_INVALID:${path}`);
  for (const path of required.bins) {
    const info = await lstat(owned_path(root, path));
    if ((info.mode & 0o111) === 0) throw new Error(`BUILD_ARTIFACT_BIN_NOT_EXECUTABLE:${path}`);
  }
}

export async function validate_exact_output_tree(root: string, outputRoot: string, required: readonly string[]): Promise<void> {
  const actual = await tree_files(root, outputRoot);
  const expected = Object.freeze(required.map((path) => join(outputRoot, path).replaceAll("\\", "/")).sort());
  await require_files(root, expected);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`BUILD_ARTIFACT_UNEXPECTED_OUTPUT:${actual.filter((path) => !expected.includes(path)).join(",")}`);
  }
}

function asset_target(from: string, reference: string, outputRoot: string): string | undefined {
  const pathname = reference.trim().replace(/[?#].*$/, "");
  if (pathname === "" || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(pathname)) return undefined;
  if (!pathname.startsWith("/assets/") && !pathname.startsWith("assets/") && !pathname.startsWith("./") && !pathname.startsWith("../")) return undefined;
  const absoluteOutput = resolve(outputRoot);
  const candidate = pathname.startsWith("/") ? resolve(absoluteOutput, `.${pathname}`) : resolve(dirname(from), pathname);
  if (!inside(absoluteOutput, candidate)) throw new Error(`BUILD_ARTIFACT_PATH_ESCAPE:${reference}`);
  const assetsRoot = join(absoluteOutput, "assets");
  if (!inside(assetsRoot, candidate)) return undefined;
  return candidate;
}

function references(from: string, text: string, outputRoot: string): readonly string[] {
  const found = new Set<string>();
  const add = (value: string): void => { const target = asset_target(from, value, outputRoot); if (target !== undefined) found.add(target); };
  const quoted = (pattern: RegExp): void => { for (const match of text.matchAll(pattern)) add(match[1] ?? match[2] ?? ""); };
  if (from.endsWith(".html")) quoted(/(?:src|href)\s*=\s*(?:"([^"]+)"|'([^']+)')/gi);
  if (from.endsWith(".js")) {
    quoted(/\bimport\s*(?:\(\s*)?(?:"([^"]+)"|'([^']+)')/g);
    quoted(/\bfrom\s*(?:"([^"]+)"|'([^']+)')/g);
    quoted(/\bnew\s+URL\s*\(\s*(?:"([^"]+)"|'([^']+)')\s*,\s*import\.meta\.url\s*\)/g);
  }
  if (from.endsWith(".css")) {
    quoted(/@import\s*(?:"([^"]+)"|'([^']+)')/gi);
    quoted(/url\(\s*(?:"([^"]+)"|'([^']+)')\s*\)/gi);
    for (const match of text.matchAll(/url\(\s*([^\s)'"`][^\s)]*)\s*\)/gi)) add(match[1] ?? "");
  }
  return Object.freeze([...found].sort());
}

export async function validate_vite_output(root: string, outputDirectory = "dist"): Promise<Readonly<{ files: readonly string[]; assets: readonly string[] }>> {
  const outputRoot = owned_path(root, outputDirectory);
  const relativeFiles = await tree_files(root, outputDirectory);
  const absoluteFiles = new Set(relativeFiles.map((path) => owned_path(root, path)));
  const htmlRoots = relativeFiles.filter((path) => extname(path) === ".html").map((path) => owned_path(root, path));
  if (htmlRoots.length === 0) throw new Error("BUILD_ARTIFACT_REQUIRED_MISSING:index.html");
  const reachable = new Set<string>();
  const pending = [...htmlRoots];
  while (pending.length > 0) {
    const from = pending.pop()!;
    if (!/\.(?:html|js|css)$/.test(from)) continue;
    for (const target of references(from, await readFile(from, "utf8"), outputRoot)) {
      if (!absoluteFiles.has(target)) throw new Error(`BUILD_ARTIFACT_VITE_REFERENCE_MISSING:${relative(root, target)}`);
      if (reachable.has(target)) continue;
      reachable.add(target);
      pending.push(target);
    }
  }
  const assets = relativeFiles.filter((path) => path.startsWith(`${outputDirectory}/assets/`)).map((path) => owned_path(root, path));
  const unreferenced = assets.filter((path) => !reachable.has(path));
  if (unreferenced.length > 0) throw new Error(`BUILD_ARTIFACT_VITE_ASSET_UNREFERENCED:${unreferenced.map((path) => relative(root, path)).join(",")}`);
  return Object.freeze({ files: relativeFiles, assets: Object.freeze(assets.map((path) => relative(root, path)).sort()) });
}
