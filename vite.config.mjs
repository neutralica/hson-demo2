import { createReadStream, existsSync, lstatSync, readFileSync, statSync } from "node:fs";
import { extname, resolve, sep } from "node:path";
import { defineConfig, loadEnv } from "vite";

const RUN_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TERMINAL_STATUSES = new Set(["pass", "fail", "skip", "unsupported", "cancelled", "error"]);

function read_json(path, code) {
  try { return JSON.parse(readFileSync(path, "utf8")); }
  catch (cause) { throw new Error(`${code}: ${path}`, { cause }); }
}

function require_report_site(directory) {
  const site = resolve(directory);
  const state = lstatSync(site, { throwIfNoEntry: false });
  if (state === undefined || state.isSymbolicLink() || !state.isDirectory() || !existsSync(resolve(site, "index.json"))) {
    throw new Error(`LOCAL_FROZEN_REPORT_SITE_MISSING: ${site}`);
  }
  return site;
}

export function resolve_local_frozen_evidence(environment, applicationRoot = process.cwd()) {
  const configuredRoot = environment.VITE_TEST_EVIDENCE_ROOT?.trim();
  const configuredDirectory = environment.HSON_LOCAL_FROZEN_EVIDENCE_DIRECTORY?.trim();
  if (configuredRoot !== undefined || configuredDirectory !== undefined) {
    if (configuredRoot === undefined || configuredDirectory === undefined) throw new Error("LOCAL_FROZEN_OVERRIDE_INCOMPLETE");
    const match = /^\/test-evidence\/([^/]+)$/.exec(configuredRoot);
    if (match === null || !RUN_ID.test(match[1])) throw new Error("LOCAL_FROZEN_OVERRIDE_RUN_ID_INVALID");
    return Object.freeze({ publicRoot: configuredRoot, runId: match[1], evidenceDirectory: require_report_site(configuredDirectory), source: "override" });
  }

  const reports = resolve(applicationRoot, ".test-reports");
  const pointerPath = resolve(reports, "current.json");
  if (!existsSync(pointerPath)) return undefined;
  const pointer = read_json(pointerPath, "LOCAL_FROZEN_CURRENT_REPORT_INVALID");
  if (!RUN_ID.test(pointer?.runId ?? "") || pointer.path !== `${pointer.runId}/site`) throw new Error(`LOCAL_FROZEN_CURRENT_REPORT_INVALID: ${pointerPath}`);

  const runDirectory = resolve(reports, pointer.runId);
  const run = read_json(resolve(runDirectory, "run.json"), "LOCAL_FROZEN_RUN_REPORT_INVALID");
  if (run.id !== pointer.runId || !TERMINAL_STATUSES.has(run.status)) throw new Error(`LOCAL_FROZEN_RUN_REPORT_INVALID: ${resolve(runDirectory, "run.json")}`);
  const evidenceDirectory = require_report_site(resolve(runDirectory, "site"));
  const index = read_json(resolve(evidenceDirectory, "index.json"), "LOCAL_FROZEN_REPORT_INDEX_INVALID");
  if (index.runId !== pointer.runId || index.status !== run.status || !TERMINAL_STATUSES.has(index.status)) {
    throw new Error(`LOCAL_FROZEN_REPORT_INDEX_INVALID: ${resolve(evidenceDirectory, "index.json")}`);
  }
  return Object.freeze({ publicRoot: `/test-evidence/${pointer.runId}`, runId: pointer.runId, evidenceDirectory, status: run.status, source: "current" });
}

function process_exists(pid) {
  try { process.kill(pid, 0); return true; }
  catch (error) { return error.code !== "ESRCH"; }
}

function playwright_owner_lifecycle_plugin(environment) {
  const rawOwnerPid = environment.HSON_PLAYWRIGHT_OWNER_PID;
  if (rawOwnerPid === undefined) return undefined;
  if (!/^\d+$/.test(rawOwnerPid) || Number(rawOwnerPid) <= 0) {
    throw new Error("HSON_PLAYWRIGHT_OWNER_PID must be a positive process ID.");
  }
  const ownerPid = Number(rawOwnerPid);
  return {
    name: "hson-playwright-owner-lifecycle",
    apply: "serve",
    configureServer(server) {
      let stopping = false;
      const timer = setInterval(() => {
        if (stopping || process_exists(ownerPid)) return;
        stopping = true;
        clearInterval(timer);
        const forceTimer = setTimeout(() => process.exit(1), 5_000);
        void server.close().then(
          () => { clearTimeout(forceTimer); process.exit(0); },
          () => { clearTimeout(forceTimer); process.exit(1); },
        );
      }, 100);
      server.httpServer?.once("close", () => clearInterval(timer));
    },
  };
}

export function local_frozen_evidence_plugin(environment, applicationRoot = process.cwd()) {
  const selection = resolve_local_frozen_evidence(environment, applicationRoot);
  return {
    name: "local-frozen-test-evidence",
    apply: "serve",
    config() {
      if (selection === undefined) return undefined;
      return { define: { "import.meta.env.VITE_TEST_EVIDENCE_ROOT": JSON.stringify(selection.publicRoot) } };
    },
    configureServer(server) {
      if (selection === undefined) return;
      const { publicRoot, evidenceDirectory: exactDirectory } = selection;
      server.middlewares.use((request, response, next) => {
        const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
        if (pathname !== publicRoot && !pathname.startsWith(`${publicRoot}/`)) return next();
        const relative = pathname === publicRoot ? "index.json" : pathname.slice(publicRoot.length + 1);
        const file = resolve(exactDirectory, relative);
        if (!file.startsWith(`${exactDirectory}${sep}`) || !existsSync(file) || !statSync(file).isFile()) return next();
        const contentType = ({ ".json": "application/json; charset=utf-8", ".txt": "text/plain; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" })[extname(file).toLowerCase()];
        if (contentType === undefined) return next();
        response.statusCode = 200;
        response.setHeader("Content-Type", contentType);
        if (request.method === "HEAD") return response.end();
        createReadStream(file).pipe(response);
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), "");
  const ownerLifecycle = playwright_owner_lifecycle_plugin(environment);
  return {
    plugins: [...(mode === "frozen-local" ? [local_frozen_evidence_plugin(environment)] : []), ...(ownerLifecycle === undefined ? [] : [ownerLifecycle])],
    server: {
      hmr: false,
    },
  };
});
