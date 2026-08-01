import type { IncomingMessage, ServerResponse } from "node:http";
import WebSocket, { type RawData } from "ws";
import type { TestSuite } from "../../app/demos/test/tests.types";
import { make_hosted_test_suite_registry } from "../../app/hosted-test/hosted-test-suite";
import { create_external_library_launcher_service } from "../../test-system/external-library-launchers";
import { make_local_node_livehost_executor_registry } from "../../test-system/livehost-node-executor";
import { create_hosted_test_application } from "../../hosted-test/hosted-test-application";
import { create_towl_authority_application } from "../../hosted-test/towl-authority-application";
import {
  start_node_application_host,
  type NodeAuthorityNamespace,
  type NodeHostedApplication,
} from "hson-live/livehost/node";
import { create_node_hosted_tests_application } from "../../hosted-test/server/node-hosted-tests-application";
import { create_node_towl_application } from "../../hosted-test/server/node-towl-application";
import { make_towl_socket, send_towl_action } from "../towl-tests/towl-test-helpers";
import type { TowlState } from "../../app/demos/towl";
import { create_towl_client } from "../../app/demos/towl";
import {
  create_browser_livehost_socket,
  type BrowserWebSocketConstructor,
} from "hson-live/livehost";

function expect_node_host(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`node application host: ${message}`);
}

type MockApplication = Readonly<{
  registration: NodeHostedApplication;
  accepts(): number;
  disposals(): number;
}>;

function mock_application(
  name: string,
  authorities: readonly NodeAuthorityNamespace[],
  httpPath?: string,
): MockApplication {
  let accepts = 0;
  let disposals = 0;
  let disposed = false;
  return Object.freeze({
    registration: Object.freeze({
      name,
      authorities,
      ...(httpPath === undefined ? {} : {
        httpRoutes: Object.freeze([Object.freeze({
          method: "GET",
          path: httpPath,
          handle(_request: IncomingMessage, response: ServerResponse) {
            response.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
            response.end(name);
          },
        })]),
      }),
      acceptWebSocket(_authorityId: string, websocket: WebSocket) {
        accepts += 1;
        websocket.on("message", (message: RawData) => websocket.send(`${name}:${message.toString()}`));
      },
      dispose() {
        if (disposed) return;
        disposed = true;
        disposals += 1;
      },
    }),
    accepts: () => accepts,
    disposals: () => disposals,
  });
}

function open_websocket(url: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const websocket = new WebSocket(url);
    websocket.once("open", () => resolve(websocket));
    websocket.once("error", reject);
  });
}

function rejected_websocket_status(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const websocket = new WebSocket(url);
    websocket.once("unexpected-response", (_request, response) => {
      resolve(response.statusCode ?? 0);
      response.resume();
    });
    websocket.once("open", () => {
      websocket.close();
      reject(new Error("WebSocket unexpectedly opened."));
    });
    websocket.once("error", () => undefined);
  });
}

async function closes(websocket: WebSocket): Promise<number> {
  return new Promise((resolve) => websocket.once("close", (code) => resolve(code)));
}

async function captured_error(run: () => Promise<unknown>): Promise<Error | undefined> {
  try {
    await run();
  } catch (error) {
    return error instanceof Error ? error : new Error(String(error));
  }
  return undefined;
}

export function node_application_host_suite(): TestSuite {
  const suite = "livehost/node-application-host";
  return Object.freeze({
    suite,
    descriptor: Object.freeze({
      subject: "livehost",
      requirements: Object.freeze(["javascript", "node"] as const),
    }),
    cases: Object.freeze([
      Object.freeze({
        suite,
        name: "registered applications receive only their HTTP and WebSocket routes",
        run: async () => {
          const alpha = mock_application("alpha", [{ kind: "exact", value: "alpha" }], "/alpha");
          const beta = mock_application("beta", [{ kind: "prefix", value: "beta:" }], "/beta");
          const host = await start_node_application_host({ port: 0, applications: [alpha.registration, beta.registration] });
          try {
            const alphaSocket = await open_websocket(`${host.url}?livehost=alpha`);
            const betaSocket = await open_websocket(`${host.url}/any/path?livehost=beta%3Aroom`);
            const [alphaHttp, betaHttp, missingHttp] = await Promise.all([
              fetch(`${host.httpUrl}/alpha`),
              fetch(`${host.httpUrl}/beta`),
              fetch(`${host.httpUrl}/missing`),
            ]);
            expect_node_host(
              alpha.accepts() === 1
                && beta.accepts() === 1
                && await alphaHttp.text() === "alpha"
                && await betaHttp.text() === "beta"
                && missingHttp.status === 404,
              "dispatch must select exactly one registered application",
            );
            alphaSocket.close();
            betaSocket.close();
          } finally {
            await host.stop();
          }
        },
      }),
      Object.freeze({
        suite,
        name: "health reports operational registration without authority state",
        run: async () => {
          const alpha = mock_application("alpha", [{ kind: "exact", value: "secret-authority" }]);
          const host = await start_node_application_host({ port: 0, applications: [alpha.registration] });
          try {
            const response = await fetch(`${host.httpUrl}/healthz`);
            const text = await response.text();
            const health = JSON.parse(text) as { ready?: unknown; applications?: unknown };
            expect_node_host(
              response.status === 200
                && health.ready === true
                && JSON.stringify(health.applications) === JSON.stringify([{ name: "alpha", ready: true }])
                && !text.includes("secret-authority"),
              "health must expose only readiness and application names",
            );
          } finally {
            await host.stop();
          }
        },
      }),
      Object.freeze({
        suite,
        name: "duplicate names, HTTP routes, and authority namespaces reject atomically",
        run: async () => {
          const firstName = mock_application("same", [{ kind: "exact", value: "one" }]);
          const secondName = mock_application("same", [{ kind: "exact", value: "two" }]);
          const nameError = await captured_error(() => start_node_application_host({
            port: 0,
            applications: [firstName.registration, secondName.registration],
          }));
          const firstRoute = mock_application("first-route", [{ kind: "exact", value: "one" }], "/same");
          const secondRoute = mock_application("second-route", [{ kind: "exact", value: "two" }], "/same");
          const routeError = await captured_error(() => start_node_application_host({
            port: 0,
            applications: [firstRoute.registration, secondRoute.registration],
          }));
          const firstNamespace = mock_application("first-namespace", [{ kind: "prefix", value: "shared:" }]);
          const secondNamespace = mock_application("second-namespace", [{ kind: "exact", value: "shared:item" }]);
          const namespaceError = await captured_error(() => start_node_application_host({
            port: 0,
            applications: [firstNamespace.registration, secondNamespace.registration],
          }));
          expect_node_host(
            nameError?.message.includes("name") === true
              && routeError?.message.includes("HTTP route") === true
              && namespaceError?.message.includes("overlap") === true
              && [firstName, secondName, firstRoute, secondRoute, firstNamespace, secondNamespace]
                .every((application) => application.disposals() === 1),
            "all registration conflicts must fail before listening and dispose each application once",
          );
        },
      }),
      Object.freeze({
        suite,
        name: "missing, malformed, and unmatched authority IDs touch no application",
        run: async () => {
          const hosted = mock_application("hosted", [{ kind: "exact", value: "hosted-tests" }]);
          const towl = mock_application("towl", [{
            kind: "prefix",
            value: "towl:",
            suffix: { minLength: 6, maxLength: 24, pattern: /^[a-z0-9][a-z0-9-]*$/ },
          }]);
          const host = await start_node_application_host({ port: 0, applications: [hosted.registration, towl.registration] });
          try {
            const statuses = await Promise.all([
              rejected_websocket_status(host.url),
              rejected_websocket_status(`${host.url}?livehost=unknown`),
              rejected_websocket_status(`${host.url}?livehost=towl%3ABAD`),
            ]);
            expect_node_host(
              statuses.join(",") === "400,404,404" && hosted.accepts() === 0 && towl.accepts() === 0,
              "invalid authority selection must reject before application dispatch",
            );
          } finally {
            await host.stop();
          }
        },
      }),
      Object.freeze({
        suite,
        name: "shutdown is bounded and idempotent with one disposal per application",
        run: async () => {
          const application = mock_application("shutdown", [{ kind: "exact", value: "shutdown" }]);
          const host = await start_node_application_host({
            port: 0,
            shutdownTimeoutMs: 1_000,
            applications: [application.registration],
          });
          const websocket = await open_websocket(`${host.url}?livehost=shutdown`);
          const closed = closes(websocket);
          await Promise.all([host.stop(), host.stop()]);
          expect_node_host(
            application.disposals() === 1 && await closed === 1001,
            "shutdown must dispose once and preserve the ordinary server-stop close policy",
          );
        },
      }),
      Object.freeze({
        suite,
        name: "structured operational events remain separate from application state",
        run: async () => {
          const events: string[] = [];
          const application = mock_application("logged", [{ kind: "exact", value: "logged" }], "/logged");
          const host = await start_node_application_host({
            port: 0,
            applications: [application.registration],
            log(event) { events.push(`${event.type}:${event.application ?? ""}:${event.route ?? ""}`); },
          });
          const websocket = await open_websocket(`${host.url}?livehost=logged`);
          await fetch(`${host.httpUrl}/logged`);
          websocket.close();
          await host.stop();
          expect_node_host(
            [
              "host-startup",
              "application-registration",
              "host-listening",
              "websocket-dispatch",
              "http-dispatch",
              "shutdown-start",
              "shutdown-completion",
            ].every((type) => events.some((event) => event.startsWith(`${type}:`)))
              && !events.some((event) => event.includes("secret") || event.includes("session")),
            "the operational seam must cover lifecycle and dispatch without protocol/report content",
          );
        },
      }),
      Object.freeze({
        suite,
        name: "shutdown timeout returns a clear failure for an undrained application",
        run: async () => {
          let disposals = 0;
          const blocked: NodeHostedApplication = Object.freeze({
            name: "blocked",
            authorities: Object.freeze([{ kind: "exact" as const, value: "blocked" }]),
            acceptWebSocket() {},
            dispose() {
              disposals += 1;
              return new Promise<void>(() => undefined);
            },
          });
          const host = await start_node_application_host({
            port: 0,
            shutdownTimeoutMs: 25,
            applications: [blocked],
          });
          const error = await captured_error(host.stop);
          expect_node_host(
            error?.message.includes("shutdown exceeded 25ms") === true && disposals === 1,
            "bounded shutdown must identify its timeout and invoke application disposal once",
          );
        },
      }),
      Object.freeze({
        suite,
        name: "disposing one registered application leaves its peer operational",
        run: async () => {
          const first = mock_application("first", [{ kind: "exact", value: "first" }]);
          const second = mock_application("second", [{ kind: "exact", value: "second" }]);
          const host = await start_node_application_host({ port: 0, applications: [first.registration, second.registration] });
          try {
            await first.registration.dispose();
            const peer = await open_websocket(`${host.url}?livehost=second`);
            expect_node_host(
              first.disposals() === 1 && second.accepts() === 1 && second.disposals() === 0,
              "application disposal must not dispose or suppress peer dispatch",
            );
            peer.close();
          } finally {
            await host.stop();
          }
          expect_node_host(
            first.disposals() === 1 && second.disposals() === 1,
            "host shutdown must preserve exactly-once disposal after an application was already disposed",
          );
        },
      }),
      Object.freeze({
        suite,
        name: "hosted tests and TOWL use separate stores behind one Node transport",
        run: async () => {
          const hosted = await create_node_hosted_tests_application({
            registry: make_hosted_test_suite_registry([]),
            executorRegistry: make_local_node_livehost_executor_registry(),
          });
          const towl = create_node_towl_application();
          const host = await start_node_application_host({
            port: 0,
            applications: [hosted.registration, towl.registration],
          });
          try {
            const coordinator = await open_websocket(`${host.url}?livehost=hosted-tests`);
            const room = await open_websocket(`${host.url}?livehost=towl%3Aroom-one`);
            expect_node_host(
              hosted.authorities.store.has("hosted-tests")
                && !hosted.authorities.store.has("towl:room-one")
                && towl.authorities.store.has("towl:room-one")
                && !towl.authorities.store.has("hosted-tests")
                && host.applicationNames.join(",") === "hosted-tests,towl",
              "transport registration must not merge application authority stores",
            );
            coordinator.close();
            room.close();
          } finally {
            await host.stop();
          }
        },
      }),
      Object.freeze({
        suite,
        name: "TOWL rooms and their disposal remain authority-local",
        run: async () => {
          const application = create_towl_authority_application();
          const firstId = "towl:room-one";
          const secondId = "towl:room-two";
          const first = make_towl_socket();
          const second = make_towl_socket();
          try {
            expect_node_host(application.connect(firstId, first).ok, "first room must connect");
            expect_node_host(application.connect(secondId, second).ok, "second room must connect");
            await first.receive({ type: "session-create", id: "equal-session" });
            await second.receive({ type: "session-create", id: "equal-session" });
            await send_towl_action(first, "join");
            const firstState = application.store.get(firstId)?.map.snap() as TowlState;
            const secondState = application.store.get(secondId)?.map.snap() as TowlState;
            expect_node_host(
              firstState.player1.sessionId !== null
                && secondState.player1.sessionId === null
                && application.disposeRoom(firstId)
                && !application.store.has(firstId)
                && application.store.has(secondId),
              "equal session values, actions, and room disposal must remain isolated",
            );
          } finally {
            application.dispose();
          }
        },
      }),
      Object.freeze({
        suite,
        name: "TOWL browser protocol remains operational through its Node authority route",
        run: async () => {
          const towl = create_node_towl_application();
          const host = await start_node_application_host({ port: 0, applications: [towl.registration] });
          const transport = create_browser_livehost_socket(
            `${host.url}?livehost=towl%3Aroute-room`,
            WebSocket as unknown as BrowserWebSocketConstructor,
          );
          try {
            await transport.ready;
            const client = create_towl_client({ socket: transport.socket });
            client.connect();
            await client.createSession();
            const joined = await client.join();
            const deadline = Date.now() + 500;
            while (client.state.player1?.sessionId !== client.livehost.session.sessionId && Date.now() < deadline) {
              await new Promise<void>((resolve) => setTimeout(resolve, 5));
            }
            expect_node_host(
              joined.seat === "player1"
                && client.state.player1.sessionId === client.livehost.session.sessionId
                && towl.authorities.roomCount() === 1,
              "the existing TOWL session and action envelopes must survive Node routing",
            );
            client.disconnect();
            client.livehost.session.dispose();
            client.livehost.recovery.dispose();
          } finally {
            transport.dispose();
            await host.stop();
          }
        },
      }),
      Object.freeze({
        suite,
        name: "equal report IDs and executor cancellation remain application-local",
        run: async () => {
          const registry = make_hosted_test_suite_registry([{
            id: "livemap/replay",
            label: "application isolation fixture",
            async run() {
              return Object.freeze({
                ok: true,
                summary: Object.freeze({
                  suites: 1,
                  cases: 0,
                  pass: 0,
                  fail: 0,
                  skip: 0,
                  msTotal: 0,
                  failures: Object.freeze([]),
                }),
              });
            },
          }]);
          const first = create_hosted_test_application(registry, { makeRunId: () => "equal-run" });
          const second = create_hosted_test_application(registry, { makeRunId: () => "equal-run" });
          const firstLaunchers = create_external_library_launcher_service();
          const secondLaunchers = create_external_library_launcher_service();
          try {
            const request = {
              type: "action" as const,
              id: "equal-report-action",
              clientId: "equal-client",
              requestId: "equal-request",
              name: "tests.run" as const,
              payload: { suite: "livemap/replay" as const },
            };
            const [firstRun, secondRun] = await Promise.all([
              first.coordinator.dispatch_action(request),
              second.coordinator.dispatch_action(request),
            ]);
            const reportId = "hosted-report:equal-run";
            firstLaunchers.terminate();
            expect_node_host(
              first.store !== second.store
                && first.coordinator !== second.coordinator
                && firstRun.type === "ack"
                && secondRun.type === "ack"
                && first.store.get(reportId) !== undefined
                && second.store.get(reportId) !== undefined
                && first.store.get(reportId) !== second.store.get(reportId)
                && firstLaunchers.terminationGeneration() === 1
                && secondLaunchers.terminationGeneration() === 0,
              "equal report IDs, authority state, and cancellation generation must not cross applications",
            );
          } finally {
            first.dispose();
            second.dispose();
            secondLaunchers.terminate();
          }
        },
      }),
      Object.freeze({
        suite,
        name: "authority-only startup creates no DOM or rendering globals",
        run: async () => {
          expect_node_host(
            typeof document === "undefined"
              && typeof window === "undefined"
              && typeof CSSStyleSheet === "undefined",
            "the Node test process must begin without rendering globals",
          );
          const towl = create_node_towl_application();
          const host = await start_node_application_host({ port: 0, applications: [towl.registration] });
          try {
            expect_node_host(
              typeof document === "undefined"
                && typeof window === "undefined"
                && typeof CSSStyleSheet === "undefined"
                && towl.authorities.roomCount() === 0,
              "host startup must not allocate DOM, CSS, LiveTree projection, or an authority",
            );
          } finally {
            await host.stop();
          }
        },
      }),
      Object.freeze({
        suite,
        name: "bounded TOWL rooms honor resumable grace then recreate a fresh incarnation",
        run: async () => {
          let now = 1_000;
          let expireSession: (() => void) | undefined;
          const application = create_towl_authority_application({
            maxRooms: 1,
            idleMs: 100,
            sweepIntervalMs: 50,
            now: () => now,
            schedule: () => () => {},
            sessions: {
              graceMs: 50,
              credential: () => "towl-lifecycle-credential-0001",
              schedule: (_delay, callback) => {
                expireSession = callback;
                return () => { expireSession = undefined; };
              },
            },
          });
          const roomId = "towl:lifecycle-room";
          const first = make_towl_socket();
          const connected = await application.connectBounded(roomId, first);
          expect_node_host(connected.ok, "bounded TOWL room must acquire");
          await first.receive({ type: "session-create", id: "create-old" });
          const created = first.sent().find((message) => message.type === "session-created");
          await first.receive({ type: "recover", id: "recover-old", logicalMapId: roomId });
          const oldPlan = first.sent().find((message) => message.type === "recovery-plan");
          first.emit_close();
          const retained = await application.evictRoom(roomId);
          expect_node_host(
            typeof created?.credential === "string"
              && typeof oldPlan?.incarnationId === "string"
              && retained.status === "busy",
            "detached resumable session must retain the room",
          );
          expireSession?.();
          now += 101;
          expect_node_host(
            await application.sweep() === 1 && application.roomCount() === 0,
            "expired idle room must evict",
          );
          const second = make_towl_socket();
          const recreated = await application.connectBounded(roomId, second);
          expect_node_host(recreated.ok, "same room key must recreate");
          await second.receive({ type: "session-attach", id: "attach-old", credential: created?.credential });
          const rejection = second.sent().find((message) => message.type === "session-rejected");
          await second.receive({ type: "session-create", id: "create-new" });
          await second.receive({ type: "recover", id: "recover-new", logicalMapId: roomId });
          const newPlan = second.sent().find((message) => message.type === "recovery-plan");
          expect_node_host(
            rejection?.code === "LIVEHOST_SESSION_CREDENTIAL_UNKNOWN"
              && typeof newPlan?.incarnationId === "string"
              && newPlan.incarnationId !== oldPlan?.incarnationId,
            "evicted room must reject old credentials and mint a new incarnation",
          );
          second.emit_close();
          await application.dispose();
        },
      }),
      Object.freeze({
        suite,
        name: "hosted report execution, subscribers, retention, and capacity are lifecycle-owned",
        run: async () => {
          let now = 1_000;
          let releaseRun!: () => void;
          const runGate = new Promise<void>((resolve) => { releaseRun = resolve; });
          let nextRun = 0;
          const registry = make_hosted_test_suite_registry([{
            id: "livemap/replay",
            label: "report lifecycle fixture",
            async run() {
              await runGate;
              return Object.freeze({
                ok: true,
                summary: Object.freeze({
                  suites: 1,
                  cases: 0,
                  pass: 0,
                  fail: 0,
                  skip: 0,
                  msTotal: 0,
                  failures: Object.freeze([]),
                }),
              });
            },
          }]);
          const application = create_hosted_test_application(registry, {
            makeRunId: () => `lifecycle-run-${++nextRun}`,
            lifecycle: {
              maxReports: 1,
              terminalRetentionMs: 100,
              sweepIntervalMs: 50,
              now: () => now,
              schedule: () => () => {},
            },
          });
          const request = (id: string) => ({
            type: "action" as const,
            id,
            clientId: "lifecycle-client",
            requestId: id,
            name: "tests.run" as const,
            payload: { suite: "livemap/replay" as const },
          });
          const running = application.coordinator.dispatch_action(request("run-one"));
          for (let index = 0; index < 8 && !application.hasReport("hosted-report:lifecycle-run-1"); index += 1) {
            await Promise.resolve();
          }
          const blocked = await application.evictReport("hosted-report:lifecycle-run-1");
          const capacity = await application.coordinator.dispatch_action(request("run-two"));
          expect_node_host(
            blocked.status === "busy"
              && capacity.type === "error"
              && application.reportCount() === 1,
            "running report must block eviction and finite capacity must reject new work",
          );
          releaseRun();
          const completed = await running;
          now += 101;
          expect_node_host(
            completed.type === "ack"
              && await application.sweepReports() === 1
              && application.reportCount() === 0
              && application.coordinator.activity.snapshot().state === "idle",
            "terminal report must evict after retention without disposing the coordinator",
          );
          await application.dispose();
        },
      }),
    ]),
  });
}
