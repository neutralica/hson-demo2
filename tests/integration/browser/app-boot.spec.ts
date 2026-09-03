import { expect, test } from "./livehost-browser-test";
import { monitor_application_errors, open_demo, reach_demo } from "./app-test-support";

type TowlLazyMetrics = Readonly<{
  webSockets: number;
  historyReplaces: number;
  credentialReads: number;
}>;

test("splash completes naturally without retaining work or disposed nodes", async ({ page }) => {
  test.setTimeout(55_000);
  const assertNoErrors = monitor_application_errors(page);
  await page.goto("/");
  const stage = page.locator("#stage");
  await expect(stage).toHaveAttribute("data-app-phase", "splash", { timeout: 15_000 });
  await expect(stage).toHaveAttribute("data-app-phase", "demo-ready", { timeout: 45_000 });
  await expect(page.locator("#sky, #logo-box")).toHaveCount(0);
  await expect(page.locator("#wasm-fireworks")).toHaveCount(1);
  assertNoErrors();
});

test("application boot reaches one clean usable demo without auto-running hosted tests", async ({ page }) => {
  const assertNoErrors = monitor_application_errors(page);
  await reach_demo(page);

  await expect(page.locator("#screen")).toHaveAttribute("data-shell-current-main", "");
  await expect(page.locator("#screen")).toHaveAttribute("data-shell-active-widgets", "");
  await expect(page.locator("#screen")).toHaveAttribute("data-shell-navigation-skin", "plain");
  await expect(page.locator('[data-shell-main-surface]')).toHaveCount(0);
  await expect(page.getByTestId("hosted-test-panel")).toHaveCount(0);
  await expect(page.getByTestId("parse-root")).toHaveCount(0);
  await expect(page.getByTestId("towl-root")).toHaveCount(0);
  await expect(page.locator("#plain-menu-demo")).toBeVisible();
  await expect(page.getByRole("button", { name: "tests", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "test", exact: true })).toHaveCount(0);
  await expect(page.locator("#amoebi-menu-demo")).toBeHidden();
  await expect(page.locator("#hson-headline")).toBeVisible();
  await expect(page.locator("#livedemo-subhead")).toBeVisible();
  await expect(page.locator("#graffiti-layer")).toBeHidden();
  await expect(page.locator("#motes-root")).toHaveCount(0);
  await expect(page.locator("#motes")).toBeHidden();
  await expect(page.locator("#mouse-host, #oklch")).toHaveCount(0);
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
  await expect(page.getByTestId("hosted-test-panel")).toHaveCount(0);
  await expect(page.getByTestId("parse-root")).toHaveCount(0);
  await expect(page.getByTestId("towl-root")).toHaveCount(0);
  await expect(page.locator("#screen")).toHaveAttribute("data-shell-current-main", "");
  await expect(page.locator("#screen")).toHaveAttribute("data-shell-active-widgets", "");
  await expect(page.locator("#screen")).toHaveAttribute("data-shell-navigation-skin", "plain");
  await expect(page.locator("#motes-root")).toHaveCount(0);
  await expect(page.locator("#graffiti-layer")).toBeHidden();
  await expect(page.locator("#sky, #logo-box")).toHaveCount(0);
  await expect(page.locator("#deck-cover")).not.toBeVisible();
  assertNoErrors();
});

test("explicit TOWL entry and browser history remain distinct from the quiet root boot", async ({ page }) => {
  await reach_demo(page);
  await expect(page.locator("#screen")).toHaveAttribute("data-shell-current-main", "");

  await page.goto("/towl");
  await expect(page.locator("#stage")).toHaveAttribute("data-app-phase", "demo-ready", { timeout: 15_000 });
  await expect(page.locator("#screen")).toHaveAttribute("data-shell-current-main", "towl");
  await expect(page.getByTestId("towl-root")).toBeVisible();

  await page.goBack();
  const rootStage = page.locator("#stage");
  await expect(rootStage).toHaveAttribute("data-app-phase", "splash", { timeout: 15_000 });
  await rootStage.click({ position: { x: 4, y: 4 } });
  await expect(rootStage).toHaveAttribute("data-app-phase", "demo-ready", { timeout: 15_000 });
  await expect(page.locator("#screen")).toHaveAttribute("data-shell-current-main", "");
  await expect(page.getByTestId("towl-root")).toHaveCount(0);

  await page.goForward();
  await expect(page.locator("#stage")).toHaveAttribute("data-app-phase", "demo-ready", { timeout: 15_000 });
  await expect(page.locator("#screen")).toHaveAttribute("data-shell-current-main", "towl");
  await expect(page.getByTestId("towl-root")).toBeVisible();
});

test("TOWL performs no room, storage, runtime, or socket work before activation", async ({ page }) => {
  await page.addInitScript(() => {
    const metrics = { webSockets: 0, historyReplaces: 0, credentialReads: 0 };
    Object.defineProperty(window, "__towlLazyMetrics", { value: metrics });

    const NativeWebSocket = window.WebSocket;
    class CountingWebSocket extends NativeWebSocket {
      constructor(url: string | URL, protocols?: string | string[]) {
        const locus = new URL(String(url), window.location.href).searchParams.get("locus");
        if (locus?.startsWith("towl:") === true) metrics.webSockets += 1;
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

  await reach_demo(page);
  const readMetrics = (): Promise<TowlLazyMetrics> => page.evaluate(() => (
    window as unknown as { __towlLazyMetrics: TowlLazyMetrics }
  ).__towlLazyMetrics);

  await expect(page.getByTestId("towl-root")).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get("room")).toBeNull();
  expect(await readMetrics()).toEqual({ webSockets: 0, historyReplaces: 0, credentialReads: 0 });

  await page.evaluate(() => history.replaceState(history.state, "", "/?mode=play#shell-state"));
  await open_demo(page, "towl");
  await expect(page.getByTestId("towl-root")).toBeVisible();
  await expect(page.getByTestId("towl-status")).toHaveText("connection: connected · session attached");
  const roomId = new URL(page.url()).searchParams.get("room");
  expect(roomId).toMatch(/^[a-z0-9][a-z0-9-]{5,23}$/);
  expect(new URL(page.url()).searchParams.get("mode")).toBe("play");
  expect(new URL(page.url()).hash).toBe("#shell-state");
  expect(await readMetrics()).toEqual({ webSockets: 1, historyReplaces: 2, credentialReads: 1 });

  await open_demo(page, "towl");
  await expect(page.getByTestId("towl-root")).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get("room")).toBeNull();
  expect(new URL(page.url()).searchParams.get("mode")).toBe("play");
  expect(new URL(page.url()).hash).toBe("#shell-state");

  await open_demo(page, "towl");
  expect(new URL(page.url()).searchParams.get("room")).toBe(roomId);
  await open_demo(page, "about");
  await expect(page.locator("#screen")).toHaveAttribute("data-shell-current-main", "about");
  expect(new URL(page.url()).searchParams.get("room")).toBeNull();
  expect(new URL(page.url()).searchParams.get("mode")).toBe("play");
  expect(new URL(page.url()).hash).toBe("#shell-state");

  await page.reload();
  await expect(page.locator("#stage")).toHaveAttribute("data-app-phase", "splash", { timeout: 15_000 });
  await page.locator("#stage").click({ position: { x: 4, y: 4 } });
  await expect(page.locator("#stage")).toHaveAttribute("data-app-phase", "demo-ready", { timeout: 15_000 });
  await expect(page.getByTestId("towl-root")).toHaveCount(0);
  await expect(page.locator("#screen")).toHaveAttribute("data-shell-current-main", "");
});

test("an invalid ordinary room query keeps the fresh shell neutral and TOWL inert", async ({ page }) => {
  await page.addInitScript(() => {
    const metrics = { webSockets: 0, historyReplaces: 0, credentialReads: 0 };
    Object.defineProperty(window, "__towlLazyMetrics", { value: metrics });

    const NativeWebSocket = window.WebSocket;
    class CountingWebSocket extends NativeWebSocket {
      constructor(url: string | URL, protocols?: string | string[]) {
        const locus = new URL(String(url), window.location.href).searchParams.get("locus");
        if (locus?.startsWith("towl:") === true) metrics.webSockets += 1;
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

  await page.goto("/?room=not_valid");
  const stage = page.locator("#stage");
  await expect(stage).toHaveAttribute("data-app-phase", "splash", { timeout: 15_000 });
  await stage.click({ position: { x: 4, y: 4 } });
  await expect(stage).toHaveAttribute("data-app-phase", "demo-ready", { timeout: 15_000 });
  await expect(page.locator("#screen")).toHaveAttribute("data-shell-current-main", "");
  await expect(page.getByTestId("towl-root")).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get("room")).toBe("not_valid");
  expect(await page.evaluate(() => (
    window as unknown as { __towlLazyMetrics: TowlLazyMetrics }
  ).__towlLazyMetrics)).toEqual({ webSockets: 0, historyReplaces: 0, credentialReads: 0 });
});

test("widget membership lazily mounts and recreates disposable widget instances", async ({ page }) => {
  await reach_demo(page);
  await expect(page.locator("#motes-root")).toHaveCount(0);
  await expect(page.locator("#mouse-host, #oklch")).toHaveCount(0);

  await open_demo(page, "point");
  await expect(page.locator("#mouse-host")).toBeVisible();
  await open_demo(page, "point");
  await expect(page.locator("#mouse-host")).not.toBeVisible();
  await expect(page.locator("#mouse-host")).toHaveCount(0);
  await open_demo(page, "point");
  await expect(page.locator("#mouse-host")).toBeVisible();
  await expect(page.locator("#mouse-host")).toHaveCount(1);

  await open_demo(page, "oklch");
  await expect(page.locator("#oklch")).toBeVisible();
  await open_demo(page, "oklch");
  await expect(page.locator("#oklch")).not.toBeVisible();
  await expect(page.locator("#oklch")).toHaveCount(0);

  await open_demo(page, "bling");
  await expect(page.locator("#motes-root")).toHaveCount(1);
  await open_demo(page, "bling");
  await expect(page.locator("#motes-root")).toHaveCount(0);
});

test("keyboard Color Sudoku activation stays inside the canonical shell lifecycle", async ({ page }) => {
  await reach_demo(page);
  await expect(page.locator("#color-sudoku-root")).toHaveCount(0);

  await page.keyboard.press("0");
  await expect(page.locator("#screen")).toHaveAttribute("data-shell-current-main", "color-sudoku");
  await expect(page.locator("#color-sudoku-root")).toBeVisible();
  await expect(page.locator("#demo-layer")).toHaveCount(1);
  await expect(page.getByRole("group", { name: "Demo navigation" })).toBeVisible();

  await open_demo(page, "about");
  await expect(page.locator("#screen")).toHaveAttribute("data-shell-current-main", "about");
  await expect(page.locator("#color-sudoku-root")).toHaveCount(0);
  await expect(page.locator("#about-panel")).toBeVisible();
  await expect(page.locator("#demo-layer")).toHaveCount(1);
});
