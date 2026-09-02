import { strict as assert } from "node:assert";
import { resolve_external_library_launchers } from "../../harness/runtimes/node/external-library-launchers";
import {
  node_selected_verification_metrics,
  run_node_selected_verifications,
} from "../../harness/runtimes/node/run-node-selected-verifications";
import { make_local_node_locus_executor_registry } from "../../harness/runtimes/node/livehost-node-executor";
import { HOSTED_TEST_RUN_OPTIONS } from "../../harness/hosted/hosted-test-scheduling";
import { make_test_executor_discovery } from "../../harness/core/test-discovery";

const registry = make_local_node_locus_executor_registry();
const availability = await resolve_external_library_launchers();
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
  const result = await run_node_selected_verifications(
    registry,
    discovery.catalog,
    availability,
    selectedIds,
    () => undefined,
    HOSTED_TEST_RUN_OPTIONS,
    { externalScheduling: { kind: "fixed", concurrency: 2 } },
  );
  const elapsedMs = performance.now() - startedAt;
  if (!result.ok) originalConsole.error(JSON.stringify({ failures: result.summary.failures }, null, 2));
  assert.equal(result.ok, true, `${result.summary.failures.length} direct All failures`);
  globalThis.gc?.();
  await new Promise<void>((resolve) => setImmediate(resolve));
  globalThis.gc?.();
  const retainedMemory = process.memoryUsage();
  originalConsole.log(JSON.stringify({
    selectedIds: selectedIds.length,
    canonicalCases: registry.catalog.tests.length,
    opaqueSuites: availability.targets.length,
    elapsedMs,
    memory: {
      baselineRss: memoryBaseline.rss,
      baselineHeapUsed: memoryBaseline.heapUsed,
      peakRss,
      peakHeapUsed,
      retainedRss: retainedMemory.rss,
      retainedHeapUsed: retainedMemory.heapUsed,
    },
    ...node_selected_verification_metrics(),
  }));
} finally {
  clearInterval(memorySampler);
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
}
