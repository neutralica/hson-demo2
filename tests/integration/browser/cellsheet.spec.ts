import { expect, test, type Locator, type Page } from "@playwright/test";
import { monitor_application_errors, open_demo, reach_demo } from "./app-test-support";

async function open_cellsheet(page: Page): Promise<Locator> {
  await reach_demo(page);
  await open_demo(page, "cells");
  const panel = page.locator("#cellsheet-panel");
  await expect(panel).toBeVisible();
  await panel.getByRole("button", { name: "reset grid" }).click();
  await expect(panel).toContainText("0 authored / 0 operators / 0 results / 0 errors");
  return panel;
}

function cell(panel: Locator, key: string): Locator {
  return panel.locator(`input[data-cellsheet-key="${key}"]`);
}

async function fill_cells(panel: Locator, values: Readonly<Record<string, string>>): Promise<void> {
  for (const [key, value] of Object.entries(values)) await cell(panel, key).fill(value);
}

test("Cellsheet preserves authored spelling while interpreting trimmed numeric and operator input", async ({ page }) => {
  const assertNoErrors = monitor_application_errors(page);
  const panel = await open_cellsheet(page);

  await cell(panel, "A1").fill(" 001.50 ");
  await expect(cell(panel, "A1")).toHaveValue(" 001.50 ");
  await expect(cell(panel, "A1")).toHaveAttribute("data-cellsheet-cell", "number");

  await cell(panel, "B1").fill(" + ");
  await expect(cell(panel, "B1")).toHaveValue(" + ");
  await expect(cell(panel, "B1")).toHaveAttribute("data-cellsheet-cell", "operator");

  await cell(panel, "C1").fill("1e2");
  await expect(cell(panel, "C1")).toHaveAttribute("data-cellsheet-cell", "number");
  await expect(cell(panel, "D1")).toHaveValue("101.5");

  await cell(panel, "A2").fill("Infinity");
  await expect(cell(panel, "A2")).toHaveAttribute("data-cellsheet-cell", "text");
  await cell(panel, "A3").fill("   ");
  await expect(cell(panel, "A3")).toHaveValue("");
  await expect(cell(panel, "A3")).toHaveAttribute("data-cellsheet-cell", "blank");
  assertNoErrors();
});

test("Cellsheet performs horizontal numeric arithmetic", async ({ page }) => {
  const panel = await open_cellsheet(page);
  const cases = [
    { op: "+", expected: "10" },
    { op: "-", expected: "6" },
    { op: "*", expected: "16" },
    { op: "/", expected: "4" },
  ] as const;

  for (const current of cases) {
    await panel.getByRole("button", { name: "reset grid" }).click();
    await fill_cells(panel, { A1: "8", B1: current.op, C1: "2" });
    await expect(cell(panel, "D1")).toHaveValue(current.expected);
    await expect(panel).toContainText("3 authored / 1 operators / 1 results / 0 errors");
  }
});

test("Cellsheet plus concatenates every available non-all-numeric value pair", async ({ page }) => {
  const panel = await open_cellsheet(page);
  const cases = [
    { left: "2", right: "shell", expected: "2shell" },
    { left: "egg", right: "2", expected: "egg2" },
    { left: "egg", right: "shell", expected: "eggshell" },
  ] as const;

  for (const current of cases) {
    await panel.getByRole("button", { name: "reset grid" }).click();
    await fill_cells(panel, { A1: current.left, B1: "+", C1: current.right });
    await expect(cell(panel, "D1")).toHaveValue(current.expected);
  }
});

test("Cellsheet discovers vertical operations and both directions independently", async ({ page }) => {
  const panel = await open_cellsheet(page);
  await fill_cells(panel, {
    A1: "3",
    B1: "4",
    A2: "5",
    B2: "+",
    C2: "6",
    B3: "2",
  });

  await expect(cell(panel, "D2")).toHaveValue("11");
  await expect(cell(panel, "B4")).toHaveValue("6");
  await expect(panel).toContainText("6 authored / 2 operators / 2 results / 0 errors");
});

test("Cellsheet omits boundary, missing-operand, and nonnumeric arithmetic operations without errors", async ({ page }) => {
  const panel = await open_cellsheet(page);
  await fill_cells(panel, {
    A1: "+",
    B2: "egg",
    C2: "-",
    D2: "shell",
    B3: "egg",
    C3: "*",
    D3: "shell",
    B4: "egg",
    C4: "/",
    D4: "shell",
  });

  await expect(panel).toContainText("10 authored / 0 operators / 0 results / 0 errors");
  await expect(cell(panel, "E2")).toHaveValue("");
  await expect(cell(panel, "E3")).toHaveValue("");
  await expect(cell(panel, "E4")).toHaveValue("");
});

test("Cellsheet division by zero errors only the operator and leaves the target blank", async ({ page }) => {
  const panel = await open_cellsheet(page);
  await fill_cells(panel, { A1: "8", B1: "/", C1: "0" });

  await expect(cell(panel, "B1")).toHaveAttribute("data-cellsheet-cell", "error");
  await expect(cell(panel, "D1")).toHaveValue("");
  await expect(cell(panel, "D1")).toHaveAttribute("data-cellsheet-cell", "blank");
  await expect(panel).toContainText("3 authored / 1 operators / 0 results / 1 errors");

  await cell(panel, "B1").focus();
  await expect(panel).toContainText("A1 / C1 ! D1=division by zero");
  await expect(cell(panel, "D1")).toHaveAttribute("data-cellsheet-relation", "target");
});

test("Cellsheet occupied targets remain authored and are marked blocked", async ({ page }) => {
  const panel = await open_cellsheet(page);
  await fill_cells(panel, { A1: "1", B1: "+", C1: "2", D1: "9" });

  await expect(cell(panel, "D1")).toHaveValue("9");
  await expect(cell(panel, "B1")).toHaveAttribute("data-cellsheet-cell", "error");
  await expect(cell(panel, "D1")).toHaveAttribute("data-cellsheet-cell", "error");
  await expect(panel).toContainText("4 authored / 1 operators / 0 results / 2 errors");

  await cell(panel, "B1").focus();
  await expect(cell(panel, "D1")).toHaveAttribute("data-cellsheet-relation", "blocked");
  await expect(panel).toContainText("occupied result target for B1");
});

test("Cellsheet collision keeps the first row-major result and marks the later writer and target", async ({ page }) => {
  const panel = await open_cellsheet(page);
  await fill_cells(panel, {
    D1: "3",
    D2: "+",
    D3: "4",
    A4: "1",
    B4: "+",
    C4: "2",
  });

  await expect(cell(panel, "D4")).toHaveValue("7");
  await expect(cell(panel, "D2")).toHaveAttribute("data-cellsheet-cell", "operator");
  await expect(cell(panel, "B4")).toHaveAttribute("data-cellsheet-cell", "error");
  await expect(cell(panel, "D4")).toHaveAttribute("data-cellsheet-cell", "error");
  await expect(panel).toContainText("6 authored / 2 operators / 1 results / 2 errors");

  await cell(panel, "D4").focus();
  await expect(panel).toContainText("D1 + D3 → D4=7");
  await expect(panel).toContainText("A4 + C4 ! D4=result collision: D4 is already written by D2:v");
});

test("Cellsheet fixpoint resolves a producer scanned after its consumer", async ({ page }) => {
  const panel = await open_cellsheet(page);
  await fill_cells(panel, {
    D1: "4",
    D2: "+",
    A3: "1",
    B3: "+",
    C3: "2",
  });

  await expect(cell(panel, "D3")).toHaveValue("3");
  await expect(cell(panel, "D4")).toHaveValue("7");
  await expect(panel).toContainText("5 authored / 2 operators / 2 results / 0 errors");
});

test("Cellsheet does not propagate an occupied-target error into a downstream addition", async ({ page }) => {
  const panel = await open_cellsheet(page);
  await fill_cells(panel, {
    A1: "1",
    B1: "+",
    C1: "2",
    D1: "9",
    E1: "+",
    F1: "1",
  });

  await expect(cell(panel, "D1")).toHaveAttribute("data-cellsheet-cell", "error");
  await expect(cell(panel, "G1")).toHaveValue("10");
  await expect(cell(panel, "G1")).toHaveAttribute("data-cellsheet-cell", "result");
  await expect(panel).toContainText("6 authored / 2 operators / 1 results / 2 errors");
});

test("Cellsheet selection distinguishes no links, successful links, and multiple touching operations", async ({ page }) => {
  const panel = await open_cellsheet(page);
  await fill_cells(panel, {
    D1: "3",
    D2: "+",
    D3: "4",
    A4: "1",
    B4: "+",
    C4: "2",
    H8: "alone",
  });

  await cell(panel, "H8").focus();
  await expect(panel).toContainText("H8: no derived operation links.");

  await cell(panel, "D1").focus();
  await expect(cell(panel, "D1")).toHaveAttribute("data-cellsheet-relation", "selected");
  await expect(cell(panel, "D2")).toHaveAttribute("data-cellsheet-relation", "operator");
  await expect(cell(panel, "D3")).toHaveAttribute("data-cellsheet-relation", "operand");
  await expect(cell(panel, "D4")).toHaveAttribute("data-cellsheet-relation", "blocked");

  await cell(panel, "D4").focus();
  await expect(panel).toContainText("D1 + D3 → D4=7");
  await expect(panel).toContainText("A4 + C4 ! D4=result collision");
});

test("Cellsheet reset clears edits instead of restoring mount samples", async ({ page }) => {
  const panel = await open_cellsheet(page);
  await fill_cells(panel, { A1: "8", B1: "+", C1: "2", H8: "edited" });
  await expect(cell(panel, "D1")).toHaveValue("10");
  await cell(panel, "H8").focus();
  const grid = cell(panel, "A1").locator("..");
  const box = await cell(panel, "A1").boundingBox();
  if (!box) throw new Error("missing Cellsheet input bounds");
  await page.mouse.move(box.x + box.width - 1, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width + 20, box.y + box.height / 2);
  await page.mouse.up();
  await expect(grid).not.toHaveCSS(
    "grid-template-columns",
    "56px 56px 56px 56px 56px 56px 56px 56px",
  );

  await panel.getByRole("button", { name: "reset grid" }).click();
  await expect(cell(panel, "A1")).toHaveValue("");
  await expect(cell(panel, "D1")).toHaveValue("");
  await expect(cell(panel, "H8")).toHaveValue("");
  await expect(panel).toContainText("Select a cell to inspect its derived operation links.");
  await expect(panel).toContainText("0 authored / 0 operators / 0 results / 0 errors");
  await expect(grid).toHaveCSS(
    "grid-template-columns",
    "56px 56px 56px 56px 56px 56px 56px 56px",
  );
});

test("Cellsheet full remount restores samples, default layout, and no selection", async ({ page }) => {
  await reach_demo(page);
  await open_demo(page, "cells");
  let panel = page.locator("#cellsheet-panel");
  await panel.evaluate((node) => node.setAttribute("data-instance", "before-remount"));
  await cell(panel, "A1").fill("edited");
  await cell(panel, "H8").fill("selected");
  await cell(panel, "H8").focus();
  await expect(panel).toContainText("H8: no derived operation links.");

  await reach_demo(page);
  await open_demo(page, "cells");
  panel = page.locator("#cellsheet-panel");
  await expect(panel).not.toHaveAttribute("data-instance", "before-remount");
  await expect(cell(panel, "A1")).toHaveValue("1");
  await expect(cell(panel, "D1")).toHaveValue("3");
  await expect(cell(panel, "A3")).toHaveValue("egg");
  await expect(cell(panel, "D3")).toHaveValue("eggshell");
  await expect(cell(panel, "D8")).toHaveValue("4");
  await expect(panel).toContainText("Select a cell to inspect its derived operation links.");
  await expect(cell(panel, "A1").locator("..")).toHaveCSS(
    "grid-template-columns",
    "56px 56px 56px 56px 56px 56px 56px 56px",
  );
});
