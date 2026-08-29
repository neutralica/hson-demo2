import { expect, test } from "./livehost-browser-test";
import { monitor_application_errors } from "./app-test-support";
import type {
  run_sanitizer_metadata_fixture,
  SanitizerMetadataCase,
} from "../../fixtures/browser/sanitizer-metadata-fixture";

type FixtureResults = ReturnType<typeof run_sanitizer_metadata_fixture>;

function expect_equal_success(result: SanitizerMetadataCase): unknown {
  expect(result.browser.ok).toBe(true);
  expect(result.worker.ok).toBe(true);
  if (!result.browser.ok || !result.worker.ok) throw new Error("expected successful parses");
  expect(result.browser.node).toEqual(result.worker.node);
  return result.browser.node;
}

function expect_equal_rejection(
  result: SanitizerMetadataCase,
  reason: RegExp,
): void {
  expect(result.browser.ok).toBe(false);
  expect(result.worker.ok).toBe(false);
  if (result.browser.ok || result.worker.ok) throw new Error("expected rejected parses");
  expect(result.browser.message).toMatch(reason);
  expect(result.worker.message).toMatch(reason);
}

test("production browser and Worker sanitizers share Hson metadata admission", async ({ page }) => {
  const assertNoErrors = monitor_application_errors(page);
  await page.goto("/tests/fixtures/browser/sanitizer-metadata-fixture.html");
  const fixture = page.locator("#fixture-root");
  await expect(fixture).toHaveAttribute("data-fixture-state", "uninitialized");

  const results = await page.evaluate(async (modulePath): Promise<FixtureResults> => {
    const module = await import(modulePath) as Readonly<{
      run_sanitizer_metadata_fixture(): FixtureResults;
    }>;
    return module.run_sanitizer_metadata_fixture();
  }, "/tests/fixtures/browser/sanitizer-metadata-fixture.ts");

  await expect(fixture).toHaveAttribute("data-fixture-state", "complete");

  const valid = expect_equal_success(results.validQuidAndUnsafeHandler);
  expect(JSON.stringify(valid)).toContain('"quid":"000000001"');
  expect(JSON.stringify(valid)).toContain('"data-_quid":"application"');
  expect(JSON.stringify(valid)).not.toContain("onclick");

  const validIndex = expect_equal_success(results.validIndex);
  expect(JSON.stringify(validIndex)).toContain('"index":"0"');
  expect_equal_success(results.applicationData);
  expect_equal_success(results.ordinaryColonized);

  expect_equal_rejection(
    results.malformedQuid,
    /invalid value for Hson metadata "hson:quid"/,
  );
  expect_equal_rejection(
    results.unknownMetadata,
    /unknown Hson metadata markup name "hson:unknown"/,
  );
  expect_equal_rejection(results.malformedIndex, /not an exact canonical index/);
  expect_equal_rejection(
    results.misplacedIndex,
    /metadata "index" is not defined for node "main"/,
  );
  expect_equal_rejection(results.duplicateQuid, /duplicate Hson metadata attribute/);
  expect_equal_rejection(
    results.caseEquivalentDuplicateQuid,
    /duplicate Hson metadata attribute/,
  );
  expect_equal_rejection(results.duplicateIndex, /duplicate Hson metadata attribute/);
  expect_equal_rejection(
    results.metadataPrivateName,
    /externally authored private Hson metadata transit name/,
  );
  expect_equal_rejection(
    results.ordinaryPrivateName,
    /externally authored private ordinary-attribute transit name/,
  );

  assertNoErrors();
});
