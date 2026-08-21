import { expect, type Page, type TestInfo, type test as playwrightTest } from "@playwright/test";

type PlaywrightTest = typeof playwrightTest;
type CanvasFidelityCase = "clear-full" | "clear-rectangle" | "plot" | "must-plot";

async function run(page: Page, kind: CanvasFidelityCase): Promise<Record<string, unknown>> {
  await page.goto("/tests/fixtures/browser/canvas-fidelity-fixture.html");
  await expect.poll(() => page.evaluate(() => typeof (globalThis as { run_canvas_fidelity_case?: unknown }).run_canvas_fidelity_case)).toBe("function");
  return page.evaluate(async (selected) => {
    const execute = (globalThis as unknown as {
      run_canvas_fidelity_case(kind: CanvasFidelityCase): Promise<Record<string, unknown>>;
    }).run_canvas_fidelity_case;
    return execute(selected);
  }, kind);
}

async function certify(
  page: Page,
  testInfo: TestInfo,
  kind: CanvasFidelityCase,
  expected: Record<string, unknown>,
): Promise<void> {
  const actual = await run(page, kind);
  const artifactStartedAt = performance.now();
  await testInfo.attach("raster-pixel-readback", {
    body: Buffer.from(JSON.stringify({ kind, actual, expected }), "utf8"),
    contentType: "application/json",
  });
  if (process.env.LOCUS_PLAYWRIGHT === "1") {
    process.stdout.write(`<LOCUS_BROWSER_TIMING>${JSON.stringify({
      artifactGenerationMs: performance.now() - artifactStartedAt,
    })}\n`);
  }
  expect(actual).toEqual(expected);
}

export function register_browser_raster_fidelity_tests(test: PlaywrightTest): void {
  test("browser raster: canvas.clear clears full backing bitmap", async ({ page }, testInfo) => {
    await certify(page, testInfo, "clear-full", { pixel: [0, 0, 0, 0] });
  });

  test("browser raster: canvas.clear rectangle preserves pixels outside its region", async ({ page }, testInfo) => {
    await certify(page, testInfo, "clear-rectangle", {
      cleared: [0, 0, 0, 0],
      untouched: [255, 0, 0, 255],
    });
  });

  test("browser raster: canvas.plot receives a native 2D context", async ({ page }, testInfo) => {
    await certify(page, testInfo, "plot", { called: true, pixel: [255, 0, 0, 255] });
  });

  test("browser raster: canvas.must.plot receives a native 2D context", async ({ page }, testInfo) => {
    await certify(page, testInfo, "must-plot", { called: true, pixel: [0, 255, 0, 255] });
  });
}
