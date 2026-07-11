// api-suite.ts

import { hson } from "hson-live";
import type { TestSuite } from "../../app/demos/test/tests.types";
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

export function livehost_api_suite(): TestSuite {
  const SUITE = "livehost/api";

  return {
    suite: SUITE,
    cases: [
      read_case({
        suite: SUITE,
        name: "hson livehost create exposes host",
        input: {},
        act: () => {
          const host = hson.liveHost.create({ state: { count: 1 } });

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
        name: "hson livehost client exposes mirror",
        input: {},
        act: () => {
          const socket = make_api_socket();
          const client = hson.liveHost.client<{ ready: boolean }>({ socket });

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
        name: "hson livehost registry creates host",
        input: {},
        act: () => {
          const registry = hson.liveHost.registry();
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
        name: "hson livehost protocol decodes hello host id",
        input: {},
        act: () => {
          const decoded = hson.liveHost.protocol.decode(JSON.stringify({
            type: "hello",
            clientId: "client-a",
            hostId: "counter",
            lastSeq: 0,
          }));

          return {
            ok: decoded.ok,
            type: decoded.ok ? decoded.value.type : undefined,
            hostId: decoded.ok && decoded.value.type === "hello" ? decoded.value.hostId : undefined,
          };
        },
        expected: {
          ok: true,
          type: "hello",
          hostId: "counter",
        },
      }),
      read_case({
        suite: SUITE,
        name: "hson livehost protocol encodes sync",
        input: {},
        act: () => {
          const encoded = hson.liveHost.protocol.encode({
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
        name: "hson livehost debug exposes resume log",
        input: {},
        act: () => {
          const resume = hson.liveHost.debug.resumeLog({ maxEntries: 1 });
          resume.record_sync({ type: "sync", seq: 1, path: ["a"], value: 1 });
          resume.record_sync({ type: "sync", seq: 2, path: ["b"], value: 2 });

          return {
            entries: resume.debug_entries().length,
            replaySeqs: resume.replay_after(0).map((message) => message.seq),
          };
        },
        expected: {
          entries: 1,
          replaySeqs: [2],
        },
      }),
    ] as const,
  };
}
