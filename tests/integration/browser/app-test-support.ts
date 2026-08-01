import { expect, type Page } from "@playwright/test";

const ALLOWED_CONSOLE_ERRORS: readonly RegExp[] = [
  /Failed to load resource.*favicon/i,
];

export function monitor_application_errors(page: Page): () => void {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (!ALLOWED_CONSOLE_ERRORS.some((allowed) => allowed.test(text))) consoleErrors.push(text);
  });
  return () => {
    expect(pageErrors, "unexpected uncaught page errors").toEqual([]);
    expect(consoleErrors, "unexpected browser console errors").toEqual([]);
  };
}

export async function reach_demo(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.getByTestId("app-root")).toBeAttached();
  const stage = page.locator("#stage");
  await expect(stage).toHaveAttribute("data-app-phase", "splash", { timeout: 15_000 });
  await stage.click({ position: { x: 4, y: 4 } });
  await expect(stage).toHaveAttribute("data-app-phase", "demo-ready", { timeout: 15_000 });
  await expect(page.getByRole("group", { name: "Demo navigation" })).toBeVisible();
}

export async function open_demo(page: Page, name: string): Promise<void> {
  await page.getByRole("button", { name, exact: true }).click();
}
