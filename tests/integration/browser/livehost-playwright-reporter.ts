import { dirname, join, relative } from "node:path";
import { createRequire } from "node:module";
import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";

export const LOCUS_BROWSER_EVENT_PREFIX = "<LOCUS_BROWSER_EVENT>";

function emit(event: Readonly<Record<string, unknown>>): void {
  process.stdout.write(`${LOCUS_BROWSER_EVENT_PREFIX}${JSON.stringify(event)}\n`);
}

function test_identity(test: TestCase, result?: TestResult): Readonly<{ path: string; title: string; titlePath: readonly string[]; project: string; line: number; column: number }> {
  const titlePath = test.titlePath();
  const specName = titlePath.find((part) => /\.spec\.[cm]?[jt]s$/.test(part));
  const executableFile = specName === undefined ? test.location.file : join(dirname(test.location.file), specName);
  return Object.freeze({
    path: relative(process.cwd(), executableFile),
    title: test.title,
    titlePath: Object.freeze(titlePath),
    project: result?.projectName ?? test.parent.project()?.name ?? "",
    line: test.location.line,
    column: test.location.column,
  });
}

export default class LocusPlaywrightReporter implements Reporter {
  onBegin(config: FullConfig, suite: Suite): void {
    const require = createRequire(import.meta.url);
    const cachedModules = Object.keys(require.cache);
    emit({
      t: "executor_started",
      workers: config.workers,
      tests: suite.allTests().length,
      pid: process.pid,
      jsdomModules: cachedModules.filter((path) => path.includes("/jsdom/")).length,
      encodingFallbackLoaded: cachedModules.some((path) => path.endsWith("/fallback/encoding.js")),
      nodeVersion: process.version,
      timestamp: Date.now(),
    });
    for (const test of suite.allTests()) emit({ t: "discovered", ...test_identity(test) });
  }

  onTestBegin(test: TestCase, result: TestResult): void {
    emit({ t: "case_started", ...test_identity(test, result), retry: result.retry, timestamp: Date.now() });
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    emit({
      t: "case_finished",
      ...test_identity(test, result),
      status: result.status,
      expectedStatus: test.expectedStatus,
      durationMs: result.duration,
      retry: result.retry,
      errors: result.errors.map((error) => ({ message: error.message ?? String(error.value ?? "Playwright error"), stack: error.stack ?? null })),
      stdout: result.stdout.map((entry) => typeof entry === "string" ? entry : entry.toString("utf8")),
      stderr: result.stderr.map((entry) => typeof entry === "string" ? entry : entry.toString("utf8")),
      attachments: result.attachments.map((attachment) => ({
        name: attachment.name,
        contentType: attachment.contentType,
        path: attachment.path ?? null,
        body: attachment.body === undefined ? null : attachment.body.toString("base64"),
      })),
      timestamp: Date.now(),
    });
  }

  onEnd(result: FullResult): void {
    emit({ t: "executor_finished", status: result.status, timestamp: Date.now() });
  }
}
