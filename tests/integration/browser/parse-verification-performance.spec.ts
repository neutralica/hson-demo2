import { expect, test, type Page } from "./livehost-browser-test";
import { open_demo, reach_demo } from "./app-test-support";

type PanelMeasurement = Readonly<{
  sourceLength: number;
  immediateParseMs: number;
  debounceToDispatchMs?: number;
  workerQueueWaitMs?: number;
  liveHostRoundTripMs?: number;
  workerDurationMs?: number;
  browserAdmissionAndComparisonMs?: number;
  totalEditToCertificateMs?: number;
}>;

function rounded(value: number | undefined): number | undefined {
  return value === undefined ? undefined : Math.round(value * 100) / 100;
}

async function measure_edit(
  page: Page,
  entry: "hson" | "json" | "html",
  source: string,
  terminal: "verified" | "invalid" = "verified",
): Promise<PanelMeasurement> {
  await page.evaluate(({ entry: currentEntry, source: currentSource }) => {
    const root = document.querySelector<HTMLElement>('[data-testid="parse-root"]');
    const editor = document.querySelector<HTMLTextAreaElement>(`[data-testid="parse-${currentEntry}-editor"]`);
    if (root === null || editor === null) throw new Error("Parsing panel measurement surface is unavailable.");
    const timeline: { status: string; at: number }[] = [];
    const began = performance.now();
    const observer = new MutationObserver(() => {
      const status = root.dataset.verificationStatus ?? "";
      if (timeline.at(-1)?.status !== status) timeline.push({ status, at: performance.now() });
    });
    observer.observe(root, { attributes: true, attributeFilter: ["data-verification-status"] });
    editor.value = currentSource;
    editor.dispatchEvent(new Event("input", { bubbles: true }));
    const immediateFinished = performance.now();
    Object.assign(window, { __phase3Measurement: { began, immediateFinished, timeline, observer } });
  }, { entry, source });
  const root = page.getByTestId("parse-root");
  await expect(root).toHaveAttribute("data-verification-status", terminal, { timeout: 20_000 });
  return page.evaluate((sourceLength): PanelMeasurement => {
    const root = document.querySelector<HTMLElement>('[data-testid="parse-root"]');
    const measurement = (window as Window & {
      __phase3Measurement: {
        began: number;
        immediateFinished: number;
        timeline: { status: string; at: number }[];
        observer: MutationObserver;
      };
    }).__phase3Measurement;
    measurement.observer.disconnect();
    const at = (status: string): number | undefined => measurement.timeline.find((item) => item.status === status)?.at;
    const queued = at("queued");
    const verifying = at("verifying");
    const browserCheck = at("browser-check");
    const verified = at("verified");
    const numberAttribute = (name: string): number | undefined => {
      const raw = root?.getAttribute(name);
      if (raw === null || raw === undefined) return undefined;
      const value = Number(raw);
      return Number.isFinite(value) ? value : undefined;
    };
    return {
      sourceLength,
      immediateParseMs: performance.now() >= measurement.immediateFinished
        ? measurement.immediateFinished - measurement.began
        : 0,
      ...(queued === undefined ? {} : { debounceToDispatchMs: queued - measurement.immediateFinished }),
      ...(queued === undefined || verifying === undefined ? {} : { workerQueueWaitMs: verifying - queued }),
      ...(queued === undefined || browserCheck === undefined ? {} : { liveHostRoundTripMs: browserCheck - queued }),
      ...(numberAttribute("data-worker-duration-ms") === undefined
        ? {}
        : { workerDurationMs: numberAttribute("data-worker-duration-ms") }),
      ...(numberAttribute("data-browser-check-duration-ms") === undefined
        ? {}
        : { browserAdmissionAndComparisonMs: numberAttribute("data-browser-check-duration-ms") }),
      ...(verified === undefined ? {} : { totalEditToCertificateMs: verified - measurement.began }),
    };
  }, source.length);
}

test("measure Phase 3 edit-to-certificate stages without imposing a budget", async ({ page }) => {
  await reach_demo(page);
  await open_demo(page, "parse");
  const ordinary = '<article id="ordinary" <h2 "Circuit certificate"/> <p data-kind="fixture" "ordinary panel content"/>/>';
  const largeItems: string[] = [];
  while (JSON.stringify({ items: largeItems }).length < 4_300) {
    largeItems.push(`phase-3-row-${largeItems.length.toString().padStart(3, "0")}`);
  }
  const large = JSON.stringify({ items: largeItems });
  const malformedNearEnd = `<main "${"x".repeat(4_300)}"`;
  const measurements = {
    tinyHson: await measure_edit(page, "hson", '<i "x"/>'),
    ordinaryHson: await measure_edit(page, "hson", ordinary),
    largeJson: await measure_edit(page, "json", large),
    malformedEarly: await measure_edit(page, "hson", "<", "invalid"),
    malformedNearEnd: await measure_edit(page, "hson", malformedNearEnd, "invalid"),
  };
  const roundedMeasurements = Object.fromEntries(Object.entries(measurements).map(([name, values]) => [
    name,
    Object.fromEntries(Object.entries(values).map(([field, value]) => [field, rounded(value)])),
  ]));
  console.log(`PHASE3_PERFORMANCE ${JSON.stringify(roundedMeasurements)}`);
  expect(measurements.largeJson.sourceLength).toBeGreaterThanOrEqual(4_000);
  expect(measurements.largeJson.sourceLength).toBeLessThanOrEqual(5_000);
  expect(measurements.tinyHson.totalEditToCertificateMs).toBeDefined();
  expect(measurements.malformedNearEnd.debounceToDispatchMs).toBeUndefined();
});
