import assert from "node:assert/strict";
import { realpath, rename, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
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
const appBoot = discovery.catalog.tests.find((entry) => entry.title === "application boot reaches one clean usable demo without auto-running hosted tests");
assert.ok(dom && raster && appBoot);
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

  const prepared = await executor.prepare();
  assert.equal((await stat(prepared.requiredResource)).isFile(), true);
  assert.equal(prepared.requiredResource.endsWith("/dist/api/transform/parsers/parse-json.js"), true);
  const sourcePackage = await realpath(resolve("node_modules/hson-live"));
  const sourceDist = resolve(sourcePackage, "dist");
  const heldDist = resolve(sourcePackage, `.playwright-dependency-race-${process.pid}`);
  const pending = executor.run(discovery.catalog, [appBoot.id]);
  const deadline = Date.now() + 30_000;
  while (executor.metrics().activeJourneys === 0) {
    if (Date.now() >= deadline) throw new Error("PLAYWRIGHT_DEPENDENCY_RACE_START_TIMEOUT");
    await new Promise((resolveWait) => setTimeout(resolveWait, 20));
  }
  await rename(sourceDist, heldDist);
  try {
    assert.equal((await stat(prepared.requiredResource)).isFile(), true);
    const concurrent = await pending;
    assert.equal(concurrent.ok, true, JSON.stringify(concurrent.failures));
  } finally {
    await rename(heldDist, sourceDist);
  }
} finally {
  await executor.dispose();
  service.terminate();
}
assert.equal(executor.metrics().retainedArtifactRoots, 0);
console.log(JSON.stringify({ suite: "playwright-adapter", checks: 17 }));
