import { expect, test } from "@playwright/test";
import { monitor_application_errors, open_demo, reach_demo } from "./app-test-support";

test("application boot reaches one clean usable demo without auto-running hosted tests", async ({ page }) => {
  const assertNoErrors = monitor_application_errors(page);
  await reach_demo(page);

  await expect(page.getByTestId("hosted-test-panel")).toHaveAttribute("data-hosted-execution-count", "0");
  await open_demo(page, "parse");
  await expect(page.getByTestId("parse-root")).toBeVisible();
  await open_demo(page, "about");
  await open_demo(page, "parse");
  await expect(page.getByTestId("parse-root")).toHaveCount(1);

  await page.reload();
  const stage = page.locator("#stage");
  await expect(stage).toHaveAttribute("data-app-phase", "splash", { timeout: 15_000 });
  await stage.click({ position: { x: 4, y: 4 } });
  await expect(stage).toHaveAttribute("data-app-phase", "demo-ready", { timeout: 15_000 });
  await expect(page.getByRole("group", { name: "Demo navigation" })).toBeVisible();
  await expect(page.getByTestId("hosted-test-panel")).toHaveAttribute("data-hosted-execution-count", "0");
  await expect(page.locator("#sky, #logo-box")).toHaveCount(0);
  await expect(page.locator("#deck-cover")).not.toBeVisible();
  assertNoErrors();
});
