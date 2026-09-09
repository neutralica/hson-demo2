import { create_locus } from "hson-live/locus";
import type { TestCase, TestSuite } from "../../harness/core/test-contracts";
import { equal_row, preview_value } from "../livemap/test-helpers";

type Listener = (message: string) => void | Promise<void>;
type MemorySocket = Readonly<{
  send(message: string): void;
  close(): void;
  onMessage(listener: Listener): () => void;
  onClose(listener: () => void): () => void;
  receive(message: unknown): Promise<void>;
  receive_raw(message: string): Promise<void>;
  sent(): Array<Record<string, unknown>>;
  listener_count(): number;
}>;

function make_memory_socket(): MemorySocket {
  const sent: string[] = [];
  const messages = new Set<Listener>();
  const closes = new Set<() => void>();
  const deliver = async (raw: string): Promise<void> => {
    for (const listener of [...messages]) await listener(raw);
    for (let index = 0; index < 8; index += 1) await Promise.resolve();
  };
  return Object.freeze({
    send(message: string) { sent.push(message); },
    close() { for (const listener of [...closes]) listener(); },
    onMessage(listener: Listener) { messages.add(listener); return () => messages.delete(listener); },
    onClose(listener: () => void) { closes.add(listener); return () => closes.delete(listener); },
    receive: (message: unknown) => deliver(JSON.stringify(message)),
    receive_raw: deliver,
    sent: () => sent.map((message) => JSON.parse(message) as Record<string, unknown>),
    listener_count: () => messages.size + closes.size,
  });
}

async function create_session(socket: MemorySocket, id: string): Promise<Record<string, unknown>> {
  await socket.receive({ type: "session-create", id });
  const response = socket.sent().at(-1);
  if (!response) throw new Error("Expected a session-created response.");
  return response;
}

function socket_case(spec: Readonly<{
  caseId: string;
  name: string;
  act: () => unknown | Promise<unknown>;
  expected: unknown;
}>): TestCase {
  return {
    suite: "livehost/socket",
    caseId: spec.caseId,
    name: spec.name,
    meta: { input: preview_value({}) },
    run: async () => ({ assertRows: [equal_row(spec.name, await spec.act(), spec.expected)] }),
  };
}

export function locus_socket_suite(): TestSuite {
  const SUITE = "livehost/socket";
  return {
    suite: SUITE,
    cases: [
      socket_case({
        caseId: "session-create-establishes-authority",
        name: "session-create establishes an attached authority session",
        act: async () => {
          const host = create_locus({ state: { count: 0 }, logicalMapId: "counter" });
          const socket = make_memory_socket();
          host.connect(socket);
          const response = await create_session(socket, "create-a");
          const result = {
            type: response.type,
            id: response.id,
            logicalMapId: response.logicalMapId,
            hasCredential: typeof response.credential === "string",
          };
          host.dispose();
          return result;
        },
        expected: { type: "session-created", id: "create-a", logicalMapId: "counter", hasCredential: true },
      }),
      socket_case({
        caseId: "invalid-json-sends-current-error",
        name: "invalid JSON returns a current protocol error",
        act: async () => {
          const host = create_locus({ state: {} });
          const socket = make_memory_socket();
          host.connect(socket);
          await socket.receive_raw("{ nope");
          const response = socket.sent()[0];
          const result = { type: response?.type, hasError: typeof response?.error === "object" };
          host.dispose();
          return result;
        },
        expected: { type: "error", hasError: true },
      }),
      socket_case({
        caseId: "session-action-ack-mutates-authority",
        name: "an attached session action acknowledges the authoritative mutation",
        act: async () => {
          type Actions = Readonly<{ increment: undefined }>;
          const host = create_locus<{ count: number }, Actions>({
            state: { count: 0 },
            actions: {
              increment: async (context) => {
                await context.mutate((draft) => draft.set(["count"], 1));
                return { updated: true };
              },
            },
          });
          const socket = make_memory_socket();
          host.connect(socket);
          await create_session(socket, "create-a");
          await socket.receive({ type: "action", id: "action-a", name: "increment" });
          const response = socket.sent().at(-1);
          const result = {
            type: response?.type,
            id: response?.id,
            ok: response?.ok,
            seq: response?.seq,
            result: response?.result,
            count: host.map.at(["count"]).snap(),
          };
          host.dispose();
          return result;
        },
        expected: { type: "ack", id: "action-a", ok: true, seq: 1, result: { updated: true }, count: 1 },
      }),
      socket_case({
        caseId: "duplicate-action-id-is-deduplicated",
        name: "a duplicate action id replays its acknowledgement without a second mutation",
        act: async () => {
          type Actions = Readonly<{ increment: undefined }>;
          const host = create_locus<{ count: number }, Actions>({
            state: { count: 0 },
            actions: {
              increment: async (context) => {
                const count = context.map.at(["count"]).snap();
                await context.mutate((draft) => draft.set(["count"], count + 1));
              },
            },
          });
          const socket = make_memory_socket();
          host.connect(socket);
          await create_session(socket, "create-a");
          await socket.receive({
            type: "action", id: "attempt-a", attemptId: "attempt-a",
            requestId: "request-a", clientId: "client-a", name: "increment",
          });
          await socket.receive({
            type: "action", id: "attempt-b", attemptId: "attempt-b",
            requestId: "request-a", clientId: "client-a", retry: true, name: "increment",
          });
          const acknowledgements = socket.sent().filter((message) => message.type === "ack");
          const result = {
            acknowledgementCount: acknowledgements.length,
            deliveries: acknowledgements.map((message) => message.delivery),
            count: host.map.at(["count"]).snap(),
          };
          host.dispose();
          return result;
        },
        expected: { acknowledgementCount: 2, deliveries: ["executed", "cached"], count: 1 },
      }),
      socket_case({
        caseId: "unknown-action-sends-error",
        name: "an unknown action returns a correlated current protocol error",
        act: async () => {
          const host = create_locus({ state: {} });
          const socket = make_memory_socket();
          host.connect(socket);
          await create_session(socket, "create-a");
          await socket.receive({ type: "action", id: "action-a", name: "missing" });
          const response = socket.sent().at(-1);
          const result = { type: response?.type, id: response?.id, ok: response?.ok, seq: response?.seq };
          host.dispose();
          return result;
        },
        expected: { type: "error", id: "action-a", ok: false, seq: 0 },
      }),
      socket_case({
        caseId: "connect-disposer-detaches-socket-listeners",
        name: "the connection disposer detaches both socket listeners",
        act: async () => {
          const host = create_locus({ state: {} });
          const socket = make_memory_socket();
          const stop = host.connect(socket);
          const before = socket.listener_count();
          stop();
          const after = socket.listener_count();
          await socket.receive({ type: "session-create", id: "create-a" });
          const result = { before, after, sentCount: socket.sent().length };
          host.dispose();
          return result;
        },
        expected: { before: 2, after: 0, sentCount: 0 },
      }),
    ],
  };
}
