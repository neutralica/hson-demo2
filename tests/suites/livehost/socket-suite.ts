// livehost/socket-suite.ts

import { create_livehost } from "hson-live/livehost";
import type { TestCase, TestSuite } from "../../harness/core/test-contracts";
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
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    },
    receive_raw: async (message) => {
      for (const listener of [...messageListeners]) await listener(message);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    },
    sent: () => sentMessages.map((message) => JSON.parse(message) as unknown),
    sent_raw: () => [...sentMessages],
    listener_count: () => messageListeners.size + closeListeners.size,
  };
}

function is_record(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function message_error_field(message: unknown, field: string): unknown {
  if (!is_record(message)) return undefined;
  const error = message.error;
  if (!is_record(error)) return undefined;
  return error[field];
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

          const [message] = socket.sent() as Array<Record<string, unknown>>;
          return {
            type: message?.type,
            seq: message?.seq,
            message: message_error_field(message, "message"),
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

          const [message] = socket.sent() as Array<Record<string, unknown>>;
          return {
            type: message?.type,
            id: message?.id,
            ok: message?.ok,
            seq: message?.seq,
            hostSeq: host.seq,
            code: message_error_field(message, "code"),
            errorMessage: message_error_field(message, "message"),
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
        name: "connect subscribe sends current value sync",
        input: {},
        act: async () => {
          const host = create_livehost({ state: { ui: { selected: "home" } } });
          const socket = make_memory_socket();

          host.connect(socket);
          await socket.receive({ type: "subscribe", path: ["ui", "selected"] });

          const [message] = socket.sent() as Array<Record<string, unknown>>;
          return {
            type: message?.type,
            seq: message?.seq,
            path: message?.path,
            value: message?.value,
          };
        },
        expected: {
          type: "sync",
          seq: 0,
          path: ["ui", "selected"],
          value: "home",
        },
      }),
      livehost_socket_read_case({
        suite: SUITE,
        name: "connect unsubscribe sends no message on success",
        input: {},
        act: async () => {
          const host = create_livehost({ state: { ui: { selected: "home" } } });
          const socket = make_memory_socket();

          host.connect(socket);
          await socket.receive({ type: "subscribe", path: ["ui", "selected"] });
          await socket.receive({ type: "unsubscribe", path: ["ui", "selected"] });

          return {
            sentCount: socket.sent().length,
            firstType: (socket.sent()[0] as Record<string, unknown> | undefined)?.type,
          };
        },
        expected: {
          sentCount: 1,
          firstType: "sync",
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

          const [message] = socket.sent() as Array<Record<string, unknown>>;
          return {
            type: message?.type,
            seq: message?.seq,
            hostSeq: host.seq,
            errorMessage: message_error_field(message, "message"),
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
        name: "connect action applies schema validator before ack",
        input: {},
        act: async () => {
          const host = create_livehost({
            state: { user: { name: "Ada" } },
            schema: {
              actions: {
                rename_user: {
                  payload: (value): value is { name: string } => {
                    return typeof value === "object"
                      && value !== null
                      && !Array.isArray(value)
                      && typeof (value as { name?: unknown }).name === "string";
                  },
                },
              },
            },
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
        name: "connect action rejects schema-invalid payload",
        input: {},
        act: async () => {
          const host = create_livehost({
            state: { user: { name: "Ada" } },
            schema: {
              actions: {
                rename_user: {
                  payload: (value): value is { name: string } => {
                    return typeof value === "object"
                      && value !== null
                      && !Array.isArray(value)
                      && typeof (value as { name?: unknown }).name === "string";
                  },
                },
              },
            },
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
            payload: { label: "Grace" },
          });

          const [message] = socket.sent() as Array<Record<string, unknown>>;
          return {
            type: message?.type,
            id: message?.id,
            ok: message?.ok,
            seq: message?.seq,
            hostSeq: host.seq,
            code: message_error_field(message, "code"),
            errorMessage: message_error_field(message, "message"),
            name: host.map.at(["user", "name"]).snap(),
          };
        },
        expected: {
          type: "error",
          id: "action-a",
          ok: false,
          seq: 0,
          hostSeq: 0,
          code: "LIVEHOST_SCHEMA_INVALID_PAYLOAD",
          errorMessage: "Value failed LiveHost schema validation.",
          name: "Ada",
        },
      }),
      livehost_socket_read_case({
        suite: SUITE,
        name: "connect action applies schema decoder before handler",
        input: {},
        act: async () => {
          const host = create_livehost({
            state: { user: { name: "Ada" } },
            schema: {
              actions: {
                rename_user: {
                  payload: (value) => {
                    if (typeof value !== "string") return { ok: false, issues: ["name must be string"] } as const;
                    return { ok: true, value: { name: value } } as const;
                  },
                },
              },
            },
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
            payload: "Grace",
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
        name: "connect subscribed path syncs after action ack",
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
          await socket.receive({ type: "subscribe", path: ["user", "name"] });
          await socket.receive({
            type: "action",
            id: "action-a",
            name: "rename_user",
            payload: { name: "Grace" },
          });

          const [initialSync, ack, updateSync] = socket.sent() as Array<Record<string, unknown>>;
          return {
            initialType: initialSync?.type,
            initialSeq: initialSync?.seq,
            initialValue: initialSync?.value,
            ackType: ack?.type,
            ackSeq: ack?.seq,
            updateType: updateSync?.type,
            updateSeq: updateSync?.seq,
            updatePath: updateSync?.path,
            updateValue: updateSync?.value,
          };
        },
        expected: {
          initialType: "sync",
          initialSeq: 0,
          initialValue: "Ada",
          ackType: "ack",
          ackSeq: 1,
          updateType: "sync",
          updateSeq: 1,
          updatePath: ["user", "name"],
          updateValue: "Grace",
        },
      }),
      livehost_socket_read_case({
        suite: SUITE,
        name: "connect unsubscribe prevents later action sync",
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
          await socket.receive({ type: "subscribe", path: ["count"] });
          await socket.receive({ type: "unsubscribe", path: ["count"] });
          await socket.receive({ type: "action", id: "action-a", name: "increment" });

          const [initialSync, ack, extra] = socket.sent() as Array<Record<string, unknown> | undefined>;
          return {
            sentCount: socket.sent().length,
            initialType: initialSync?.type,
            initialValue: initialSync?.value,
            ackType: ack?.type,
            ackSeq: ack?.seq,
            extraType: extra?.type,
            count: host.map.at(["count"]).snap(),
          };
        },
        expected: {
          sentCount: 2,
          initialType: "sync",
          initialValue: 0,
          ackType: "ack",
          ackSeq: 1,
          extraType: undefined,
          count: 1,
        },
      }),
      livehost_socket_read_case({
        suite: SUITE,
        name: "connect multiple sessions receive subscribed action sync",
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
          const firstSocket = make_memory_socket();
          const secondSocket = make_memory_socket();

          host.connect(firstSocket);
          host.connect(secondSocket);
          await firstSocket.receive({ type: "subscribe", path: ["count"] });
          await secondSocket.receive({ type: "subscribe", path: ["count"] });
          await firstSocket.receive({ type: "action", id: "action-a", name: "increment" });

          const firstSent = firstSocket.sent() as Array<Record<string, unknown>>;
          const secondSent = secondSocket.sent() as Array<Record<string, unknown>>;
          const firstUpdate = firstSent[2];
          const secondUpdate = secondSent[1];

          return {
            firstCount: firstSent.length,
            secondCount: secondSent.length,
            firstAckType: firstSent[1]?.type,
            firstUpdateType: firstUpdate?.type,
            firstUpdateSeq: firstUpdate?.seq,
            firstUpdateValue: firstUpdate?.value,
            secondUpdateType: secondUpdate?.type,
            secondUpdateSeq: secondUpdate?.seq,
            secondUpdateValue: secondUpdate?.value,
            count: host.map.at(["count"]).snap(),
          };
        },
        expected: {
          firstCount: 3,
          secondCount: 2,
          firstAckType: "ack",
          firstUpdateType: "sync",
          firstUpdateSeq: 1,
          firstUpdateValue: 1,
          secondUpdateType: "sync",
          secondUpdateSeq: 1,
          secondUpdateValue: 1,
          count: 1,
        },
      }),
      livehost_socket_read_case({
        suite: SUITE,
        name: "lazy socket action receives trusted non-resumable session origin",
        input: {},
        act: async () => {
          let origin: unknown;
          const host = create_livehost({
            state: {},
            sessionId: () => "server-lazy-session",
            actions: { inspect: (ctx) => { origin = ctx.origin; } },
          });
          const socket = make_memory_socket();
          host.connect(socket);
          await socket.receive({
            type: "action",
            id: "lazy-origin-a",
            clientId: "spoofed-session",
            requestId: "lazy-origin-request-a",
            name: "inspect",
          });
          return origin;
        },
        expected: {
          kind: "session",
          sessionId: "server-lazy-session",
          epoch: 1,
          resumable: false,
        },
      }),
      livehost_socket_read_case({
        suite: SUITE,
        name: "explicit socket session action receives trusted resumable origin",
        input: {},
        act: async () => {
          let origin: unknown;
          const host = create_livehost({
            state: {},
            sessionId: () => "server-resumable-session",
            actions: { inspect: (ctx) => { origin = ctx.origin; } },
          });
          const socket = make_memory_socket();
          host.connect(socket);
          await socket.receive({ type: "session-create", id: "create-a" });
          await socket.receive({
            type: "action",
            id: "resumable-origin-a",
            clientId: "spoofed-session",
            requestId: "resumable-origin-request-a",
            name: "inspect",
          });
          return origin;
        },
        expected: {
          kind: "session",
          sessionId: "server-resumable-session",
          epoch: 1,
          resumable: true,
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
