import { expect, test } from "@playwright/test";
import { monitor_application_errors, open_demo, reach_demo } from "./app-test-support";

const VALID_HSON = '<div id="browser-parse" "hello browser"/>';

test("Parse transforms valid-invalid-valid input without duplicate surfaces", async ({ page }) => {
  const assertNoErrors = monitor_application_errors(page);
  await reach_demo(page);
  await open_demo(page, "parse");

  const root = page.getByTestId("parse-root");
  const hson = page.getByTestId("parse-hson-editor");
  const json = page.getByTestId("parse-json-editor");
  const html = page.getByTestId("parse-html-editor");
  await expect(root).toBeVisible();
  await expect(hson).toBeVisible();

  await hson.fill(VALID_HSON);
  await expect(page.getByTestId("parse-hson-status")).toHaveText("OK");
  await expect(json).toHaveValue(/browser-parse/);
  await expect(html).toHaveValue(/<div id="browser-parse">hello browser<\/div>/);
  let lastValidHtml = await html.inputValue();

  await page.getByRole("button", { name: "toggle hson panel view mode" }).click();
  await expect(page.getByTestId("parse-hson-node-output")).toBeVisible();
  await page.getByRole("button", { name: "toggle hson panel view mode" }).click();

  for (let cycle = 0; cycle < 3; cycle += 1) {
    await hson.fill("<div");
    await expect(page.getByTestId("parse-hson-status")).toHaveText("XX");
    await expect(html).toHaveValue(lastValidHtml);
    await expect(root).toBeVisible();
    await hson.fill(VALID_HSON.replace("hello browser", `hello browser ${cycle}`));
    await expect(page.getByTestId("parse-hson-status")).toHaveText("OK");
    await expect(html).toHaveValue(new RegExp(`hello browser ${cycle}`));
    lastValidHtml = await html.inputValue();
    await expect(page.getByTestId("parse-root")).toHaveCount(1);
  }

  await open_demo(page, "about");
  await open_demo(page, "parse");
  await expect(page.getByTestId("parse-root")).toHaveCount(1);
  await expect(hson).toBeVisible();
  assertNoErrors();
});
