import { expect, test, type Page } from "./livehost-browser-test";
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
  if (new URL(page.url()).pathname !== "/towl") {
    await expect(page.getByRole("group", { name: "Demo navigation" })).toBeVisible();
  }
}

async function open_towl(page: Page): Promise<void> {
  if (!await page.getByTestId("towl-root").isVisible()) await open_demo(page, "towl");
  await expect(page.getByTestId("towl-root")).toBeVisible();
  await expect(page.getByTestId("towl-status")).toHaveText(/^connection: connected · session (attached|restored)$/);
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
    await first.getByRole("button", { name: "share room" }).click();
    await expect(first.getByTestId("towl-share-status")).toHaveText("link copied");
    const inviteUrl = await first.evaluate(() => navigator.clipboard.readText());
    const canonicalInvite = new URL(inviteUrl);
    expect(canonicalInvite.origin).toBe(firstUrl.origin);
    expect(canonicalInvite.pathname).toBe("/towl");
    expect(canonicalInvite.searchParams.get("room")).toBe(roomId);
    expect([...canonicalInvite.searchParams.keys()]).toEqual(["room"]);
    expect(canonicalInvite.hash).toBe("");
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
    "connection: connected · session restored",
    { timeout: 15_000 },
  );
  await expect(page.getByTestId("towl-local-seat")).toHaveText("local seat: player1");
  expect(await page.evaluate((key) => localStorage.getItem(key), credentialKey)).toBe(originalCredential);
  expect(await page.evaluate(() => (
    window as unknown as { __towlSocketCount: number }
  ).__towlSocketCount)).toBe(2);
});

test("Share Room uses one canonical invite for native share, cancellation, and clipboard fallback", async ({ page }) => {
  await page.addInitScript(() => {
    const state = {
      mode: "share" as "share" | "cancel" | "fail",
      payloads: [] as ShareData[],
      copies: [] as string[],
    };
    Object.defineProperty(window, "__towlShareProbe", { value: state });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (payload: ShareData) => {
        state.payloads.push(payload);
        if (state.mode === "cancel") throw new DOMException("cancelled", "AbortError");
        if (state.mode === "fail") throw new Error("native share unavailable");
      },
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async (value: string) => { state.copies.push(value); } },
    });
  });

  await reach_demo_url(page, "/?mode=play#towl");
  await open_towl(page);
  const roomId = new URL(page.url()).searchParams.get("room");
  expect(roomId).not.toBeNull();
  const expectedInvite = new URL(`/towl?room=${roomId}`, page.url()).toString();
  const initialPhase = await page.getByTestId("towl-phase").innerText();

  await page.getByRole("button", { name: "share room" }).click();
  await expect(page.getByTestId("towl-share-status")).toHaveText("shared");
  expect(await page.evaluate(() => {
    const probe = (window as unknown as { __towlShareProbe: { payloads: ShareData[] } }).__towlShareProbe;
    return probe.payloads.at(-1)?.url;
  })).toBe(expectedInvite);

  await page.evaluate(() => {
    (window as unknown as { __towlShareProbe: { mode: string } }).__towlShareProbe.mode = "cancel";
  });
  await page.getByRole("button", { name: "share room" }).click();
  await expect(page.getByTestId("towl-share-status")).toHaveText("");
  expect(await page.evaluate(() => (
    window as unknown as { __towlShareProbe: { copies: string[] } }
  ).__towlShareProbe.copies)).toEqual([]);

  await page.evaluate(() => {
    (window as unknown as { __towlShareProbe: { mode: string } }).__towlShareProbe.mode = "fail";
  });
  await page.getByRole("button", { name: "share room" }).click();
  await expect(page.getByTestId("towl-share-status")).toHaveText("link copied");
  expect(await page.evaluate(() => (
    window as unknown as { __towlShareProbe: { copies: string[] } }
  ).__towlShareProbe.copies)).toEqual([expectedInvite]);
  await expect(page.getByTestId("towl-phase")).toHaveText(initialPhase);
  expect(new URL(page.url()).searchParams.get("room")).toBe(roomId);
});

test("Back resumes the same seat while Leave vacates it, clears the credential, and exits the room URL", async ({ browser }) => {
  const firstContext = await browser.newContext();
  const secondContext = await browser.newContext();
  const first = await firstContext.newPage();
  const second = await secondContext.newPage();
  try {
    await reach_demo_url(first, "/towl");
    await open_towl(first);
    const inviteUrl = first.url();
    const roomId = new URL(inviteUrl).searchParams.get("room");
    expect(roomId).not.toBeNull();
    const credentialKey = `hson-livedemo.towl.${roomId}.livehost-credential`;
    await first.getByRole("button", { name: "join", exact: true }).click();
    await expect(first.getByTestId("towl-local-seat")).toHaveText("local seat: player1");

    await reach_demo_url(second, inviteUrl);
    await open_towl(second);
    await second.getByRole("button", { name: "join", exact: true }).click();
    await expect(second.getByTestId("towl-local-seat")).toHaveText("local seat: player2");
    const credential = await second.evaluate((key) => localStorage.getItem(key), credentialKey);
    expect(credential).not.toBeNull();

    await second.getByRole("button", { name: "back", exact: true }).click();
    await expect(second.getByTestId("towl-root")).toHaveCount(0);
    expect(new URL(second.url()).searchParams.get("room")).toBe(roomId);
    expect(await second.evaluate((key) => localStorage.getItem(key), credentialKey)).toBe(credential);
    await expect(first.getByTestId("towl-player2")).toContainText("disconnected");

    await open_demo(second, "towl");
    await expect(second.getByTestId("towl-status")).toContainText("connected", { timeout: 15_000 });
    await expect(second.getByTestId("towl-local-seat")).toHaveText("local seat: player2");
    await expect(first.getByTestId("towl-player2")).toContainText("connected");

    await second.getByRole("button", { name: "leave room", exact: true }).click();
    await expect(second.getByTestId("towl-root")).toHaveCount(0, { timeout: 10_000 });
    expect(new URL(second.url()).pathname).toBe("/");
    expect(new URL(second.url()).searchParams.get("room")).toBeNull();
    expect(await second.evaluate((key) => localStorage.getItem(key), credentialKey)).toBeNull();
    await expect(first.getByTestId("towl-player2")).toContainText("vacant");

    await second.reload();
    const stage = second.locator("#stage");
    await expect(stage).toHaveAttribute("data-app-phase", "splash", { timeout: 15_000 });
    await stage.click({ position: { x: 4, y: 4 } });
    await expect(stage).toHaveAttribute("data-app-phase", "demo-ready", { timeout: 15_000 });
    await expect(second.getByTestId("towl-root")).toHaveCount(0);
    expect(await second.evaluate((key) => localStorage.getItem(key), credentialKey)).toBeNull();
  } finally {
    await firstContext.close();
    await secondContext.close();
  }
});
