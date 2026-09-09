import { hson } from "hson-live";
import { create_application_locus_store } from "../../../src/server/livehost/application-locus-store";
import type { TestCase, TestSuite } from "../../harness/core/test-contracts";
import { equal_row, preview_value } from "../livemap/test-helpers";

type Listener = (message: string) => void;
type ApiSocket = Readonly<{
  send(message: string): void;
  close(): void;
  onMessage(listener: Listener): () => void;
  onClose(listener: () => void): () => void;
  receive(message: unknown): void;
  sent(): Array<Record<string, unknown>>;
}>;

function make_api_socket(): ApiSocket {
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
  });
}

function read_case(spec: Readonly<{
  suite: string;
  caseId: string;
  name: string;
  input?: unknown;
  act: () => unknown | Promise<unknown>;
  expected: unknown;
}>): TestCase {
  return {
    suite: spec.suite,
    caseId: spec.caseId,
    name: spec.name,
    meta: { input: preview_value(spec.input ?? {}) },
    run: async () => ({ assertRows: [equal_row(spec.name, await spec.act(), spec.expected)] }),
  };
}

async function establish_session(client: ReturnType<typeof hson.echo.create>, socket: ApiSocket): Promise<void> {
  client.connect();
  const pending = client.session.create();
  const request = socket.sent().at(-1);
  socket.receive({
    type: "session-created",
    id: request?.id,
    sessionId: "session-a",
    credential: "credential-a",
    epoch: 1,
    logicalMapId: "main",
    incarnationId: "inc-a",
  });
  await pending;
}

export function locus_api_suite(): TestSuite {
  const SUITE = "livehost/api";
  return {
    suite: SUITE,
    cases: [
      read_case({
        suite: SUITE,
        caseId: "hson-locus-create-exposes-authority",
        name: "hson locus create exposes one authority",
        input: {},
        act: () => {
          const host = hson.locus.create({ state: { count: 1 } });
          const result = { seq: host.seq, count: host.map.at(["count"]).snap() };
          host.dispose();
          return result;
        },
        expected: { seq: 0, count: 1 },
      }),
      read_case({
        suite: SUITE,
        caseId: "hson-echo-create-exposes-endpoint",
        name: "hson echo create exposes endpoint-only capabilities",
        input: {},
        act: () => {
          const client = hson.echo.create({ socket: make_api_socket() });
          const result = {
            connect: typeof client.connect,
            session: typeof client.session.create,
            action: typeof client.action,
            hasMap: "map" in client,
            hasRecovery: "recovery" in client,
            hasSeq: "seq" in client,
            hasOnEvent: "onEvent" in client,
          };
          client.dispose();
          return result;
        },
        expected: {
          connect: "function", session: "function", action: "function",
          hasMap: false, hasRecovery: false, hasSeq: false, hasOnEvent: false,
        },
      }),
      read_case({
        suite: SUITE,
        caseId: "hson-echo-session-is-explicit",
        name: "hson echo establishes a semantic session explicitly",
        input: {},
        act: async () => {
          const socket = make_api_socket();
          const client = hson.echo.create({ socket });
          await establish_session(client, socket);
          const result = {
            sentType: socket.sent()[0]?.type,
            status: client.session.status,
            logicalMapId: client.session.logicalMapId,
          };
          client.dispose();
          return result;
        },
        expected: { sentType: "session-create", status: "attached", logicalMapId: "main" },
      }),
      read_case({
        suite: SUITE,
        caseId: "hson-echo-replica-is-explicit",
        name: "hson echo preserves an explicitly supplied replica map",
        input: {},
        act: () => {
          const map = hson.liveMap.fromJson({ count: 1 });
          const client = hson.echo.create({
            socket: make_api_socket(),
            map,
            recovery: { logicalMapId: "main" },
          });
          const result = { sameMap: client.map === map, count: client.map.at(["count"]).snap(), hasRecovery: "recovery" in client };
          client.dispose();
          return result;
        },
        expected: { sameMap: true, count: 1, hasRecovery: true },
      }),
      read_case({
        suite: SUITE,
        caseId: "application-store-creates-and-rejects-duplicate",
        name: "application Locus store owns unique authorities",
        input: {},
        act: () => {
          const registry = create_application_locus_store();
          const first = registry.create("counter", { state: { count: 2 } });
          const duplicate = registry.create("counter", { state: { count: 3 } });
          const result = {
            first: first.ok,
            duplicate: duplicate.ok,
            count: registry.get("counter")?.map.at(["count"]).snap(),
          };
          for (const entry of registry.list()) entry.host.dispose();
          return result;
        },
        expected: { first: true, duplicate: false, count: 2 },
      }),
      read_case({
        suite: SUITE,
        caseId: "application-store-connects-current-session-protocol",
        name: "application Locus store accepts current session creation",
        input: {},
        act: () => {
          const registry = create_application_locus_store();
          const socket = make_api_socket();
          registry.create("counter", { state: { count: 2 }, logicalMapId: "counter" });
          const connected = registry.connect("counter", socket);
          socket.receive({ type: "session-create", id: "create-a" });
          const response = socket.sent()[0];
          const result = { connected: connected.ok, type: response?.type, logicalMapId: response?.logicalMapId };
          for (const entry of registry.list()) entry.host.dispose();
          return result;
        },
        expected: { connected: true, type: "session-created", logicalMapId: "counter" },
      }),
    ],
  };
}
