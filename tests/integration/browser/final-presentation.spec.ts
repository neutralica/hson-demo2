import { expect, test } from "./livehost-browser-test";
import { monitor_application_errors, open_demo, reach_demo } from "./app-test-support";
test("bling switches one navigation model between amoebic and historical plain presentations", async ({ page }) => {
  const assertNoErrors = monitor_application_errors(page);
  await reach_demo(page);
  const screen = page.locator("#screen");
  const amoebic = page.locator("#amoebi-menu-demo");
  const plain = page.locator("#plain-menu-demo");
  const menuOrder = ["about", "test", "parse", "build", "bar-bar", "towl", "cells", "fleurs", "point", "oklch", "bling"];

  await expect(screen).toHaveAttribute("data-shell-current-main", "");
  await expect(screen).toHaveAttribute("data-shell-active-widgets", "");
  await expect(screen).toHaveAttribute("data-shell-navigation-skin", "plain");
  await expect(amoebic).toBeHidden();
  await expect(plain).toBeVisible();
  await expect(page.locator("#motes-root")).toHaveCount(0);
  await expect(page.locator("#motes")).toBeHidden();
  await expect(page.locator("#graffiti-layer")).toBeHidden();
  expect(await amoebic.locator("[data-amoebi-hit-target]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-amoebi-hit-target")))).toEqual(menuOrder);
  expect(await plain.locator("[data-menu-key]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-menu-key")))).toEqual(menuOrder);

  const parseButton = plain.getByRole("button", { name: "parse", exact: true });
  const aboutButton = plain.getByRole("button", { name: "about", exact: true });
  const pointButton = plain.getByRole("button", { name: "point", exact: true });
  const parseLabel = parseButton.locator(".plain-menu-label");
  const aboutLabel = aboutButton.locator(".plain-menu-label");
  const parseMarker = parseButton.locator(".plain-menu-marker");
  const aboutMarker = aboutButton.locator(".plain-menu-marker");
  const subheadMarker = page.locator("#livedemo-subhead > .plain-menu-marker");
  const subheadLabel = page.locator("#livedemo-subhead > .livedemo-label");
  await expect(subheadMarker).toHaveText("");
  await expect(subheadMarker).toHaveAttribute("aria-hidden", "true");
  expect(await subheadLabel.evaluate((element) => element.getBoundingClientRect().x)).toBe(
    await aboutLabel.evaluate((element) => element.getBoundingClientRect().x),
  );
  await expect(parseButton).toHaveCSS("color", "oklch(0.75 0.06 300)");
  await expect(pointButton).toHaveCSS("color", "oklch(0.7 0.001 101)");
  const aboutIdleX = await aboutLabel.evaluate((element) => element.getBoundingClientRect().x);
  expect(await aboutMarker.evaluate((element) => getComputedStyle(element, "::before").content)).toBe("none");
  await aboutButton.hover();
  expect(await aboutMarker.evaluate((element) => getComputedStyle(element, "::before").content)).toBe('">>"');
  expect(await aboutLabel.evaluate((element) => element.getBoundingClientRect().x)).toBe(aboutIdleX);
  await aboutButton.focus();
  expect(await aboutMarker.evaluate((element) => getComputedStyle(element, "::before").content)).toBe('">>"');
  expect(await aboutLabel.evaluate((element) => element.getBoundingClientRect().x)).toBe(aboutIdleX);

  const parseIdleX = await parseLabel.evaluate((element) => element.getBoundingClientRect().x);
  await parseButton.click();
  await expect(screen).toHaveAttribute("data-shell-current-main", "parse");
  await expect(parseButton).toHaveCSS("font-weight", "900");
  await parseButton.hover();
  expect(await parseMarker.evaluate((element) => getComputedStyle(element, "::before").content)).toBe('"X"');
  expect(await parseLabel.evaluate((element) => element.getBoundingClientRect().x)).toBe(parseIdleX);
  await parseButton.focus();
  expect(await parseMarker.evaluate((element) => getComputedStyle(element, "::before").content)).toBe('"X"');
  expect(await parseLabel.evaluate((element) => element.getBoundingClientRect().x)).toBe(parseIdleX);
  await page.mouse.move(1300, 800);
  await aboutButton.focus();
  expect(await parseMarker.evaluate((element) => getComputedStyle(element, "::before").content)).toBe('">"');
  expect(await parseLabel.evaluate((element) => element.getBoundingClientRect().x)).toBe(parseIdleX);

  const parseRoot = page.getByTestId("parse-root");
  await parseRoot.evaluate((element) => element.setAttribute("data-bling-retention", "same-instance"));
  const urlBefore = page.url();

  await plain.getByRole("button", { name: "bling", exact: true }).click();
  await expect(screen).toHaveAttribute("data-shell-navigation-skin", "amoebic");
  await expect(amoebic).toHaveAttribute("data-amoebi-transition", "entering");
  await expect(screen).toHaveAttribute("data-shell-current-main", "parse");
  await expect(page.getByTestId("parse-root")).toHaveAttribute(
    "data-bling-retention",
    "same-instance",
  );
  expect(page.url()).toBe(urlBefore);
  await expect(amoebic).toBeVisible();
  await expect(plain).toBeHidden();
  await expect(page.locator("#motes-root")).toHaveCount(1);
  await expect(page.locator("#graffiti-layer")).toBeVisible();
  await expect(page.locator("#motes")).toHaveCSS("background-image", /linear-gradient/);
  await expect(amoebic).toHaveAttribute("data-amoebi-transition", "settled", { timeout: 3_000 });

  await amoebic.getByRole("button", { name: "parse", exact: true }).click();
  await expect(screen).toHaveAttribute("data-shell-current-main", "");
  await expect(page.getByTestId("parse-root")).toHaveCount(0);
  await amoebic.getByRole("button", { name: "bling", exact: true }).click();
  await expect(amoebic).toHaveAttribute("data-amoebi-transition", "exiting");
  await expect(amoebic).toBeVisible();
  await expect(plain).toBeHidden();
  await amoebic.getByRole("button", { name: "bling", exact: true }).click();
  await expect(amoebic).toHaveAttribute("data-amoebi-transition", "entering");
  await expect(page.locator("#amoebi-menu-demo")).toHaveCount(1);
  await amoebic.getByRole("button", { name: "bling", exact: true }).click();
  await expect(amoebic).toHaveAttribute("data-amoebi-transition", "exiting");
  await expect(screen).toHaveAttribute("data-shell-navigation-skin", "plain", { timeout: 3_000 });
  await expect(amoebic).toBeHidden();
  await expect(plain).toBeVisible();
  await expect(screen).toHaveAttribute("data-shell-current-main", "");
  await aboutButton.press("Enter");
  await expect(screen).toHaveAttribute("data-shell-current-main", "about");
  await expect(aboutButton).toHaveCSS("font-weight", "900");
  expect(await aboutMarker.evaluate((element) => getComputedStyle(element, "::before").content)).toBe('"X"');
  await aboutButton.press("Enter");
  await expect(screen).toHaveAttribute("data-shell-current-main", "");
  await expect(page.locator("#amoebi-menu-demo")).toHaveCount(1);
  await expect(page.locator("#plain-menu-demo")).toHaveCount(1);

  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(plain).toBeVisible();
  await expect(plain.locator("[data-menu-key]")).toHaveCount(menuOrder.length);
  for (const key of menuOrder) {
    await expect(plain.getByRole("button", { name: key === "test" ? "tests" : key, exact: true })).toBeVisible();
  }

  await plain.getByRole("button", { name: "bling", exact: true }).click();
  await expect(amoebic).toHaveAttribute("data-amoebi-transition", "entering");
  await page.reload();
  await expect(page.locator("#stage")).toHaveAttribute("data-app-phase", "splash", { timeout: 15_000 });
  await page.locator("#stage").click({ position: { x: 4, y: 4 } });
  await expect(page.locator("#stage")).toHaveAttribute("data-app-phase", "demo-ready", { timeout: 15_000 });
  await expect(page.locator("#screen")).toHaveAttribute("data-shell-navigation-skin", "amoebic");
  await expect(page.locator("#amoebi-menu-demo")).toBeVisible();
  await page.locator("#amoebi-menu-demo").getByRole("button", { name: "bling", exact: true }).click();
  await expect(page.locator("#screen")).toHaveAttribute("data-shell-navigation-skin", "plain", { timeout: 3_000 });
  await page.reload();
  await expect(page.locator("#stage")).toHaveAttribute("data-app-phase", "splash", { timeout: 15_000 });
  await page.locator("#stage").click({ position: { x: 4, y: 4 } });
  await expect(page.locator("#stage")).toHaveAttribute("data-app-phase", "demo-ready", { timeout: 15_000 });
  await expect(page.locator("#screen")).toHaveAttribute("data-shell-navigation-skin", "plain");
  expect(new URL(page.url()).searchParams.get("room")).toBeNull();
  assertNoErrors();
});
