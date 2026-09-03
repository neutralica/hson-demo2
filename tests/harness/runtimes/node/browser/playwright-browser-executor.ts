import { createConnection, createServer } from "node:net";
import { rm } from "node:fs/promises";
import { delimiter, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { TestCatalog } from "../../../../../src/shared/testing/test-catalog-contract";
import type { TestExecutorDescriptor } from "../../../../../src/shared/testing/test-executor-contract";
import type { TestFailure } from "../../../../../src/shared/testing/test-contracts";
import { empty_totals } from "../../../../../src/shared/testing/test-run-contract";
import type { RunOptions, RunResult, TestEvent } from "../../../core/test-contracts";
import type { NodeProcessResult, NodeProcessSupervisor } from "../node-process-supervisor";
import {
  normalize_playwright_source_path,
  playwright_case_id,
  playwright_suite_id,
  type PlaywrightDiscoveredTest,
} from "./playwright-test-discovery";

export const LOCAL_PLAYWRIGHT_BROWSER_EXECUTOR = Object.freeze({
  id: "local-playwright-chromium",
  kind: "browser",
  label: "Node-supervised Playwright Chromium",
  location: "hosted",
  capabilities: Object.freeze({ provides: Object.freeze([
    "javascript", "node", "process", "browser-dom", "browser-raster", "browser", "chromium",
    "websocket", "network", "local-server",
  ] as const) }),
  supportsStreaming: true,
  supportsCancellation: true,
}) satisfies TestExecutorDescriptor;

const EVENT_PREFIX = "<LOCUS_BROWSER_EVENT>";
const TIMING_PREFIX = "<LOCUS_BROWSER_TIMING>";
const PLAYWRIGHT_SERVER_STARTUP_BUDGET_MS = 60_000;
const PLAYWRIGHT_CASE_TIMEOUT_MS = 30_000;
// Playwright may spend five seconds in its graceful web-server handoff, after
// which the hosted server retains its own five-second bounded shutdown.
const PLAYWRIGHT_SERVER_SETTLEMENT_BUDGET_MS = 10_000;

type BrowserReporterEvent = Readonly<Record<string, unknown> & { t: string }>;

export type BrowserExecutorMetrics = Readonly<{
  launches: number;
  activeProcesses: number;
  activeJourneys: number;
  maximumActiveProcesses: number;
  maximumActiveJourneys: number;
  chromiumLaunchMs: number;
  contextCreationMs: number;
  pageCreationMs: number;
  serverReadinessMs: number;
  journeyMs: number;
  artifactGenerationMs: number;
  reportOverheadMs: number;
  artifactCount: number;
  cancellations: number;
  forcedTerminations: number;
  serverSettlementFailures: number;
  lastChildPid: number | null;
  lastChildJsdomModules: number | null;
  lastChildEncodingFallbackLoaded: boolean | null;
  lastChildNodeVersion: string | null;
  retainedArtifactRoots: number;
}>;

export type PlaywrightBrowserExecutor = Readonly<{
  run(
    catalog: TestCatalog,
    selectedIds: readonly string[],
    onEvent?: (event: TestEvent) => void,
    options?: RunOptions,
  ): Promise<RunResult>;
  metrics(): BrowserExecutorMetrics;
  dispose(): Promise<void>;
}>;

async function reserve_port(): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        server.close();
        reject(new Error("Browser executor could not reserve an ephemeral port."));
        return;
      }
      server.close((error) => error === undefined ? resolve(address.port) : reject(error));
    });
  });
}

async function port_accepts_connections(port: number): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const socket = createConnection({ host: "127.0.0.1", port });
    socket.once("connect", () => { socket.destroy(); resolve(true); });
    socket.once("error", () => { socket.destroy(); resolve(false); });
  });
}

async function assert_ports_released(ports: readonly number[]): Promise<void> {
  const deadline = Date.now() + PLAYWRIGHT_SERVER_SETTLEMENT_BUDGET_MS;
  while (true) {
    const listening = (await Promise.all(ports.map(async (port) => await port_accepts_connections(port) ? port : undefined)))
      .filter((port): port is number => port !== undefined);
    if (listening.length === 0) return;
    if (Date.now() >= deadline) throw new Error(`PLAYWRIGHT_SERVER_PROCESS_REMAINS:${listening.join(",")}`);
    await new Promise<void>((resolve) => setTimeout(resolve, 25));
  }
}

function string_array(value: unknown): readonly string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : Object.freeze([]);
}

function reporter_error(event: BrowserReporterEvent): string | undefined {
  if (!Array.isArray(event.errors) || event.errors.length === 0) return undefined;
  return event.errors.map((entry) => {
    if (typeof entry !== "object" || entry === null) return String(entry);
    const error = entry as { message?: unknown; stack?: unknown };
    return typeof error.stack === "string" && error.stack.length > 0
      ? error.stack
      : typeof error.message === "string" ? error.message : "Playwright assertion failed.";
  }).join("\n");
}

function case_status(value: unknown): "pass" | "fail" | "skip" {
  if (value === "passed") return "pass";
  if (value === "skipped") return "skip";
  return "fail";
}

function suite_source(sourceRef: string | undefined): Readonly<{ path: string; project: string }> {
  if (sourceRef === undefined || !sourceRef.startsWith("playwright:")) throw new Error(`BROWSER_EXECUTOR_SOURCE_INVALID:${sourceRef ?? "missing"}`);
  const separator = sourceRef.lastIndexOf("#");
  if (separator < "playwright:".length) throw new Error(`BROWSER_EXECUTOR_SOURCE_INVALID:${sourceRef}`);
  return Object.freeze({ path: normalize_playwright_source_path(sourceRef.slice("playwright:".length, separator)), project: sourceRef.slice(separator + 1) });
}

function empty_metrics(): BrowserExecutorMetrics {
  return Object.freeze({
    launches: 0,
    activeProcesses: 0,
    activeJourneys: 0,
    maximumActiveProcesses: 0,
    maximumActiveJourneys: 0,
    chromiumLaunchMs: 0,
    contextCreationMs: 0,
    pageCreationMs: 0,
    serverReadinessMs: 0,
    journeyMs: 0,
    artifactGenerationMs: 0,
    reportOverheadMs: 0,
    artifactCount: 0,
    cancellations: 0,
    forcedTerminations: 0,
    serverSettlementFailures: 0,
    lastChildPid: null,
    lastChildJsdomModules: null,
    lastChildEncodingFallbackLoaded: null,
    lastChildNodeVersion: null,
    retainedArtifactRoots: 0,
  });
}

export function create_playwright_browser_executor(
  supervisor: NodeProcessSupervisor,
): PlaywrightBrowserExecutor {
  let metrics = empty_metrics();
  const retainedArtifactRoots = new Set<string>();
  return Object.freeze({
    async run(catalog, selectedIds, onEvent = () => undefined, options = {}) {
      if (selectedIds.length === 0) {
        return Object.freeze({
          ok: true,
          totals: empty_totals(),
          failures: Object.freeze([]),
          durationMs: 0,
        });
      }
      const descriptors = selectedIds.map((id) => {
        const descriptor = catalog.tests.find((candidate) => candidate.id === id);
        if (descriptor === undefined) throw new Error(`BROWSER_EXECUTOR_UNKNOWN_SELECTION: ${id}`);
        const suite = catalog.suites.find((candidate) => candidate.id === descriptor.suiteId);
        if (suite?.executionShape !== "browser-journeys") {
          throw new Error(`BROWSER_EXECUTOR_ASSIGNMENT_INVALID: ${id}`);
        }
        return Object.freeze({ descriptor, suite });
      });
      const selectedKeys = new Set(descriptors.map(({ descriptor }) => descriptor.id));
      const selectedTitles = descriptors.map(({ descriptor }) => descriptor.title);
      const selectedPaths = [...new Set(descriptors.map(({ suite }) => suite_source(suite.sourceRef).path))];
      const selectedTitlePattern = `(?:${selectedTitles.map((title) => title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})$`;
      const suiteStarted = new Set<string>();
      const suiteStartedAt = new Map<string, number>();
      const suiteRemaining = new Map<string, number>();
      for (const { suite } of descriptors) suiteRemaining.set(suite.id, (suiteRemaining.get(suite.id) ?? 0) + 1);
      const terminalIds = new Set<string>();
      const failures: TestFailure[] = [];
      let pass = 0;
      let fail = 0;
      let skip = 0;
      let error = 0;
      let artifactCount = 0;
      let executorStartedAt = 0;
      let journeyMs = 0;
      let chromiumLaunchMs = 0;
      let contextCreationMs = 0;
      let pageCreationMs = 0;
      let artifactGenerationMs = 0;
      let parserBuffer = "";
      const startedAt = performance.now();
      const startedEpoch = Date.now();
      const emit = (event: TestEvent): void => onEvent(Object.freeze({
        ...event,
        executorId: LOCAL_PLAYWRIGHT_BROWSER_EXECUTOR.id,
      }) as TestEvent);
      const accept = (event: BrowserReporterEvent): void => {
        if (event.t === "executor_started") {
          executorStartedAt = Number(event.timestamp) || Date.now();
          metrics = Object.freeze({
            ...metrics,
            lastChildPid: Number.isInteger(event.pid) ? Number(event.pid) : null,
            lastChildJsdomModules: Number.isInteger(event.jsdomModules) ? Number(event.jsdomModules) : null,
            lastChildEncodingFallbackLoaded: typeof event.encodingFallbackLoaded === "boolean"
              ? event.encodingFallbackLoaded
              : null,
            lastChildNodeVersion: typeof event.nodeVersion === "string" ? event.nodeVersion : null,
          });
          return;
        }
        if (event.t === "executor_finished") return;
        const path = typeof event.path === "string" ? normalize_playwright_source_path(event.path) : "";
        const title = typeof event.title === "string" ? event.title : "";
        const project = typeof event.project === "string" ? event.project : "";
        const titlePath = string_array(event.titlePath);
        if (path.length === 0 || title.length === 0 || project.length === 0 || titlePath.length === 0) return;
        const evidence: PlaywrightDiscoveredTest = Object.freeze({ path, title, project, titlePath, line: Number(event.line) || 0, column: Number(event.column) || 0 });
        const id = `${playwright_suite_id(evidence)}::${playwright_case_id(evidence)}`;
        if (!selectedKeys.has(id)) return;
        const descriptor = catalog.tests.find((candidate) => candidate.id === id);
        const suite = catalog.suites.find((candidate) => candidate.id === descriptor?.suiteId);
        if (descriptor === undefined || suite?.executionShape !== "browser-journeys" || descriptor.title !== title) return;
        const source = suite_source(suite.sourceRef);
        if (source.path !== path || source.project !== project) return;
        if (event.t === "case_started") {
          if (suiteStarted.has(suite.id) === false) {
            suiteStarted.add(suite.id);
            suiteStartedAt.set(suite.id, performance.now());
            emit({ t: "suite_begin", suite: suite.id, title: suite.title, category: suite.subject, totalPlanned: suiteRemaining.get(suite.id) ?? 0 });
          }
          metrics = Object.freeze({
            ...metrics,
            activeJourneys: metrics.activeJourneys + 1,
            maximumActiveJourneys: Math.max(metrics.maximumActiveJourneys, metrics.activeJourneys + 1),
          });
          emit({ t: "case_begin", suite: suite.id, caseId: descriptor.caseId, name: descriptor.title });
          return;
        }
        if (event.t !== "case_finished" || terminalIds.has(id)) return;
        terminalIds.add(id);
        metrics = Object.freeze({ ...metrics, activeJourneys: Math.max(0, metrics.activeJourneys - 1) });
        const status = case_status(event.status);
        const durationMs = Number.isFinite(event.durationMs) ? Number(event.durationMs) : 0;
        journeyMs += durationMs;
        if (status === "pass") pass += 1;
        else if (status === "skip") skip += 1;
        else fail += 1;
        const error = reporter_error(event);
        if (status === "fail") {
          failures.push(Object.freeze({
            suite: suite.id,
            caseId: descriptor.caseId,
            name: descriptor.title,
            err: error ?? "Playwright journey failed.",
            ms: durationMs,
          }));
        }
        emit({
          t: "case_end",
          suite: suite.id,
          caseId: descriptor.caseId,
          name: descriptor.title,
          status,
          ms: durationMs,
          ...(error === undefined ? {} : { err: error }),
        });
        for (const content of string_array(event.stdout)) {
          const ordinaryLines: string[] = [];
          for (const line of content.split(/(?<=\n)/)) {
            const normalized = line.trimEnd();
            if (!normalized.startsWith(TIMING_PREFIX)) {
              ordinaryLines.push(line);
              continue;
            }
            try {
              const timing = JSON.parse(normalized.slice(TIMING_PREFIX.length)) as Record<string, unknown>;
              chromiumLaunchMs += Number(timing.chromiumLaunchMs) || 0;
              contextCreationMs += Number(timing.contextCreationMs) || 0;
              pageCreationMs += Number(timing.pageCreationMs) || 0;
              artifactGenerationMs += Number(timing.artifactGenerationMs) || 0;
            } catch { ordinaryLines.push(line); }
          }
          const ordinary = ordinaryLines.join("");
          if (ordinary.length > 0) emit({ t: "evidence", suite: suite.id, caseId: descriptor.caseId, kind: "stdout", name: "Playwright stdout", content: ordinary });
        }
        for (const content of string_array(event.stderr)) {
          emit({ t: "evidence", suite: suite.id, caseId: descriptor.caseId, kind: "stderr", name: "Playwright stderr", content });
        }
        if (Array.isArray(event.attachments)) {
          for (const value of event.attachments) {
            if (typeof value !== "object" || value === null) continue;
            const attachment = value as { name?: unknown; contentType?: unknown; path?: unknown; body?: unknown };
            artifactCount += 1;
            emit({
              t: "evidence",
              suite: suite.id,
              caseId: descriptor.caseId,
              kind: "artifact",
              name: typeof attachment.name === "string" ? attachment.name : "Playwright artifact",
              content: typeof attachment.body === "string" ? attachment.body : "",
              ...(typeof attachment.path === "string" ? { reference: attachment.path } : {}),
              ...(typeof attachment.contentType === "string" ? { mediaType: attachment.contentType } : {}),
            });
          }
        }
        const remaining = (suiteRemaining.get(suite.id) ?? 1) - 1;
        suiteRemaining.set(suite.id, remaining);
        if (remaining === 0) {
          emit({
            t: "suite_end",
            suite: suite.id,
            ms: performance.now() - (suiteStartedAt.get(suite.id) ?? performance.now()),
          });
        }
      };
      const parseChunk = (chunk: string): void => {
        parserBuffer += chunk;
        while (true) {
          const newline = parserBuffer.indexOf("\n");
          if (newline < 0) return;
          const line = parserBuffer.slice(0, newline).replace(/\r$/, "");
          parserBuffer = parserBuffer.slice(newline + 1);
          if (!line.startsWith(EVENT_PREFIX)) continue;
          try {
            const decoded = JSON.parse(line.slice(EVENT_PREFIX.length)) as BrowserReporterEvent;
            if (typeof decoded.t === "string") accept(decoded);
          } catch { /* Raw output remains available as bounded process evidence. */ }
        }
      };
      const [hostedPort, appPort] = await Promise.all([reserve_port(), reserve_port()]);
      const outputToken = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const outputRoot = resolve(process.cwd(), "test-results", "livehost-browser", outputToken);
      retainedArtifactRoots.add(outputRoot);
      metrics = Object.freeze({
        ...metrics,
        activeJourneys: 0,
        launches: metrics.launches + 1,
        activeProcesses: metrics.activeProcesses + 1,
        maximumActiveProcesses: Math.max(metrics.maximumActiveProcesses, metrics.activeProcesses + 1),
        retainedArtifactRoots: retainedArtifactRoots.size,
      });
      let result: NodeProcessResult;
      let serverSettlementFailed = false;
      try {
        result = await supervisor.start({
          cwd: process.cwd(),
          command: process.execPath,
          args: Object.freeze([
            fileURLToPath(import.meta.resolve("@playwright/test/cli")),
            "test",
            ...selectedPaths,
            "--grep",
            selectedTitlePattern,
          ]),
          environment: Object.freeze({
            LIVEHOST_PLAYWRIGHT: "1",
            HOSTED_TEST_PORT: String(hostedPort),
            PLAYWRIGHT_APP_PORT: String(appPort),
            PLAYWRIGHT_OUTPUT_DIR: outputRoot,
            ...(process.env.PLAYWRIGHT_BROWSERS_PATH === undefined
              ? {}
              : { PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH }),
            PATH: `${dirname(process.execPath)}${delimiter}${process.env.PATH ?? ""}`,
          }),
          // This watchdog preserves Playwright's existing 30-second journey timeout;
          // it only adds the two existing 30-second web-server startup budgets.
          timeoutMs: PLAYWRIGHT_SERVER_STARTUP_BUDGET_MS + (selectedIds.length * PLAYWRIGHT_CASE_TIMEOUT_MS),
        }, {
          ...(options.signal === undefined ? {} : { signal: options.signal }),
          generation: supervisor.generation(),
          observeStdoutChunk: (chunk) => parseChunk(chunk.toString("utf8")),
        }).result;
        await assert_ports_released([hostedPort, appPort]);
      } catch (error) {
        serverSettlementFailed = true;
        throw error;
      } finally {
        metrics = Object.freeze({
          ...metrics,
          activeProcesses: Math.max(0, metrics.activeProcesses - 1),
          activeJourneys: 0,
          serverSettlementFailures: metrics.serverSettlementFailures + (serverSettlementFailed ? 1 : 0),
        });
      }
      parseChunk("\n");
      if (!result.cancelled) {
        for (const { descriptor, suite } of descriptors) {
          if (terminalIds.has(descriptor.id)) continue;
          terminalIds.add(descriptor.id);
          if (!suiteStarted.has(suite.id)) {
            suiteStarted.add(suite.id);
            emit({ t: "suite_begin", suite: suite.id, totalPlanned: suiteRemaining.get(suite.id) ?? 0 });
          }
          const reason = result.timedOut
            ? "[BROWSER_TIMEOUT] Playwright browser execution timed out."
            : `[BROWSER_INFRASTRUCTURE] Playwright exited before reporting this journey (exit ${result.exitCode ?? "none"}, signal ${result.signal ?? "none"}).`;
          error += 1;
          failures.push(Object.freeze({ suite: suite.id, caseId: descriptor.caseId, name: descriptor.title, err: reason, ms: 0 }));
          emit({ t: "case_begin", suite: suite.id, caseId: descriptor.caseId, name: descriptor.title });
          emit({ t: "case_end", suite: suite.id, caseId: descriptor.caseId, name: descriptor.title, status: "error", ms: 0, err: reason });
          const remaining = (suiteRemaining.get(suite.id) ?? 1) - 1;
          suiteRemaining.set(suite.id, remaining);
          if (remaining === 0) emit({ t: "suite_end", suite: suite.id, ms: performance.now() - startedAt });
        }
      }
      const reportOverheadStarted = performance.now();
      if (result.stdout.length > 0) {
        emit({
          t: "evidence", suite: descriptors[0]!.suite.id, kind: "artifact", name: "bounded Playwright process output",
          content: JSON.stringify({ stdout: result.stdout, stderr: result.stderr }),
          truncated: result.stdoutTruncated || result.stderrTruncated,
          knownBytes: result.stdoutBytes + result.stderrBytes,
        });
      }
      const wallMs = performance.now() - startedAt;
      const serverReadinessMs = executorStartedAt > 0 ? Math.max(0, executorStartedAt - startedEpoch) : 0;
      metrics = Object.freeze({
        ...metrics,
        activeJourneys: 0,
        chromiumLaunchMs,
        contextCreationMs,
        pageCreationMs,
        serverReadinessMs,
        journeyMs,
        artifactGenerationMs,
        reportOverheadMs: performance.now() - reportOverheadStarted,
        artifactCount,
        cancellations: metrics.cancellations + (result.cancelled ? 1 : 0),
        forcedTerminations: metrics.forcedTerminations + (result.forceKilled ? 1 : 0),
      });
      return Object.freeze({
        ok: !result.cancelled && fail === 0 && error === 0 && result.ok,
        ...(result.cancelled ? { cancelled: true as const } : {}),
        totals: Object.freeze({
          suites: new Set(descriptors.map(({ suite }) => suite.id)).size,
          cases: terminalIds.size,
          pass,
          fail,
          skip,
          unsupported: 0,
          cancelled: 0,
          error,
        }),
        failures: Object.freeze(failures),
        durationMs: wallMs,
      });
    },
    metrics: () => metrics,
    async dispose() {
      await Promise.all([...retainedArtifactRoots].map((root) => rm(root, { recursive: true, force: true })));
      retainedArtifactRoots.clear();
      metrics = Object.freeze({ ...metrics, retainedArtifactRoots: 0 });
    },
  });
}
