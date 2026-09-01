import { Worker } from "node:worker_threads";
import WebSocket from "ws";
import { create_browser_locus_socket, type BrowserWebSocketConstructor } from "hson-live/locus";
import { create_echo } from "hson-live/echo";
import { start_node_application_host } from "hson-live/livehost/node";
import type { CircuitVerificationActions, CircuitVerificationResult } from "../../../src/shared/circuit-verification-contract";
import { create_circuit_verification_service } from "../../harness/runtimes/node/circuit-verification-service";
import { create_node_circuit_verification_application } from "../../harness/runtimes/node/server/node-circuit-verification-application";

function rounded(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}

function ordinary_source(): string {
  return JSON.stringify({
    phase: 2,
    title: "ordinary worker circuit",
    rows: Array.from({ length: 100 }, (_, index) => ({ index, text: `row-${index}`, active: index % 3 === 0 })),
  });
}

async function submit_timing(
  service: ReturnType<typeof create_circuit_verification_service>,
  panelId: string,
  inputRevision: number,
  source: string,
): Promise<Readonly<{ totalMs: number; workerExecutionMs: number; coordinationUpperBoundMs: number; result: CircuitVerificationResult }>> {
  const began = performance.now();
  const result = await service.submit({ panelId, inputRevision, entry: "json", source });
  const totalMs = performance.now() - began;
  return Object.freeze({
    totalMs,
    workerExecutionMs: result.durationMs,
    coordinationUpperBoundMs: Math.max(0, totalMs - result.durationMs),
    result,
  });
}

const coldBegan = performance.now();
const service = create_circuit_verification_service();
await service.ready();
const coldWorkerStartupMs = performance.now() - coldBegan;

let measurements;
try {
  const tiny = await submit_timing(service, "tiny", 1, '{"ok":true}');
  const ordinary = await submit_timing(service, "ordinary", 1, ordinary_source());
  const malformedEarly = await submit_timing(service, "malformed-early", 1, "{");
  const malformedLate = await submit_timing(
    service,
    "malformed-late",
    1,
    `{"payload":"${"x".repeat(100_000)}"`,
  );

  const supersessionBegan = performance.now();
  const obsolete = service.submit({ panelId: "supersession", inputRevision: 1, entry: "json", source: ordinary_source() });
  const current = service.submit({ panelId: "supersession", inputRevision: 2, entry: "json", source: '{"current":true}' });
  const [obsoleteResult] = await Promise.all([obsolete, current]);
  const supersessionDelayMs = performance.now() - supersessionBegan;

  let queuedStartedAt = 0;
  const blocker = service.submit({ panelId: "queue-blocker", inputRevision: 1, entry: "json", source: ordinary_source() });
  const queuedAt = performance.now();
  const queued = service.submit(
    { panelId: "queue-wait", inputRevision: 1, entry: "json", source: '{"queued":true}' },
    (progress) => { if (progress.stage === "started") queuedStartedAt = performance.now(); },
  );
  await Promise.all([blocker, queued]);
  const queueWaitMs = Math.max(0, queuedStartedAt - queuedAt);

  measurements = {
    coldWorkerStartupMs: rounded(coldWorkerStartupMs),
    warmTiny: {
      totalMs: rounded(tiny.totalMs),
      workerExecutionMs: rounded(tiny.workerExecutionMs),
      resultTransferAndCoordinationUpperBoundMs: rounded(tiny.coordinationUpperBoundMs),
    },
    warmOrdinary: {
      sourceCharacters: ordinary_source().length,
      totalMs: rounded(ordinary.totalMs),
      workerExecutionMs: rounded(ordinary.workerExecutionMs),
      resultTransferAndCoordinationUpperBoundMs: rounded(ordinary.coordinationUpperBoundMs),
    },
    malformedEarly: {
      totalMs: rounded(malformedEarly.totalMs),
      workerExecutionMs: rounded(malformedEarly.workerExecutionMs),
    },
    malformedLate: {
      sourceCharacters: 100_013,
      totalMs: rounded(malformedLate.totalMs),
      workerExecutionMs: rounded(malformedLate.workerExecutionMs),
    },
    supersession: {
      delayMs: rounded(supersessionDelayMs),
      obsoleteStatus: obsoleteResult.status,
    },
    queueWaitMs: rounded(queueWaitMs),
  };
} finally {
  await service.dispose();
}

let currentWorker: Worker | undefined;
const replacementService = create_circuit_verification_service({
  workerFactory() {
    currentWorker = new Worker(
      new URL("../../harness/runtimes/node/circuit-verification-worker.mjs", import.meta.url),
      { name: "hson-circuit-verifier-measurement" },
    );
    return currentWorker;
  },
});
await replacementService.ready();
const replacementBegan = performance.now();
await currentWorker?.terminate();
while (replacementService.diagnostics().workerStarts < 2) {
  await new Promise<void>((resolve) => setTimeout(resolve, 1));
}
await replacementService.ready();
const workerReplacementMs = performance.now() - replacementBegan;
await replacementService.dispose();

const application = await create_node_circuit_verification_application();
const host = await start_node_application_host({ port: 0, applications: [application.registration] });
const transport = create_browser_locus_socket(
  `${host.url}/circuit-verification?locus=circuit-verifier`,
  WebSocket as unknown as BrowserWebSocketConstructor,
);
let locusTotalMs = 0;
let locusWorkerExecutionMs = 0;
try {
  await transport.ready;
  const client = create_echo<undefined, CircuitVerificationActions>({ socket: transport.socket });
  client.connect();
  await new Promise<void>((resolve) => setTimeout(resolve, 10));
  const began = performance.now();
  const response = await client.action("circuit.verify", {
    panelId: "network-measurement",
    inputRevision: 1,
    entry: "json",
    source: ordinary_source(),
  });
  locusTotalMs = performance.now() - began;
  if (response.type !== "ack") throw new Error(`Locus measurement failed: ${response.error.code}`);
  const result = response.result as unknown as CircuitVerificationResult;
  locusWorkerExecutionMs = result.durationMs;
  client.disconnect();
  client.session.dispose();
  client.recovery.dispose();
} finally {
  transport.dispose();
  await host.dispose();
}

console.log(JSON.stringify({
  ...measurements,
  workerReplacementMs: rounded(workerReplacementMs),
  localhostLocus: {
    totalMs: rounded(locusTotalMs),
    workerExecutionMs: rounded(locusWorkerExecutionMs),
    locusAndNetworkOverheadMs: rounded(Math.max(0, locusTotalMs - locusWorkerExecutionMs)),
  },
}, null, 2));
