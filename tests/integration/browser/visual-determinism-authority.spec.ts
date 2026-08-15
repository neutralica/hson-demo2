import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test } from "./livehost-browser-test";
import { register_browser_raster_fidelity_tests } from "./browser-raster-fidelity";
import { monitor_application_errors, reach_demo } from "./app-test-support";

const source = (relative: string): string => readFileSync(
  fileURLToPath(new URL(`../../../${relative}`, import.meta.url)),
  "utf8",
);

test("Fleurs seed owns its complete semantic and LiveTree SVG result", async ({ page }) => {
  const fleursSource = [
    "src/app/demos/fleurs/fleurs.ts",
    "src/app/demos/fleurs/fleurs-cols.ts",
    "src/app/demos/fleurs/fleurs.consts.ts",
    "src/app/demos/fleurs/fleurs-helpers.ts",
    "src/app/demos/fleurs/fleurs-rng.ts",
    "src/app/demos/fleurs/render-fleurs.ts",
  ].map(source).join("\n");
  expect(fleursSource).not.toContain("Math.random");
  expect(fleursSource).not.toContain("tests/");
  expect(fleursSource).not.toMatch(/console\.(?:log|debug|info)\s*\(/);

  await reach_demo(page);
  const witness = await page.evaluate(async () => {
    const bootUrl = "/src/app/boot.ts";
    const fleursUrl = "/src/app/demos/fleurs/fleurs.ts";
    const [{ boot_livetree }, { makeFlowerSpec, renderFlower }] = await Promise.all([
      import(/* @vite-ignore */ bootUrl),
      import(/* @vite-ignore */ fleursUrl),
    ]);
    const field = boot_livetree().find.byId("fleurs-field");
    if (!field) throw new Error("missing Fleurs field");

    const firstSpec = makeFlowerSpec(12_345, 40, 50);
    const repeatSpec = makeFlowerSpec(12_345, 40, 50);
    const variedSpec = makeFlowerSpec(12_346, 40, 50);
    const renderSpec = { ...firstSpec, bitmap: false };

    const semanticMarkup = (markup: string): string => markup.replace(/\s+hson:quid="[^"]+"/g, "");
    const first = await renderFlower(field, renderSpec);
    const firstMarkup = semanticMarkup(first.content.markup.outerHTML);
    first.remove();
    const repeat = await renderFlower(field, { ...repeatSpec, bitmap: false });
    const repeatMarkup = semanticMarkup(repeat.content.markup.outerHTML);
    repeat.remove();
    const varied = await renderFlower(field, { ...variedSpec, bitmap: false });
    const variedMarkup = semanticMarkup(varied.content.markup.outerHTML);
    varied.remove();
    const bitmap = await renderFlower(field, firstSpec);
    const bitmapImage = bitmap.content.markup.outerHTML.includes("<image");
    field.empty();

    return {
      sameSpec: JSON.stringify(firstSpec) === JSON.stringify(repeatSpec),
      variedSpec: JSON.stringify(firstSpec) !== JSON.stringify(variedSpec),
      sameMarkup: firstMarkup === repeatMarkup,
      variedMarkup: firstMarkup !== variedMarkup,
      bitmapImage,
      retainedFlowers: field.content.all().length,
    };
  });

  expect(witness).toEqual({
    sameSpec: true,
    variedSpec: true,
    sameMarkup: true,
    variedMarkup: true,
    bitmapImage: true,
    retainedFlowers: 0,
  });
});

test("Deck animates retained LiveTree text handles and cancels interrupted work", async ({ page }) => {
  const helpers = source("src/app/demos/deck/deck-helpers.ts");
  expect(helpers).not.toContain("createTreeWalker");
  expect(helpers).not.toContain("textContent");
  expect(helpers).not.toContain(".dom.");

  const assertNoErrors = monitor_application_errors(page);
  await reach_demo(page);
  await page.evaluate(async () => {
    const bootUrl = "/src/app/boot.ts";
    const deckUrl = "/src/app/demos/deck/mount-deck.ts";
    const [{ boot_livetree }, { mount_deck }] = await Promise.all([
      import(/* @vite-ignore */ bootUrl),
      import(/* @vite-ignore */ deckUrl),
    ]);
    const stage = boot_livetree().find.byId("stage");
    if (!stage) throw new Error("missing stage");
    const host = stage.create.div().attrs.set("data-testid", "phase2b-deck-host");
    const nativeWalker = document.createTreeWalker.bind(document);
    document.createTreeWalker = () => {
      throw new Error("Deck attempted native tree walking");
    };
    const deck = mount_deck(host, [{
      bodyA: { kind: "code", lang: "ts", text: "const answer: number = 42; // retained" },
    }]);
    deck.open();
    Object.defineProperty(window, "__phase2bDeck", {
      configurable: true,
      value: { deck, host, nativeWalker },
    });
  });

  const host = page.getByTestId("phase2b-deck-host");
  await expect(host.locator(".text.row")).toContainText("const answer: number = 42;// retained", { timeout: 2_000 });
  await page.evaluate(() => {
    const probe = (window as unknown as {
      __phase2bDeck: {
        deck: { close(): void; open(): void; dispose(): void };
        nativeWalker: typeof document.createTreeWalker;
      };
    }).__phase2bDeck;
    probe.deck.close();
    probe.deck.open();
  });
  await page.waitForTimeout(260);
  await page.evaluate(() => {
    const probe = (window as unknown as {
      __phase2bDeck: {
        deck: { dispose(): void };
        nativeWalker: typeof document.createTreeWalker;
      };
    }).__phase2bDeck;
    probe.deck.dispose();
    document.createTreeWalker = probe.nativeWalker;
  });
  await expect(host.locator("#live-demo-deck")).toHaveCount(0);
  await page.waitForTimeout(1_050);
  await expect(host).toBeEmpty();
  await page.evaluate(() => {
    const probe = (window as unknown as {
      __phase2bDeck: { host: { remove(): void } };
    }).__phase2bDeck;
    probe.host.remove();
  });
  await expect(host).toHaveCount(0);
  assertNoErrors();
});

test("Fireworks projects flash and canvas presentation through LiveTree", async ({ page }) => {
  const fireworks = source("src/app/widgets/wasm-fireworks/wasm-fireworks.ts");
  expect(fireworks).not.toContain(".dom.el(");
  expect(fireworks).not.toMatch(/\.style\.[a-zA-Z]/);
  expect(fireworks).toContain("canvasLt.canvas.size.set(W, H)");
  expect(fireworks).toContain("flashLt.css.setMany");

  const assertNoErrors = monitor_application_errors(page);
  await reach_demo(page);
  const flash = page.locator("#wasm-fireworks-flash");
  const canvas = page.locator("#wasm-fireworks");
  await expect(flash).toHaveCount(1);
  await expect(canvas).toHaveAttribute("width", String(await page.evaluate(() => window.innerWidth)));
  await expect(canvas).toHaveAttribute("height", String(await page.evaluate(() => window.innerHeight)));
  await page.evaluate(() => {
    const target = document.querySelector<HTMLElement>("#wasm-fireworks-flash");
    if (!target) throw new Error("missing Fireworks flash");
    const opacityValues: string[] = [];
    let active = true;
    const sample = (): void => {
      if (!active) return;
      opacityValues.push(getComputedStyle(target).opacity);
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
    Object.defineProperty(window, "__phase2bFlash", {
      value: { opacityValues, stop: () => { active = false; } },
    });
  });
  await page.keyboard.press("z");
  await page.waitForTimeout(250);
  const projected = await page.evaluate(() => {
    const probe = (window as unknown as {
      __phase2bFlash: { opacityValues: string[]; stop(): void };
    }).__phase2bFlash;
    probe.stop();
    return probe.opacityValues.some((value) => Number(value) > 0);
  });
  expect(projected).toBe(true);
  assertNoErrors();
});

register_browser_raster_fidelity_tests(test);
