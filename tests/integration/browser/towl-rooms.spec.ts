import { expect, test, type Page } from "@playwright/test";
import { open_demo } from "./app-test-support";

test.setTimeout(90_000);

async function reach_demo_url(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await expect(page.getByTestId("app-root")).toBeAttached();
  const stage = page.locator("#stage");
  await expect(stage).toHaveAttribute("data-app-phase", /^(splash|demo-ready)$/, { timeout: 15_000 });
  if (await stage.getAttribute("data-app-phase") === "splash") {
    await stage.click({ position: { x: 4, y: 4 } });
  }
  await expect(stage).toHaveAttribute("data-app-phase", "demo-ready", { timeout: 15_000 });
  await expect(page.getByRole("group", { name: "Demo navigation" })).toBeVisible();
}

async function open_towl(page: Page): Promise<void> {
  if (!await page.getByTestId("towl-root").isVisible()) await open_demo(page, "towl");
  await expect(page.getByTestId("towl-root")).toBeVisible();
  await expect(page.getByTestId("towl-status")).toHaveText("connection: connected · session attached");
}

test("TOWL room URL shares one game, isolates another, and reattaches on refresh", async ({ browser, baseURL }) => {
  const origin = new URL(baseURL ?? "http://127.0.0.1:4173").origin;
  const firstContext = await browser.newContext();
  const secondContext = await browser.newContext();
  const isolatedContext = await browser.newContext();
  await firstContext.grantPermissions(["clipboard-read", "clipboard-write"], { origin });
  const first = await firstContext.newPage();
  const second = await secondContext.newPage();
  const isolated = await isolatedContext.newPage();
  try {
    await reach_demo_url(first, "/?mode=play#towl");
    expect(new URL(first.url()).searchParams.get("room")).toBeNull();
    await open_towl(first);
    const firstUrl = new URL(first.url());
    const roomId = firstUrl.searchParams.get("room");
    expect(roomId).toMatch(/^[a-z0-9][a-z0-9-]{5,23}$/);
    expect(firstUrl.searchParams.get("mode")).toBe("play");
    expect(firstUrl.hash).toBe("#towl");
    await first.getByRole("button", { name: "copy invite link" }).click();
    await expect(first.getByTestId("towl-invite-status")).toHaveText("copied");
    const inviteUrl = await first.evaluate(() => navigator.clipboard.readText());
    expect(inviteUrl).toBe(first.url());
    await first.getByRole("button", { name: "join", exact: true }).click();
    await expect(first.getByTestId("towl-local-seat")).toHaveText("local seat: player1");

    await reach_demo_url(second, inviteUrl);
    await open_towl(second);
    await second.getByRole("button", { name: "join", exact: true }).click();
    await expect(second.getByTestId("towl-local-seat")).toHaveText("local seat: player2");
    await expect(first.getByTestId("towl-phase")).toHaveText("phase: ready");
    await expect(first.getByTestId("towl-player2")).toContainText("joined");

    await reach_demo_url(isolated, "/?room=isolated-room");
    await open_towl(isolated);
    await expect(isolated.getByTestId("towl-player1")).toContainText("vacant");
    await expect(isolated.getByTestId("towl-phase")).toHaveText("phase: lobby");

    await first.reload();
    await expect(first.locator("#stage")).toHaveAttribute("data-app-phase", "demo-ready", { timeout: 15_000 });
    await open_towl(first);
    await expect(first.getByTestId("towl-local-seat")).toHaveText("local seat: player1");

  } finally {
    await firstContext.close();
    await secondContext.close();
    await isolatedContext.close();
  }
});

test("TOWL replaces a lost browser transport and restores the same session seat", async ({ page }) => {
  await page.addInitScript(() => {
    const NativeWebSocket = window.WebSocket;
    let latestTowlSocket: WebSocket | undefined;
    let towlSocketCount = 0;
    class ObservableWebSocket extends NativeWebSocket {
      constructor(url: string | URL, protocols?: string | string[]) {
        if (protocols === undefined) super(url);
        else super(url, protocols);
        const livehost = new URL(String(url), window.location.href).searchParams.get("livehost");
        if (livehost?.startsWith("towl:") === true) {
          latestTowlSocket = this;
          towlSocketCount += 1;
        }
      }
    }
    Object.defineProperty(window, "WebSocket", { value: ObservableWebSocket });
    Object.defineProperties(window, {
      __closeTowlSocket: { value: () => latestTowlSocket?.close() },
      __towlSocketCount: { get: () => towlSocketCount },
    });
  });

  await reach_demo_url(page, "/?mode=play#towl");
  await open_towl(page);
  await page.getByRole("button", { name: "join", exact: true }).click();
  await expect(page.getByTestId("towl-local-seat")).toHaveText("local seat: player1");
  const roomId = new URL(page.url()).searchParams.get("room");
  expect(roomId).not.toBeNull();
  const credentialKey = `hson-livedemo.towl.${roomId}.livehost-credential`;
  const originalCredential = await page.evaluate((key) => localStorage.getItem(key), credentialKey);
  expect(originalCredential).not.toBeNull();

  await page.evaluate(() => (
    window as unknown as { __closeTowlSocket(): void }
  ).__closeTowlSocket());
  await expect(page.getByTestId("towl-status")).toHaveText(
    "connection: connected · session attached",
    { timeout: 15_000 },
  );
  await expect(page.getByTestId("towl-local-seat")).toHaveText("local seat: player1");
  expect(await page.evaluate((key) => localStorage.getItem(key), credentialKey)).toBe(originalCredential);
  expect(await page.evaluate(() => (
    window as unknown as { __towlSocketCount: number }
  ).__towlSocketCount)).toBe(2);
});
