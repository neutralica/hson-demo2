import { expect, test } from "@playwright/test";
import { monitor_application_errors, open_demo, reach_demo } from "./app-test-support";

const VALID_HSON = '<div id="browser-build" "built in browser"/>';

test("Build preview and HTML output recover across edits and navigation", async ({ page }) => {
  const assertNoErrors = monitor_application_errors(page);
  await reach_demo(page);
  await open_demo(page, "build");

  const root = page.getByTestId("build-root");
  const source = page.getByTestId("build-source-editor");
  const preview = page.getByTestId("build-preview");
  const html = page.getByTestId("build-html-output");
  await expect(root).toBeVisible();
  await expect(source).toBeVisible();

  await source.fill(VALID_HSON);
  await expect(page.getByTestId("build-status")).toHaveText("OK");
  await expect(preview.locator("#browser-build")).toHaveText("built in browser");
  await page.getByRole("button", { name: "show html output" }).click();
  await expect(html).toBeVisible();
  await expect(html).toHaveValue(/<div id="browser-build">built in browser<\/div>/);
  const lastValidHtml = await html.inputValue();

  await source.fill("<div");
  await expect(page.getByTestId("build-status")).toHaveText("XX");
  await expect(html).toHaveValue(lastValidHtml);
  await expect(preview.locator("#browser-build")).toHaveCount(1);

  await source.fill(VALID_HSON.replace("built in browser", "recovered build"));
  await expect(page.getByTestId("build-status")).toHaveText("OK");
  await expect(html).toHaveValue(/recovered build/);
  await page.getByRole("button", { name: "show render preview" }).click();
  await expect(preview).toBeVisible();
  await expect(preview.locator("#browser-build")).toHaveText("recovered build");

  await open_demo(page, "about");
  await open_demo(page, "build");
  await expect(page.getByTestId("build-root")).toHaveCount(1);
  await source.fill(VALID_HSON);
  await expect(preview.locator("#browser-build")).toHaveCount(1);
  assertNoErrors();
});
