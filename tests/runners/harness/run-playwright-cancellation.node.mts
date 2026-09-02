import assert from "node:assert/strict";
import type { TestEvent } from "../../harness/core/test-contracts";
import { create_playwright_browser_executor } from "../../harness/runtimes/node/browser/playwright-browser-executor";
import { discover_direct_report_executables } from "../../harness/runtimes/node/direct-report-discovery";
import { create_external_library_launcher_service } from "../../harness/runtimes/node/external-library-launchers";

const wait_until = async (predicate: () => boolean, timeoutMs: number): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) { if (Date.now() >= deadline) throw new Error("PLAYWRIGHT_CANCELLATION_START_TIMEOUT"); await new Promise((resolve) => setTimeout(resolve, 20)); }
};
const discovery = await discover_direct_report_executables();
const selected = discovery.catalog.tests.find((entry) => entry.suiteId === "livedemo/browser/towl-direct-entry");
assert.ok(selected);
const service = create_external_library_launcher_service();
const executor = create_playwright_browser_executor(service.processSupervisor);
const controller = new AbortController();
const events: TestEvent[] = [];
try {
  const pending = executor.run(discovery.catalog, [selected.id], (event) => events.push(event), { signal: controller.signal });
  await wait_until(() => executor.metrics().activeJourneys === 1, 30_000);
  controller.abort();
  const result = await pending;
  assert.equal(result.ok, false);
  assert.equal(result.cancelled, true);
  assert.equal(events.some((event) => event.t === "case_end"), false, "cancellation cannot fabricate a failed or passing terminal case");
  assert.equal(executor.metrics().activeProcesses, 0);
  assert.equal(executor.metrics().activeJourneys, 0);
  assert.equal(executor.metrics().cancellations, 1);
  assert.equal(executor.metrics().serverSettlementFailures, 0);
} finally {
  await executor.dispose();
  service.terminate();
}
assert.equal(executor.metrics().retainedArtifactRoots, 0);
console.log(JSON.stringify({ suite: "playwright-cancellation", checks: 9 }));
