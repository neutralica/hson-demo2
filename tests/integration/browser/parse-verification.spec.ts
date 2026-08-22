import { expect, test, type Page } from "./livehost-browser-test";
import { monitor_application_errors, open_demo, reach_demo } from "./app-test-support";

async function open_parsing_panels(page: Page): Promise<void> {
  await reach_demo(page);
  await open_demo(page, "parse");
  await expect(page.getByTestId("parse-root")).toBeVisible();
}

async function expect_verified(page: Page, origin: "hson" | "json" | "html"): Promise<void> {
  const root = page.getByTestId("parse-root");
  await expect(root).toHaveAttribute("data-verification-origin", origin);
  await expect(root).toHaveAttribute("data-verification-status", "verified", { timeout: 15_000 });
  await expect(page.getByTestId(`parse-${origin}-status`)).toHaveText("Verified");
}

test("authored HSON reaches the Locus worker and browser certificate", async ({ page }) => {
  const assertNoErrors = monitor_application_errors(page);
  await open_parsing_panels(page);
  await page.getByTestId("parse-hson-editor").fill('<article id="phase-3" "HSON verified"/>');
  await expect(page.getByTestId("parse-html-editor")).toHaveValue(/HSON verified/);
  await expect_verified(page, "hson");
  await expect(page.getByTestId("parse-root")).toHaveAttribute("data-circuit-serializations", "24");
  await expect(page.getByTestId("parse-root")).toHaveAttribute("data-circuit-parses", "25");
  await expect(page.getByTestId("parse-root")).toHaveAttribute("data-circuit-comparisons", "25");
  assertNoErrors();
});

test("JSON is an editable explicit verification origin", async ({ page }) => {
  const assertNoErrors = monitor_application_errors(page);
  await open_parsing_panels(page);
  const editor = page.getByTestId("parse-json-editor");
  await expect(editor).toBeEditable();
  await editor.fill('{"phase":3,"origin":"json","items":[1,2,3]}');
  await expect(page.getByTestId("parse-hson-editor")).toHaveValue(/origin\s+"json"/);
  await expect_verified(page, "json");
  assertNoErrors();
});

test("authored HTML is admitted by DOMParser and reaches the final certificate", async ({ page }) => {
  const assertNoErrors = monitor_application_errors(page);
  await open_parsing_panels(page);
  const editor = page.getByTestId("parse-html-editor");
  await expect(editor).toBeEditable();
  await editor.fill('<section data-origin="html"><b>HTML verified</b></section>');
  await expect(page.getByTestId("parse-json-editor")).toHaveValue(/HTML verified/);
  await expect_verified(page, "html");
  assertNoErrors();
});

test("an immediate parse failure never dispatches verification", async ({ page }) => {
  const assertNoErrors = monitor_application_errors(page);
  await open_parsing_panels(page);
  await page.getByTestId("parse-hson-editor").fill("<broken");
  await expect(page.getByTestId("parse-root")).toHaveAttribute("data-verification-status", "invalid");
  await expect(page.getByTestId("parse-hson-status")).toHaveText("Invalid");
  await page.getByTestId("parse-html-editor").focus();
  await expect(page.getByTestId("parse-root")).toHaveAttribute("data-verification-status", "invalid");
  assertNoErrors();
});

test("rapid edits debounce to and certify only the newest revision", async ({ page }) => {
  const assertNoErrors = monitor_application_errors(page);
  await open_parsing_panels(page);
  const editor = page.getByTestId("parse-hson-editor");
  await editor.fill('<div data-edit="1" "obsolete one"/>');
  await editor.fill('<div data-edit="2" "obsolete two"/>');
  await editor.fill('<div data-edit="3" "latest"/>');
  await expect(page.getByTestId("parse-root")).toHaveAttribute("data-verification-revision", "3");
  await expect_verified(page, "hson");
  await expect(page.getByTestId("parse-html-editor")).toHaveValue(/data-edit="3"/);
  await expect(page.getByTestId("parse-html-editor")).not.toHaveValue(/obsolete/);
  assertNoErrors();
});

test("verification progress is textual and bounded", async ({ page }) => {
  const assertNoErrors = monitor_application_errors(page);
  await open_parsing_panels(page);
  await page.evaluate(() => {
    const root = document.querySelector('[data-testid="parse-root"]');
    const status = document.querySelector('[data-testid="parse-json-status"]');
    const seen: string[] = [];
    const observer = new MutationObserver(() => {
      const value = status?.textContent ?? "";
      if (value !== "" && seen.at(-1) !== value) seen.push(value);
    });
    if (root !== null) observer.observe(root, { attributes: true, subtree: true, childList: true, characterData: true });
    Object.assign(window, { __parseVerificationStates: seen });
  });
  const rows = Array.from({ length: 180 }, (_, index) => ({ index, label: `row-${index}` }));
  await page.getByTestId("parse-json-editor").fill(JSON.stringify({ rows }));
  await expect_verified(page, "json");
  const states = await page.evaluate(() => (window as Window & { __parseVerificationStates?: string[] }).__parseVerificationStates ?? []);
  const progressStates = states.filter((state) => state.startsWith("Verifying "));
  expect(progressStates.length).toBeLessThanOrEqual(8);
  expect(states).toContain("Verified");
  expect(states.some((state) => state.startsWith("Verifying ") || state === "Checking browser")).toBe(true);
  await expect(page.getByTestId("parse-json-status")).toHaveAttribute("role", "status");
  assertNoErrors();
});

test("an unavailable verifier preserves the immediate local preview", async ({ page }) => {
  await page.addInitScript(() => {
    const NativeWebSocket = window.WebSocket;
    window.WebSocket = class extends NativeWebSocket {
      constructor(url: string | URL, protocols?: string | string[]) {
        const requested = String(url);
        super(requested.includes("locus=circuit-verifier") ? "ws://127.0.0.1:1" : requested, protocols);
      }
    };
  });
  await open_parsing_panels(page);
  await page.getByTestId("parse-hson-editor").fill('<main id="offline" "local preview"/>');
  await expect(page.getByTestId("parse-html-editor")).toHaveValue(/local preview/);
  await expect(page.getByTestId("parse-root")).toHaveAttribute("data-verification-status", "unavailable", { timeout: 10_000 });
  await expect(page.getByTestId("parse-hson-status")).toHaveText("Verification unavailable");
  await expect(page.getByTestId("parse-hson-status")).toHaveAttribute("title", /unavailable/i);
});

test("a browser DOMParser disagreement is distinct from universal failure", async ({ page }) => {
  await page.addInitScript(() => {
    const NativeDOMParser = window.DOMParser;
    window.DOMParser = class extends NativeDOMParser {
      override parseFromString(input: string, mimeType: DOMParserSupportedType): Document {
        return super.parseFromString(input.replaceAll("phase-three-boundary", "altered-boundary"), mimeType);
      }
    };
  });
  const assertNoErrors = monitor_application_errors(page);
  await open_parsing_panels(page);
  await page.getByTestId("parse-hson-editor").fill('<div "phase-three-boundary"/>');
  await expect(page.getByTestId("parse-root")).toHaveAttribute("data-verification-status", "failed", { timeout: 15_000 });
  await expect(page.getByTestId("parse-hson-status")).toHaveText("Verification failed");
  await expect(page.getByTestId("parse-hson-status")).toHaveAttribute("title", /browser DOMParser/i);
  assertNoErrors();
});

test("switching authored origins increments once and does not create update loops", async ({ page }) => {
  const assertNoErrors = monitor_application_errors(page);
  await open_parsing_panels(page);
  await page.getByTestId("parse-hson-editor").fill('<div id="first"/>');
  await expect_verified(page, "hson");
  const firstRevision = Number(await page.getByTestId("parse-root").getAttribute("data-verification-revision"));
  await page.getByTestId("parse-html-editor").fill('<aside id="second">switched</aside>');
  await expect(page.getByTestId("parse-root")).toHaveAttribute("data-verification-revision", `${firstRevision + 1}`);
  await expect_verified(page, "html");
  await expect(page.getByTestId("parse-hson-editor")).toHaveValue(/second/);
  assertNoErrors();
});
