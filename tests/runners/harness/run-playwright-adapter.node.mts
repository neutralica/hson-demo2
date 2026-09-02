import assert from "node:assert/strict";
import { createRequire } from "node:module";
import type { TestEvent } from "../../harness/core/test-contracts";
import { create_playwright_browser_executor, LOCAL_PLAYWRIGHT_BROWSER_EXECUTOR } from "../../harness/runtimes/node/browser/playwright-browser-executor";
import { discover_playwright_tests, playwright_case_id, playwright_suite_id } from "../../harness/runtimes/node/browser/playwright-test-discovery";
import { discover_direct_report_executables } from "../../harness/runtimes/node/direct-report-discovery";
import { create_external_library_launcher_service } from "../../harness/runtimes/node/external-library-launchers";

const discoveredTests = discover_playwright_tests();
assert.deepEqual(discoveredTests.map((entry) => `${playwright_suite_id(entry)}::${playwright_case_id(entry)}`), discover_playwright_tests().map((entry) => `${playwright_suite_id(entry)}::${playwright_case_id(entry)}`));
const discovery = await discover_direct_report_executables();
const dom = discovery.catalog.tests.find((entry) => entry.suiteId === "livedemo/browser/small-state-surfaces");
const raster = discovery.catalog.tests.find((entry) => entry.title === "browser raster: canvas.clear clears full backing bitmap");
assert.ok(dom && raster);
const authorityModules = Object.keys(createRequire(import.meta.url).cache).filter((path) => path.includes("/jsdom/"));
assert.ok(authorityModules.length > 0, "parent jsdom state exists for the isolation proof");
const service = create_external_library_launcher_service();
const executor = create_playwright_browser_executor(service.processSupervisor);
const events: TestEvent[] = [];
try {
  const result = await executor.run(discovery.catalog, [dom.id, raster.id], (event) => events.push(event));
  assert.equal(result.ok, true);
  assert.deepEqual(events.filter((event) => event.t === "case_begin").map((event) => `${event.suite}::${event.caseId}`), [dom.id, raster.id]);
  assert.deepEqual(events.filter((event) => event.t === "case_end").map((event) => event.status), ["pass", "pass"]);
  assert.ok(events.some((event) => event.t === "evidence" && event.kind === "artifact"));
  assert.ok(events.every((event) => event.executorId === LOCAL_PLAYWRIGHT_BROWSER_EXECUTOR.id));
  const metrics = executor.metrics();
  assert.equal(metrics.activeProcesses, 0);
  assert.equal(metrics.maximumActiveProcesses, 1);
  assert.notEqual(metrics.lastChildPid, process.pid);
  assert.equal(metrics.lastChildJsdomModules, 0);
  assert.equal(metrics.lastChildEncodingFallbackLoaded, false);
} finally {
  await executor.dispose();
  service.terminate();
}
assert.equal(executor.metrics().retainedArtifactRoots, 0);
console.log(JSON.stringify({ suite: "playwright-adapter", checks: 12 }));
