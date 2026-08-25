import { createReadStream, existsSync, statSync } from "node:fs";
import { resolve, sep } from "node:path";
import { defineConfig, loadEnv } from "vite";

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

function local_frozen_evidence_plugin(environment) {
  const publicRoot = environment.VITE_TEST_EVIDENCE_ROOT;
  const evidenceDirectory = environment.HSON_LOCAL_FROZEN_EVIDENCE_DIRECTORY;
  return {
    name: "local-frozen-test-evidence",
    apply: "serve",
    configureServer(server) {
      if (publicRoot === undefined || evidenceDirectory === undefined) return;
      if (!/^\/test-evidence\/[0-9a-f]{40}$/.test(publicRoot)) throw new Error("LOCAL_FROZEN_EVIDENCE_ROOT_INVALID");
      const exactDirectory = resolve(evidenceDirectory);
      if (!existsSync(resolve(exactDirectory, "index.json"))) throw new Error("LOCAL_FROZEN_EVIDENCE_INDEX_MISSING");
      server.middlewares.use((request, response, next) => {
        const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
        if (pathname !== publicRoot && !pathname.startsWith(`${publicRoot}/`)) return next();
        const relative = pathname === publicRoot ? "index.json" : pathname.slice(publicRoot.length + 1);
        const file = resolve(exactDirectory, relative);
        if (!file.startsWith(`${exactDirectory}${sep}`) || !existsSync(file) || !statSync(file).isFile()) return next();
        response.statusCode = 200;
        response.setHeader("Content-Type", "application/json; charset=utf-8");
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
    plugins: [local_frozen_evidence_plugin(environment), ...(ownerLifecycle === undefined ? [] : [ownerLifecycle])],
    server: {
      hmr: false,
    },
  };
});
