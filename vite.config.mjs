import { createReadStream, existsSync, statSync } from "node:fs";
import { resolve, sep } from "node:path";
import { defineConfig, loadEnv } from "vite";

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
  return {
    plugins: [local_frozen_evidence_plugin(environment)],
    server: {
      hmr: false,
    },
  };
});
