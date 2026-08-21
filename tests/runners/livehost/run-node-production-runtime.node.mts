import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createServer } from "node:net";
import WebSocket from "ws";

const artifact = new URL("../../../dist-node/livehost-server.mjs", import.meta.url);
const source = await readFile(artifact, "utf8");
assert.equal(source.includes("../hson-live/src"), false);
assert.equal(/from\s+["'][^"']+\.tsx?["']/.test(source), false);
assert.equal(/import\s+["']tsx["']/.test(source), false);
assert.match(source, /from "hson-live\/livehost\/node"|function start_node_application_host/);

const port = await new Promise<number>((resolve, reject) => {
  const probe = createServer();
  probe.once("error", reject);
  probe.listen(0, "127.0.0.1", () => {
    const address = probe.address();
    if (address === null || typeof address === "string") {
      reject(new Error("Could not reserve a production smoke port."));
      return;
    }
    probe.close((error) => error === undefined ? resolve(address.port) : reject(error));
  });
});

const child = spawn(process.execPath, [artifact.pathname], {
  cwd: new URL("../../../", import.meta.url),
  env: {
    ...process.env,
    HOST: "127.0.0.1",
    PORT: String(port),
    SHUTDOWN_TIMEOUT_MS: "2000",
    LOCUS_DEPLOYMENT: "production",
    LOCUS_ALLOWED_ORIGINS: "https://public.example",
    LOCUS_BEARER_TOKEN: "production-smoke-secret",
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let stdout = "";
let stderr = "";
child.stdout.setEncoding("utf8");
child.stderr.setEncoding("utf8");
child.stdout.on("data", (chunk: string) => stdout += chunk);
child.stderr.on("data", (chunk: string) => stderr += chunk);

const started = await new Promise<boolean>((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(`Production server startup timed out.\n${stdout}\n${stderr}`)), 10_000);
  const inspect = (): void => {
    if (!stdout.includes("Hosted-test server listening")) return;
    clearTimeout(timer);
    resolve(true);
  };
  child.stdout.on("data", inspect);
  child.once("exit", (code) => {
    clearTimeout(timer);
    reject(new Error(`Production server exited ${code} before listening.\n${stdout}\n${stderr}`));
  });
});
assert.equal(started, true);

const health = await fetch(`http://127.0.0.1:${port}/healthz`);
assert.equal(health.status, 200);
assert.deepEqual(await health.json(), {
  ready: true,
  applications: [
    { name: "hosted-tests", ready: true },
    { name: "towl", ready: true },
    { name: "circuit-verification", ready: true },
  ],
});

const websocket = new WebSocket(
  `ws://127.0.0.1:${port}/hosted-tests?locus=hosted-tests`,
  {
    headers: {
      Origin: "https://public.example",
      Cookie: "locus_auth=production-smoke-secret",
    },
  },
);
await new Promise<void>((resolve, reject) => {
  websocket.once("open", resolve);
  websocket.once("error", reject);
});
websocket.close();

const towl = new WebSocket(
  `ws://127.0.0.1:${port}/towl?locus=towl:smoke-room`,
  {
    headers: {
      Origin: "https://public.example",
      Cookie: "locus_auth=production-smoke-secret",
    },
  },
);
await new Promise<void>((resolve, reject) => {
  towl.once("open", resolve);
  towl.once("error", reject);
});
towl.close();

child.kill("SIGTERM");
const exitCode = await new Promise<number | null>((resolve) => child.once("exit", resolve));
assert.equal(exitCode, 0, `${stdout}\n${stderr}`);
assert.equal(stderr.includes("production-smoke-secret"), false);
assert.equal(stdout.includes("production-smoke-secret"), false);

process.stdout.write("ok 1 - built production Node artifact enforces secured real-network startup and graceful SIGTERM\n");
