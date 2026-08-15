import { test as base } from "@playwright/test";

export { expect } from "@playwright/test";
export type { Locator, Page } from "@playwright/test";

export const LIVEHOST_BROWSER_TIMING_PREFIX = "<LIVEHOST_BROWSER_TIMING>";

type BrowserJourneyClock = {
  startedAt: number;
  browserReadyAt: number;
  contextReadyAt: number;
  pageReadyAt: number;
};

export const test = base.extend<{
  browserJourneyClock: BrowserJourneyClock;
  browserTiming: void;
  browserEvidence: void;
}>({
  browserJourneyClock: [async ({}, use) => {
    await use({ startedAt: performance.now(), browserReadyAt: 0, contextReadyAt: 0, pageReadyAt: 0 });
  }, { auto: true }],
  browserTiming: [async ({ browser, browserJourneyClock }, use) => {
    void browser;
    browserJourneyClock.browserReadyAt = performance.now();
    await use();
  }, { auto: true }],
  browserEvidence: [async ({ context, browserJourneyClock, browserTiming }, use, testInfo) => {
    void browserTiming;
    browserJourneyClock.contextReadyAt = performance.now();
    const evidence: Readonly<Record<string, unknown>>[] = [];
    const observe = (page: import("@playwright/test").Page): void => {
      if (browserJourneyClock.pageReadyAt === 0) browserJourneyClock.pageReadyAt = performance.now();
      page.on("console", (message) => {
        if (message.type() !== "warning" && message.type() !== "error") return;
        evidence.push(Object.freeze({ kind: "console", level: message.type(), text: message.text(), url: page.url() }));
      });
      page.on("pageerror", (error) => {
        evidence.push(Object.freeze({ kind: "pageerror", message: error.message, stack: error.stack ?? null, url: page.url() }));
      });
      page.on("requestfailed", (request) => {
        evidence.push(Object.freeze({
          kind: "network-failure",
          method: request.method(),
          url: request.url(),
          failure: request.failure()?.errorText ?? "unknown",
        }));
      });
    };
    for (const page of context.pages()) observe(page);
    context.on("page", observe);
    await use();
    context.off("page", observe);
    let artifactGenerationMs = 0;
    if (evidence.length > 0) {
      const artifactStartedAt = performance.now();
      await testInfo.attach("browser-console-network-evidence", {
        body: Buffer.from(JSON.stringify(evidence, null, 2), "utf8"),
        contentType: "application/json",
      });
      artifactGenerationMs = performance.now() - artifactStartedAt;
    }
    if (process.env.LIVEHOST_PLAYWRIGHT === "1") {
      process.stdout.write(`${LIVEHOST_BROWSER_TIMING_PREFIX}${JSON.stringify({
        chromiumLaunchMs: Math.max(0, browserJourneyClock.browserReadyAt - browserJourneyClock.startedAt),
        contextCreationMs: Math.max(0, browserJourneyClock.contextReadyAt - browserJourneyClock.browserReadyAt),
        pageCreationMs: browserJourneyClock.pageReadyAt === 0
          ? 0
          : Math.max(0, browserJourneyClock.pageReadyAt - browserJourneyClock.contextReadyAt),
        artifactGenerationMs,
      })}\n`);
    }
  }, { auto: true }],
});
