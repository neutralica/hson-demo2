import { lstat, mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join, relative, resolve } from "node:path";
import { createHash } from "node:crypto";
import type { RunReport } from "./run-report-contract";
import type { LocalRedactor } from "./run-report-redaction";
const allowed = new Set(["text/plain", "application/json", "image/png", "image/jpeg", "image/webp"]);
const safe_name = (id: string): string => `${id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "item"}-${createHash("sha256").update(id).digest("hex").slice(0, 12)}`;
const json = (v: unknown) => JSON.stringify(v, null, 2) + "\n";
export async function materialize_run_site(runDir: string, report: RunReport, redactor: LocalRedactor): Promise<void> {
  const site = join(runDir, "site"); const categories = join(site, "categories"); const suitesDir = join(site, "suites"); const casesDir = join(site, "cases"); await mkdir(categories, { recursive: true }); await mkdir(suitesDir, { recursive: true }); await mkdir(casesDir, { recursive: true });
  const used = new Set<string>(); const claim = (name: string) => { if (used.has(name)) throw new Error(`MATERIALIZATION_COLLISION:${name}`); used.add(name); return name; };
  const categoryEntries = new Map<string, { id: string; suites: string[]; file: string }>();
  for (const suite of report.suites) { const category = categoryEntries.get(suite.category) ?? { id: suite.category, suites: [], file: claim(`categories/${safe_name(suite.category)}.json`) }; category.suites.push(suite.id); categoryEntries.set(suite.category, category); const suiteFile = claim(`suites/${safe_name(suite.id)}.json`); const caseRefs: { id: string; file: string }[] = [];
    for (const c of suite.cases) { const file = claim(`cases/${safe_name(`${suite.id}:${c.id}`)}.json`); caseRefs.push({ id: c.id, file }); await writeFile(join(site, file), json({ ...c, diagnostics: c.diagnostics.map((d) => ({ ...d, message: redactor.text(d.message).value, ...(d.stack ? { stack: redactor.text(d.stack, 32 * 1024).value } : {}) })) })); }
    await writeFile(join(site, suiteFile), json({ ...suite, cases: caseRefs }));
  }
  for (const category of categoryEntries.values()) await writeFile(join(site, category.file), json(category));
  // Public artifacts are deliberately opt-in and checked at this boundary. Existing reports contain references only.
  for (const artifact of [...report.artifacts, ...report.suites.flatMap((s) => [...s.artifacts, ...s.cases.flatMap((c) => c.artifacts)])]) { if (!allowed.has(artifact.mediaType) || artifact.path.includes("..") || artifact.path.startsWith("/")) continue; const source = resolve(runDir, artifact.path); if (!source.startsWith(resolve(runDir) + "/")) continue; const stat = await lstat(source); if (stat.isSymbolicLink()) throw new Error("PUBLIC_ARTIFACT_SYMLINK"); const limit = artifact.mediaType === "text/plain" ? 256 * 1024 : 2 * 1024 * 1024; if (stat.size > limit) continue; await readFile(source); }
  await writeFile(join(site, "index.json"), json({ id: report.id, status: report.status, totals: report.totals, categories: [...categoryEntries.values()].map((c) => ({ id: c.id, file: c.file })), suites: report.suites.map((s) => ({ id: s.id, file: `suites/${safe_name(s.id)}.json` })) }));
}
