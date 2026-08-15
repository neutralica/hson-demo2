import { expect, test } from "./livehost-browser-test";
import { monitor_application_errors, open_demo, reach_demo } from "./app-test-support";
import type * as BrowserTransformOracle from "../../helpers/transform/browser-transform-oracle";

const VALID_HSON = '<div id="browser-parse" "hello browser"/>';
const LOCALLY_PARSED = /^(Parsed · waiting|Queued|Verifying \d\/6|Checking browser|Verified)$/;

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
  await expect(page.getByTestId("parse-hson-status")).toHaveText(LOCALLY_PARSED);
  await expect(json).toHaveValue(/browser-parse/);
  await expect(html).toHaveValue(/<div id="browser-parse">hello browser<\/div>/);
  let lastValidHtml = await html.inputValue();

  await page.getByRole("button", { name: "toggle hson panel view mode" }).click();
  await expect(page.getByTestId("parse-hson-node-output")).toBeVisible();
  await page.getByRole("button", { name: "toggle hson panel view mode" }).click();

  for (let cycle = 0; cycle < 3; cycle += 1) {
    await hson.fill("<div");
    await expect(page.getByTestId("parse-hson-status")).toHaveText("Invalid");
    await expect(html).toHaveValue(lastValidHtml);
    await expect(root).toBeVisible();
    await hson.fill(VALID_HSON.replace("hello browser", `hello browser ${cycle}`));
    await expect(page.getByTestId("parse-hson-status")).toHaveText(LOCALLY_PARSED);
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

test("HSON bare primitives preserve Demo and Transform semantic identity", async ({ page }) => {
  const assertNoErrors = monitor_application_errors(page);
  await reach_demo(page);
  await open_demo(page, "parse");

  const hson = page.getByTestId("parse-hson-editor");
  for (const [source, json, html] of [
    ["0", "0", "<_hson_obj><_hson_val>0</_hson_val></_hson_obj>"],
    ["-0", "-0", "<_hson_obj><_hson_val>-0</_hson_val></_hson_obj>"],
    [`"browser string"`, `"browser string"`, "<_hson_obj><_hson_str>&quot;browser string&quot;</_hson_str></_hson_obj>"],
    ["true", "true", "<_hson_obj><_hson_val>true</_hson_val></_hson_obj>"],
    ["false", "false", "<_hson_obj><_hson_val>false</_hson_val></_hson_obj>"],
    ["null", "null", "<_hson_obj><_hson_val>null</_hson_val></_hson_obj>"],
  ] as const) {
    await hson.fill(source);
    await expect(page.getByTestId("parse-hson-status")).toHaveText(LOCALLY_PARSED);
    await expect(hson).toHaveValue(source);
    await expect(page.getByTestId("parse-json-editor")).toHaveValue(json);
    await expect(page.getByTestId("parse-html-editor")).toHaveValue(html);
  }

  await page.getByRole("button", { name: "toggle hson panel view mode" }).click();
  const node = page.getByTestId("parse-hson-node-output");
  await expect(node).toContainText('"$_tag": "_hson_val"');
  await expect(node).not.toContainText('"$_tag": "_hson_root"');
  await expect(node).not.toContainText('"$_tag": "_hson_elem"');
  assertNoErrors();
});

test("Demo accepts adjacent and empty element text items without collapsing order", async ({ page }) => {
  const assertNoErrors = monitor_application_errors(page);
  await reach_demo(page);
  await open_demo(page, "parse");

  const editor = page.getByTestId("parse-hson-editor");
  for (const [source, expected] of [
    [`<div "a" "b"/>`, ["a", "b"]],
    [`<div """"""/>`, ["", "", ""]],
  ] as const) {
    await editor.fill(source);
    await expect(page.getByTestId("parse-hson-status")).toHaveText(LOCALLY_PARSED);
    await page.getByRole("button", { name: "toggle hson panel view mode" }).click();
    const rawNode = await page.getByTestId("parse-hson-node-output").textContent();
    const parsed = JSON.parse(rawNode ?? "null") as {
      $_content: readonly [{ $_content: readonly [{ $_content: readonly { $_content: readonly string[] }[] }] }];
    };
    const values = parsed.$_content[0].$_content[0].$_content.map((item) => item.$_content[0]);
    expect(values).toEqual(expected);
    await page.getByRole("button", { name: "toggle hson panel view mode" }).click();
  }
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
  await expect(status).toHaveText(LOCALLY_PARSED);
  await expect(json).toHaveValue(/"record": \{/);
  await expect(json).toHaveValue(/"items": \[/);

  await json.fill(`{"record":{"a":1,"b":2},"items":[{"name":"Ada"}]}`);
  await expect(page.getByTestId("parse-json-status")).toHaveText(LOCALLY_PARSED);
  const serialized = await hson.inputValue();
  expect(serialized).toMatch(/record\s+<\s*a\s+1\s+b\s+2\s*>/s);
  expect(serialized).toMatch(/items\s+«\s*<\s*name\s+"Ada"\s*>\s*»/s);
  expect(serialized).not.toContain("<<");

  await hson.fill(`<<a 1>>`);
  await expect(status).toHaveText("Invalid");
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
    String.raw`<tag value="\u00G1"/>`,
  ]) {
    await editor.fill(invalid);
    await expect(status).toHaveText("Invalid");
  }

  await editor.fill(String.raw`<tag a="\/" A="\u0041"/>`);
  await expect(status).toHaveText(LOCALLY_PARSED);
  await expect(page.getByTestId("parse-json-editor")).toHaveValue(/"a": "\/"/);
  await expect(page.getByTestId("parse-json-editor")).toHaveValue(/"A": "A"/);
  await editor.fill("<'name\\u0041' 1>");
  await expect(status).toHaveText(LOCALLY_PARSED);
  await expect(page.getByTestId("parse-json-editor")).toHaveValue(/"nameA": 1/);
  assertNoErrors();
});

test("browser executes the portable strict Transform oracle and structured witness", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const modulePath = "/tests/helpers/transform/browser-transform-oracle.ts";
    const probe = await import(/* @vite-ignore */ modulePath) as typeof BrowserTransformOracle;
    return probe.run_browser_transform_oracle_probe();
  });
  expect(result).toEqual({
    closureTag: "_hson_elem",
    rejectionCode: "authored-reserved-name",
    rejectionStage: "tokenization",
    source: { index: 1, line: 1, column: 2 },
    stableWitness: true,
    negativeZero: true,
  });
});
