// pair-suite.ts

import { create_livehost, create_livehost_client } from "hson-live";
import type { TestCase, TestSuite } from "../../app/demos/test/tests.types";
import { equal_row, preview_value } from "../livemap/test-helpers";

type PairSocketMessageListener = (message: string) => void;
type PairSocketCloseListener = () => void;

type PairSocket = Readonly<{
  send: (message: string) => void;
  close: () => void;
  onMessage: (listener: PairSocketMessageListener) => () => void;
  onClose: (listener: PairSocketCloseListener) => () => void;
  sent: () => unknown[];
  sent_raw: () => string[];
  listener_count: () => number;
}>;

type LiveHostPairReadCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: unknown;
  act: () => unknown | Promise<unknown>;
  expected: unknown;
}>;

function make_socket_pair(): readonly [PairSocket, PairSocket] {
  const firstSent: string[] = [];
  const secondSent: string[] = [];
  const firstMessageListeners = new Set<PairSocketMessageListener>();
  const secondMessageListeners = new Set<PairSocketMessageListener>();
  const firstCloseListeners = new Set<PairSocketCloseListener>();
  const secondCloseListeners = new Set<PairSocketCloseListener>();

  function make_socket(
    ownSent: string[],
    peerMessageListeners: Set<PairSocketMessageListener>,
    ownMessageListeners: Set<PairSocketMessageListener>,
    peerCloseListeners: Set<PairSocketCloseListener>,
    ownCloseListeners: Set<PairSocketCloseListener>,
  ): PairSocket {
    function send(message: string): void {
      ownSent.push(message);
      queueMicrotask(() => {
        for (const listener of Array.from(peerMessageListeners)) listener(message);
      });
    }

    function close(): void {
      queueMicrotask(() => {
        for (const listener of Array.from(peerCloseListeners)) listener();
      });
    }

    function onMessage(listener: PairSocketMessageListener): () => void {
      ownMessageListeners.add(listener);
      return () => {
        ownMessageListeners.delete(listener);
      };
    }

    function onClose(listener: PairSocketCloseListener): () => void {
      ownCloseListeners.add(listener);
      return () => {
        ownCloseListeners.delete(listener);
      };
    }

    function sent(): unknown[] {
      return ownSent.map((message) => JSON.parse(message) as unknown);
    }

    function sent_raw(): string[] {
      return [...ownSent];
    }

    function listener_count(): number {
      return ownMessageListeners.size + ownCloseListeners.size;
    }

    return Object.freeze({
      send,
      close,
      onMessage,
      onClose,
      sent,
      sent_raw,
      listener_count,
    });
  }

  return [
    make_socket(
      firstSent,
      secondMessageListeners,
      firstMessageListeners,
      secondCloseListeners,
      firstCloseListeners,
    ),
    make_socket(
      secondSent,
      firstMessageListeners,
      secondMessageListeners,
      firstCloseListeners,
      secondCloseListeners,
    ),
  ] as const;
}

async function settle_pair(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

function livehost_pair_read_case(spec: LiveHostPairReadCaseSpec): TestCase {
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

export function livehost_pair_suite(): TestSuite {
  const SUITE = "livehost/pair";

  return {
    suite: SUITE,
    cases: [
      livehost_pair_read_case({
        suite: SUITE,
        name: "client hello receives host snapshot",
        input: {},
        act: async () => {
          const [clientSocket, hostSocket] = make_socket_pair();
          const host = create_livehost({ state: { user: { name: "Ada" } } });
          const client = create_livehost_client<{ user: { name: string } }>({
            socket: clientSocket,
            clientId: "client-a",
          });

          host.connect(hostSocket);
          client.connect();
          await settle_pair();

          const [clientHello] = clientSocket.sent() as Array<Record<string, unknown>>;
          const [hostHello] = hostSocket.sent() as Array<Record<string, unknown>>;

          return {
            clientSentType: clientHello?.type,
            clientSentLastSeq: clientHello?.lastSeq,
            hostSentType: hostHello?.type,
            hostSentSeq: hostHello?.seq,
            clientSeq: client.seq,
            clientRoot: client.map.snap(),
          };
        },
        expected: {
          clientSentType: "hello",
          clientSentLastSeq: 0,
          hostSentType: "hello",
          hostSentSeq: 0,
          clientSeq: 0,
          clientRoot: { user: { name: "Ada" } },
        },
      }),
      livehost_pair_read_case({
        suite: SUITE,
        name: "client subscribe receives immediate host sync",
        input: {},
        act: async () => {
          const [clientSocket, hostSocket] = make_socket_pair();
          const host = create_livehost({ state: { ui: { selected: "home" } } });
          const client = create_livehost_client<{ ui: { selected: string } }>({ socket: clientSocket });

          host.connect(hostSocket);
          client.connect();
          await settle_pair();
          client.subscribe(["ui", "selected"]);
          await settle_pair();

          const [, sync] = hostSocket.sent() as Array<Record<string, unknown>>;

          return {
            syncType: sync?.type,
            syncSeq: sync?.seq,
            syncPath: sync?.path,
            syncValue: sync?.value,
            clientSeq: client.seq,
            selected: client.map.at(["ui", "selected"]).snap(),
          };
        },
        expected: {
          syncType: "sync",
          syncSeq: 0,
          syncPath: ["ui", "selected"],
          syncValue: "home",
          clientSeq: 0,
          selected: "home",
        },
      }),
      livehost_pair_read_case({
        suite: SUITE,
        name: "client action resolves ack and receives sync update",
        input: {},
        act: async () => {
          type Actions = Readonly<{
            rename_user: { name: string };
          }>;
          const [clientSocket, hostSocket] = make_socket_pair();
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
          const client = create_livehost_client<{ user: { name: string } }, Actions>({
            socket: clientSocket,
            actionId: () => "action-a",
          });

          host.connect(hostSocket);
          client.connect();
          await settle_pair();
          client.subscribe(["user", "name"]);
          await settle_pair();
          const resultPromise = client.action("rename_user", { name: "Grace" });
          await settle_pair();
          const result = await resultPromise;
          await settle_pair();

          const [, initialSync, ack, updateSync] = hostSocket.sent() as Array<Record<string, unknown>>;

          return {
            ackType: ack?.type,
            ackSeq: ack?.seq,
            resultType: result.type,
            resultSeq: result.seq,
            updateType: updateSync?.type,
            updateSeq: updateSync?.seq,
            updateValue: updateSync?.value,
            clientSeq: client.seq,
            clientName: client.map.at(["user", "name"]).snap(),
            hostName: host.map.at(["user", "name"]).snap(),
            initialSyncValue: initialSync?.value,
          };
        },
        expected: {
          ackType: "ack",
          ackSeq: 1,
          resultType: "ack",
          resultSeq: 1,
          updateType: "sync",
          updateSeq: 1,
          updateValue: "Grace",
          clientSeq: 1,
          clientName: "Grace",
          hostName: "Grace",
          initialSyncValue: "Ada",
        },
      }),
      livehost_pair_read_case({
        suite: SUITE,
        name: "client action resolves host error",
        input: {},
        act: async () => {
          type Actions = Readonly<{
            missing: undefined;
          }>;
          const [clientSocket, hostSocket] = make_socket_pair();
          const host = create_livehost({ state: {} });
          const client = create_livehost_client<undefined, Actions>({
            socket: clientSocket,
            actionId: () => "action-a",
          });

          host.connect(hostSocket);
          client.connect();
          await settle_pair();
          const resultPromise = client.action("missing");
          await settle_pair();
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
          resultSeq: 0,
          message: "Unknown LiveHost action: missing",
          code: "LIVEHOST_UNKNOWN_ACTION",
          clientSeq: 0,
        },
      }),
      livehost_pair_read_case({
        suite: SUITE,
        name: "client unsubscribe stops later sync update",
        input: {},
        act: async () => {
          type Actions = Readonly<{
            increment: undefined;
          }>;
          const [clientSocket, hostSocket] = make_socket_pair();
          const host = create_livehost({
            state: { count: 0 },
            actions: {
              increment: (ctx) => {
                const current = ctx.map.at(["count"]).snap();
                ctx.map.set(["count"], typeof current === "number" ? current + 1 : 1);
              },
            },
          });
          const client = create_livehost_client<{ count: number }, Actions>({
            socket: clientSocket,
            actionId: () => "action-a",
          });

          host.connect(hostSocket);
          client.connect();
          await settle_pair();
          client.subscribe(["count"]);
          await settle_pair();
          client.unsubscribe(["count"]);
          await settle_pair();
          const resultPromise = client.action("increment");
          await settle_pair();
          const result = await resultPromise;

          const hostMessages = hostSocket.sent() as Array<Record<string, unknown>>;

          return {
            hostSentCount: hostMessages.length,
            resultType: result.type,
            resultSeq: result.seq,
            clientCount: client.map.at(["count"]).snap(),
            hostCount: host.map.at(["count"]).snap(),
            lastHostMessageType: hostMessages[hostMessages.length - 1]?.type,
          };
        },
        expected: {
          hostSentCount: 3,
          resultType: "ack",
          resultSeq: 1,
          clientCount: 0,
          hostCount: 1,
          lastHostMessageType: "ack",
        },
      }),
    ] as const,
  };
}