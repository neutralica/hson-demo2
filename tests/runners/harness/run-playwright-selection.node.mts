import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { playwright_execution_arguments, playwright_missing_case_reason } from "../../harness/runtimes/node/browser/playwright-browser-executor";
import {
  discover_playwright_tests,
  parse_playwright_discovery_output,
  playwright_case_id,
  playwright_suite_id,
  PLAYWRIGHT_REPOSITORY_ROOT,
  type PlaywrightDiscoveredTest,
} from "../../harness/runtimes/node/browser/playwright-test-discovery";
import { discover_direct_report_executables } from "../../harness/runtimes/node/direct-report-discovery";

const discovered = discover_playwright_tests();
const direct = await discover_direct_report_executables();
const browserIds = direct.catalog.tests.filter((descriptor) => (
  direct.catalog.suites.find((suite) => suite.id === descriptor.suiteId)?.executionShape === "browser-journeys"
)).map((descriptor) => descriptor.id);
assert.ok(discovered.length > 0, "Playwright discovery must return browser journeys");
assert.equal(browserIds.length, discovered.length);

function identity(test: PlaywrightDiscoveredTest): string {
  return `${playwright_suite_id(test)}::${playwright_case_id(test)}`;
}

function list(selected: readonly PlaywrightDiscoveredTest[]): Readonly<{ tests: readonly PlaywrightDiscoveredTest[]; args: readonly string[] }> {
  const ids = selected.map(identity);
  const args = playwright_execution_arguments(direct.catalog, ids);
  const result = spawnSync(process.execPath, [...args, "--list"], {
    cwd: PLAYWRIGHT_REPOSITORY_ROOT,
    encoding: "utf8",
    env: {
      ...process.env,
      LIVEHOST_PLAYWRIGHT: "1",
      // The retired config filter must not intersect with discovered execution locators.
      LIVEHOST_PLAYWRIGHT_TITLES: JSON.stringify([playwright_case_id(selected[0]!)]),
    },
  });
  assert.equal(result.status, 0, result.stderr);
  const tests = parse_playwright_discovery_output(result.stdout);
  assert.deepEqual(tests.map(identity), ids);
  return Object.freeze({ tests, args });
}

const single = discovered.find((test) => test.path.endsWith("app-boot.spec.ts")
  && test.title === "splash completes naturally without retaining work or disposed nodes")!;
const sameFile = discovered.filter((test) => test.path === single.path).slice(0, 3);
const crossFile = [single, discovered.find((test) => test.path.endsWith("visual-determinism-authority.spec.ts"))!];

const singleList = list([single]);
assert.equal(singleList.tests.length, 1);
assert.ok(singleList.args.includes(single.path));
assert.ok(singleList.args.includes("--grep"));
assert.equal(singleList.args[singleList.args.indexOf("--project") + 1], single.project);
assert.equal(singleList.args.some((argument) => argument.includes(playwright_case_id(single))), false);

assert.equal(list(sameFile).tests.length, 3);
assert.equal(list(crossFile).tests.length, 2);

const fullList = list(discovered);
assert.equal(fullList.tests.length, discovered.length);
assert.equal(fullList.args.includes("--grep"), false);
assert.equal(fullList.args.includes("--project"), false);
assert.equal(fullList.args.some((argument) => /\.spec\.[cm]?[jt]s:\d+$/.test(argument)), false);

assert.match(
  playwright_missing_case_reason(1, 0, { timedOut: false, exitCode: 1, signal: null }),
  /^\[BROWSER_SELECTION_ZERO_MATCH\] Playwright matched zero tests for 1 selected discovered browser journeys\.$/,
);

console.log(JSON.stringify({ suite: "playwright-selection", checks: 20, discovered: discovered.length }));
