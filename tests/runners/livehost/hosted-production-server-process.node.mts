import { start_hosted_test_server } from "../../harness/runtimes/node/server/hosted-test-server";

if (process.send === undefined) throw new Error("Hosted production server process requires an IPC channel.");

console.log = () => undefined;
console.warn = () => undefined;
console.error = () => undefined;

const memoryBaseline = process.memoryUsage();
let peakRss = memoryBaseline.rss;
let peakHeapUsed = memoryBaseline.heapUsed;
const memorySampler = setInterval(() => {
  const usage = process.memoryUsage();
  peakRss = Math.max(peakRss, usage.rss);
  peakHeapUsed = Math.max(peakHeapUsed, usage.heapUsed);
}, 50);

const server = await start_hosted_test_server({
  port: 0,
  timeline(event) {
    process.send!({
      type: "timeline",
      event: { ...event, at: performance.timeOrigin + event.at },
    });
  },
});

async function retained_memory(): Promise<NodeJS.MemoryUsage> {
  globalThis.gc?.();
  await new Promise<void>((resolve) => setImmediate(resolve));
  globalThis.gc?.();
  return process.memoryUsage();
}

process.send({ type: "ready", url: server.url });
process.on("message", async (message: Readonly<{
  id: number;
  command: "snapshot" | "metrics" | "memory" | "disconnect" | "stop";
  authorityId?: string;
}>) => {
  try {
    const value = message.command === "snapshot"
      ? server.connectionSnapshot()
      : message.command === "metrics"
        ? server.metrics()
        : message.command === "memory"
          ? { baseline: memoryBaseline, peakRss, peakHeapUsed, current: await retained_memory() }
          : message.command === "disconnect"
            ? server.disconnectConnections(message.authorityId)
            : await server.stop();
    if (message.command === "stop") clearInterval(memorySampler);
    process.send!({ type: "response", id: message.id, value });
  } catch (error) {
    process.send!({
      type: "response",
      id: message.id,
      error: error instanceof Error ? error.stack ?? error.message : String(error),
    });
  }
});
