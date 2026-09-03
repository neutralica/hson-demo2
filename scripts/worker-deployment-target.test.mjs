import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { load_worker_deployment_target } from "./worker-deployment-target.mjs";

async function fixture(overrides = {}) {
  const repositoryRoot = await mkdtemp(join(tmpdir(), "hson-towl-target-"));
  await mkdir(join(repositoryRoot, "deployment"));
  await writeFile(join(repositoryRoot, "wrangler.jsonc"), JSON.stringify({ name: "fixture-worker", main: "src/worker.ts" }));
  await writeFile(join(repositoryRoot, "deployment/towl-worker-target.json"), JSON.stringify({
    schemaVersion: 1,
    wranglerConfig: "wrangler.jsonc",
    wranglerEnvironment: null,
    publicWebSocketOriginEnvironmentVariable: "HSON_TOWL_WORKER_WS_ORIGIN",
    workerWsOrigin: "wss://worker.example",
    productionStaticOrigins: ["https://app.example"],
    ...overrides,
  }));
  return repositoryRoot;
}

test("target identity is derived from Wrangler while production origin defaults from tracked metadata", async () => {
  const repositoryRoot = await fixture();
  const target = await load_worker_deployment_target({ repositoryRoot, environment: {} });
  assert.deepEqual(target, {
    name: "fixture-worker",
    entrypoint: "src/worker.ts",
    wranglerConfig: "wrangler.jsonc",
    wranglerEnvironment: null,
    publicWebSocketOrigin: "wss://worker.example",
    publicWebSocketOriginEnvironmentVariable: "HSON_TOWL_WORKER_WS_ORIGIN",
    productionStaticOrigins: ["https://app.example"],
  });
});

test("an explicit environment origin overrides the tracked production origin", async () => {
  const repositoryRoot = await fixture();
  const target = await load_worker_deployment_target({ repositoryRoot, environment: { HSON_TOWL_WORKER_WS_ORIGIN: "wss://override.example" } });
  assert.equal(target.publicWebSocketOrigin, "wss://override.example");
});

test("missing, insecure, credentialed, or routed production origins fail closed", async () => {
  for (const value of [undefined, "ws://worker.example", "wss://user@worker.example", "wss://worker.example/towl", "wss://worker.example?target=other", "wss://worker.example#other"]) {
    const repositoryRoot = await fixture({ workerWsOrigin: value });
    await assert.rejects(load_worker_deployment_target({ repositoryRoot, environment: {} }), /HSON_TOWL_WORKER_WS_ORIGIN/);
  }
});

test("invalid target or Wrangler configuration fails closed", async () => {
  const malformedTarget = await fixture({ wranglerConfig: "missing.jsonc" });
  await assert.rejects(load_worker_deployment_target({ repositoryRoot: malformedTarget, environment: { HSON_TOWL_WORKER_WS_ORIGIN: "wss://worker.example" } }), /Wrangler configuration is missing/);
  const malformedOrigins = await fixture({ productionStaticOrigins: ["http://app.example"] });
  await assert.rejects(load_worker_deployment_target({ repositoryRoot: malformedOrigins, environment: { HSON_TOWL_WORKER_WS_ORIGIN: "wss://worker.example" } }), /static origins are invalid/);
});

test("standalone Worker deployment remains narrow and test-free", async () => {
  const manifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(manifest.scripts["deploy:worker"], "npm run build:hson-live && npm run check:cloudflare && npm run verify:worker-target && npm run preflight:cloudflare && npm run cloudflare:deploy");
  const reachable = ["deploy:worker", "build:hson-live", "check:cloudflare", "verify:worker-target", "preflight:cloudflare", "cloudflare:deploy"]
    .map((name) => manifest.scripts[name]).join("\n");
  assert.doesNotMatch(reachable, /npm\s+run\s+test(?::|\s)|playwright|npm\s+pack|npm\s+ci|git\s+(?:fetch|pull|checkout|restore|reset|merge|rebase|commit|submodule)|vite\s+build/i);
});
