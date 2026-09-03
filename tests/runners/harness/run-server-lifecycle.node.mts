import assert from "node:assert/strict";
import { start_local_livehost_server } from "../../harness/runtimes/node/server/local-livehost-server";

const server = await start_local_livehost_server({ port: 0 });
const health = new URL(server.url);
health.protocol = "http:";
health.pathname = "/healthz";
assert.equal((await fetch(health)).status, 200);
assert.deepEqual(server.connectionSnapshot(), { total: 0, towl: 0, circuitVerification: 0 });
await server.stop();
await assert.rejects(fetch(health), /fetch failed|ECONNREFUSED/);
console.log(JSON.stringify({ suite: "server-lifecycle", checks: 3 }));
