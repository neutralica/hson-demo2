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

test("HSON bare primitives expose one root-free semantic node in every browser panel", async ({ page }) => {
  const assertNoErrors = monitor_application_errors(page);
  await reach_demo(page);
  await open_demo(page, "parse");

  const hson = page.getByTestId("parse-hson-editor");
  await hson.fill("42");
  await expect(page.getByTestId("parse-hson-status")).toHaveText("OK");
  await expect(page.getByTestId("parse-json-editor")).toHaveValue("42");
  await expect(page.getByTestId("parse-html-editor")).toHaveValue("<_val>42</_val>");

  await page.getByRole("button", { name: "toggle hson panel view mode" }).click();
  const node = page.getByTestId("parse-hson-node-output");
  await expect(node).toContainText('"$_tag": "_hson_val"');
  await expect(node).not.toContainText('"$_tag": "_hson_root"');
  await expect(node).not.toContainText('"$_tag": "_hson_elem"');
  assertNoErrors();
});

test("browser object parsing and serialization use one stable angle pair per object", async ({ page }) => {
  const assertNoErrors = monitor_application_errors(page);
  await reach_demo(page);
  await open_demo(page, "parse");

  const hson = page.getByTestId("parse-hson-editor");
  const json = page.getByTestId("parse-json-editor");
  const status = page.getByTestId("parse-hson-status");

  await hson.fill(`<record <a 1 b 2> items «<name "Ada">»>`);
  await expect(status).toHaveText("OK");
  await expect(json).toHaveValue(/"record": \{/);
  await expect(json).toHaveValue(/"items": \[/);

  await json.fill(`{"record":{"a":1,"b":2},"items":[{"name":"Ada"}]}`);
  await expect(page.getByTestId("parse-json-status")).toHaveText("OK");
  const serialized = await hson.inputValue();
  expect(serialized).toMatch(/record\s+<\s*a\s+1\s+b\s+2\s*>/s);
  expect(serialized).toMatch(/items\s+«\s*<\s*name\s+"Ada"\s*>\s*»/s);
  expect(serialized).not.toContain("<<");

  await hson.fill(`<<a 1>>`);
  await expect(status).toHaveText("XX");
  assertNoErrors();
});

test("browser HSON parsing enforces authored names, duplicates, and escape grammars", async ({ page }) => {
  const assertNoErrors = monitor_application_errors(page);
  await reach_demo(page);
  await open_demo(page, "parse");

  const editor = page.getByTestId("parse-hson-editor");
  const status = page.getByTestId("parse-hson-status");
  for (const invalid of [
    `<_hson_obj>`,
    `<tag a="1" a="2"/>`,
    String.raw`<tag value="\q"/>`,
    "<`name\\u0041` 1>",
  ]) {
    await editor.fill(invalid);
    await expect(status).toHaveText("XX");
  }

  await editor.fill(String.raw`<tag a="\/" A="\u0041"/>`);
  await expect(status).toHaveText("OK");
  await expect(page.getByTestId("parse-json-editor")).toHaveValue(/"a": "\/"/);
  await expect(page.getByTestId("parse-json-editor")).toHaveValue(/"A": "A"/);
  assertNoErrors();
});

test("browser executes the portable strict Transform oracle and structured witness", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const modulePath = "/src/tests/transform/browser-transform-oracle.ts";
    const probe = await import(/* @vite-ignore */ modulePath) as {
      run_browser_transform_oracle_probe(): {
        closureTag: string;
        rejectionCode: string;
        rejectionStage?: string;
        source?: { index: number; line: number; column: number };
        stableWitness: boolean;
      };
    };
    return probe.run_browser_transform_oracle_probe();
  });
  expect(result).toEqual({
    closureTag: "_hson_elem",
    rejectionCode: "authored-reserved-name",
    rejectionStage: "tokenization",
    source: { index: 1, line: 1, column: 2 },
    stableWitness: true,
  });
});
