import { spawn } from "node:child_process";
import { createServer } from "node:http";
import WebSocket from "ws";

function expect_entry(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`node application host entry: ${message}`);
}

function child_exit(child: ReturnType<typeof spawn>): Promise<Readonly<{ code: number | null; signal: NodeJS.Signals | null }>> {
  return new Promise((resolve) => {
    const finish = (code: number | null, signal: NodeJS.Signals | null): void => resolve({ code, signal });
    child.once("exit", finish);
    // Close the attach-after-exit race without weakening the event result.
    if (child.exitCode !== null || child.signalCode !== null) {
      child.off("exit", finish);
      resolve({ code: child.exitCode, signal: child.signalCode });
    }
  });
}

async function available_port(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("Unable to reserve an entrypoint smoke port.");
  await new Promise<void>((resolve, reject) => server.close((error) => error === undefined ? resolve() : reject(error)));
  return address.port;
}

async function wait_for(
  predicate: () => boolean,
  timeoutMs: number,
  failure: () => string,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!predicate() && Date.now() < deadline) {
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
  }
  if (!predicate()) throw new Error(failure());
}

const port = await available_port();
const child = spawn(
  process.execPath,
  ["--import", "tsx", "tests/harness/runtimes/node/server/hosted-test-server-entry.node.ts"],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: String(port),
      SHUTDOWN_TIMEOUT_MS: "2000",
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let stdout = "";
let stderr = "";
child.stdout.setEncoding("utf8");
child.stderr.setEncoding("utf8");
child.stdout.on("data", (chunk: string) => { stdout += chunk; });
child.stderr.on("data", (chunk: string) => { stderr += chunk; });

try {
  await wait_for(
    () => stdout.includes("Hosted-test server listening"),
    5_000,
    () => `entrypoint did not listen\nstdout:\n${stdout}\nstderr:\n${stderr}`,
  );
  const healthResponse = await fetch(`http://127.0.0.1:${port}/healthz`);
  const healthText = await healthResponse.text();
  const websocket = new WebSocket(`ws://127.0.0.1:${port}/hosted-tests?locus=hosted-tests`);
  await new Promise<void>((resolve, reject) => {
    websocket.once("open", resolve);
    websocket.once("error", reject);
  });
  websocket.close();
  expect_entry(
    healthResponse.status === 200
      && healthText.includes('"name":"hosted-tests"')
      && healthText.includes('"name":"towl"')
      && stdout.includes('"type":"host-listening"')
      && stdout.includes('"type":"application-registration"'),
    "source entrypoint must expose health, both registrations, and structured startup events",
  );
  const exitPromise = child_exit(child);
  child.kill("SIGTERM");
  const forceTimer = setTimeout(() => {
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
  }, 5_000);
  const exit = await exitPromise.finally(() => clearTimeout(forceTimer));
  expect_entry(
    exit.code === 0
      && exit.signal === null
      && stdout.includes('"type":"shutdown-completion"'),
    `SIGTERM must use bounded host shutdown\nstdout:\n${stdout}\nstderr:\n${stderr}`,
  );
} finally {
  if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
}

console.log(JSON.stringify({ port, health: true, structuredEvents: true, gracefulShutdown: true }));
