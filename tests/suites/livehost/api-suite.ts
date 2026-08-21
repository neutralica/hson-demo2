// api-suite.ts

import { hson } from "hson-live";
import { create_application_locus_store } from "../../harness/hosted/application-locus-store";
import type { TestSuite } from "../../harness/core/test-contracts";
import { read_case } from "../livemap/handle-helpers";

type ApiSocketMessageListener = (message: string) => void;
type ApiSocketCloseListener = () => void;

type ApiSocket = Readonly<{
  send: (message: string) => void;
  close: () => void;
  onMessage: (listener: ApiSocketMessageListener) => () => void;
  onClose: (listener: ApiSocketCloseListener) => () => void;
  receive: (message: unknown) => void;
  sent: () => unknown[];
}>;

function make_api_socket(): ApiSocket {
  const sentMessages: string[] = [];
  const messageListeners = new Set<ApiSocketMessageListener>();
  const closeListeners = new Set<ApiSocketCloseListener>();

  function send(message: string): void {
    sentMessages.push(message);
  }

  function close(): void {
    for (const listener of Array.from(closeListeners)) listener();
  }

  function onMessage(listener: ApiSocketMessageListener): () => void {
    messageListeners.add(listener);
    return () => {
      messageListeners.delete(listener);
    };
  }

  function onClose(listener: ApiSocketCloseListener): () => void {
    closeListeners.add(listener);
    return () => {
      closeListeners.delete(listener);
    };
  }

  function receive(message: unknown): void {
    const text = typeof message === "string" ? message : JSON.stringify(message);
    for (const listener of Array.from(messageListeners)) listener(text);
  }

  function sent(): unknown[] {
    return sentMessages.map((message) => JSON.parse(message) as unknown);
  }

  return Object.freeze({
    send,
    close,
    onMessage,
    onClose,
    receive,
    sent,
  });
}

export function locus_api_suite(): TestSuite {
  const SUITE = "livehost/api";

  return {
    suite: SUITE,
    cases: [
      read_case({
        suite: SUITE,
        caseId: "hson-livehost-create-exposes-host", name: "hson livehost create exposes host",
        input: {},
        act: () => {
          const host = hson.locus.create({ state: { count: 1 } });

          return {
            seq: host.seq,
            count: host.map.at(["count"]).snap(),
          };
        },
        expected: {
          seq: 0,
          count: 1,
        },
      }),
      read_case({
        suite: SUITE,
        caseId: "hson-livehost-client-exposes-mirror", name: "hson livehost client exposes mirror",
        input: {},
        act: () => {
          const socket = make_api_socket();
          const client = hson.locus.client<{ ready: boolean }>({ socket });

          client.connect();
          socket.receive({
            type: "hello",
            sessionId: "session-a",
            seq: 0,
            snapshot: { ready: true },
          });

          return {
            sentType: (socket.sent()[0] as Record<string, unknown> | undefined)?.type,
            seq: client.seq,
            ready: client.map.at(["ready"]).snap(),
          };
        },
        expected: {
          sentType: "hello",
          seq: 0,
          ready: true,
        },
      }),
      read_case({
        suite: SUITE,
        caseId: "hson-livehost-client-receives-sync", name: "hson livehost client receives sync",
        input: {},
        act: () => {
          const socket = make_api_socket();
          const client = hson.locus.client<{ count: number }>({ socket });

          client.connect();
          socket.receive({
            type: "hello",
            sessionId: "session-a",
            seq: 0,
            snapshot: { count: 1 },
          });
          socket.receive({
            type: "sync",
            seq: 1,
            path: ["count"],
            value: 2,
          });

          return {
            seq: client.seq,
            count: client.map.at(["count"]).snap(),
          };
        },
        expected: {
          seq: 1,
          count: 2,
        },
      }),
      read_case({
        suite: SUITE,
        caseId: "hson-livehost-client-sends-subscribe-and-unsubscribe", name: "hson livehost client sends subscribe and unsubscribe",
        input: {},
        act: () => {
          const socket = make_api_socket();
          const client = hson.locus.client({ socket });

          client.connect();
          client.subscribe(["count"]);
          client.unsubscribe(["count"]);

          const messages = socket.sent() as Array<Record<string, unknown>>;

          return {
            types: messages.map((message) => message.type),
            subscribePath: messages[1]?.path,
            unsubscribePath: messages[2]?.path,
          };
        },
        expected: {
          types: ["hello", "subscribe", "unsubscribe"],
          subscribePath: ["count"],
          unsubscribePath: ["count"],
        },
      }),
      read_case({
        suite: SUITE,
        caseId: "hson-livehost-client-sends-action-payload", name: "hson livehost client sends action payload",
        input: {},
        act: () => {
          const socket = make_api_socket();
          const client = hson.locus.client<undefined, { setCount: number }>({
            socket,
            actionId: () => "action-a",
          });

          client.connect();
          void client.action("setCount", 4);

          const messages = socket.sent() as Array<Record<string, unknown>>;

          return {
            types: messages.map((message) => message.type),
            id: messages[1]?.id,
            name: messages[1]?.name,
            payload: messages[1]?.payload,
          };
        },
        expected: {
          types: ["hello", "action"],
          id: "action-a",
          name: "setCount",
          payload: 4,
        },
      }),
      read_case({
        suite: SUITE,
        caseId: "hson-livehost-registry-creates-host", name: "hson livehost registry creates host",
        input: {},
        act: () => {
          const registry = create_application_locus_store();
          const result = registry.create("counter", { state: { count: 2 } });

          return {
            ok: result.ok,
            has: registry.has("counter"),
            count: registry.get("counter")?.map.at(["count"]).snap(),
          };
        },
        expected: {
          ok: true,
          has: true,
          count: 2,
        },
      }),
      read_case({
        suite: SUITE,
        caseId: "hson-livehost-registry-rejects-duplicate-id", name: "hson livehost registry rejects duplicate id",
        input: {},
        act: () => {
          const registry = create_application_locus_store();
          const first = registry.create("counter", { state: { count: 1 } });
          const second = registry.create("counter", { state: { count: 2 } });

          return {
            firstOk: first.ok,
            secondOk: second.ok,
            has: registry.has("counter"),
            count: registry.get("counter")?.map.at(["count"]).snap(),
          };
        },
        expected: {
          firstOk: true,
          secondOk: false,
          has: true,
          count: 1,
        },
      }),
      read_case({
        suite: SUITE,
        caseId: "hson-livehost-registry-rejects-unknown-connect", name: "hson livehost registry rejects unknown connect",
        input: {},
        act: () => {
          const registry = create_application_locus_store();
          const socket = make_api_socket();
          const connected = registry.connect("missing", socket);

          return {
            connected: connected.ok,
            sentCount: socket.sent().length,
          };
        },
        expected: {
          connected: false,
          sentCount: 0,
        },
      }),
      read_case({
        suite: SUITE,
        caseId: "hson-livehost-registry-connects-socket", name: "hson livehost registry connects socket",
        input: {},
        act: () => {
          const registry = create_application_locus_store();
          const socket = make_api_socket();
          const created = registry.create("counter", { state: { count: 2 } });
          const connected = registry.connect("counter", socket);

          socket.receive({ type: "hello", clientId: "client-a" });

          const [hello] = socket.sent() as Array<Record<string, unknown>>;

          return {
            created: created.ok,
            connected: connected.ok,
            helloType: hello?.type,
            snapshot: hello?.snapshot,
          };
        },
        expected: {
          created: true,
          connected: true,
          helloType: "hello",
          snapshot: { count: 2 },
        },
      }),
      read_case({
        suite: SUITE,
        caseId: "hson-livehost-protocol-decodes-hello-host-id", name: "hson livehost protocol decodes hello host id",
        input: {},
        act: () => {
          const decoded = hson.locus.protocol.decode(JSON.stringify({
            type: "hello",
            clientId: "client-a",
            hostId: "counter",
          }));

          return {
            ok: decoded.ok,
            type: decoded.ok ? decoded.value.type : undefined,
            hasHostId: decoded.ok && decoded.value.type === "hello" ? "hostId" in decoded.value : undefined,
          };
        },
        expected: {
          ok: true,
          type: "hello",
          hasHostId: false,
        },
      }),
      read_case({
        suite: SUITE,
        caseId: "hson-livehost-protocol-decodes-action", name: "hson livehost protocol decodes action",
        input: {},
        act: () => {
          const decoded = hson.locus.protocol.decode(JSON.stringify({
            type: "action",
            id: "action-a",
            name: "setCount",
            payload: 5,
          }));

          return {
            ok: decoded.ok,
            type: decoded.ok ? decoded.value.type : undefined,
            id: decoded.ok && decoded.value.type === "action" ? decoded.value.id : undefined,
            name: decoded.ok && decoded.value.type === "action" ? decoded.value.name : undefined,
            payload: decoded.ok && decoded.value.type === "action" ? decoded.value.payload : undefined,
          };
        },
        expected: {
          ok: true,
          type: "action",
          id: "action-a",
          name: "setCount",
          payload: 5,
        },
      }),
      read_case({
        suite: SUITE,
        caseId: "hson-livehost-protocol-encodes-sync", name: "hson livehost protocol encodes sync",
        input: {},
        act: () => {
          const encoded = hson.locus.protocol.encode({
            type: "sync",
            seq: 3,
            path: ["count"],
            value: 4,
          });
          const parsed = JSON.parse(encoded) as Record<string, unknown>;

          return {
            type: parsed.type,
            seq: parsed.seq,
            path: parsed.path,
            value: parsed.value,
          };
        },
        expected: {
          type: "sync",
          seq: 3,
          path: ["count"],
          value: 4,
        },
      }),
      read_case({
        suite: SUITE,
        caseId: "hson-livehost-protocol-encodes-error", name: "hson livehost protocol encodes error",
        input: {},
        act: () => {
          const encoded = hson.locus.protocol.encode({
            type: "error",
            id: "action-a",
            ok: false,
            seq: 4,
            error: {
              message: "Nope.",
              code: "NOPE",
              path: ["count"],
            },
          });
          const parsed = JSON.parse(encoded) as Record<string, unknown>;
          const error = parsed.error as Record<string, unknown> | undefined;

          return {
            type: parsed.type,
            id: parsed.id,
            ok: parsed.ok,
            seq: parsed.seq,
            message: error?.message,
            code: error?.code,
            path: error?.path,
          };
        },
        expected: {
          type: "error",
          id: "action-a",
          ok: false,
          seq: 4,
          message: "Nope.",
          code: "NOPE",
          path: ["count"],
        },
      }),
      read_case({
        suite: SUITE,
        caseId: "hson-livehost-protocol-rejects-invalid-json", name: "hson livehost protocol rejects invalid json",
        input: {},
        act: () => {
          const decoded = hson.locus.protocol.decode("{");

          return {
            ok: decoded.ok,
          };
        },
        expected: {
          ok: false,
        },
      }),
      read_case({
        suite: SUITE,
        caseId: "hson-livehost-debug-omits-historical-resume-log", name: "hson livehost debug omits historical resume log",
        input: {},
        act: () => {
          return {
            hasResumeLog: Object.hasOwn(hson.locus.debug, "resumeLog"),
          };
        },
        expected: {
          hasResumeLog: false,
        },
      }),
      read_case({
        suite: SUITE,
        caseId: "hson-livehost-debug-exposes-sync-manager", name: "hson livehost debug exposes sync manager",
        input: {},
        act: () => {
          const host = hson.locus.create({ state: { count: 5 } });
          const messages: unknown[] = [];
          const sync = hson.locus.debug.syncManager(host.map);
          const added = sync.add_session("session-a", (message) => {
            messages.push(message);
          });

          sync.subscribe("session-a", ["count"], 0);

          const [message] = messages as Array<Record<string, unknown>>;

          return {
            added: added.ok,
            messageType: message?.type,
            path: message?.path,
            value: message?.value,
          };
        },
        expected: {
          added: true,
          messageType: "sync",
          path: ["count"],
          value: 5,
        },
      }),
      read_case({
        suite: SUITE,
        caseId: "hson-livehost-debug-sync-manager-rejects-duplicate-session", name: "hson livehost debug sync manager rejects duplicate session",
        input: {},
        act: () => {
          const host = hson.locus.create({ state: { count: 5 } });
          const sync = hson.locus.debug.syncManager(host.map);
          const first = sync.add_session("session-a", () => undefined);
          const second = sync.add_session("session-a", () => undefined);

          return {
            firstOk: first.ok,
            secondOk: second.ok,
          };
        },
        expected: {
          firstOk: true,
          secondOk: false,
        },
      }),
    ] as const,
  };
}
