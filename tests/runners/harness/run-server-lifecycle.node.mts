import assert from "node:assert/strict";
import { start_hosted_test_server } from "../../harness/runtimes/node/server/hosted-test-server";

const server = await start_hosted_test_server({ port: 0 });
const health = new URL(server.url);
health.protocol = "http:";
health.pathname = "/healthz";
assert.equal((await fetch(health)).status, 200);
assert.equal(server.browserMetrics?.().activeProcesses, 0);
await server.stop();
await assert.rejects(fetch(health), /fetch failed|ECONNREFUSED/);
assert.equal(server.browserMetrics?.().activeProcesses, 0);
console.log(JSON.stringify({ suite: "server-lifecycle", checks: 4 }));
