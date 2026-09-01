// client-suite.ts

import { LocusDisconnectedError } from "hson-live/locus";
import { create_echo } from "hson-live/echo";
import type { TestCase, TestSuite } from "../../harness/core/test-contracts";
import { preview_value, equal_row } from "../livemap/test-helpers";

type MemorySocketMessageListener = (message: string) => void;
type MemorySocketCloseListener = () => void;

type MemorySocket = Readonly<{
  send: (message: string) => void;
  close: () => void;
  onMessage: (listener: MemorySocketMessageListener) => () => void;
  onClose: (listener: MemorySocketCloseListener) => () => void;
  receive: (message: unknown) => Promise<void>;
  sent: () => unknown[];
  sent_raw: () => string[];
  listener_count: () => number;
}>;

type LocusClientReadCaseSpec = Readonly<{
  suite: string;
  caseId: string; name: string;
  input: unknown;
  act: () => unknown | Promise<unknown>;
  expected: unknown;
}>;

function make_memory_socket(): MemorySocket {
  const sentMessages: string[] = [];
  const messageListeners = new Set<MemorySocketMessageListener>();
  const closeListeners = new Set<MemorySocketCloseListener>();

  function send(message: string): void {
    sentMessages.push(message);
  }

  function close(): void {
    for (const listener of Array.from(closeListeners)) listener();
  }

  function onMessage(listener: MemorySocketMessageListener): () => void {
    messageListeners.add(listener);
    return () => {
      messageListeners.delete(listener);
    };
  }

  function onClose(listener: MemorySocketCloseListener): () => void {
    closeListeners.add(listener);
    return () => {
      closeListeners.delete(listener);
    };
  }

  async function receive(message: unknown): Promise<void> {
    const encoded = JSON.stringify(message);
    for (const listener of Array.from(messageListeners)) listener(encoded);
    await Promise.resolve();
  }

  function sent(): unknown[] {
    return sentMessages.map((message) => JSON.parse(message) as unknown);
  }

  function sent_raw(): string[] {
    return [...sentMessages];
  }

  function listener_count(): number {
    return messageListeners.size + closeListeners.size;
  }

  return Object.freeze({
    send,
    close,
    onMessage,
    onClose,
    receive,
    sent,
    sent_raw,
    listener_count,
  });
}

function locus_client_read_case(spec: LocusClientReadCaseSpec): TestCase {
  return {
    suite: spec.suite,
    caseId: spec.caseId, name: spec.name,
    meta: {
      input: preview_value(spec.input),
    },
    run: async () => {
      const value = await spec.act();

      return {
        assertRows: [
          equal_row(`${spec.name}: value`, value, spec.expected),
        ],
      };
    },
  };
}

export function locus_client_suite(): TestSuite {
  const SUITE = "livehost/client";

  return {
    suite: SUITE,
    cases: [
      locus_client_read_case({
        suite: SUITE,
        caseId: "connect-sends-hello-message", name: "connect sends hello message",
        input: {},
        act: () => {
          const socket = make_memory_socket();
          const client = create_echo({
            socket,
            clientId: "client-a",
          });

          client.connect();
          const [message] = socket.sent() as Array<Record<string, unknown>>;

          return {
            type: message?.type,
            clientId: message?.clientId,
            hasLastSeq: Object.hasOwn(message ?? {}, "lastSeq"),
            listenerCount: socket.listener_count(),
          };
        },
        expected: {
          type: "hello",
          clientId: "client-a",
          hasLastSeq: false,
          listenerCount: 2,
        },
      }),
      locus_client_read_case({
        suite: SUITE,
        caseId: "hello-replaces-client-map-snapshot", name: "hello replaces client map snapshot",
        input: {},
        act: async () => {
          const socket = make_memory_socket();
          const client = create_echo<{ user: { name: string } }>({ socket });

          client.connect();
          await socket.receive({
            type: "hello",
            sessionId: "session-a",
            seq: 3,
            snapshot: { user: { name: "Ada" } },
          });

          return {
            seq: client.seq,
            root: client.map.snap(),
            name: client.map.at(["user", "name"]).snap(),
          };
        },
        expected: {
          seq: 3,
          root: { user: { name: "Ada" } },
          name: "Ada",
        },
      }),
      locus_client_read_case({
        suite: SUITE,
        caseId: "sync-updates-client-map-path", name: "sync updates client map path",
        input: {},
        act: async () => {
          const socket = make_memory_socket();
          const client = create_echo<{ user: { name: string } }>({ socket });

          client.connect();
          await socket.receive({
            type: "hello",
            sessionId: "session-a",
            seq: 0,
            snapshot: { user: { name: "Ada" } },
          });
          await socket.receive({
            type: "sync",
            seq: 1,
            path: ["user", "name"],
            value: "Grace",
          });

          return {
            seq: client.seq,
            root: client.map.snap(),
            name: client.map.at(["user", "name"]).snap(),
          };
        },
        expected: {
          seq: 1,
          root: { user: { name: "Grace" } },
          name: "Grace",
        },
      }),
      locus_client_read_case({
        suite: SUITE,
        caseId: "sync-at-empty-path-replaces-client-map", name: "sync at empty path replaces client map",
        input: {},
        act: async () => {
          const socket = make_memory_socket();
          const client = create_echo<{ user: { name: string } }>({ socket });

          client.connect();
          await socket.receive({
            type: "hello",
            sessionId: "session-a",
            seq: 0,
            snapshot: { user: { name: "Ada" } },
          });
          await socket.receive({
            type: "sync",
            seq: 1,
            path: [],
            value: { user: { name: "Grace" } },
          });

          return {
            seq: client.seq,
            root: client.map.snap(),
            name: client.map.at(["user", "name"]).snap(),
          };
        },
        expected: {
          seq: 1,
          root: { user: { name: "Grace" } },
          name: "Grace",
        },
      }),
      locus_client_read_case({
        suite: SUITE,
        caseId: "subscribe-sends-path-message", name: "subscribe sends path message",
        input: {},
        act: () => {
          const socket = make_memory_socket();
          const client = create_echo({ socket });

          client.subscribe(["ui", "selected"]);
          const [message] = socket.sent() as Array<Record<string, unknown>>;

          return {
            type: message?.type,
            path: message?.path,
          };
        },
        expected: {
          type: "subscribe",
          path: ["ui", "selected"],
        },
      }),
      locus_client_read_case({
        suite: SUITE,
        caseId: "unsubscribe-sends-path-message", name: "unsubscribe sends path message",
        input: {},
        act: () => {
          const socket = make_memory_socket();
          const client = create_echo({ socket });

          client.unsubscribe(["ui", "selected"]);
          const [message] = socket.sent() as Array<Record<string, unknown>>;

          return {
            type: message?.type,
            path: message?.path,
          };
        },
        expected: {
          type: "unsubscribe",
          path: ["ui", "selected"],
        },
      }),
      locus_client_read_case({
        suite: SUITE,
        caseId: "action-sends-message-and-resolves-ack", name: "action sends message and resolves ack",
        input: {},
        act: async () => {
          type Actions = Readonly<{
            rename_user: { name: string };
          }>;
          const socket = make_memory_socket();
          const client = create_echo<undefined, Actions>({
            socket,
          });

          client.connect();
          const resultPromise = client.action("rename_user", { name: "Grace" });
          const [, message] = socket.sent() as Array<Record<string, unknown>>;
          await socket.receive({
            type: "ack",
            id: resultPromise.request.requestId,
            ok: true,
            seq: 1,
          });
          const result = await resultPromise;

          return {
            sentType: message?.type,
            requestMatches: message?.id === resultPromise.request.requestId,
            sentName: message?.name,
            sentPayload: message?.payload,
            resultType: result.type,
            resultSeq: result.seq,
            clientSeq: client.seq,
          };
        },
        expected: {
          sentType: "action",
          requestMatches: true,
          sentName: "rename_user",
          sentPayload: { name: "Grace" },
          resultType: "ack",
          resultSeq: 1,
          clientSeq: 1,
        },
      }),
      locus_client_read_case({
        suite: SUITE,
        caseId: "action-resolves-matching-error", name: "action resolves matching error",
        input: {},
        act: async () => {
          type Actions = Readonly<{
            fail: undefined;
          }>;
          const socket = make_memory_socket();
          const client = create_echo<undefined, Actions>({
            socket,
          });

          client.connect();
          const resultPromise = client.action("fail");
          await socket.receive({
            type: "error",
            id: resultPromise.request.requestId,
            ok: false,
            seq: 2,
            error: { message: "Nope.", code: "NOPE" },
          });
          const result = await resultPromise;

          return {
            resultType: result.type,
            resultSeq: result.seq,
            message: result.type === "error" ? result.error.message : undefined,
            code: result.type === "error" ? result.error.code : undefined,
            clientSeq: client.seq,
          };
        },
        expected: {
          resultType: "error",
          resultSeq: 2,
          message: "Nope.",
          code: "NOPE",
          clientSeq: 2,
        },
      }),
      locus_client_read_case({
        suite: SUITE,
        caseId: "action-ignores-unrelated-ack-until-matching-result-arrives", name: "action ignores unrelated ack until matching result arrives",
        input: {},
        act: async () => {
          type Actions = Readonly<{
            save: { id: string };
          }>;
          const socket = make_memory_socket();
          const client = create_echo<undefined, Actions>({
            socket,
          });
          let resolved = false;

          client.connect();
          const action = client.action("save", { id: "row-a" });
          const resultPromise = action.then((result) => {
            resolved = true;
            return result;
          });
          await socket.receive({
            type: "ack",
            id: "other-action",
            ok: true,
            seq: 1,
          });
          const afterUnrelated = resolved;
          await socket.receive({
            type: "ack",
            id: action.request.requestId,
            ok: true,
            seq: 2,
          });
          const result = await resultPromise;

          return {
            afterUnrelated,
            resultType: result.type,
            resultSeq: result.seq,
            clientSeq: client.seq,
          };
        },
        expected: {
          afterUnrelated: false,
          resultType: "ack",
          resultSeq: 2,
          clientSeq: 2,
        },
      }),
      locus_client_read_case({
        suite: SUITE,
        caseId: "connect-is-idempotent-while-already-connected", name: "connect is idempotent while already connected",
        input: {},
        act: () => {
          const socket = make_memory_socket();
          const client = create_echo({
            socket,
            clientId: "client-a",
          });

          client.connect();
          client.connect();

          return {
            sentCount: socket.sent().length,
            listenerCount: socket.listener_count(),
            first: socket.sent()[0],
            second: socket.sent()[1],
          };
        },
        expected: {
          sentCount: 1,
          listenerCount: 2,
          first: { type: "hello", clientId: "client-a" },
          second: undefined,
        },
      }),
      locus_client_read_case({
        suite: SUITE,
        caseId: "reconnect-sends-fresh-hello-without-historical-cursor", name: "reconnect sends fresh hello without historical cursor",
        input: {},
        act: async () => {
          const socket = make_memory_socket();
          const client = create_echo({
            socket,
            clientId: "client-a",
          });

          client.connect();
          await socket.receive({
            type: "hello",
            sessionId: "session-a",
            seq: 5,
            snapshot: { ready: true },
          });
          client.disconnect();
          client.connect();

          const [, secondHello] = socket.sent() as Array<Record<string, unknown>>;
          return {
            seq: client.seq,
            sentCount: socket.sent().length,
            secondType: secondHello?.type,
            secondClientId: secondHello?.clientId,
            secondHasLastSeq: Object.hasOwn(secondHello ?? {}, "lastSeq"),
            listenerCount: socket.listener_count(),
          };
        },
        expected: {
          seq: 5,
          sentCount: 2,
          secondType: "hello",
          secondClientId: "client-a",
          secondHasLastSeq: false,
          listenerCount: 2,
        },
      }),
      locus_client_read_case({
        suite: SUITE,
        caseId: "server-close-detaches-listeners", name: "server close detaches listeners",
        input: {},
        act: async () => {
          const socket = make_memory_socket();
          const client = create_echo({ socket });

          client.connect();
          const before = socket.listener_count();
          socket.close();
          const after = socket.listener_count();
          await socket.receive({
            type: "hello",
            sessionId: "session-a",
            seq: 9,
            snapshot: { ignored: true },
          });

          return {
            before,
            after,
            seq: client.seq,
            root: client.map.snap(),
          };
        },
        expected: {
          before: 2,
          after: 0,
          seq: 0,
          root: {},
        },
      }),
      locus_client_read_case({
        suite: SUITE,
        caseId: "invalid-server-message-is-ignored", name: "invalid server message is ignored",
        input: {},
        act: async () => {
          const socket = make_memory_socket();
          const client = create_echo({ socket });

          client.connect();
          await socket.receive(["not", "a", "message"]);
          await socket.receive("not an object");

          return {
            seq: client.seq,
            root: client.map.snap(),
            sentCount: socket.sent().length,
            listenerCount: socket.listener_count(),
          };
        },
        expected: {
          seq: 0,
          root: {},
          sentCount: 1,
          listenerCount: 2,
        },
      }),
      locus_client_read_case({
        suite: SUITE,
        caseId: "action-without-payload-omits-payload-field", name: "action without payload omits payload field",
        input: {},
        act: async () => {
          type Actions = Readonly<{
            ping: undefined;
          }>;
          const socket = make_memory_socket();
          const client = create_echo<undefined, Actions>({
            socket,
          });

          client.connect();
          const resultPromise = client.action("ping");
          const [, message] = socket.sent() as Array<Record<string, unknown>>;
          await socket.receive({
            type: "ack",
            id: resultPromise.request.requestId,
            ok: true,
            seq: 1,
          });
          const result = await resultPromise;

          return {
            sentType: message?.type,
            sentName: message?.name,
            hasPayload: Object.prototype.hasOwnProperty.call(message ?? {}, "payload"),
            resultType: result.type,
            clientSeq: client.seq,
          };
        },
        expected: {
          sentType: "action",
          sentName: "ping",
          hasPayload: false,
          resultType: "ack",
          clientSeq: 1,
        },
      }),
      locus_client_read_case({
        suite: SUITE,
        caseId: "disconnect-detaches-socket-listeners", name: "disconnect detaches socket listeners",
        input: {},
        act: async () => {
          const socket = make_memory_socket();
          const client = create_echo({ socket });

          client.connect();
          const before = socket.listener_count();
          client.disconnect();
          const after = socket.listener_count();
          await socket.receive({
            type: "hello",
            sessionId: "session-a",
            seq: 7,
            snapshot: { ignored: true },
          });

          return {
            before,
            after,
            seq: client.seq,
            root: client.map.snap(),
          };
        },
        expected: {
          before: 2,
          after: 0,
          seq: 0,
          root: {},
        },
      }),
      locus_client_read_case({
        suite: SUITE,
        caseId: "action-resolves-ack-result-payload", name: "action resolves ack result payload",
        input: {},
        act: async () => {
          type Actions = Readonly<{ read: undefined }>;
          const socket = make_memory_socket();
          const client = create_echo<undefined, Actions>({ socket });
          client.connect();
          const resultPromise = client.action("read");
          await socket.receive({
            type: "ack",
            id: resultPromise.request.requestId,
            ok: true,
            seq: 1,
            result: { status: "done", count: 2 },
          });
          const result = await resultPromise;
          return result.type === "ack" ? result.result : undefined;
        },
        expected: { status: "done", count: 2 },
      }),
      locus_client_read_case({
        suite: SUITE,
        caseId: "disconnect-rejects-pending-action-with-stable-error", name: "disconnect rejects pending action with stable error",
        input: {},
        act: async () => {
          type Actions = Readonly<{ wait: undefined }>;
          const socket = make_memory_socket();
          const client = create_echo<undefined, Actions>({ socket });
          client.connect();
          const outcome = client.action("wait").then(
            () => ({ resolved: true as const }),
            (error: unknown) => ({
              resolved: false as const,
              instance: error instanceof LocusDisconnectedError,
              name: error instanceof Error ? error.name : undefined,
              code: typeof error === "object" && error !== null && "code" in error ? error.code : undefined,
            }),
          );

          client.disconnect();
          client.disconnect();

          return { outcome: await outcome, listenerCount: socket.listener_count() };
        },
        expected: {
          outcome: { resolved: false, instance: true, name: "LocusDisconnectedError", code: "LOCUS_DISCONNECTED" },
          listenerCount: 0,
        },
      }),
      locus_client_read_case({
        suite: SUITE,
        caseId: "socket-close-rejects-every-pending-action-once", name: "socket close rejects every pending action once",
        input: {},
        act: async () => {
          type Actions = Readonly<{ wait: { index: number } }>;
          const socket = make_memory_socket();
          const client = create_echo<undefined, Actions>({
            socket,
          });
          const settlements = [0, 0, 0];
          client.connect();
          const outcomes = [0, 1, 2].map((index) => client.action("wait", { index }).then(
            () => "resolved",
            (error: unknown) => {
              settlements[index] = (settlements[index] ?? 0) + 1;
              return error instanceof Error ? error.name : "unknown";
            },
          ));

          socket.close();
          client.disconnect();

          return {
            outcomes: await Promise.all(outcomes),
            settlements,
            listenerCount: socket.listener_count(),
          };
        },
        expected: {
          outcomes: ["LocusDisconnectedError", "LocusDisconnectedError", "LocusDisconnectedError"],
          settlements: [1, 1, 1],
          listenerCount: 0,
        },
      }),
      locus_client_read_case({
        suite: SUITE,
        caseId: "disconnect-leaves-completed-action-settled-and-ignores-late-results", name: "disconnect leaves completed action settled and ignores late results",
        input: {},
        act: async () => {
          type Actions = Readonly<{ wait: undefined }>;
          const socket = make_memory_socket();
          let pendingSettlements = 0;
          const client = create_echo<undefined, Actions>({ socket });
          client.connect();
          const completed = client.action("wait");
          const pendingAction = client.action("wait");
          const pending = pendingAction.then(
            () => "resolved",
            () => {
              pendingSettlements += 1;
              return "rejected";
            },
          );
          await socket.receive({ type: "ack", id: completed.request.requestId, ok: true, seq: 1 });
          client.disconnect();
          const completedResult = await completed;
          const pendingResult = await pending;
          await socket.receive({ type: "ack", id: pendingAction.request.requestId, ok: true, seq: 2 });
          await socket.receive({ type: "error", id: pendingAction.request.requestId, ok: false, seq: 3, error: { message: "late" } });

          return {
            completedType: completedResult.type,
            pendingResult,
            pendingSettlements,
            seq: client.seq,
          };
        },
        expected: {
          completedType: "ack",
          pendingResult: "rejected",
          pendingSettlements: 1,
          seq: 1,
        },
      }),
      locus_client_read_case({
        suite: SUITE,
        caseId: "reconnect-starts-with-no-stale-pending-actions", name: "reconnect starts with no stale pending actions",
        input: {},
        act: async () => {
          type Actions = Readonly<{ wait: undefined }>;
          const socket = make_memory_socket();
          const client = create_echo<undefined, Actions>({ socket });
          client.connect();
          const oldAction = client.action("wait");
          const oldOutcome = oldAction.then(
            () => "resolved",
            () => "rejected",
          );
          client.disconnect();
          client.connect();
          const newAction = client.action("wait");
          await socket.receive({ type: "ack", id: oldAction.request.requestId, ok: true, seq: 1 });
          await socket.receive({ type: "error", id: oldAction.request.requestId, ok: false, seq: 2, error: { message: "late" } });
          await socket.receive({ type: "ack", id: newAction.request.requestId, ok: true, seq: 3 });
          const newResult = await newAction;

          return {
            oldOutcome: await oldOutcome,
            newType: newResult.type,
            newSeq: newResult.seq,
            clientSeq: client.seq,
          };
        },
        expected: {
          oldOutcome: "rejected",
          newType: "ack",
          newSeq: 3,
          clientSeq: 3,
        },
      }),
      locus_client_read_case({
        suite: SUITE,
        caseId: "disconnect-then-socket-close-is-idempotent", name: "disconnect then socket close is idempotent",
        input: {},
        act: async () => {
          type Actions = Readonly<{ wait: undefined }>;
          const socket = make_memory_socket();
          let settlements = 0;
          const client = create_echo<undefined, Actions>({ socket });
          client.connect();
          const outcome = client.action("wait").catch((error: unknown) => {
            settlements += 1;
            return error instanceof Error ? error.name : "unknown";
          });
          client.disconnect();
          socket.close();

          return { outcome: await outcome, settlements, listenerCount: socket.listener_count() };
        },
        expected: { outcome: "LocusDisconnectedError", settlements: 1, listenerCount: 0 },
      }),
      locus_client_read_case({
        suite: SUITE,
        caseId: "event-listeners-receive-once-and-dispose-idempotently", name: "event listeners receive once and dispose idempotently",
        input: {},
        act: async () => {
          const socket = make_memory_socket();
          const client = create_echo({ socket });
          const first: string[] = [];
          const second: string[] = [];
          const stopFirst = client.onEvent((message) => first.push(message.event));
          client.onEvent((message) => second.push(message.event));
          client.connect();
          await socket.receive({ type: "event", event: "one", payload: { n: 1 } });
          stopFirst();
          stopFirst();
          await socket.receive({ type: "event", event: "two", payload: { n: 2 } });
          return { first, second };
        },
        expected: { first: ["one"], second: ["one", "two"] },
      }),
      locus_client_read_case({
        suite: SUITE,
        caseId: "events-do-not-settle-pending-actions", name: "events do not settle pending actions",
        input: {},
        act: async () => {
          type Actions = Readonly<{ wait: undefined }>;
          const socket = make_memory_socket();
          const client = create_echo<undefined, Actions>({ socket });
          client.connect();
          let settled = false;
          const action = client.action("wait");
          const pending = action.then((result) => {
            settled = true;
            return result;
          });
          await socket.receive({ type: "event", event: "notice", payload: null });
          const settledAfterEvent = settled;
          await socket.receive({ type: "ack", id: action.request.requestId, ok: true, seq: 1 });
          const result = await pending;
          return { settledAfterEvent, resultType: result.type };
        },
        expected: { settledAfterEvent: false, resultType: "ack" },
      }),
      locus_client_read_case({
        suite: SUITE,
        caseId: "event-listeners-persist-across-reconnect-without-detached-delivery", name: "event listeners persist across reconnect without detached delivery",
        input: {},
        act: async () => {
          const socket = make_memory_socket();
          const client = create_echo({ socket });
          const received: string[] = [];
          client.onEvent((message) => received.push(message.event));
          client.connect();
          client.disconnect();
          await socket.receive({ type: "event", event: "detached", payload: null });
          client.connect();
          await socket.receive({ type: "event", event: "reconnected", payload: null });
          return { received, socketListenerCount: socket.listener_count() };
        },
        expected: { received: ["reconnected"], socketListenerCount: 2 },
      }),
    ] as const,
  };
}
