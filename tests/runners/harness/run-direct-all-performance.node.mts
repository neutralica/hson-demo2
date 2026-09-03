import { strict as assert } from "node:assert";
import {
  create_external_library_launcher_service,
  resolve_external_library_launchers,
} from "../../harness/runtimes/node/external-library-launchers";
import {
  create_node_selected_verification_service,
} from "../../harness/runtimes/node/run-node-selected-verifications";
import { make_local_node_locus_executor_registry } from "../../harness/runtimes/node/livehost-node-executor";
import { make_test_executor_discovery } from "../../harness/core/test-discovery";

const DIRECT_RUN_OPTIONS = Object.freeze({ yieldAfterMs: 8, yieldBetweenSuites: false });

const registry = make_local_node_locus_executor_registry();
const availability = await resolve_external_library_launchers();
const launcherService = create_external_library_launcher_service();
const verificationService = create_node_selected_verification_service(launcherService);
const discovery = make_test_executor_discovery(registry, availability.targets);
const selectedIds = Object.freeze([
  ...registry.catalog.tests.map((test) => test.id),
  ...availability.targets.map((target) => target.id),
]);
const originalConsole = Object.freeze({
  log: console.log,
  warn: console.warn,
  error: console.error,
});
const memoryBaseline = process.memoryUsage();
let peakRss = memoryBaseline.rss;
let peakHeapUsed = memoryBaseline.heapUsed;
const memorySampler = setInterval(() => {
  const usage = process.memoryUsage();
  peakRss = Math.max(peakRss, usage.rss);
  peakHeapUsed = Math.max(peakHeapUsed, usage.heapUsed);
}, 50);
console.log = () => undefined;
console.warn = () => undefined;
console.error = () => undefined;
const startedAt = performance.now();
try {
  const result = await verificationService.run(
    registry,
    discovery.catalog,
    availability,
    selectedIds,
    () => undefined,
    DIRECT_RUN_OPTIONS,
    { externalScheduling: { kind: "fixed", concurrency: 2 } },
  );
  const elapsedMs = performance.now() - startedAt;
  if (!result.ok) originalConsole.error(JSON.stringify({ failures: result.failures }, null, 2));
  assert.equal(result.ok, true, `${result.failures.length} direct All failures`);
  globalThis.gc?.();
  await new Promise<void>((resolve) => setImmediate(resolve));
  globalThis.gc?.();
  const retainedMemory = process.memoryUsage();
  originalConsole.log(JSON.stringify({
    selectedIds: selectedIds.length,
    canonicalCases: registry.catalog.tests.length,
    externalSuites: availability.targets.length,
    elapsedMs,
    memory: {
      baselineRss: memoryBaseline.rss,
      baselineHeapUsed: memoryBaseline.heapUsed,
      peakRss,
      peakHeapUsed,
      retainedRss: retainedMemory.rss,
      retainedHeapUsed: retainedMemory.heapUsed,
    },
    ...verificationService.metrics(),
  }));
} finally {
  launcherService.terminate();
  clearInterval(memorySampler);
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
}
