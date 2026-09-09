import { create_echo, type Echo } from "hson-live/echo";
import { LocusDisconnectedError } from "hson-live/locus";
import type { LocusActionPayloads } from "hson-live/types";
import type { TestCase, TestSuite } from "../../harness/core/test-contracts";
import { equal_row, preview_value } from "../livemap/test-helpers";

type Listener = (message: string) => void;
type MemorySocket = Readonly<{
  send(message: string): void;
  close(): void;
  onMessage(listener: Listener): () => void;
  onClose(listener: () => void): () => void;
  receive(message: unknown): void;
  sent(): Array<Record<string, unknown>>;
  listener_count(): number;
}>;

function make_memory_socket(): MemorySocket {
  const sent: string[] = [];
  const messages = new Set<Listener>();
  const closes = new Set<() => void>();
  return Object.freeze({
    send(message: string) { sent.push(message); },
    close() { for (const listener of [...closes]) listener(); },
    onMessage(listener: Listener) { messages.add(listener); return () => messages.delete(listener); },
    onClose(listener: () => void) { closes.add(listener); return () => closes.delete(listener); },
    receive(message: unknown) {
      const raw = JSON.stringify(message);
      for (const listener of [...messages]) listener(raw);
    },
    sent: () => sent.map((message) => JSON.parse(message) as Record<string, unknown>),
    listener_count: () => messages.size + closes.size,
  });
}

async function establish<TActions extends LocusActionPayloads>(
  client: Echo<undefined, TActions>,
  socket: MemorySocket,
): Promise<void> {
  client.connect();
  const pending = client.session.create();
  const request = socket.sent().at(-1);
  socket.receive({
    type: "session-created", id: request?.id, sessionId: "session-a",
    credential: "credential-a", epoch: 1, logicalMapId: "main", incarnationId: "inc-a",
  });
  await pending;
}

function read_case(spec: Readonly<{
  suite: string;
  caseId: string;
  name: string;
  act: () => unknown | Promise<unknown>;
  expected: unknown;
}>): TestCase {
  return {
    suite: spec.suite,
    caseId: spec.caseId,
    name: spec.name,
    meta: { input: preview_value({}) },
    run: async () => ({ assertRows: [equal_row(spec.name, await spec.act(), spec.expected)] }),
  };
}

export function locus_client_suite(): TestSuite {
  const SUITE = "livehost/client";
  return {
    suite: SUITE,
    cases: [
      read_case({
        suite: SUITE,
        caseId: "connect-only-installs-transport",
        name: "connect installs transport listeners without creating a session",
        act: () => {
          const socket = make_memory_socket();
          const client = create_echo({ socket });
          client.connect();
          const result = { sent: socket.sent().length, listeners: socket.listener_count(), status: client.session.status };
          client.dispose();
          return result;
        },
        expected: { sent: 0, listeners: 2, status: "idle" },
      }),
      read_case({
        suite: SUITE,
        caseId: "session-create-establishes-authority",
        name: "session create establishes authority identity",
        act: async () => {
          const socket = make_memory_socket();
          const client = create_echo({ socket });
          await establish(client, socket);
          const result = {
            outbound: socket.sent()[0]?.type,
            status: client.session.status,
            credential: client.session.credential,
            logicalMapId: client.session.logicalMapId,
            incarnationId: client.session.incarnationId,
          };
          client.dispose();
          return result;
        },
        expected: {
          outbound: "session-create", status: "attached", credential: "credential-a",
          logicalMapId: "main", incarnationId: "inc-a",
        },
      }),
      read_case({
        suite: SUITE,
        caseId: "action-requires-session",
        name: "action rejects before semantic session establishment",
        act: async () => {
          const socket = make_memory_socket();
          const client = create_echo<undefined, Readonly<{ save: { id: string } }>>({ socket });
          client.connect();
          let disconnected = false;
          try { await client.action("save", { id: "a" }); }
          catch (error) { disconnected = error instanceof LocusDisconnectedError; }
          client.dispose();
          return { disconnected, sent: socket.sent().length };
        },
        expected: { disconnected: true, sent: 0 },
      }),
      read_case({
        suite: SUITE,
        caseId: "action-resolves-correlated-ack",
        name: "action resolves its correlated acknowledgement",
        act: async () => {
          const socket = make_memory_socket();
          const client = create_echo<undefined, Readonly<{ save: { id: string } }>>({ socket });
          await establish(client, socket);
          const pending = client.action("save", { id: "item-a" });
          const request = socket.sent().at(-1);
          socket.receive({
            type: "ack", id: request?.id, requestId: request?.requestId,
            ok: true, seq: 2, result: { saved: "item-a" },
          });
          const response = await pending;
          const result = {
            outbound: request?.type,
            name: request?.name,
            payload: request?.payload,
            requestMatches: request?.requestId === pending.request.requestId,
            result: response.type === "ack" ? response.result : undefined,
          };
          client.dispose();
          return result;
        },
        expected: {
          outbound: "action", name: "save", payload: { id: "item-a" },
          requestMatches: true, result: { saved: "item-a" },
        },
      }),
      read_case({
        suite: SUITE,
        caseId: "action-status-resolves-current-state",
        name: "action status resolves the current request state",
        act: async () => {
          const socket = make_memory_socket();
          const client = create_echo({ socket, clientId: "client-a" });
          await establish(client, socket);
          const pending = client.actionStatus("request-a");
          const request = socket.sent().at(-1);
          socket.receive({ type: "action-status", id: request?.id, requestId: "request-a", state: "pending" });
          const result = await pending;
          client.dispose();
          return { outbound: request?.type, state: result.state, requestId: result.requestId };
        },
        expected: { outbound: "action-status", state: "pending", requestId: "request-a" },
      }),
      read_case({
        suite: SUITE,
        caseId: "disconnect-rejects-pending-action",
        name: "disconnect rejects a pending endpoint action",
        act: async () => {
          const socket = make_memory_socket();
          const client = create_echo<undefined, Readonly<{ wait: undefined }>>({ socket });
          await establish(client, socket);
          const pending = client.action("wait");
          client.disconnect();
          let disconnected = false;
          try { await pending; } catch (error) { disconnected = error instanceof LocusDisconnectedError; }
          const result = { disconnected, status: client.session.status, listeners: socket.listener_count() };
          client.dispose();
          return result;
        },
        expected: { disconnected: true, status: "detached", listeners: 0 },
      }),
    ],
  };
}
