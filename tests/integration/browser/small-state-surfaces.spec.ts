import { expect, test } from "@playwright/test";
import { monitor_application_errors, open_demo, reach_demo } from "./app-test-support";

test("About switches local topics, presents one selection, and resets on remount", async ({ page }) => {
  const assertNoErrors = monitor_application_errors(page);
  await reach_demo(page);
  await open_demo(page, "about");

  const root = page.locator("#about-root");
  const thisSite = root.locator('[data-doc-key="livedemo"]');
  const liveMap = root.locator('[data-doc-key="livemap"]');
  await expect(root).toBeVisible();
  await expect(thisSite).toHaveAttribute("data-active", "true");
  await expect(liveMap).toHaveAttribute("data-active", "false");

  await liveMap.click();
  await expect(liveMap).toHaveAttribute("data-active", "true");
  await expect(thisSite).toHaveAttribute("data-active", "false");
  await expect(root.locator(".about-doc")).toContainText("LiveMap");
  await root.evaluate((node) => node.setAttribute("data-instance", "old"));

  await open_demo(page, "build");
  await expect(root).toHaveCount(0);
  await open_demo(page, "about");
  await expect(root).not.toHaveAttribute("data-instance", "old");
  await expect(thisSite).toHaveAttribute("data-active", "true");
  await expect(liveMap).toHaveAttribute("data-active", "false");
  assertNoErrors();
});
