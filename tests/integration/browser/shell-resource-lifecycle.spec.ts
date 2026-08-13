import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";
import { OKLCH_COLOR_TARGETS } from "../../../src/app/demos/oklch/link-colors";
import { monitor_application_errors, open_demo, reach_demo } from "./app-test-support";

type ResourceMetrics = Readonly<{
  listeners: Record<string, number>;
  frames: readonly string[];
}>;

async function install_resource_metrics(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const listenerSets = new Map<string, Set<EventListenerOrEventListenerObject>>();
    const pendingFrames = new Map<number, string>();
    const nativeAdd = EventTarget.prototype.addEventListener;
    const nativeRemove = EventTarget.prototype.removeEventListener;
    const nativeRequest = window.requestAnimationFrame.bind(window);
    const nativeCancel = window.cancelAnimationFrame.bind(window);

    const listenerKey = (target: EventTarget, type: string): string | undefined => {
      if (target === window) return `window:${type}`;
      if (target === document) return `document:${type}`;
      return undefined;
    };

    EventTarget.prototype.addEventListener = function trackedAdd(
      type: string,
      listener: EventListenerOrEventListenerObject | null,
      options?: boolean | AddEventListenerOptions,
    ): void {
      const key = listenerKey(this, type);
      if (key && listener) {
        const listeners = listenerSets.get(key) ?? new Set<EventListenerOrEventListenerObject>();
        listeners.add(listener);
        listenerSets.set(key, listeners);
      }
      nativeAdd.call(this, type, listener, options);
    };

    EventTarget.prototype.removeEventListener = function trackedRemove(
      type: string,
      listener: EventListenerOrEventListenerObject | null,
      options?: boolean | EventListenerOptions,
    ): void {
      const key = listenerKey(this, type);
      if (key && listener) listenerSets.get(key)?.delete(listener);
      nativeRemove.call(this, type, listener, options);
    };

    window.requestAnimationFrame = (callback: FrameRequestCallback): number => {
      let id = 0;
      id = nativeRequest((time) => {
        pendingFrames.delete(id);
        callback(time);
      });
      pendingFrames.set(id, String(callback));
      return id;
    };

    window.cancelAnimationFrame = (id: number): void => {
      pendingFrames.delete(id);
      nativeCancel(id);
    };

    Object.defineProperty(window, "__phase1cResources", {
      value: {
        snapshot: (): ResourceMetrics => ({
          listeners: Object.fromEntries(
            [...listenerSets].map(([key, listeners]) => [key, listeners.size]),
          ),
          frames: [...pendingFrames.values()],
        }),
      },
    });
  });
}

async function resource_metrics(page: Page): Promise<ResourceMetrics> {
  return page.evaluate(() => (
    window as unknown as { __phase1cResources: { snapshot(): ResourceMetrics } }
  ).__phase1cResources.snapshot());
}

function listener_count(metrics: ResourceMetrics, key: string): number {
  return metrics.listeners[key] ?? 0;
}

test("Bar-Bar and Pointer cancel owned loops and ambient listeners before recreation", async ({ page }) => {
  await install_resource_metrics(page);
  await reach_demo(page);
  const baseline = await resource_metrics(page);

  await open_demo(page, "bar-bar");
  await expect(page.locator('[data-shell-main-surface="bar-bar"]')).toBeVisible();
  await page.waitForTimeout(60);
  const barActive = await resource_metrics(page);
  expect(listener_count(barActive, "window:keydown")).toBe(listener_count(baseline, "window:keydown") + 1);
  expect(listener_count(barActive, "window:keyup")).toBe(listener_count(baseline, "window:keyup") + 1);
  expect(barActive.frames.some((source) => source.includes("draw(ctx, s)"))).toBe(true);
  await page.locator('[data-shell-main-surface="bar-bar"]').evaluate((node) => node.setAttribute("data-instance", "old"));

  await open_demo(page, "bar-bar");
  await expect(page.locator('[data-shell-main-surface="bar-bar"]')).toHaveCount(0);
  await page.waitForTimeout(60);
  const barDisposed = await resource_metrics(page);
  expect(listener_count(barDisposed, "window:keydown")).toBe(listener_count(baseline, "window:keydown"));
  expect(listener_count(barDisposed, "window:keyup")).toBe(listener_count(baseline, "window:keyup"));
  expect(barDisposed.frames.some((source) => source.includes("draw(ctx, s)"))).toBe(false);

  await open_demo(page, "bar-bar");
  await expect(page.locator('[data-shell-main-surface="bar-bar"]')).not.toHaveAttribute("data-instance", "old");
  await open_demo(page, "bar-bar");

  await open_demo(page, "point");
  await expect(page.locator("#mouse-host")).toBeVisible();
  await page.waitForTimeout(60);
  const pointActive = await resource_metrics(page);
  expect(listener_count(pointActive, "window:pointermove")).toBe(listener_count(baseline, "window:pointermove") + 1);
  expect(pointActive.frames.some((source) => source.includes("render_stack()"))).toBe(true);
  await page.locator("#mouse-host").evaluate((node) => node.setAttribute("data-instance", "old"));

  await open_demo(page, "point");
  await expect(page.locator("#mouse-host")).toHaveCount(0);
  await page.waitForTimeout(60);
  const pointDisposed = await resource_metrics(page);
  expect(listener_count(pointDisposed, "window:pointermove")).toBe(listener_count(baseline, "window:pointermove"));
  expect(pointDisposed.frames.some((source) => source.includes("render_stack()"))).toBe(false);

  await open_demo(page, "point");
  await expect(page.locator("#mouse-host")).not.toHaveAttribute("data-instance", "old");
});

test("OKLCH reverts instance-owned CSS projection and recreates cleanly", async ({ page }) => {
  await reach_demo(page);
  const target = OKLCH_COLOR_TARGETS[0];
  const secondTarget = OKLCH_COLOR_TARGETS[1];
  if (!target || !secondTarget) throw new Error("expected at least two OKLCH targets");

  await open_demo(page, "oklch");
  const lightness = page.locator(".oklch-row-l input");
  await expect(lightness).toBeVisible();
  await lightness.evaluate((input) => {
    const range = input as HTMLInputElement;
    range.value = "42";
    range.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await expect.poll(() => page.evaluate((varName) => (
      getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
    ), target.varName))
    .toContain("42%");

  await page.locator(".oklch-demo-target-row").nth(1).click();
  await lightness.evaluate((input) => {
    const range = input as HTMLInputElement;
    range.value = "55";
    range.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await expect.poll(() => page.evaluate((varName) => (
      getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
    ), secondTarget.varName))
    .toContain("55%");
  await page.locator(".oklch-demo-target-row").first().click();
  await expect(lightness).toHaveValue("42");
  await page.locator(".oklch-demo-target-row").nth(1).click();
  await expect(lightness).toHaveValue("55");

  await open_demo(page, "oklch");
  await expect(page.locator("#oklch")).toHaveCount(0);
  await expect.poll(() => page.evaluate(({ varName, secondVarName, currentName }) => ({
      target: getComputedStyle(document.documentElement).getPropertyValue(varName).trim(),
      secondTarget: getComputedStyle(document.documentElement).getPropertyValue(secondVarName).trim(),
      current: getComputedStyle(document.documentElement).getPropertyValue(`--${currentName}`).trim(),
    }), { varName: target.varName, secondVarName: secondTarget.varName, currentName: "oklch-demo-current" }))
    .toEqual({ target: target.initial, secondTarget: secondTarget.initial, current: "" });

  await open_demo(page, "oklch");
  await expect(page.locator("#oklch")).toHaveCount(1);
  await expect(lightness).not.toHaveValue("42");
});

test("Amoeba emits one shell intent and projects shell selection without local canonical state", async ({ page }) => {
  await reach_demo(page);
  const source = readFileSync(fileURLToPath(new URL("../../../src/app/demos/amoeba/make-amoebi.ts", import.meta.url)), "utf8");
  const types = readFileSync(fileURLToPath(new URL("../../../src/app/demos/amoeba/amoebi.types.ts", import.meta.url)), "utf8");
  expect(source).not.toContain('["activeIds"]');
  expect(source).not.toContain('["selectedId"]');
  expect(types).not.toMatch(/^\s*(?:activeIds|selectedId):/m);

  const mutations = await page.evaluate(() => {
    const screen = document.querySelector("#screen");
    if (!screen) throw new Error("missing shell screen");
    const record = { count: 0 };
    const observer = new MutationObserver((entries) => {
      record.count += entries.filter((entry) => entry.attributeName === "data-shell-current-main").length;
    });
    observer.observe(screen, { attributes: true });
    Object.defineProperty(window, "__phase1cMainMutations", { value: { record, observer } });
    return record.count;
  });
  expect(mutations).toBe(0);

  await open_demo(page, "about");
  await expect(page.locator("#screen")).toHaveAttribute("data-shell-current-main", "about");
  const aboutPath = page.locator('[data-amoeba-id="about"]');
  await page.mouse.move(1200, 700);
  await expect(aboutPath).toHaveCSS("fill", "rgba(0, 0, 0, 0)");
  const commitCount = await page.evaluate(() => {
    const probe = (window as unknown as {
      __phase1cMainMutations: { record: { count: number }; observer: MutationObserver };
    }).__phase1cMainMutations;
    probe.observer.disconnect();
    return probe.record.count;
  });
  expect(commitCount).toBe(1);

  await page.keyboard.press("0");
  await expect(page.locator("#screen")).toHaveAttribute("data-shell-current-main", "color-sudoku");
  await expect(aboutPath).not.toHaveCSS("fill", "rgba(0, 0, 0, 0)");
});

test("Cellsheet deactivation cancels an active resize while retaining authored state", async ({ page }) => {
  await reach_demo(page);
  await open_demo(page, "cells");
  const panel = page.locator("#cellsheet-panel");
  const input = panel.locator('input[data-cellsheet-key="A1"]');
  await panel.evaluate((node) => node.setAttribute("data-instance", "retained"));
  const box = await input.boundingBox();
  if (!box) throw new Error("missing Cellsheet input bounds");

  await page.mouse.move(box.x + box.width - 1, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width + 20, box.y + box.height / 2);
  await expect.poll(() => page.evaluate(() => document.body.style.cursor)).toBe("col-resize");

  await open_demo(page, "about");
  await expect(panel).not.toBeVisible();
  await expect.poll(() => page.evaluate(() => document.body.style.cursor)).not.toBe("col-resize");
  const grid = input.locator("..");
  const dimensions = await grid.evaluate((node) => (
    getComputedStyle(node).gridTemplateColumns
  ));
  await page.mouse.move(box.x + box.width + 80, box.y + box.height / 2);
  await page.mouse.up();

  await open_demo(page, "cells");
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute("data-instance", "retained");
  await expect(grid).toHaveCSS("grid-template-columns", dimensions);
});

test("shell replacement cancels Deck and Amoeba scheduled work and leaves one Fireworks controller", async ({ page }) => {
  await page.addInitScript(() => {
    const nativeFetch = window.fetch.bind(window);
    const pending: Array<{
      input: RequestInfo | URL;
      init: RequestInit | undefined;
      resolve: (response: Response) => void;
      reject: (reason: unknown) => void;
      settled: boolean;
    }> = [];

    window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      if (!String(input).includes("hson-fireworks.wasm")) return nativeFetch(input, init);
      return new Promise((resolve, reject) => {
        const entry = { input, init, resolve, reject, settled: false };
        pending.push(entry);
        const abort = (): void => {
          if (entry.settled) return;
          entry.settled = true;
          reject(new DOMException("Firework mount cancelled.", "AbortError"));
        };
        if (init?.signal?.aborted) abort();
        else init?.signal?.addEventListener("abort", abort, { once: true });
      });
    };

    Object.defineProperty(window, "__phase1cReleaseWasm", {
      value: async () => {
        for (const entry of pending) {
          if (entry.settled) continue;
          entry.settled = true;
          try {
            entry.resolve(await nativeFetch(entry.input, entry.init));
          } catch (error) {
            entry.reject(error);
          }
        }
      },
    });
  });
  const assertNoErrors = monitor_application_errors(page);
  await reach_demo(page);
  await expect(page.locator("#wasm-fireworks")).toHaveCount(0);
  await page.keyboard.press("~");
  const aboutTarget = page.locator('[data-amoebi-hit-target="about"]');
  await aboutTarget.dispatchEvent("pointerenter");
  await aboutTarget.dispatchEvent("pointerleave");

  await page.evaluate(async () => {
    const bootUrl = "/src/app/boot.ts";
    const demoUrl = "/src/app/phases/phase-3-demo/mount-demo.ts";
    const [{ boot_livetree }, { mount_demo }] = await Promise.all([
      import(/* @vite-ignore */ bootUrl),
      import(/* @vite-ignore */ demoUrl),
    ]);
    const body = boot_livetree();
    const stage = body.find.byId("stage");
    if (!stage) throw new Error("missing stage LiveTree");
    await mount_demo(stage);
  });

  await page.evaluate(() => (
    window as unknown as { __phase1cReleaseWasm(): Promise<void> }
  ).__phase1cReleaseWasm());

  await page.waitForTimeout(400);
  await expect(page.locator("#live-demo-deck")).toHaveCount(1);
  await expect(page.locator("#amoebi-menu-demo")).toHaveCount(1);
  await expect(page.locator("#wasm-fireworks")).toHaveCount(1);
  assertNoErrors();
});
