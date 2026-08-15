import { expect, test, type Locator, type Page } from "./livehost-browser-test";
import { monitor_application_errors, open_demo, reach_demo } from "./app-test-support";

type ResizeEdge = "left" | "right" | "top" | "bottom";

type GridDimensions = Readonly<{
  columns: readonly number[];
  rows: readonly number[];
}>;

async function open_cellsheet(page: Page): Promise<Locator> {
  await reach_demo(page);
  await open_demo(page, "cells");
  const panel = page.locator("#cellsheet-panel");
  await expect(panel).toBeVisible();
  await panel.getByRole("button", { name: "reset grid" }).click();
  return panel;
}

function cell(panel: Locator, key: string): Locator {
  return panel.locator(`input[data-cellsheet-key="${key}"]`);
}

function grid(panel: Locator): Locator {
  return cell(panel, "A1").locator("..");
}

async function edge_point(target: Locator, edge: ResizeEdge, inset = 1): Promise<{ x: number; y: number }> {
  await target.scrollIntoViewIfNeeded();
  const box = await target.boundingBox();
  if (!box) throw new Error("missing Cellsheet input bounds");
  if (edge === "left") return { x: box.x + inset, y: box.y + box.height / 2 };
  if (edge === "right") return { x: box.x + box.width - inset, y: box.y + box.height / 2 };
  if (edge === "top") return { x: box.x + box.width / 2, y: box.y + inset };
  return { x: box.x + box.width / 2, y: box.y + box.height - inset };
}

async function drag_edge(
  page: Page,
  target: Locator,
  edge: ResizeEdge,
  delta: Readonly<{ x: number; y: number }>,
  shift = false,
): Promise<void> {
  const start = await edge_point(target, edge);
  if (shift) await page.keyboard.down("Shift");
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + delta.x, start.y + delta.y);
  await page.mouse.up();
  if (shift) await page.keyboard.up("Shift");
}

async function read_dimensions(panel: Locator): Promise<GridDimensions> {
  return grid(panel).evaluate((node) => {
    const style = getComputedStyle(node);
    const values = (raw: string): number[] => raw.split(" ").map((part) => Number.parseFloat(part));
    return {
      columns: values(style.gridTemplateColumns),
      rows: values(style.gridTemplateRows),
    };
  });
}

async function install_resize_authority_probe(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const nativeAdd = EventTarget.prototype.addEventListener;
    const nativeCapture = Element.prototype.setPointerCapture;
    const nativeRelease = Element.prototype.releasePointerCapture;
    const documentPointerAdds: Record<string, number> = {};
    const captures: Array<{ key: string | null; pointerId: number }> = [];
    const releases: Array<{ key: string | null; pointerId: number }> = [];

    EventTarget.prototype.addEventListener = function trackedAdd(
      type: string,
      listener: EventListenerOrEventListenerObject | null,
      options?: boolean | AddEventListenerOptions,
    ): void {
      if (this === document && ["pointermove", "pointerup", "pointercancel"].includes(type)) {
        documentPointerAdds[type] = (documentPointerAdds[type] ?? 0) + 1;
      }
      nativeAdd.call(this, type, listener, options);
    };

    Element.prototype.setPointerCapture = function trackedCapture(pointerId: number): void {
      captures.push({ key: this.getAttribute("data-cellsheet-key"), pointerId });
      nativeCapture.call(this, pointerId);
    };
    Element.prototype.releasePointerCapture = function trackedRelease(pointerId: number): void {
      releases.push({ key: this.getAttribute("data-cellsheet-key"), pointerId });
      nativeRelease.call(this, pointerId);
    };

    Object.defineProperty(window, "__cellsheetResizeProbe", {
      value: { documentPointerAdds, captures, releases },
    });
  });
}

test("Cellsheet detects every resize edge, preserves corner priority, and ignores the cell interior", async ({ page }) => {
  const panel = await open_cellsheet(page);
  const reset = panel.getByRole("button", { name: "reset grid" });

  await drag_edge(page, cell(panel, "A1"), "right", { x: 12, y: 0 });
  expect((await read_dimensions(panel)).columns[0]).toBe(68);
  await reset.click();

  await drag_edge(page, cell(panel, "B1"), "left", { x: 12, y: 0 });
  expect((await read_dimensions(panel)).columns[0]).toBe(68);
  await reset.click();

  await drag_edge(page, cell(panel, "A1"), "bottom", { x: 0, y: 12 });
  expect((await read_dimensions(panel)).rows[0]).toBe(46);
  await reset.click();

  await drag_edge(page, cell(panel, "A2"), "top", { x: 0, y: 12 });
  expect((await read_dimensions(panel)).rows[0]).toBe(46);
  await reset.click();

  const interior = await cell(panel, "A1").boundingBox();
  if (!interior) throw new Error("missing Cellsheet input bounds");
  await page.mouse.move(interior.x + interior.width / 2, interior.y + interior.height / 2);
  await page.mouse.down();
  await page.mouse.move(interior.x + interior.width / 2 + 20, interior.y + interior.height / 2 + 12);
  await page.mouse.up();
  expect(await read_dimensions(panel)).toEqual({
    columns: [56, 56, 56, 56, 56, 56, 56, 56],
    rows: [34, 34, 34, 34, 34, 34, 34, 34],
  });

  const corner = await cell(panel, "B2").boundingBox();
  if (!corner) throw new Error("missing Cellsheet input bounds");
  await page.mouse.move(corner.x + 1, corner.y + 1);
  await expect(cell(panel, "B2")).toHaveCSS("cursor", "col-resize");
});

test("Cellsheet ordinary column resize clamps at 34px and 140px and shifts following geometry", async ({ page }) => {
  const panel = await open_cellsheet(page);
  const a1 = cell(panel, "A1");
  const b1 = cell(panel, "B1");
  const beforeA = await a1.boundingBox();
  const beforeB = await b1.boundingBox();
  if (!beforeA || !beforeB) throw new Error("missing Cellsheet column bounds");

  await drag_edge(page, a1, "right", { x: 20, y: 0 });
  let dimensions = await read_dimensions(panel);
  expect(dimensions.columns.slice(0, 2)).toEqual([76, 56]);
  const grownB = await b1.boundingBox();
  const grownA = await a1.boundingBox();
  if (!grownA || !grownB) throw new Error("missing shifted Cellsheet column bounds");
  expect((grownB.x - grownA.x) - (beforeB.x - beforeA.x)).toBeCloseTo(20, 5);

  await panel.getByRole("button", { name: "reset grid" }).click();
  await drag_edge(page, a1, "right", { x: -80, y: 0 });
  dimensions = await read_dimensions(panel);
  expect(dimensions.columns[0]).toBe(34);

  await panel.getByRole("button", { name: "reset grid" }).click();
  await drag_edge(page, a1, "right", { x: 200, y: 0 });
  dimensions = await read_dimensions(panel);
  expect(dimensions.columns[0]).toBe(140);
  expect((await a1.boundingBox())?.width).toBeCloseTo(140, 5);
  expect(beforeA.width).toBeCloseTo(56, 5);
});

test("Cellsheet ordinary row resize clamps at 26px and 96px and shifts following geometry", async ({ page }) => {
  const panel = await open_cellsheet(page);
  const a1 = cell(panel, "A1");
  const a2 = cell(panel, "A2");
  const beforeA2 = await a2.boundingBox();
  const beforeA1 = await a1.boundingBox();
  if (!beforeA1 || !beforeA2) throw new Error("missing Cellsheet row bounds");

  await drag_edge(page, a1, "bottom", { x: 0, y: 18 });
  let dimensions = await read_dimensions(panel);
  expect(dimensions.rows.slice(0, 2)).toEqual([52, 34]);
  const grownA2 = await a2.boundingBox();
  const grownA1 = await a1.boundingBox();
  if (!grownA1 || !grownA2) throw new Error("missing shifted Cellsheet row bounds");
  expect((grownA2.y - grownA1.y) - (beforeA2.y - beforeA1.y)).toBeCloseTo(18, 5);

  await panel.getByRole("button", { name: "reset grid" }).click();
  await drag_edge(page, a1, "bottom", { x: 0, y: -80 });
  dimensions = await read_dimensions(panel);
  expect(dimensions.rows[0]).toBe(26);

  await panel.getByRole("button", { name: "reset grid" }).click();
  await drag_edge(page, a1, "bottom", { x: 0, y: 200 });
  dimensions = await read_dimensions(panel);
  expect(dimensions.rows[0]).toBe(96);
});

test("Cellsheet Shift resize preserves the pair total, enforces pair minimums, and preserves its max bypass", async ({ page }) => {
  const panel = await open_cellsheet(page);
  const a1 = cell(panel, "A1");
  const reset = panel.getByRole("button", { name: "reset grid" });

  await drag_edge(page, a1, "right", { x: 18, y: 0 }, true);
  let dimensions = await read_dimensions(panel);
  expect(dimensions.columns.slice(0, 2)).toEqual([74, 38]);
  expect(dimensions.columns[0]! + dimensions.columns[1]!).toBe(112);

  await reset.click();
  await drag_edge(page, a1, "bottom", { x: 0, y: 6 }, true);
  dimensions = await read_dimensions(panel);
  expect(dimensions.rows.slice(0, 2)).toEqual([40, 28]);
  expect(dimensions.rows[0]! + dimensions.rows[1]!).toBe(68);

  await reset.click();
  await drag_edge(page, a1, "right", { x: -80, y: 0 }, true);
  dimensions = await read_dimensions(panel);
  expect(dimensions.columns.slice(0, 2)).toEqual([34, 78]);

  await reset.click();
  await drag_edge(page, a1, "right", { x: 200, y: 0 });
  await drag_edge(page, a1, "right", { x: 200, y: 0 }, true);
  dimensions = await read_dimensions(panel);
  expect(dimensions.columns.slice(0, 2)).toEqual([162, 34]);
  expect(dimensions.columns[0]).toBeGreaterThan(140);
});

test("Cellsheet Shift resize samples Shift at pointerdown and falls back to ordinary resize without a neighbor", async ({ page }) => {
  const panel = await open_cellsheet(page);
  const a1 = cell(panel, "A1");
  const reset = panel.getByRole("button", { name: "reset grid" });
  let start = await edge_point(a1, "right");

  await page.keyboard.down("Shift");
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.keyboard.up("Shift");
  await page.mouse.move(start.x + 10, start.y);
  await page.mouse.up();
  expect((await read_dimensions(panel)).columns.slice(0, 2)).toEqual([66, 46]);

  await reset.click();
  start = await edge_point(a1, "right");
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.keyboard.down("Shift");
  await page.mouse.move(start.x + 10, start.y);
  await page.keyboard.up("Shift");
  await page.mouse.up();
  expect((await read_dimensions(panel)).columns.slice(0, 2)).toEqual([66, 56]);

  await reset.click();
  await drag_edge(page, cell(panel, "H1"), "right", { x: 200, y: 0 }, true);
  expect((await read_dimensions(panel)).columns[7]).toBe(140);
});

test("Cellsheet hover feedback uses the seven-pixel edge threshold", async ({ page }) => {
  const panel = await open_cellsheet(page);
  const input = cell(panel, "A1");
  const box = await input.boundingBox();
  if (!box) throw new Error("missing Cellsheet input bounds");

  await page.mouse.move(box.x + box.width - 7, box.y + box.height / 2);
  await expect(input).toHaveCSS("cursor", "col-resize");
  await expect(input).not.toHaveCSS("box-shadow", "none");

  await page.mouse.move(box.x + box.width - 8, box.y + box.height / 2);
  await expect(input).toHaveCSS("cursor", "text");
  await expect(input).toHaveCSS("box-shadow", "none");
});

test("Cellsheet capture owns resize routing and LiveTree owns all transient presentation", async ({ page }) => {
  const assertNoErrors = monitor_application_errors(page);
  await install_resize_authority_probe(page);
  const panel = await open_cellsheet(page);
  const input = cell(panel, "A1");
  const start = await edge_point(input, "right");

  const styleMutations = await page.evaluate(() => {
    const record = { count: 0 };
    const panelNode = document.querySelector("#cellsheet-panel");
    const gridNode = document.querySelector('#cellsheet-panel input[data-cellsheet-key="A1"]')?.parentElement;
    const observer = new MutationObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === document.body) record.count += 1;
        if (entry.target === panelNode || entry.target === gridNode) record.count += 1;
        if (entry.target instanceof HTMLInputElement && entry.target.dataset.cellsheetKey) record.count += 1;
      }
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["style"],
      subtree: true,
    });
    Object.defineProperty(window, "__cellsheetStyleMutations", { value: { record, observer } });
    return record.count;
  });
  expect(styleMutations).toBe(0);

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  const capture = await page.evaluate(() => {
    const probe = (window as unknown as {
      __cellsheetResizeProbe: {
        captures: Array<{ key: string | null; pointerId: number }>;
      };
    }).__cellsheetResizeProbe;
    return probe.captures.at(-1);
  });
  expect(capture?.key).toBe("A1");
  expect(capture?.pointerId).toBeGreaterThan(0);
  await expect(input).toHaveCSS("cursor", "col-resize");
  await expect(input).not.toHaveCSS("box-shadow", "none");
  await expect(panel).toHaveCSS("user-select", "none");
  expect(await input.evaluate((node, pointerId) => node.hasPointerCapture(pointerId), capture!.pointerId)).toBe(true);

  await page.mouse.move(start.x + 15, start.y);
  expect((await read_dimensions(panel)).columns[0]).toBe(71);
  await page.mouse.up();

  await expect(input).toHaveCSS("cursor", "text");
  await expect(input).toHaveCSS("box-shadow", "none");
  await expect(panel).not.toHaveCSS("user-select", "none");
  expect(await input.evaluate((node, pointerId) => node.hasPointerCapture(pointerId), capture!.pointerId)).toBe(false);

  const authority = await page.evaluate(() => {
    const probe = (window as unknown as {
      __cellsheetResizeProbe: {
        documentPointerAdds: Record<string, number>;
        releases: Array<{ key: string | null; pointerId: number }>;
      };
      __cellsheetStyleMutations: { record: { count: number }; observer: MutationObserver };
    }).__cellsheetResizeProbe;
    const styles = (window as unknown as {
      __cellsheetStyleMutations: { record: { count: number }; observer: MutationObserver };
    }).__cellsheetStyleMutations;
    styles.observer.disconnect();
    return {
      documentPointerAdds: probe.documentPointerAdds,
      release: probe.releases.at(-1),
      rawStyleMutations: styles.record.count,
    };
  });
  expect(authority.documentPointerAdds).toEqual({});
  expect(authority.release).toEqual(capture);
  expect(authority.rawStyleMutations).toBe(0);
  assertNoErrors();
});

test("Cellsheet pointercancel releases capture, clears presentation, and makes later movement inert", async ({ page }) => {
  const panel = await open_cellsheet(page);
  const input = cell(panel, "A1");
  const start = await edge_point(input, "right");
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 12, start.y);
  const resized = await read_dimensions(panel);
  const pointerId = await input.evaluate((node) => {
    for (let candidate = 1; candidate < 16; candidate += 1) {
      if (node.hasPointerCapture(candidate)) return candidate;
    }
    return undefined;
  });
  expect(pointerId).toBeDefined();

  await input.dispatchEvent("pointercancel", { pointerId, bubbles: true });
  await expect(input).toHaveCSS("cursor", "text");
  await expect(input).toHaveCSS("box-shadow", "none");
  expect(await input.evaluate((node, id) => node.hasPointerCapture(id), pointerId!)).toBe(false);
  await page.mouse.move(start.x + 60, start.y);
  expect(await read_dimensions(panel)).toEqual(resized);
  await page.mouse.up();
});

test("Cellsheet dispose during capture releases the pointer and removes the retained panel", async ({ page }) => {
  const assertNoErrors = monitor_application_errors(page);
  await install_resize_authority_probe(page);
  const panel = await open_cellsheet(page);
  await panel.evaluate((node) => node.setAttribute("data-cellsheet-dispose-target", "true"));
  const disposedPanel = page.locator('[data-cellsheet-dispose-target="true"]');
  const input = cell(panel, "A1");
  const start = await edge_point(input, "right");
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 12, start.y);
  const capture = await page.evaluate(() => {
    return (window as unknown as {
      __cellsheetResizeProbe: { captures: Array<{ key: string | null; pointerId: number }> };
    }).__cellsheetResizeProbe.captures.at(-1);
  });
  expect(capture?.key).toBe("A1");

  await page.evaluate(() => {
    const importModule = (path: string): Promise<Record<string, unknown>> => import(/* @vite-ignore */ path);
    void Promise.all([
      importModule("/src/app/boot.ts"),
      importModule("/src/app/app.ts"),
    ]).then(([boot, app]) => {
      const bootLiveTree = boot.boot_livetree as () => unknown;
      const runApp = app.run_app as (root: unknown) => Promise<void>;
      void runApp(bootLiveTree());
    });
  });
  await expect(disposedPanel).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => {
    return (window as unknown as {
      __cellsheetResizeProbe: { releases: Array<{ key: string | null; pointerId: number }> };
    }).__cellsheetResizeProbe.releases.at(-1);
  })).toEqual(capture);
  await page.mouse.move(start.x + 80, start.y);
  await page.mouse.up();
  assertNoErrors();
});
