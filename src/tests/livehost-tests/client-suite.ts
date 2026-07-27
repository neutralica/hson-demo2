// client-suite.ts

import { create_livehost_client, LiveHostDisconnectedError } from "hson-live/livehost";
import type { TestCase, TestSuite } from "../../app/demos/test/tests.types";
import { preview_value, equal_row } from "../livemap-tests/test-helpers";

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

type LiveHostClientReadCaseSpec = Readonly<{
  suite: string;
  name: string;
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

function livehost_client_read_case(spec: LiveHostClientReadCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
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

export function livehost_client_suite(): TestSuite {
  const SUITE = "livehost/client";

  return {
    suite: SUITE,
    cases: [
      livehost_client_read_case({
        suite: SUITE,
        name: "connect sends hello message",
        input: {},
        act: () => {
          const socket = make_memory_socket();
          const client = create_livehost_client({
            socket,
            clientId: "client-a",
          });

          client.connect();
          const [message] = socket.sent() as Array<Record<string, unknown>>;

          return {
            type: message?.type,
            clientId: message?.clientId,
            lastSeq: message?.lastSeq,
            listenerCount: socket.listener_count(),
          };
        },
        expected: {
          type: "hello",
          clientId: "client-a",
          lastSeq: 0,
          listenerCount: 2,
        },
      }),
      livehost_client_read_case({
        suite: SUITE,
        name: "hello replaces client map snapshot",
        input: {},
        act: async () => {
          const socket = make_memory_socket();
          const client = create_livehost_client<{ user: { name: string } }>({ socket });

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
      livehost_client_read_case({
        suite: SUITE,
        name: "sync updates client map path",
        input: {},
        act: async () => {
          const socket = make_memory_socket();
          const client = create_livehost_client<{ user: { name: string } }>({ socket });

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
      livehost_client_read_case({
        suite: SUITE,
        name: "sync at empty path replaces client map",
        input: {},
        act: async () => {
          const socket = make_memory_socket();
          const client = create_livehost_client<{ user: { name: string } }>({ socket });

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
      livehost_client_read_case({
        suite: SUITE,
        name: "subscribe sends path message",
        input: {},
        act: () => {
          const socket = make_memory_socket();
          const client = create_livehost_client({ socket });

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
      livehost_client_read_case({
        suite: SUITE,
        name: "unsubscribe sends path message",
        input: {},
        act: () => {
          const socket = make_memory_socket();
          const client = create_livehost_client({ socket });

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
      livehost_client_read_case({
        suite: SUITE,
        name: "action sends message and resolves ack",
        input: {},
        act: async () => {
          type Actions = Readonly<{
            rename_user: { name: string };
          }>;
          const socket = make_memory_socket();
          const client = create_livehost_client<undefined, Actions>({
            socket,
            actionId: () => "action-a",
          });

          client.connect();
          const resultPromise = client.action("rename_user", { name: "Grace" });
          const [, message] = socket.sent() as Array<Record<string, unknown>>;
          await socket.receive({
            type: "ack",
            id: "action-a",
            ok: true,
            seq: 1,
          });
          const result = await resultPromise;

          return {
            sentType: message?.type,
            sentId: message?.id,
            sentName: message?.name,
            sentPayload: message?.payload,
            resultType: result.type,
            resultSeq: result.seq,
            clientSeq: client.seq,
          };
        },
        expected: {
          sentType: "action",
          sentId: "action-a",
          sentName: "rename_user",
          sentPayload: { name: "Grace" },
          resultType: "ack",
          resultSeq: 1,
          clientSeq: 1,
        },
      }),
      livehost_client_read_case({
        suite: SUITE,
        name: "action resolves matching error",
        input: {},
        act: async () => {
          type Actions = Readonly<{
            fail: undefined;
          }>;
          const socket = make_memory_socket();
          const client = create_livehost_client<undefined, Actions>({
            socket,
            actionId: () => "action-a",
          });

          client.connect();
          const resultPromise = client.action("fail");
          await socket.receive({
            type: "error",
            id: "action-a",
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
      livehost_client_read_case({
        suite: SUITE,
        name: "action ignores unrelated ack until matching result arrives",
        input: {},
        act: async () => {
          type Actions = Readonly<{
            save: { id: string };
          }>;
          const socket = make_memory_socket();
          const client = create_livehost_client<undefined, Actions>({
            socket,
            actionId: () => "action-a",
          });
          let resolved = false;

          client.connect();
          const resultPromise = client.action("save", { id: "row-a" }).then((result) => {
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
            id: "action-a",
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
      livehost_client_read_case({
        suite: SUITE,
        name: "connect is idempotent while already connected",
        input: {},
        act: () => {
          const socket = make_memory_socket();
          const client = create_livehost_client({
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
          first: { type: "hello", clientId: "client-a", lastSeq: 0 },
          second: undefined,
        },
      }),
      livehost_client_read_case({
        suite: SUITE,
        name: "reconnect sends last known seq",
        input: {},
        act: async () => {
          const socket = make_memory_socket();
          const client = create_livehost_client({
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
            secondLastSeq: secondHello?.lastSeq,
            listenerCount: socket.listener_count(),
          };
        },
        expected: {
          seq: 5,
          sentCount: 2,
          secondType: "hello",
          secondClientId: "client-a",
          secondLastSeq: 5,
          listenerCount: 2,
        },
      }),
      livehost_client_read_case({
        suite: SUITE,
        name: "server close detaches listeners",
        input: {},
        act: async () => {
          const socket = make_memory_socket();
          const client = create_livehost_client({ socket });

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
      livehost_client_read_case({
        suite: SUITE,
        name: "invalid server message is ignored",
        input: {},
        act: async () => {
          const socket = make_memory_socket();
          const client = create_livehost_client({ socket });

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
      livehost_client_read_case({
        suite: SUITE,
        name: "action without payload omits payload field",
        input: {},
        act: async () => {
          type Actions = Readonly<{
            ping: undefined;
          }>;
          const socket = make_memory_socket();
          const client = create_livehost_client<undefined, Actions>({
            socket,
            actionId: () => "action-a",
          });

          client.connect();
          const resultPromise = client.action("ping");
          const [, message] = socket.sent() as Array<Record<string, unknown>>;
          await socket.receive({
            type: "ack",
            id: "action-a",
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
      livehost_client_read_case({
        suite: SUITE,
        name: "disconnect detaches socket listeners",
        input: {},
        act: async () => {
          const socket = make_memory_socket();
          const client = create_livehost_client({ socket });

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
      livehost_client_read_case({
        suite: SUITE,
        name: "action resolves ack result payload",
        input: {},
        act: async () => {
          type Actions = Readonly<{ read: undefined }>;
          const socket = make_memory_socket();
          const client = create_livehost_client<undefined, Actions>({ socket, actionId: () => "result-a" });
          client.connect();
          const resultPromise = client.action("read");
          await socket.receive({
            type: "ack",
            id: "result-a",
            ok: true,
            seq: 1,
            result: { status: "done", count: 2 },
          });
          const result = await resultPromise;
          return result.type === "ack" ? result.result : undefined;
        },
        expected: { status: "done", count: 2 },
      }),
      livehost_client_read_case({
        suite: SUITE,
        name: "disconnect rejects pending action with stable error",
        input: {},
        act: async () => {
          type Actions = Readonly<{ wait: undefined }>;
          const socket = make_memory_socket();
          const client = create_livehost_client<undefined, Actions>({ socket, actionId: () => "pending-a" });
          client.connect();
          const outcome = client.action("wait").then(
            () => ({ resolved: true as const }),
            (error: unknown) => ({
              resolved: false as const,
              instance: error instanceof LiveHostDisconnectedError,
              name: error instanceof Error ? error.name : undefined,
              code: typeof error === "object" && error !== null && "code" in error ? error.code : undefined,
            }),
          );

          client.disconnect();
          client.disconnect();

          return { outcome: await outcome, listenerCount: socket.listener_count() };
        },
        expected: {
          outcome: { resolved: false, instance: true, name: "LiveHostDisconnectedError", code: "LIVEHOST_DISCONNECTED" },
          listenerCount: 0,
        },
      }),
      livehost_client_read_case({
        suite: SUITE,
        name: "socket close rejects every pending action once",
        input: {},
        act: async () => {
          type Actions = Readonly<{ wait: { index: number } }>;
          const socket = make_memory_socket();
          let nextId = 0;
          const client = create_livehost_client<undefined, Actions>({
            socket,
            actionId: () => `pending-${nextId += 1}`,
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
          outcomes: ["LiveHostDisconnectedError", "LiveHostDisconnectedError", "LiveHostDisconnectedError"],
          settlements: [1, 1, 1],
          listenerCount: 0,
        },
      }),
      livehost_client_read_case({
        suite: SUITE,
        name: "disconnect leaves completed action settled and ignores late results",
        input: {},
        act: async () => {
          type Actions = Readonly<{ wait: undefined }>;
          const socket = make_memory_socket();
          const ids = ["completed", "pending"];
          let nextId = 0;
          let pendingSettlements = 0;
          const client = create_livehost_client<undefined, Actions>({ socket, actionId: () => ids[nextId++]! });
          client.connect();
          const completed = client.action("wait");
          const pending = client.action("wait").then(
            () => "resolved",
            () => {
              pendingSettlements += 1;
              return "rejected";
            },
          );
          await socket.receive({ type: "ack", id: "completed", ok: true, seq: 1 });
          client.disconnect();
          const completedResult = await completed;
          const pendingResult = await pending;
          await socket.receive({ type: "ack", id: "pending", ok: true, seq: 2 });
          await socket.receive({ type: "error", id: "pending", ok: false, seq: 3, error: { message: "late" } });

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
      livehost_client_read_case({
        suite: SUITE,
        name: "reconnect starts with no stale pending actions",
        input: {},
        act: async () => {
          type Actions = Readonly<{ wait: undefined }>;
          const socket = make_memory_socket();
          const ids = ["old-action", "new-action"];
          let nextId = 0;
          const client = create_livehost_client<undefined, Actions>({ socket, actionId: () => ids[nextId++]! });
          client.connect();
          const oldOutcome = client.action("wait").then(
            () => "resolved",
            () => "rejected",
          );
          client.disconnect();
          client.connect();
          const newAction = client.action("wait");
          await socket.receive({ type: "ack", id: "old-action", ok: true, seq: 1 });
          await socket.receive({ type: "error", id: "old-action", ok: false, seq: 2, error: { message: "late" } });
          await socket.receive({ type: "ack", id: "new-action", ok: true, seq: 3 });
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
      livehost_client_read_case({
        suite: SUITE,
        name: "disconnect then socket close is idempotent",
        input: {},
        act: async () => {
          type Actions = Readonly<{ wait: undefined }>;
          const socket = make_memory_socket();
          let settlements = 0;
          const client = create_livehost_client<undefined, Actions>({ socket });
          client.connect();
          const outcome = client.action("wait").catch((error: unknown) => {
            settlements += 1;
            return error instanceof Error ? error.name : "unknown";
          });
          client.disconnect();
          socket.close();

          return { outcome: await outcome, settlements, listenerCount: socket.listener_count() };
        },
        expected: { outcome: "LiveHostDisconnectedError", settlements: 1, listenerCount: 0 },
      }),
      livehost_client_read_case({
        suite: SUITE,
        name: "action before connect rejects without allocating or sending",
        input: {},
        act: async () => {
          type Actions = Readonly<{ wait: undefined }>;
          const socket = make_memory_socket();
          let actionIdCalls = 0;
          const client = create_livehost_client<undefined, Actions>({
            socket,
            actionId: () => `action-${actionIdCalls += 1}`,
          });
          const error = await client.action("wait").catch((reason: unknown) => reason);

          return {
            instance: error instanceof LiveHostDisconnectedError,
            name: error instanceof Error ? error.name : undefined,
            actionIdCalls,
            sentCount: socket.sent().length,
          };
        },
        expected: {
          instance: true,
          name: "LiveHostDisconnectedError",
          actionIdCalls: 1,
          sentCount: 0,
        },
      }),
      livehost_client_read_case({
        suite: SUITE,
        name: "action after explicit disconnect rejects without allocating or sending",
        input: {},
        act: async () => {
          type Actions = Readonly<{ wait: undefined }>;
          const socket = make_memory_socket();
          let actionIdCalls = 0;
          const client = create_livehost_client<undefined, Actions>({
            socket,
            actionId: () => `action-${actionIdCalls += 1}`,
          });
          client.connect();
          client.disconnect();
          const error = await client.action("wait").catch((reason: unknown) => reason);

          return {
            instance: error instanceof LiveHostDisconnectedError,
            actionIdCalls,
            sentCount: socket.sent().length,
          };
        },
        expected: { instance: true, actionIdCalls: 1, sentCount: 1 },
      }),
      livehost_client_read_case({
        suite: SUITE,
        name: "action after socket close rejects without allocating or sending",
        input: {},
        act: async () => {
          type Actions = Readonly<{ wait: undefined }>;
          const socket = make_memory_socket();
          let actionIdCalls = 0;
          const client = create_livehost_client<undefined, Actions>({
            socket,
            actionId: () => `action-${actionIdCalls += 1}`,
          });
          client.connect();
          socket.close();
          const error = await client.action("wait").catch((reason: unknown) => reason);

          return {
            instance: error instanceof LiveHostDisconnectedError,
            actionIdCalls,
            sentCount: socket.sent().length,
          };
        },
        expected: { instance: true, actionIdCalls: 1, sentCount: 1 },
      }),
      livehost_client_read_case({
        suite: SUITE,
        name: "duplicate logical request IDs retain independent delivery attempts",
        input: {},
        act: async () => {
          type Actions = Readonly<{ wait: undefined }>;
          const socket = make_memory_socket();
          const client = create_livehost_client<undefined, Actions>({ socket, actionId: () => "duplicate" });
          client.connect();
          const first = client.action("wait");
          const second = client.action("wait");
          const sent = socket.sent() as Array<Record<string, unknown>>;
          await socket.receive({ type: "ack", id: "duplicate", attemptId: sent[1]?.attemptId, ok: true, seq: 1 });
          await socket.receive({ type: "ack", id: "duplicate", attemptId: sent[2]?.attemptId, ok: true, seq: 2 });
          const firstResult = await first;
          const secondResult = await second;

          return {
            firstType: firstResult.type,
            secondType: secondResult.type,
            sentTypes: (socket.sent() as Array<Record<string, unknown>>).map((message) => message.type),
          };
        },
        expected: {
          firstType: "ack",
          secondType: "ack",
          sentTypes: ["hello", "action", "action"],
        },
      }),
      livehost_client_read_case({
        suite: SUITE,
        name: "event listeners receive once and dispose idempotently",
        input: {},
        act: async () => {
          const socket = make_memory_socket();
          const client = create_livehost_client({ socket });
          const first: string[] = [];
          const second: string[] = [];
          const stopFirst = client.on_event((message) => first.push(message.event));
          client.on_event((message) => second.push(message.event));
          client.connect();
          await socket.receive({ type: "event", event: "one", payload: { n: 1 } });
          stopFirst();
          stopFirst();
          await socket.receive({ type: "event", event: "two", payload: { n: 2 } });
          return { first, second };
        },
        expected: { first: ["one"], second: ["one", "two"] },
      }),
      livehost_client_read_case({
        suite: SUITE,
        name: "events do not settle pending actions",
        input: {},
        act: async () => {
          type Actions = Readonly<{ wait: undefined }>;
          const socket = make_memory_socket();
          const client = create_livehost_client<undefined, Actions>({ socket, actionId: () => "pending" });
          client.connect();
          let settled = false;
          const pending = client.action("wait").then((result) => {
            settled = true;
            return result;
          });
          await socket.receive({ type: "event", event: "notice", payload: null });
          const settledAfterEvent = settled;
          await socket.receive({ type: "ack", id: "pending", ok: true, seq: 1 });
          const result = await pending;
          return { settledAfterEvent, resultType: result.type };
        },
        expected: { settledAfterEvent: false, resultType: "ack" },
      }),
      livehost_client_read_case({
        suite: SUITE,
        name: "event listeners persist across reconnect without detached delivery",
        input: {},
        act: async () => {
          const socket = make_memory_socket();
          const client = create_livehost_client({ socket });
          const received: string[] = [];
          client.on_event((message) => received.push(message.event));
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
