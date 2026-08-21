import type { LocusDisposer, LocusSocketLike } from "hson-live/locus";
import type { TestSuite } from "../../harness/core/test-contracts";
import { make_test_executor_registry, type TestExecutorRegistry } from "../../harness/core/test-executor";
import { make_test_executor_discovery } from "../../harness/core/test-discovery";
import {
  create_hosted_test_application,
  type HostedTestApplication,
} from "../../harness/hosted/hosted-test-application";
import { hosted_test_recovery_association } from "../../../src/shared/hosted-tests/hosted-test-application.types";
import { create_cloudflare_hosted_test_application } from "../../harness/runtimes/cloudflare/worker";
import { make_cloudflare_locus_executor_registry } from "../../harness/runtimes/cloudflare/cloudflare-test-executor";

function expect_lifecycle(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`hosted test lifecycle: ${message}`);
}

function make_executor(run: () => Promise<void> = () => Promise.resolve()): TestExecutorRegistry {
  const suite = "livehost/hosted-lifecycle-fixture";
  return make_test_executor_registry(Object.freeze({
    id: "hosted-lifecycle-node",
    kind: "node",
    label: "Hosted lifecycle Node",
    location: "local",
    capabilities: Object.freeze({ provides: Object.freeze(["javascript", "node"] as const) }),
    supportsStreaming: true,
    supportsCancellation: true,
  }), [Object.freeze({
    suite,
    descriptor: Object.freeze({
      subject: "livehost",
      requirements: Object.freeze(["javascript", "node"] as const),
      collections: Object.freeze(["dev"] as const),
    }),
    cases: Object.freeze([Object.freeze({ suite, caseId: "execute", name: "execute", run })]),
  })]);
}

function make_application(
  executorRegistry: TestExecutorRegistry,
  options: Readonly<{
    makeRunId: () => string;
    maxReports: number;
    terminalRetentionMs: number;
    now?: () => number;
    schedule?: (delayMs: number, callback: () => void) => () => void;
    requireReportReady?: boolean;
  }>,
): HostedTestApplication {
  return create_hosted_test_application({
    executorRegistry,
    discovery: make_test_executor_discovery(executorRegistry),
    makeRunId: options.makeRunId,
    ...(options.requireReportReady === undefined ? {} : { requireReportReady: options.requireReportReady }),
    lifecycle: {
      maxReports: options.maxReports,
      terminalRetentionMs: options.terminalRetentionMs,
      sweepIntervalMs: Math.max(1, options.terminalRetentionMs),
      ...(options.now === undefined ? {} : { now: options.now }),
      schedule: options.schedule ?? (() => () => {}),
    },
  });
}

function selected_request(id: string, selectionId: string, clientId = "lifecycle-client") {
  return {
    type: "action" as const,
    id,
    clientId,
    requestId: id,
    name: "tests.runSelected" as const,
    payload: { selectionIds: [selectionId] },
  };
}

async function run_selected(application: HostedTestApplication, id: string, selectionId: string, clientId?: string) {
  const response = await application.coordinator.dispatch_action(selected_request(id, selectionId, clientId));
  expect_lifecycle(response.type === "ack", `run ${id} must succeed`);
  return response.result as Readonly<{ runId: string; attemptId: string; reportHostId: string }>;
}

type TestSocket = LocusSocketLike & Readonly<{
  receive(message: unknown): Promise<void>;
  disconnect(): void;
  sent(): readonly Record<string, unknown>[];
}>;

function make_socket(): TestSocket {
  const messages = new Set<(message: string) => void>();
  const closes = new Set<() => void>();
  const sent: string[] = [];
  return Object.freeze({
    send(message: string) { sent.push(message); },
    close() {},
    onMessage(listener: (message: string) => void): LocusDisposer {
      messages.add(listener);
      return () => { messages.delete(listener); };
    },
    onClose(listener: () => void): LocusDisposer {
      closes.add(listener);
      return () => { closes.delete(listener); };
    },
    async receive(message: unknown): Promise<void> {
      const encoded = JSON.stringify(message);
      for (const listener of [...messages]) listener(encoded);
      for (let index = 0; index < 8; index += 1) await Promise.resolve();
    },
    disconnect(): void { for (const listener of [...closes]) listener(); },
    sent: () => sent.map((message) => JSON.parse(message) as Record<string, unknown>),
  });
}

async function wait_for_report(application: HostedTestApplication, hostId: string, runId?: string): Promise<void> {
  for (let index = 0; index < 40; index += 1) {
    if (application.hasReport(hostId) && (runId === undefined || application.coordinator.map.snap().runs[runId] !== undefined)) return;
    await Promise.resolve();
  }
  expect_lifecycle(false, `${hostId} must be allocated and associated`);
}

async function settle_activity(): Promise<void> {
  for (let index = 0; index < 20; index += 1) await Promise.resolve();
}

async function run_selected_through_socket(
  application: HostedTestApplication,
  id: string,
  selectionId: string,
  retry = false,
): Promise<Record<string, unknown>> {
  const socket = make_socket();
  const connected = application.connect("hosted-tests", socket);
  expect_lifecycle(connected.ok, "coordinator socket must connect");
  await socket.receive({ ...selected_request(id, selectionId), ...(retry ? { retry: true } : {}) });
  for (let index = 0; index < 40; index += 1) {
    const response = socket.sent().find((message) => message.id === id && (message.type === "ack" || message.type === "error"));
    if (response !== undefined) {
      connected.value();
      socket.disconnect();
      return response;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  connected.value();
  socket.disconnect();
  throw new Error(`hosted test lifecycle: coordinator action ${id} did not settle: ${JSON.stringify(socket.sent())}`);
}

export function hosted_test_lifecycle_suite(): TestSuite {
  const suite = "livehost/hosted-test-lifecycle";
  return Object.freeze({
    suite,
    descriptor: Object.freeze({
      subject: "livehost",
      requirements: Object.freeze(["javascript", "node"] as const),
    }),
    cases: Object.freeze([
      Object.freeze({
        suite,
        caseId: "worker-production-policy-bounds-report-and-coordinator-state",
        name: "Worker production policy bounds report and coordinator state",
        run: async () => {
          const application = create_cloudflare_hosted_test_application();
          try {
            const workerSelectionId = make_cloudflare_locus_executor_registry().catalog.tests[0]!.id;
            for (let index = 1; index <= 17; index += 1) {
              await run_selected(application, `worker-${index}`, workerSelectionId);
            }
            const state = application.coordinator.map.snap();
            expect_lifecycle(application.reportCount() === 16, "Worker must retain only 16 terminal reports");
            expect_lifecycle(Object.keys(state.runs).length === 16, "Worker coordinator runs must follow report capacity");
            expect_lifecycle(
              Object.values(state.requests).reduce((total, requests) => total + Object.keys(requests).length, 0) === 16,
              "Worker coordinator requests must follow report capacity",
            );
          } finally {
            await application.dispose();
          }
        },
      }),
      Object.freeze({
        suite,
        caseId: "capacity-eviction-cleans-exact-report-owned-state",
        name: "capacity eviction cleans exact report-owned state",
        run: async () => {
          const executor = make_executor();
          const selectionId = executor.catalog.tests[0]!.id;
          let nextRun = 0;
          const application = make_application(executor, {
            makeRunId: () => `capacity-${++nextRun}`,
            maxReports: 2,
            terminalRetentionMs: 1_000,
          });
          try {
            await run_selected(application, "request-one", selectionId, "shared-client");
            await run_selected(application, "request-two", selectionId, "shared-client");
            await run_selected(application, "request-three", selectionId, "other-client");
            let state = application.coordinator.map.snap();
            expect_lifecycle(application.reportCount() === 2 && !application.hasReport("hosted-report:capacity-1"), "oldest idle report must be evicted");
            expect_lifecycle(application.retention.size() === 2 && application.retention.get("capacity-1") === undefined, "inspection retention must follow authority eviction");
            expect_lifecycle(state.runs["capacity-1"] === undefined && state.runs["capacity-2"] !== undefined, "only the evicted run association must be removed");
            expect_lifecycle(state.requests["shared-client"]?.["request-one"] === undefined && state.requests["shared-client"]?.["request-two"] !== undefined, "only the evicted request association must be removed");
            await settle_activity();
            const secondEviction = await application.evictReport("hosted-report:capacity-2");
            expect_lifecycle(secondEviction.status === "evicted", `second report must evict normally: ${JSON.stringify(secondEviction)}`);
            state = application.coordinator.map.snap();
            expect_lifecycle(state.requests["shared-client"] === undefined, "empty per-client request container must be removed");
            expect_lifecycle(state.runs["capacity-3"] !== undefined && state.requests["other-client"]?.["request-three"] !== undefined, "unrelated coordinator evidence must remain");
            expect_lifecycle(
              Object.keys(state.runs).length === 1 && Object.keys(state.requests).length === 1,
              "coordinator remains schema-valid with only the unrelated association",
            );
          } finally {
            await application.dispose();
          }
        },
      }),
      Object.freeze({
        suite,
        caseId: "terminal-time-and-connection-activity-govern-ordinary-eviction",
        name: "terminal time and connection activity govern ordinary eviction",
        run: async () => {
          let now = 1_000;
          const executor = make_executor();
          const selectionId = executor.catalog.tests[0]!.id;
          const application = make_application(executor, {
            makeRunId: () => "timed-report",
            maxReports: 2,
            terminalRetentionMs: 100,
            now: () => now,
          });
          try {
            const result = await run_selected(application, "timed-request", selectionId);
            const socket = make_socket();
            const connected = await application.connectBounded(result.reportHostId, socket);
            expect_lifecycle(connected.ok, "terminal report connection must attach");
            now += 101;
            expect_lifecycle(await application.sweepReports() === 0, "active connection must block timed eviction");
            connected.value();
            socket.disconnect();
            await settle_activity();
            now += 101;
            const swept = await application.sweepReports();
            const timedEviction = application.hasReport(result.reportHostId) ? await application.evictReport(result.reportHostId) : undefined;
            expect_lifecycle(swept === 1 && application.reportCount() === 0, `idle terminal report must expire after retention: ${JSON.stringify(timedEviction)}`);
          } finally {
            await application.dispose();
          }
        },
      }),
      Object.freeze({
        suite,
        caseId: "explicit-and-scheduled-sweeps-preserve-idle-age",
        name: "explicit and scheduled sweeps preserve idle age",
        run: async () => {
          let now = 1_000;
          let scheduled: (() => void) | undefined;
          let scheduleCalls = 0;
          let nextRun = 0;
          const executor = make_executor();
          const selectionId = executor.catalog.tests[0]!.id;
          const application = make_application(executor, {
            makeRunId: () => `idle-proof-${++nextRun}`,
            maxReports: 1,
            terminalRetentionMs: 100,
            now: () => now,
            schedule: (_delayMs, callback) => {
              scheduleCalls += 1;
              scheduled = callback;
              return () => {
                if (scheduled === callback) scheduled = undefined;
              };
            },
          });
          try {
            const first = await run_selected(application, "idle-proof-one", selectionId);
            await settle_activity();
            expect_lifecycle(await application.sweepReports() === 0 && application.hasReport(first.reportHostId), "zero-age report must be retained");
            now = 1_099;
            expect_lifecycle(await application.sweepReports() === 0 && application.hasReport(first.reportHostId), "below-threshold report must be retained");
            now = 1_100;
            expect_lifecycle(await application.sweepReports() === 1 && !application.hasReport(first.reportHostId), "threshold report must be evicted");

            const second = await run_selected(application, "idle-proof-two", selectionId);
            const socket = make_socket();
            const connected = await application.connectBounded(second.reportHostId, socket);
            expect_lifecycle(connected.ok, "active proof connection must attach");
            now = 1_200;
            expect_lifecycle(await application.sweepReports() === 0 && application.hasReport(second.reportHostId), "active report must remain protected past threshold");
            connected.value();
            socket.disconnect();
            await settle_activity();
            const zeroAgeScheduled = scheduled;
            expect_lifecycle(zeroAgeScheduled !== undefined, "application scheduler must receive the sweep callback");
            zeroAgeScheduled();
            await settle_activity();
            expect_lifecycle(application.hasReport(second.reportHostId), "scheduled zero-age sweep must retain the report");
            now = 1_300;
            const thresholdScheduled = scheduled;
            expect_lifecycle(thresholdScheduled !== undefined, "application sweep must reschedule after execution");
            thresholdScheduled();
            await settle_activity();
            expect_lifecycle(!application.hasReport(second.reportHostId) && scheduleCalls >= 3, "scheduled threshold sweep must evict and remain scheduled");
          } finally {
            await application.dispose();
          }
        },
      }),
      Object.freeze({
        suite,
        caseId: "active-attempt-remains-acquired-through-settlement",
        name: "active attempt remains acquired through settlement",
        run: async () => {
          let releaseRun!: () => void;
          const gate = new Promise<void>((resolve) => { releaseRun = resolve; });
          const executor = make_executor(() => gate);
          const selectionId = executor.catalog.tests[0]!.id;
          let nextRun = 0;
          const application = make_application(executor, {
            makeRunId: () => `active-${++nextRun}`,
            maxReports: 1,
            terminalRetentionMs: 100,
          });
          try {
            const running = application.coordinator.dispatch_action(selected_request("active-one", selectionId));
            await wait_for_report(application, "hosted-report:active-1", "active-1");
            const blocked = await application.evictReport("hosted-report:active-1");
            const cancelling = application.coordinator.dispatch_action({
              type: "action",
              id: "cancel-active-one",
              clientId: "lifecycle-client",
              requestId: "cancel-active-one",
              name: "tests.cancel",
              payload: { runId: "active-1", attemptId: "active-1:attempt:1" },
            });
            for (let index = 0; index < 40
              && application.coordinator.map.snap().runs["active-1"]?.attempts["active-1:attempt:1"]?.controlStatus !== "cancelling";
              index += 1) await Promise.resolve();
            const cancellationBlocked = await application.evictReport("hosted-report:active-1");
            const pressured = await application.coordinator.dispatch_action(selected_request("active-two", selectionId));
            expect_lifecycle(blocked.status === "busy" && blocked.blockers.includes("acquisition"), "active execution must retain its acquisition barrier");
            expect_lifecycle(
              cancellationBlocked.status === "busy"
                && cancellationBlocked.blockers.includes("acquisition"),
              "cancelling execution must retain its acquisition barrier through settlement",
            );
            expect_lifecycle(pressured.type === "error" && application.reportCount() === 1, "capacity must not force-dispose an active report");
            releaseRun();
            expect_lifecycle((await cancelling).type === "ack" && (await running).type === "ack", "cancelled attempt must settle normally");
            await settle_activity();
            const terminalEviction = await application.evictReport("hosted-report:active-1");
            expect_lifecycle(terminalEviction.status === "evicted", `terminal report becomes ordinarily evictable: ${JSON.stringify(terminalEviction)}`);
          } finally {
            await application.dispose();
          }
        },
      }),
      Object.freeze({
        suite,
        caseId: "readiness-is-cleared-when-a-report-id-is-reused",
        name: "readiness is cleared when a report ID is reused",
        run: async () => {
          let executions = 0;
          const executor = make_executor(async () => { executions += 1; });
          const selectionId = executor.catalog.tests[0]!.id;
          const application = make_application(executor, {
            makeRunId: () => "reused-readiness",
            maxReports: 1,
            terminalRetentionMs: 100,
            requireReportReady: true,
          });
          const reportHostId = "hosted-report:reused-readiness";
          const ready = async (requestId: string): Promise<void> => {
            const socket = make_socket();
            const connected = await application.connectBounded(reportHostId, socket);
            expect_lifecycle(connected.ok, "report must accept readiness connection");
            await socket.receive({ type: "action", id: requestId, name: "tests.ready", payload: { runId: "reused-readiness" } });
            connected.value();
            socket.disconnect();
          };
          try {
            const first = application.coordinator.dispatch_action(selected_request("ready-one", selectionId));
            await wait_for_report(application, reportHostId, "reused-readiness");
            await ready("mark-ready-one");
            expect_lifecycle((await first).type === "ack" && executions === 1, "first readiness marker must release execution");
            expect_lifecycle((await application.evictReport(reportHostId)).status === "evicted", "first report must evict");
            const second = application.coordinator.dispatch_action(selected_request("ready-two", selectionId));
            await wait_for_report(application, reportHostId, "reused-readiness");
            for (let index = 0; index < 8; index += 1) await Promise.resolve();
            expect_lifecycle(executions === 1, "reused report ID must not inherit stale readiness");
            await ready("mark-ready-two");
            expect_lifecycle((await second).type === "ack" && Number(executions) === 2, "fresh readiness must release reused report execution");
          } finally {
            await application.dispose();
          }
        },
      }),
      Object.freeze({
        suite,
        caseId: "historical-action-dedupe-outlives-expired-report-availability",
        name: "historical action dedupe outlives expired report availability",
        run: async () => {
          const executor = make_executor();
          const selectionId = executor.catalog.tests[0]!.id;
          let nextRun = 0;
          const application = make_application(executor, {
            makeRunId: () => `dedupe-${++nextRun}`,
            maxReports: 1,
            terminalRetentionMs: 100,
          });
          const originalRequest = selected_request("dedupe-original", selectionId);
          try {
            const original = await run_selected_through_socket(application, originalRequest.id, selectionId);
            expect_lifecycle(original.type === "ack", "original logical action must succeed");
            const originalResult = original.result as Readonly<{ runId: string; attemptId: string; reportHostId: string }>;
            await run_selected(application, "dedupe-pressure", selectionId);
            expect_lifecycle(!application.hasReport(originalResult.reportHostId), "capacity must expire the original detailed report");
            const retried = await run_selected_through_socket(application, originalRequest.id, selectionId, true);
            expect_lifecycle(
              JSON.stringify(retried.result) === JSON.stringify(original.result),
              `dedupe must retain the same historical terminal result: ${JSON.stringify({ original, retried })}`,
            );
            expect_lifecycle(nextRun === 2, "historical retry must not execute a replacement run");
            expect_lifecycle(application.coordinator.actionRequests.debug().cachedOutcomeResponseCount === 1, "retry must be served from generic Locus dedupe");
            const unavailable = await application.connectBounded(originalResult.reportHostId, make_socket());
            expect_lifecycle(!unavailable.ok, "expired report authority must remain unavailable");
            expect_lifecycle(
              hosted_test_recovery_association(application.coordinator.map.snap(), originalResult.runId, originalResult.attemptId) === undefined,
              "expired report recovery must not retarget to a retained authority",
            );
          } finally {
            await application.dispose();
          }
        },
      }),
    ]),
  });
}
