import WebSocket from "ws";
import type { LiveHostApplication, LiveHostConnection } from "hson-live/livehost";
import type { TestSuite } from "../../harness/core/test-contracts";
import { create_towl_authority_application } from "../../../src/server/towl/towl-authority-application";
import {
  start_node_application_host,
} from "hson-live/livehost/node";
import { create_node_towl_application } from "../../../src/server/towl/node-towl-application";
import { make_towl_socket, send_towl_action } from "../towl/towl-test-helpers";
import type { TowlState } from "../../../src/app/demos/towl/index";
import { create_towl_client } from "../../../src/app/demos/towl/index";
import {
  create_browser_locus_socket,
  type BrowserWebSocketConstructor,
} from "hson-live/locus";

function expect_node_host(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`node application host: ${message}`);
}

type MockApplication = Readonly<{
  registration: LiveHostApplication;
  accepts(): number;
  disposals(): number;
}>;

function mock_application(
  name: string,
  _formerAuthorities: readonly unknown[],
  httpPath?: string,
  connectionPath = `/${name}`,
): MockApplication {
  let accepts = 0;
  let disposals = 0;
  let disposed = false;
  return Object.freeze({
    registration: Object.freeze({
      name,
      ...(httpPath === undefined ? {} : {
        requests: Object.freeze([Object.freeze({
          method: "GET",
          path: httpPath,
          handle() {
            return new Response(name, { headers: { "content-type": "text/plain; charset=utf-8" } });
          },
        })]),
      }),
      connections: Object.freeze([Object.freeze({
        path: connectionPath,
        accept(_request: Request, connection: LiveHostConnection) {
          accepts += 1;
          connection.onMessage((message) => connection.send(
            typeof message === "string" ? `${name}:${message}` : message,
          ));
        },
      })]),
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
        caseId: "registered-applications-receive-only-their-http-and-websocket-routes", name: "registered applications receive only their HTTP and WebSocket routes",
        run: async () => {
          const alpha = mock_application("alpha", [{ kind: "exact", value: "alpha" }], "/alpha");
          const beta = mock_application("beta", [{ kind: "prefix", value: "beta:" }], "/beta");
          const host = await start_node_application_host({ port: 0, applications: [alpha.registration, beta.registration] });
          try {
            const alphaSocket = await open_websocket(`${host.url}/alpha?locus=alpha`);
            const betaSocket = await open_websocket(`${host.url}/beta?locus=beta%3Aroom`);
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
            await host.dispose();
          }
        },
      }),
      Object.freeze({
        suite,
        caseId: "health-reports-operational-registration-without-authority-state", name: "health reports operational registration without authority state",
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
            await host.dispose();
          }
        },
      }),
      Object.freeze({
        suite,
        caseId: "duplicate-names-http-routes-and-authority-namespaces-reject-atomically", name: "duplicate names, HTTP routes, and authority namespaces reject atomically",
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
          const firstNamespace = mock_application("first-namespace", [{ kind: "prefix", value: "shared:" }], undefined, "/shared");
          const secondNamespace = mock_application("second-namespace", [{ kind: "exact", value: "shared:item" }], undefined, "/shared");
          const namespaceError = await captured_error(() => start_node_application_host({
            port: 0,
            applications: [firstNamespace.registration, secondNamespace.registration],
          }));
          expect_node_host(
            nameError?.message.includes("name") === true
              && routeError?.message.includes("route") === true
              && namespaceError?.message.includes("overlap") === true
              && [firstName, secondName, firstRoute, secondRoute, firstNamespace, secondNamespace]
                .every((application) => application.disposals() === 1),
            "all registration conflicts must fail before listening and dispose each application once",
          );
        },
      }),
      Object.freeze({
        suite,
        caseId: "missing-malformed-and-unmatched-authority-ids-touch-no-application", name: "missing, malformed, and unmatched authority IDs touch no application",
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
              rejected_websocket_status(`${host.url}/unknown?locus=unknown`),
              rejected_websocket_status(`${host.url}/invalid-towl?locus=towl%3ABAD`),
            ]);
            expect_node_host(
              statuses.join(",") === "404,404,404" && hosted.accepts() === 0 && towl.accepts() === 0,
              "unmatched exact connection paths must reject before application dispatch",
            );
          } finally {
            await host.dispose();
          }
        },
      }),
      Object.freeze({
        suite,
        caseId: "shutdown-is-bounded-and-idempotent-with-one-disposal-per-application", name: "shutdown is bounded and idempotent with one disposal per application",
        run: async () => {
          const application = mock_application("shutdown", [{ kind: "exact", value: "shutdown" }]);
          const host = await start_node_application_host({
            port: 0,
            shutdownTimeoutMs: 1_000,
            applications: [application.registration],
          });
          const websocket = await open_websocket(`${host.url}/shutdown?locus=shutdown`);
          const closed = closes(websocket);
          await Promise.all([host.dispose(), host.dispose()]);
          expect_node_host(
            application.disposals() === 1 && await closed === 1001,
            "shutdown must dispose once and preserve the ordinary server-stop close policy",
          );
        },
      }),
      Object.freeze({
        suite,
        caseId: "structured-operational-events-remain-separate-from-application-state", name: "structured operational events remain separate from application state",
        run: async () => {
          const events: string[] = [];
          const application = mock_application("logged", [{ kind: "exact", value: "logged" }], "/logged");
          const host = await start_node_application_host({
            port: 0,
            applications: [application.registration],
            log(event) { events.push(`${event.type}:${event.application ?? ""}:${event.route ?? ""}`); },
          });
          const websocket = await open_websocket(`${host.url}/logged?locus=logged`);
          await fetch(`${host.httpUrl}/logged`);
          websocket.close();
          await host.dispose();
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
        caseId: "shutdown-timeout-returns-a-clear-failure-for-an-undrained-application", name: "shutdown timeout returns a clear failure for an undrained application",
        run: async () => {
          let disposals = 0;
          const blocked: LiveHostApplication = Object.freeze({
            name: "blocked",
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
          const error = await captured_error(host.dispose);
          expect_node_host(
            error?.message.includes("shutdown exceeded 25ms") === true && disposals === 1,
            "bounded shutdown must identify its timeout and invoke application disposal once",
          );
        },
      }),
      Object.freeze({
        suite,
        caseId: "disposing-one-registered-application-leaves-its-peer-operational", name: "disposing one registered application leaves its peer operational",
        run: async () => {
          const first = mock_application("first", [{ kind: "exact", value: "first" }]);
          const second = mock_application("second", [{ kind: "exact", value: "second" }]);
          const host = await start_node_application_host({ port: 0, applications: [first.registration, second.registration] });
          try {
            await first.registration.dispose();
            const peer = await open_websocket(`${host.url}/second?locus=second`);
            expect_node_host(
              first.disposals() === 1 && second.accepts() === 1 && second.disposals() === 0,
              "application disposal must not dispose or suppress peer dispatch",
            );
            peer.close();
          } finally {
            await host.dispose();
          }
          expect_node_host(
            first.disposals() === 1 && second.disposals() === 1,
            "host shutdown must preserve exactly-once disposal after an application was already disposed",
          );
        },
      }),
      Object.freeze({
        suite,
        caseId: "towl-rooms-and-their-disposal-remain-authority-local", name: "TOWL rooms and their disposal remain authority-local",
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
        caseId: "towl-browser-protocol-remains-operational-through-its-node-authority-route", name: "TOWL browser protocol remains operational through its Node authority route",
        run: async () => {
          const towl = create_node_towl_application();
          const host = await start_node_application_host({ port: 0, applications: [towl.registration] });
          const transport = create_browser_locus_socket(
            `${host.url}/towl?locus=towl%3Aroute-room`,
            WebSocket as unknown as BrowserWebSocketConstructor,
          );
          try {
            await transport.ready;
            const client = create_towl_client({
              socket: transport.socket,
              logicalMapId: "towl:route-room",
            });
            client.connect();
            await client.createSession();
            await client.recover();
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
            await host.dispose();
          }
        },
      }),
      Object.freeze({
        suite,
        caseId: "authority-only-startup-creates-no-dom-or-rendering-globals", name: "authority-only startup creates no DOM or rendering globals",
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
            await host.dispose();
          }
        },
      }),
      Object.freeze({
        suite,
        caseId: "bounded-towl-rooms-honor-resumable-grace-then-recreate-a-fresh-incarnation", name: "bounded TOWL rooms honor resumable grace then recreate a fresh incarnation",
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
            rejection?.code === "LOCUS_SESSION_CREDENTIAL_UNKNOWN"
              && typeof newPlan?.incarnationId === "string"
              && newPlan.incarnationId !== oldPlan?.incarnationId,
            "evicted room must reject old credentials and mint a new incarnation",
          );
          second.emit_close();
          await application.dispose();
        },
      }),
    ]),
  });
}
