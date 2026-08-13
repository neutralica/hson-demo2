import { expect, test, type Page } from "@playwright/test";
import { monitor_application_errors, open_demo, reach_demo } from "./app-test-support";

test.setTimeout(90_000);

type TowlBootMetrics = Readonly<{
  webSockets: number;
  historyReplaces: number;
  credentialReads: number;
}>;

async function open_direct_towl(page: Page, url = "/towl"): Promise<void> {
  await page.goto(url);
  await expect(page.getByTestId("app-root")).toBeAttached();
  await expect(page.locator("#stage")).toHaveAttribute("data-app-phase", "demo-ready", { timeout: 15_000 });
  await expect(page.locator("#screen")).toHaveAttribute("data-shell-current-main", "towl");
  await expect(page.getByTestId("towl-root")).toBeVisible();
  await expect(page.getByTestId("towl-status")).toHaveText(
    "connection: connected · session attached",
    { timeout: 15_000 },
  );
}

async function install_towl_boot_metrics(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const metrics = { webSockets: 0, historyReplaces: 0, credentialReads: 0 };
    Object.defineProperty(window, "__towlBootMetrics", { value: metrics });

    const NativeWebSocket = window.WebSocket;
    class CountingWebSocket extends NativeWebSocket {
      constructor(url: string | URL, protocols?: string | string[]) {
        const livehost = new URL(String(url), window.location.href).searchParams.get("livehost");
        if (livehost?.startsWith("towl:") === true) metrics.webSockets += 1;
        if (protocols === undefined) super(url);
        else super(url, protocols);
      }
    }
    Object.defineProperty(window, "WebSocket", { value: CountingWebSocket });

    const replaceState = history.replaceState;
    history.replaceState = function replacement(data: unknown, unused: string, url?: string | URL | null): void {
      metrics.historyReplaces += 1;
      replaceState.call(history, data, unused, url);
    };

    const getItem = Storage.prototype.getItem;
    Storage.prototype.getItem = function countedGetItem(key: string): string | null {
      if (key.startsWith("hson-livedemo.towl.")) metrics.credentialReads += 1;
      return getItem.call(this, key);
    };
  });
}

async function read_towl_boot_metrics(page: Page): Promise<TowlBootMetrics> {
  return page.evaluate(() => (
    window as unknown as { __towlBootMetrics: TowlBootMetrics }
  ).__towlBootMetrics);
}

async function assert_phone_geometry(page: Page): Promise<void> {
  const geometry = await page.locator("#towl-root").evaluate((root) => {
    const required = (selector: string): HTMLElement => {
      const node = root.querySelector<HTMLElement>(selector);
      if (!node) throw new Error(`missing ${selector}`);
      return node;
    };
    const rect = (selector: string) => required(selector).getBoundingClientRect();
    const actionHeights = [...root.querySelectorAll<HTMLElement>("#towl-actions > button")]
      .map((button) => button.getBoundingClientRect().height);
    const rootRect = root.getBoundingClientRect();
    const pullRect = rect("#towl-pull");
    const roomRect = rect("#towl-room-row");
    const statusRect = required('[data-testid="towl-status"]').getBoundingClientRect();
    return {
      viewport: { width: innerWidth, height: innerHeight },
      documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      rootOverflow: root.scrollWidth - root.clientWidth,
      rootRect: { left: rootRect.left, right: rootRect.right, top: rootRect.top },
      actionHeights,
      pullReachable: pullRect.top >= rootRect.top && pullRect.bottom <= root.scrollHeight + rootRect.top,
      roomReachable: roomRect.top >= rootRect.top && roomRect.bottom <= root.scrollHeight + rootRect.top,
      statusReachable: statusRect.top >= rootRect.top && statusRect.bottom <= root.scrollHeight + rootRect.top,
    };
  });

  expect(geometry.documentOverflow).toBeLessThanOrEqual(1);
  expect(geometry.rootOverflow).toBeLessThanOrEqual(1);
  expect(geometry.rootRect.left).toBeGreaterThanOrEqual(-1);
  expect(geometry.rootRect.right).toBeLessThanOrEqual(geometry.viewport.width + 1);
  expect(geometry.rootRect.top).toBeGreaterThanOrEqual(-1);
  expect(geometry.actionHeights.length).toBe(4);
  expect(Math.min(...geometry.actionHeights)).toBeGreaterThanOrEqual(44);
  expect(geometry.pullReachable).toBe(true);
  expect(geometry.roomReachable).toBe(true);
  expect(geometry.statusReachable).toBe(true);
  await expect(page.locator("#menu-container")).toBeHidden();
  await expect(page.locator("#motes")).toBeHidden();
  await expect(page.locator("#graffiti-layer")).toBeHidden();
  await expect(page.locator("#live-demo-deck")).toBeHidden();
}

test("two fresh phone contexts enter one direct TOWL room and synchronize an authoritative pull", async ({ browser }) => {
  const firstContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const secondContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const first = await firstContext.newPage();
  const second = await secondContext.newPage();
  try {
    await open_direct_towl(first);
    await assert_phone_geometry(first);
    const invite = new URL(first.url());
    expect(invite.pathname).toBe("/towl");
    const roomId = invite.searchParams.get("room");
    expect(roomId).toMatch(/^[a-z0-9][a-z0-9-]{5,23}$/);
    await expect(first.getByTestId("towl-room")).toHaveText(`room ${roomId}`);
    await first.getByRole("button", { name: "join", exact: true }).click();
    await expect(first.getByTestId("towl-local-seat")).toHaveText("local seat: player1");

    await open_direct_towl(second, first.url());
    await assert_phone_geometry(second);
    expect(new URL(second.url()).searchParams.get("room")).toBe(roomId);
    await second.getByRole("button", { name: "join", exact: true }).click();
    await expect(second.getByTestId("towl-local-seat")).toHaveText("local seat: player2");
    await expect(first.getByTestId("towl-phase")).toHaveText("phase: ready");

    await first.getByRole("button", { name: "ready", exact: true }).click();
    await second.getByRole("button", { name: "ready", exact: true }).click();
    await expect(first.getByTestId("towl-phase")).toHaveText("phase: playing");
    await expect(second.getByTestId("towl-phase")).toHaveText("phase: playing");
    await first.getByRole("button", { name: "pull", exact: true }).click();
    await expect(second.getByTestId("towl-rope")).toContainText("rope: 1");
  } finally {
    await firstContext.close();
    await secondContext.close();
  }
});

test("invalid direct invite is inert until Create new room is chosen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await install_towl_boot_metrics(page);
  const invalidUrl = "/towl?room=not_valid&mode=play";
  await page.goto(invalidUrl);
  await expect(page.locator("#stage")).toHaveAttribute("data-app-phase", "demo-ready", { timeout: 15_000 });
  await expect(page.locator("#screen")).toHaveAttribute("data-shell-current-main", "towl");
  await expect(page.getByText("invalid TOWL room link", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "create new room", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "back", exact: true })).toBeVisible();
  expect(new URL(page.url()).searchParams.get("room")).toBe("not_valid");
  expect(await read_towl_boot_metrics(page)).toEqual({ webSockets: 0, historyReplaces: 0, credentialReads: 0 });

  await page.getByRole("button", { name: "create new room", exact: true }).click();
  await expect(page.getByTestId("towl-status")).toHaveText(
    "connection: connected · session attached",
    { timeout: 15_000 },
  );
  expect(new URL(page.url()).searchParams.get("room")).toMatch(/^[a-z0-9][a-z0-9-]{5,23}$/);
  expect(await read_towl_boot_metrics(page)).toEqual({ webSockets: 1, historyReplaces: 1, credentialReads: 1 });
});

test("portrait, landscape, and desktop-like resizing preserves one room, session, and socket", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await install_towl_boot_metrics(page);
  await open_direct_towl(page);
  await page.getByRole("button", { name: "join", exact: true }).click();
  await expect(page.getByTestId("towl-local-seat")).toHaveText("local seat: player1");
  const roomId = new URL(page.url()).searchParams.get("room");
  expect(roomId).not.toBeNull();
  const credentialKey = `hson-livedemo.towl.${roomId}.livehost-credential`;
  expect(await read_towl_boot_metrics(page)).toEqual({ webSockets: 1, historyReplaces: 1, credentialReads: 1 });
  const credential = await page.evaluate((key) => localStorage.getItem(key), credentialKey);
  expect(credential).not.toBeNull();
  const activeMetrics = await read_towl_boot_metrics(page);
  await assert_phone_geometry(page);

  await page.setViewportSize({ width: 844, height: 390 });
  await assert_phone_geometry(page);
  await expect(page.locator("#screen")).toHaveAttribute("data-shell-current-main", "towl");
  await expect(page.getByTestId("towl-local-seat")).toHaveText("local seat: player1");
  expect(new URL(page.url()).searchParams.get("room")).toBe(roomId);
  expect(await read_towl_boot_metrics(page)).toEqual(activeMetrics);

  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.locator("#screen")).toHaveAttribute("data-shell-current-main", "towl");
  await expect(page.getByTestId("towl-local-seat")).toHaveText("local seat: player1");
  expect(new URL(page.url()).searchParams.get("room")).toBe(roomId);
  expect(await read_towl_boot_metrics(page)).toEqual(activeMetrics);
  expect(await page.evaluate((key) => localStorage.getItem(key), credentialKey)).toBe(credential);

  await page.getByRole("button", { name: "back", exact: true }).click();
  await expect(page.getByTestId("towl-root")).toHaveCount(0);
  await expect(page.locator("#screen")).toHaveAttribute("data-shell-current-main", "");
  expect(new URL(page.url()).pathname).toBe("/");
  expect(new URL(page.url()).searchParams.get("room")).toBe(roomId);
  expect(await page.evaluate((key) => localStorage.getItem(key), credentialKey)).toBe(credential);

  await page.reload();
  await expect(page.locator("#stage")).toHaveAttribute("data-app-phase", "demo-ready", { timeout: 15_000 });
  await expect(page.getByTestId("towl-status")).toHaveText(
    "connection: connected · session attached",
    { timeout: 15_000 },
  );
  await expect(page.getByTestId("towl-local-seat")).toHaveText("local seat: player1");
});

test("desktop shell selection retains ordinary chrome and focus styles do not leak", async ({ page }) => {
  const assertNoErrors = monitor_application_errors(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await reach_demo(page);
  await open_demo(page, "towl");
  await expect(page.locator("#screen")).toHaveAttribute("data-shell-entry", "standard");
  await expect(page.locator("#screen")).toHaveAttribute("data-shell-current-main", "towl");
  await expect(page.getByTestId("towl-root")).toBeVisible();
  await expect(page.getByRole("group", { name: "Demo navigation" })).toBeVisible();
  await expect(page.locator("#menu-container")).toBeVisible();
  await expect(page.locator("#ui-root")).toBeVisible();

  await open_demo(page, "about");
  await expect(page.locator("#screen")).toHaveAttribute("data-shell-current-main", "about");
  await expect(page.getByTestId("towl-root")).toHaveCount(0);
  await expect(page.locator("#about-panel")).toBeVisible();
  await expect(page.getByRole("group", { name: "Demo navigation" })).toBeVisible();
  assertNoErrors();
});
