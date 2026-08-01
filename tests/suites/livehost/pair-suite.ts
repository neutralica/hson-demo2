// pair-suite.ts

import { create_livehost, create_livehost_client } from "hson-live/livehost";
import type { TestCase, TestSuite } from "../../harness/core/test-contracts";
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
  await Promise.resolve();
  await Promise.resolve();
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
        name: "client socket close detaches host listener",
        input: {},
        act: async () => {
          const [clientSocket, hostSocket] = make_socket_pair();
          const host = create_livehost({ state: { ready: true } });
          const client = create_livehost_client<{ ready: boolean }>({
            socket: clientSocket,
            clientId: "client-a",
          });

          host.connect(hostSocket);
          client.connect();
          await settle_pair();
          clientSocket.close();
          await settle_pair();
          clientSocket.send(JSON.stringify({ type: "hello", clientId: "client-a", lastSeq: 0 }));
          await settle_pair();

          const clientMessages = clientSocket.sent() as Array<Record<string, unknown>>;
          const hostMessages = hostSocket.sent() as Array<Record<string, unknown>>;

          return {
            clientSentCount: clientMessages.length,
            hostSentCount: hostMessages.length,
            firstClientType: clientMessages[0]?.type,
            secondClientType: clientMessages[1]?.type,
            firstHostType: hostMessages[0]?.type,
            secondHostType: hostMessages[1]?.type,
            clientSeq: client.seq,
            clientRoot: client.map.snap(),
          };
        },
        expected: {
          clientSentCount: 2,
          hostSentCount: 1,
          firstClientType: "hello",
          secondClientType: "hello",
          firstHostType: "hello",
          secondHostType: undefined,
          clientSeq: 0,
          clientRoot: { ready: true },
        },
      }),
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
      livehost_pair_read_case({
        suite: SUITE,
        name: "client reconnect with stale seq receives replayed sync",
        input: {},
        act: async () => {
          type Actions = Readonly<{
            increment: undefined;
          }>;
          const [firstClientSocket, firstHostSocket] = make_socket_pair();
          const [secondClientSocket, secondHostSocket] = make_socket_pair();
          const host = create_livehost({
            state: { count: 0 },
            actions: {
              increment: (ctx) => {
                const current = ctx.map.at(["count"]).snap();
                ctx.map.set(["count"], typeof current === "number" ? current + 1 : 1);
              },
            },
          });
          const firstClient = create_livehost_client<{ count: number }, Actions>({
            socket: firstClientSocket,
            actionId: () => "action-a",
          });

          host.connect(firstHostSocket);
          firstClient.connect();
          await settle_pair();
          firstClient.subscribe(["count"]);
          await settle_pair();
          const resultPromise = firstClient.action("increment");
          await settle_pair();
          await resultPromise;
          await settle_pair();

          const secondClient = create_livehost_client<{ count: number }, Actions>({
            socket: secondClientSocket,
            clientId: "client-b",
          });
          host.connect(secondHostSocket);
          secondClient.connect();
          await settle_pair();

          const [secondHello] = secondClientSocket.sent() as Array<Record<string, unknown>>;
          const [hostHello, replay] = secondHostSocket.sent() as Array<Record<string, unknown>>;

          return {
            secondLastSeq: secondHello?.lastSeq,
            hostHelloType: hostHello?.type,
            hostHelloSeq: hostHello?.seq,
            replayType: replay?.type,
            replaySeq: replay?.seq,
            replayPath: replay?.path,
            replayValue: replay?.value,
            secondSeq: secondClient.seq,
            secondCount: secondClient.map.at(["count"]).snap(),
          };
        },
        expected: {
          secondLastSeq: 0,
          hostHelloType: "hello",
          hostHelloSeq: 1,
          replayType: "sync",
          replaySeq: 1,
          replayPath: ["count"],
          replayValue: 1,
          secondSeq: 1,
          secondCount: 1,
        },
      }),
      livehost_pair_read_case({
        suite: SUITE,
        name: "client reconnect after latest seq receives only hello",
        input: {},
        act: async () => {
          type Actions = Readonly<{
            increment: undefined;
          }>;
          const [firstClientSocket, firstHostSocket] = make_socket_pair();
          const [secondClientSocket, secondHostSocket] = make_socket_pair();
          const host = create_livehost({
            state: { count: 0 },
            actions: {
              increment: (ctx) => {
                const current = ctx.map.at(["count"]).snap();
                ctx.map.set(["count"], typeof current === "number" ? current + 1 : 1);
              },
            },
          });
          const firstClient = create_livehost_client<{ count: number }, Actions>({
            socket: firstClientSocket,
            actionId: () => "action-a",
          });

          host.connect(firstHostSocket);
          firstClient.connect();
          await settle_pair();
          firstClient.subscribe(["count"]);
          await settle_pair();
          const resultPromise = firstClient.action("increment");
          await settle_pair();
          await resultPromise;
          await settle_pair();

          const secondClient = create_livehost_client<{ count: number }, Actions>({ socket: secondClientSocket });
          host.connect(secondHostSocket);
          secondClient.connect();
          await settle_pair();
          secondClient.disconnect();
          secondClientSocket.close();
          await settle_pair();
          host.connect(secondHostSocket);
          secondClient.connect();
          await settle_pair();

          const secondClientMessages = secondClientSocket.sent() as Array<Record<string, unknown>>;
          const secondHostMessages = secondHostSocket.sent() as Array<Record<string, unknown>>;
          const replayMessages = secondHostMessages.filter((message) => message.type === "sync");
          const lastHello = secondHostMessages[secondHostMessages.length - 1];

          return {
            clientHelloCount: secondClientMessages.length,
            firstLastSeq: secondClientMessages[0]?.lastSeq,
            secondLastSeq: secondClientMessages[1]?.lastSeq,
            hostSentCount: secondHostMessages.length,
            replayCount: replayMessages.length,
            lastHostType: lastHello?.type,
            lastHostSeq: lastHello?.seq,
            clientSeq: secondClient.seq,
            clientCount: secondClient.map.at(["count"]).snap(),
          };
        },
        expected: {
          clientHelloCount: 2,
          firstLastSeq: 0,
          secondLastSeq: 1,
          hostSentCount: 3,
          replayCount: 1,
          lastHostType: "hello",
          lastHostSeq: 1,
          clientSeq: 1,
          clientCount: 1,
        },
      }),
      livehost_pair_read_case({
        suite: SUITE,
        name: "client reconnect too far behind receives snapshot without replay",
        input: {},
        act: async () => {
          type Actions = Readonly<{
            increment: undefined;
          }>;
          const [writerClientSocket, writerHostSocket] = make_socket_pair();
          const [readerClientSocket, readerHostSocket] = make_socket_pair();
          const host = create_livehost({
            state: { count: 0 },
            actions: {
              increment: (ctx) => {
                const current = ctx.map.at(["count"]).snap();
                ctx.map.set(["count"], typeof current === "number" ? current + 1 : 1);
              },
            },
          });
          const writer = create_livehost_client<{ count: number }, Actions>({
            socket: writerClientSocket,
            actionId: () => "action-a",
          });

          host.connect(writerHostSocket);
          writer.connect();
          await settle_pair();
          writer.subscribe(["count"]);
          await settle_pair();
          const resultPromise = writer.action("increment");
          await settle_pair();
          await resultPromise;
          await settle_pair();

          const reader = create_livehost_client<{ count: number }, Actions>({ socket: readerClientSocket });
          host.connect(readerHostSocket);
          reader.connect();
          await settle_pair();

          const hostMessages = readerHostSocket.sent() as Array<Record<string, unknown>>;
          const replayMessages = hostMessages.filter((message) => message.type === "sync");

          return {
            hostSentCount: hostMessages.length,
            replayCount: replayMessages.length,
            helloType: hostMessages[0]?.type,
            helloSeq: hostMessages[0]?.seq,
            readerSeq: reader.seq,
            readerRoot: reader.map.snap(),
            readerCount: reader.map.at(["count"]).snap(),
          };
        },
        expected: {
          hostSentCount: 2,
          replayCount: 1,
          helloType: "hello",
          helloSeq: 1,
          readerSeq: 1,
          readerRoot: { count: 1 },
          readerCount: 1,
        },
      }),
      livehost_pair_read_case({
        suite: SUITE,
        name: "host connection emits one generic event to one client",
        input: {},
        act: async () => {
          const [firstClientSocket, firstHostSocket] = make_socket_pair();
          const [secondClientSocket, secondHostSocket] = make_socket_pair();
          const host = create_livehost({ state: { ready: true } });
          const first = create_livehost_client<{ ready: boolean }>({ socket: firstClientSocket });
          const second = create_livehost_client<{ ready: boolean }>({ socket: secondClientSocket });
          const firstEvents: unknown[] = [];
          const secondEvents: unknown[] = [];
          first.on_event((message) => firstEvents.push(message));
          second.on_event((message) => secondEvents.push(message));
          const firstConnection = host.connect(firstHostSocket);
          host.connect(secondHostSocket);
          first.connect();
          second.connect();
          await settle_pair();
          firstConnection.emit_event("notice", { nested: [1, { ok: true }] });
          await settle_pair();
          return { firstEvents, secondEvents };
        },
        expected: {
          firstEvents: [{ type: "event", event: "notice", payload: { nested: [1, { ok: true }] } }],
          secondEvents: [],
        },
      }),
      livehost_pair_read_case({
        suite: SUITE,
        name: "action context emits ordered events only to invoking client before ack",
        input: {},
        act: async () => {
          type Actions = Readonly<{ emit: undefined }>;
          const [firstClientSocket, firstHostSocket] = make_socket_pair();
          const [secondClientSocket, secondHostSocket] = make_socket_pair();
          const host = create_livehost<undefined, Actions>({
            actions: {
              emit: (ctx) => {
                ctx.emit_event("first", { n: 1 });
                ctx.emit_event("second", { n: 2 });
                return { done: true };
              },
            },
          });
          const first = create_livehost_client<undefined, Actions>({ socket: firstClientSocket, actionId: () => "emit-a" });
          const second = create_livehost_client<undefined, Actions>({ socket: secondClientSocket });
          const firstEvents: string[] = [];
          const secondEvents: string[] = [];
          first.on_event((message) => firstEvents.push(message.event));
          second.on_event((message) => secondEvents.push(message.event));
          host.connect(firstHostSocket);
          host.connect(secondHostSocket);
          first.connect();
          second.connect();
          await settle_pair();
          const resultPromise = first.action("emit");
          await settle_pair();
          const result = await resultPromise;
          const hostTypes = (firstHostSocket.sent() as Array<Record<string, unknown>>).map((message) => message.type);
          return {
            firstEvents,
            secondEvents,
            resultType: result.type,
            result: result.type === "ack" ? result.result : undefined,
            hostTypes,
          };
        },
        expected: {
          firstEvents: ["first", "second"],
          secondEvents: [],
          resultType: "ack",
          result: { done: true },
          hostTypes: ["hello", "event", "event", "ack"],
        },
      }),
      livehost_pair_read_case({
        suite: SUITE,
        name: "action context emitter returns false after originating connection closes",
        input: {},
        act: async () => {
          type Actions = Readonly<{ delayed: undefined }>;
          let release: (() => void) | undefined;
          const gate = new Promise<void>((resolve) => {
            release = resolve;
          });
          let emitted: boolean | undefined;
          let origin: unknown;
          const [clientSocket, hostSocket] = make_socket_pair();
          const host = create_livehost<undefined, Actions>({
            sessionId: () => "async-detach-session",
            actions: {
              delayed: async (ctx) => {
                origin = ctx.origin;
                await gate;
                emitted = ctx.emit_event("late", null);
                return { emitted };
              },
            },
          });
          const client = create_livehost_client<undefined, Actions>({ socket: clientSocket, actionId: () => "delayed-a" });
          host.connect(hostSocket);
          client.connect();
          await settle_pair();
          const actionOutcome = client.action("delayed").then(
            () => "resolved",
            () => "rejected",
          );
          await settle_pair();
          client.disconnect();
          clientSocket.close();
          await settle_pair();
          release?.();
          await settle_pair();
          const hostEvents = (hostSocket.sent() as Array<Record<string, unknown>>).filter((message) => message.type === "event");
          return { actionOutcome: await actionOutcome, origin, emitted, hostEventCount: hostEvents.length };
        },
        expected: {
          actionOutcome: "rejected",
          origin: { kind: "session", sessionId: "async-detach-session", epoch: 1, resumable: false },
          emitted: false,
          hostEventCount: 0,
        },
      }),
      livehost_pair_read_case({
        suite: SUITE,
        name: "concurrent generic actions keep event markers connection scoped",
        input: {},
        act: async () => {
          type Actions = Readonly<{ marked: { marker: string } }>;
          let started = 0;
          let release: (() => void) | undefined;
          const gate = new Promise<void>((resolve) => {
            release = resolve;
          });
          let bothStarted: (() => void) | undefined;
          const entered = new Promise<void>((resolve) => {
            bothStarted = resolve;
          });
          const [firstClientSocket, firstHostSocket] = make_socket_pair();
          const [secondClientSocket, secondHostSocket] = make_socket_pair();
          const host = create_livehost<undefined, Actions>({
            actions: {
              marked: async (ctx, payload) => {
                started += 1;
                if (started === 2) bothStarted?.();
                await gate;
                ctx.emit_event("marker", payload);
                return payload;
              },
            },
          });
          const first = create_livehost_client<undefined, Actions>({ socket: firstClientSocket, actionId: () => "marked-a" });
          const second = create_livehost_client<undefined, Actions>({ socket: secondClientSocket, actionId: () => "marked-b" });
          const firstMarkers: unknown[] = [];
          const secondMarkers: unknown[] = [];
          first.on_event((message) => firstMarkers.push(message.payload));
          second.on_event((message) => secondMarkers.push(message.payload));
          host.connect(firstHostSocket);
          host.connect(secondHostSocket);
          first.connect();
          second.connect();
          await settle_pair();
          const firstResult = first.action("marked", { marker: "a" });
          const secondResult = second.action("marked", { marker: "b" });
          await entered;
          release?.();
          const [firstAck, secondAck] = await Promise.all([firstResult, secondResult]);
          await settle_pair();
          return {
            started,
            firstMarkers,
            secondMarkers,
            firstResult: firstAck.type === "ack" ? firstAck.result : undefined,
            secondResult: secondAck.type === "ack" ? secondAck.result : undefined,
          };
        },
        expected: {
          started: 2,
          firstMarkers: [{ marker: "a" }],
          secondMarkers: [{ marker: "b" }],
          firstResult: { marker: "a" },
          secondResult: { marker: "b" },
        },
      }),
      livehost_pair_read_case({
  suite: SUITE,
  name: "client supplied id cannot manufacture session authority",
  input: {},

  act: async () => {
    type Actions = Readonly<{
      inspect: undefined;
    }>;

    const [clientSocket, hostSocket] = make_socket_pair();

    const host = create_livehost<undefined, Actions>({
      sessionId: () => "server-session-a",

      actions: {
        inspect: (ctx) => {
          return ctx.origin;
        },
      },
    });

    const client = create_livehost_client<undefined, Actions>({
      socket: clientSocket,
      clientId: "impersonated-session",
      actionId: () => "inspect-a",
    });

    host.connect(hostSocket);
    client.connect();

    await settle_pair();

    const result = await client.action("inspect");

    await settle_pair();

    return {
      resultType: result.type,
      origin: result.type === "ack"
        ? result.result
        : undefined,
    };
  },

  expected: {
    resultType: "ack",
    origin: {
      kind: "session",
      sessionId: "server-session-a",
      epoch: 1,
      resumable: false,
    },
  },
      }),
      livehost_pair_read_case({
  suite: SUITE,
  name: "clients sharing a claimed id retain distinct session authority",
  input: {},

  act: async () => {
    type Actions = Readonly<{
      inspect: undefined;
    }>;

    let nextSession = 0;

    const [firstClientSocket, firstHostSocket] = make_socket_pair();
    const [secondClientSocket, secondHostSocket] = make_socket_pair();

    const host = create_livehost<undefined, Actions>({
      sessionId: () => {
        nextSession += 1;
        return `server-session-${nextSession}`;
      },

      actions: {
        inspect: (ctx) => {
          return ctx.origin;
        },
      },
    });

    const first = create_livehost_client<undefined, Actions>({
      socket: firstClientSocket,
      clientId: "shared-claimed-id",
      actionId: () => "inspect-a",
    });

    const second = create_livehost_client<undefined, Actions>({
      socket: secondClientSocket,
      clientId: "shared-claimed-id",
      actionId: () => "inspect-b",
    });

    host.connect(firstHostSocket);
    host.connect(secondHostSocket);

    first.connect();
    second.connect();

    await settle_pair();

    const [firstResult, secondResult] = await Promise.all([
      first.action("inspect"),
      second.action("inspect"),
    ]);

    await settle_pair();

    return {
      firstOrigin: firstResult.type === "ack"
        ? firstResult.result
        : undefined,

      secondOrigin: secondResult.type === "ack"
        ? secondResult.result
        : undefined,
    };
  },

  expected: {
    firstOrigin: {
      kind: "session",
      sessionId: "server-session-1",
      epoch: 1,
      resumable: false,
    },

    secondOrigin: {
      kind: "session",
      sessionId: "server-session-2",
      epoch: 1,
      resumable: false,
    },
  },
      }),
      livehost_pair_read_case({
  suite: SUITE,
  name: "client invalid payload is rejected before handler and mutation",
  input: {},

  act: async () => {
    type Actions = Readonly<{
      update: { value: string };
    }>;

    let calls = 0;

    const [clientSocket, hostSocket] = make_socket_pair();

    const host = create_livehost<{ value: string }, Actions>({
      state: {
        value: "unchanged",
      },

      schema: {
        actions: {
          update: {
            payload: (value): value is { value: string } => {
              return typeof value === "object"
                && value !== null
                && !Array.isArray(value)
                && typeof (value as { value?: unknown }).value === "string";
            },
          },
        },
      },

      actions: {
        update: (ctx, payload) => {
          calls += 1;
          ctx.map.set(["value"], payload.value);
        },
      },
    });

    const client = create_livehost_client<
      { value: string },
      Actions
    >({
      socket: clientSocket,
      actionId: () => "invalid-update-a",
    });

    host.connect(hostSocket);
    client.connect();

    await settle_pair();

    const result = await client.action(
      "update",
      {
        label: "changed",
      } as unknown as { value: string },
    );

    await settle_pair();

    return {
      calls,
      resultType: result.type,
      code: result.type === "error"
        ? result.error.code
        : undefined,
      resultSeq: result.seq,
      hostSeq: host.seq,
      value: host.map.at(["value"]).snap(),
    };
  },

  expected: {
    calls: 0,
    resultType: "error",
    code: "LIVEHOST_SCHEMA_INVALID_PAYLOAD",
    resultSeq: 0,
    hostSeq: 0,
    value: "unchanged",
  },
      }),
      livehost_pair_read_case({
  suite: SUITE,
  name: "repeated session action id returns cached outcome without rerunning handler",
  input: {},

  act: async () => {
    type Actions = Readonly<{
      increment: undefined;
    }>;

    let calls = 0;

    const [clientSocket, hostSocket] = make_socket_pair();

    const host = create_livehost<{ count: number }, Actions>({
      state: {
        count: 0,
      },

      actions: {
        increment: (ctx) => {
          calls += 1;

          const count = ctx.map.at(["count"]).snap();

          ctx.map.set(
            ["count"],
            typeof count === "number"
              ? count + 1
              : 1,
          );

          return {
            calls,
          };
        },
      },
    });

    const client = create_livehost_client<
      { count: number },
      Actions
    >({
      socket: clientSocket,
      actionId: () => "same-action-id",
    });

    host.connect(hostSocket);
    client.connect();

    await settle_pair();

    const first = await client.action("increment");

    await settle_pair();

    const second = await client.action("increment");

    await settle_pair();

    return {
      calls,

      firstType: first.type,
      firstSeq: first.seq,
      firstResult: first.type === "ack"
        ? first.result
        : undefined,

      secondType: second.type,
      secondSeq: second.seq,
      secondResult: second.type === "ack"
        ? second.result
        : undefined,

      hostSeq: host.seq,
      count: host.map.at(["count"]).snap(),
    };
  },

  expected: {
    calls: 1,

    firstType: "ack",
    firstSeq: 1,
    firstResult: {
      calls: 1,
    },

    secondType: "ack",
    secondSeq: 1,
    secondResult: {
      calls: 1,
    },

    hostSeq: 1,
    count: 1,
  },
      }),
      
    ] as const,
  };
}
