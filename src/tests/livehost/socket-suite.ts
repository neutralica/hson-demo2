// livehost/socket-suite.ts

import { create_livehost } from "hson-live";
import type { TestCase, TestSuite } from "../../app/demos/test/tests.types";
import { equal_row, preview_value } from "../livemap/test-helpers";

type LiveHostSocketReadCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: unknown;
  act: () => unknown | Promise<unknown>;
  expected: unknown;
}>;

type MemorySocketMessageListener = (message: string) => void | Promise<void>;
type MemorySocketCloseListener = () => void;

type MemorySocket = Readonly<{
  send: (message: string) => void;
  close: (code?: number, reason?: string) => void;
  onMessage: (listener: MemorySocketMessageListener) => () => void;
  onClose: (listener: MemorySocketCloseListener) => () => void;
  receive: (message: unknown) => Promise<void>;
  receive_raw: (message: string) => Promise<void>;
  sent: () => readonly unknown[];
  sent_raw: () => readonly string[];
  listener_count: () => number;
}>;

function livehost_socket_read_case(spec: LiveHostSocketReadCaseSpec): TestCase {
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

function make_memory_socket(): MemorySocket {
  const sentMessages: string[] = [];
  const messageListeners = new Set<MemorySocketMessageListener>();
  const closeListeners = new Set<MemorySocketCloseListener>();

  return {
    send: (message) => {
      sentMessages.push(message);
    },
    close: () => {
      for (const listener of [...closeListeners]) listener();
    },
    onMessage: (listener) => {
      messageListeners.add(listener);
      return () => {
        messageListeners.delete(listener);
      };
    },
    onClose: (listener) => {
      closeListeners.add(listener);
      return () => {
        closeListeners.delete(listener);
      };
    },
    receive: async (message) => {
      const raw = JSON.stringify(message);
      for (const listener of [...messageListeners]) await listener(raw);
    },
    receive_raw: async (message) => {
      for (const listener of [...messageListeners]) await listener(message);
    },
    sent: () => sentMessages.map((message) => JSON.parse(message) as unknown),
    sent_raw: () => [...sentMessages],
    listener_count: () => messageListeners.size + closeListeners.size,
  };
}

export function livehost_socket_suite(): TestSuite {
  const SUITE = "livehost/socket";

  return {
    suite: SUITE,
    cases: [
      livehost_socket_read_case({
        suite: SUITE,
        name: "connect hello sends snapshot",
        input: {},
        act: async () => {
          const host = create_livehost({
            state: { user: { name: "Ada" } },
            sessionId: "session-a",
          });
          const socket = make_memory_socket();

          host.connect(socket);
          await socket.receive({ type: "hello", clientId: "client-a", lastSeq: 0 });

          const [message] = socket.sent() as Array<Record<string, unknown>>;
          return {
            type: message?.type,
            sessionId: message?.sessionId,
            seq: message?.seq,
            snapshot: message?.snapshot,
          };
        },
        expected: {
          type: "hello",
          sessionId: "session-a",
          seq: 0,
          snapshot: { user: { name: "Ada" } },
        },
      }),
      livehost_socket_read_case({
        suite: SUITE,
        name: "connect invalid json sends error",
        input: {},
        act: async () => {
          const host = create_livehost({ state: {} });
          const socket = make_memory_socket();

          host.connect(socket);
          await socket.receive_raw("{ nope");

          const [message] = socket.sent() as Array<Record<string, any>>;
          return {
            type: message?.type,
            seq: message?.seq,
            message: message?.error?.message,
          };
        },
        expected: {
          type: "error",
          seq: 0,
          message: "Invalid LiveHost message JSON.",
        },
      }),
      livehost_socket_read_case({
        suite: SUITE,
        name: "connect action sends ack and mutates map",
        input: {},
        act: async () => {
          const host = create_livehost({
            state: { user: { name: "Ada" } },
            actions: {
              rename_user: (ctx, payload) => {
                if (!payload || typeof payload !== "object" || Array.isArray(payload)) return;
                const name = (payload as { name?: unknown }).name;
                if (typeof name === "string") ctx.map.set(["user", "name"], name);
              },
            },
          });
          const socket = make_memory_socket();

          host.connect(socket);
          await socket.receive({
            type: "action",
            id: "action-a",
            name: "rename_user",
            payload: { name: "Grace" },
          });

          const [message] = socket.sent() as Array<Record<string, unknown>>;
          return {
            type: message?.type,
            id: message?.id,
            ok: message?.ok,
            seq: message?.seq,
            hostSeq: host.seq,
            name: host.map.at(["user", "name"]).snap(),
          };
        },
        expected: {
          type: "ack",
          id: "action-a",
          ok: true,
          seq: 1,
          hostSeq: 1,
          name: "Grace",
        },
      }),
      livehost_socket_read_case({
        suite: SUITE,
        name: "connect unknown action sends error",
        input: {},
        act: async () => {
          const host = create_livehost({ state: {} });
          const socket = make_memory_socket();

          host.connect(socket);
          await socket.receive({
            type: "action",
            id: "action-a",
            name: "missing_action",
          });

          const [message] = socket.sent() as Array<Record<string, any>>;
          return {
            type: message?.type,
            id: message?.id,
            ok: message?.ok,
            seq: message?.seq,
            hostSeq: host.seq,
            code: message?.error?.code,
            errorMessage: message?.error?.message,
          };
        },
        expected: {
          type: "error",
          id: "action-a",
          ok: false,
          seq: 0,
          hostSeq: 0,
          code: "LIVEHOST_UNKNOWN_ACTION",
          errorMessage: "Unknown LiveHost action: missing_action",
        },
      }),
      livehost_socket_read_case({
        suite: SUITE,
        name: "connect subscribe sends not implemented error",
        input: {},
        act: async () => {
          const host = create_livehost({ state: {} });
          const socket = make_memory_socket();

          host.connect(socket);
          await socket.receive({ type: "subscribe", path: ["ui", "selected"] });

          const [message] = socket.sent() as Array<Record<string, any>>;
          return {
            type: message?.type,
            seq: message?.seq,
            code: message?.error?.code,
            path: message?.error?.path,
            errorMessage: message?.error?.message,
          };
        },
        expected: {
          type: "error",
          seq: 0,
          code: "LIVEHOST_NOT_IMPLEMENTED",
          path: ["ui", "selected"],
          errorMessage: "LiveHost subscribe is not implemented yet.",
        },
      }),
      livehost_socket_read_case({
        suite: SUITE,
        name: "connect unsubscribe sends not implemented error",
        input: {},
        act: async () => {
          const host = create_livehost({ state: {} });
          const socket = make_memory_socket();

          host.connect(socket);
          await socket.receive({ type: "unsubscribe", path: ["ui", "selected"] });

          const [message] = socket.sent() as Array<Record<string, any>>;
          return {
            type: message?.type,
            seq: message?.seq,
            code: message?.error?.code,
            path: message?.error?.path,
            errorMessage: message?.error?.message,
          };
        },
        expected: {
          type: "error",
          seq: 0,
          code: "LIVEHOST_NOT_IMPLEMENTED",
          path: ["ui", "selected"],
          errorMessage: "LiveHost unsubscribe is not implemented yet.",
        },
      }),
      livehost_socket_read_case({
        suite: SUITE,
        name: "connect hello after action reports updated seq and snapshot",
        input: {},
        act: async () => {
          const host = create_livehost({
            state: { user: { name: "Ada" } },
            sessionId: "session-a",
            actions: {
              rename_user: (ctx, payload) => {
                if (!payload || typeof payload !== "object" || Array.isArray(payload)) return;
                const name = (payload as { name?: unknown }).name;
                if (typeof name === "string") ctx.map.set(["user", "name"], name);
              },
            },
          });
          const socket = make_memory_socket();

          host.connect(socket);
          await socket.receive({
            type: "action",
            id: "action-a",
            name: "rename_user",
            payload: { name: "Grace" },
          });
          await socket.receive({ type: "hello", clientId: "client-a", lastSeq: 0 });

          const [, hello] = socket.sent() as Array<Record<string, unknown>>;
          return {
            type: hello?.type,
            sessionId: hello?.sessionId,
            seq: hello?.seq,
            snapshot: hello?.snapshot,
          };
        },
        expected: {
          type: "hello",
          sessionId: "session-a",
          seq: 1,
          snapshot: { user: { name: "Grace" } },
        },
      }),
      livehost_socket_read_case({
        suite: SUITE,
        name: "connect two actions return increasing ack seqs",
        input: {},
        act: async () => {
          const host = create_livehost({
            state: { count: 0 },
            actions: {
              increment: (ctx) => {
                const current = ctx.map.at(["count"]).snap();
                ctx.map.set(["count"], typeof current === "number" ? current + 1 : 1);
              },
            },
          });
          const socket = make_memory_socket();

          host.connect(socket);
          await socket.receive({ type: "action", id: "a1", name: "increment" });
          await socket.receive({ type: "action", id: "a2", name: "increment" });

          const [first, second] = socket.sent() as Array<Record<string, unknown>>;
          return {
            firstType: first?.type,
            firstId: first?.id,
            firstSeq: first?.seq,
            secondType: second?.type,
            secondId: second?.id,
            secondSeq: second?.seq,
            hostSeq: host.seq,
            count: host.map.at(["count"]).snap(),
          };
        },
        expected: {
          firstType: "ack",
          firstId: "a1",
          firstSeq: 1,
          secondType: "ack",
          secondId: "a2",
          secondSeq: 2,
          hostSeq: 2,
          count: 2,
        },
      }),
      livehost_socket_read_case({
        suite: SUITE,
        name: "connect malformed action does not increment seq",
        input: {},
        act: async () => {
          const host = create_livehost({ state: {} });
          const socket = make_memory_socket();

          host.connect(socket);
          await socket.receive({ type: "action", name: "missing_id" });

          const [message] = socket.sent() as Array<Record<string, any>>;
          return {
            type: message?.type,
            seq: message?.seq,
            hostSeq: host.seq,
            errorMessage: message?.error?.message,
          };
        },
        expected: {
          type: "error",
          seq: 0,
          hostSeq: 0,
          errorMessage: "LiveHost action message requires string id.",
        },
      }),
      livehost_socket_read_case({
        suite: SUITE,
        name: "connect disposer detaches socket listeners",
        input: {},
        act: async () => {
          const host = create_livehost({ state: {} });
          const socket = make_memory_socket();

          const stop = host.connect(socket);
          const before = socket.listener_count();
          stop();
          const after = socket.listener_count();
          await socket.receive({ type: "hello" });

          return {
            before,
            after,
            sentCount: socket.sent().length,
          };
        },
        expected: {
          before: 2,
          after: 0,
          sentCount: 0,
        },
      }),
    ] as const,
  };
}