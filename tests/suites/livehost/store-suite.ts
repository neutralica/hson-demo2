// livehost/store-suite.ts

import { create_livehost, create_livehost_store } from "hson-live/livehost";
import type { TestSuite } from "../../harness/core/test-contracts";
import { read_case } from "../livemap/handle-helpers";

type StoreSocketMessageListener = (message: string) => void;
type StoreSocketCloseListener = () => void;

type StoreSocket = Readonly<{
  send: (message: string) => void;
  close: () => void;
  onMessage: (listener: StoreSocketMessageListener) => () => void;
  onClose: (listener: StoreSocketCloseListener) => () => void;
  receive: (message: unknown) => void;
  sent: () => unknown[];
  listener_count: () => number;
}>;

function make_store_socket(): StoreSocket {
  const sentMessages: string[] = [];
  const messageListeners = new Set<StoreSocketMessageListener>();
  const closeListeners = new Set<StoreSocketCloseListener>();

  function send(message: string): void {
    sentMessages.push(message);
  }

  function close(): void {
    for (const listener of Array.from(closeListeners)) listener();
  }

  function onMessage(listener: StoreSocketMessageListener): () => void {
    messageListeners.add(listener);
    return () => {
      messageListeners.delete(listener);
    };
  }

  function onClose(listener: StoreSocketCloseListener): () => void {
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
    listener_count,
  });
}

export function livehost_store_suite(): TestSuite {
  const SUITE = "livehost/store";

  return {
    suite: SUITE,
    cases: [
      read_case({
        suite: SUITE,
        name: "create stores host by id",
        input: {},
        act: () => {
          const store = create_livehost_store();
          const result = store.create("counter", { state: { count: 0 } });

          return {
            ok: result.ok,
            has: store.has("counter"),
            sameHost: result.ok ? Object.is(store.get("counter"), result.value) : undefined,
            count: result.ok ? result.value.map.at(["count"]).snap() : undefined,
          };
        },
        expected: {
          ok: true,
          has: true,
          sameHost: true,
          count: 0,
        },
      }),
      read_case({
        suite: SUITE,
        name: "create rejects duplicate id",
        input: {},
        act: () => {
          const store = create_livehost_store();
          const first = store.create("counter", { state: { count: 0 } });
          const second = store.create("counter", { state: { count: 1 } });

          return {
            firstOk: first.ok,
            secondOk: second.ok,
            code: second.ok ? undefined : second.error.code,
            count: store.get("counter")?.map.at(["count"]).snap(),
          };
        },
        expected: {
          firstOk: true,
          secondOk: false,
          code: "LIVEHOST_STORE_DUPLICATE_ID",
          count: 0,
        },
      }),
      read_case({
        suite: SUITE,
        name: "set stores existing host by id",
        input: {},
        act: () => {
          const store = create_livehost_store();
          const host = create_livehost({ state: { ready: true } });
          const result = store.set("main", host);

          return {
            ok: result.ok,
            has: store.has("main"),
            sameHost: Object.is(store.get("main"), host),
            ready: store.get("main")?.map.at(["ready"]).snap(),
          };
        },
        expected: {
          ok: true,
          has: true,
          sameHost: true,
          ready: true,
        },
      }),
      read_case({
        suite: SUITE,
        name: "set rejects duplicate id",
        input: {},
        act: () => {
          const store = create_livehost_store();
          const first = store.set("main", create_livehost({ state: { ready: true } }));
          const second = store.set("main", create_livehost({ state: { ready: false } }));

          return {
            firstOk: first.ok,
            secondOk: second.ok,
            code: second.ok ? undefined : second.error.code,
            ready: store.get("main")?.map.at(["ready"]).snap(),
          };
        },
        expected: {
          firstOk: true,
          secondOk: false,
          code: "LIVEHOST_STORE_DUPLICATE_ID",
          ready: true,
        },
      }),
      read_case({
        suite: SUITE,
        name: "delete removes host",
        input: {},
        act: () => {
          const store = create_livehost_store();
          store.create("counter", { state: { count: 0 } });
          const deleted = store.delete("counter");

          return {
            deleted,
            has: store.has("counter"),
            value: store.get("counter"),
          };
        },
        expected: {
          deleted: true,
          has: false,
          value: undefined,
        },
      }),
      read_case({
        suite: SUITE,
        name: "connect rejects unknown id",
        input: {},
        act: () => {
          const store = create_livehost_store();
          const socket = make_store_socket();
          const result = store.connect("missing", socket);

          return {
            ok: result.ok,
            code: result.ok ? undefined : result.error.code,
            sentCount: socket.sent().length,
            listenerCount: socket.listener_count(),
          };
        },
        expected: {
          ok: false,
          code: "LIVEHOST_STORE_UNKNOWN_ID",
          sentCount: 0,
          listenerCount: 0,
        },
      }),
      read_case({
        suite: SUITE,
        name: "connect routes socket to stored host",
        input: {},
        act: () => {
          const store = create_livehost_store();
          const socket = make_store_socket();
          store.create("counter", { state: { count: 2 } });
          const result = store.connect("counter", socket);

          socket.receive({ type: "hello", clientId: "client-a", lastSeq: 0 });

          const [hello] = socket.sent() as Array<Record<string, unknown>>;

          return {
            ok: result.ok,
            helloType: hello?.type,
            helloSeq: hello?.seq,
            snapshot: hello?.snapshot,
            listenerCount: socket.listener_count(),
          };
        },
        expected: {
          ok: true,
          helloType: "hello",
          helloSeq: 0,
          snapshot: { count: 2 },
          listenerCount: 2,
        },
      }),
      read_case({
        suite: SUITE,
        name: "connect routes action to stored host",
        input: {},
        act: () => {
          const store = create_livehost_store();
          const socket = make_store_socket();
          const created = store.create("counter", {
            state: { count: 2 },
            actions: {
              increment: (ctx) => {
                const count = ctx.map.at(["count"]).snap() as number;
                ctx.map.at(["count"]).set(count + 1);
              },
            },
          });
          const connected = store.connect("counter", socket);

          socket.receive({ type: "hello", clientId: "client-a", lastSeq: 0 });
          socket.receive({ type: "action", id: "action-a", name: "increment" });

          const messages = socket.sent() as Array<Record<string, unknown>>;

          return {
            created: created.ok,
            connected: connected.ok,
            messageTypes: messages.map((message) => message.type),
            count: store.get("counter")?.map.at(["count"]).snap(),
          };
        },
        expected: {
          created: true,
          connected: true,
          messageTypes: ["hello"],
          count: 3,
        },
      }),
      read_case({
        suite: SUITE,
        name: "list returns registered entries",
        input: {},
        act: () => {
          const store = create_livehost_store();
          store.create("a", { state: { value: 1 } });
          store.create("b", { state: { value: 2 } });

          const entries = store.list();

          return {
            count: entries.length,
            ids: entries.map((entry) => entry.id),
            values: entries.map((entry) => entry.host.map.at(["value"]).snap()),
          };
        },
        expected: {
          count: 2,
          ids: ["a", "b"],
          values: [1, 2],
        },
      }),
      read_case({
        suite: SUITE,
        name: "delete unknown id returns false",
        input: {},
        act: () => {
          const store = create_livehost_store();

          return {
            deleted: store.delete("missing"),
            listCount: store.list().length,
          };
        },
        expected: {
          deleted: false,
          listCount: 0,
        },
      }),
      read_case({
        suite: SUITE,
        name: "connect disposer detaches socket listeners",
        input: {},
        act: () => {
          const store = create_livehost_store();
          const socket = make_store_socket();
          store.create("counter", { state: { count: 0 } });
          const result = store.connect("counter", socket);
          const beforeDisposeCount = socket.listener_count();

          if (result.ok) result.value();

          return {
            ok: result.ok,
            beforeDisposeCount,
            afterDisposeCount: socket.listener_count(),
          };
        },
        expected: {
          ok: true,
          beforeDisposeCount: 2,
          afterDisposeCount: 0,
        },
      }),
      read_case({
        suite: SUITE,
        name: "list entries are frozen snapshots",
        input: {},
        act: () => {
          const store = create_livehost_store();
          store.create("a", { state: { value: 1 } });

          const firstEntries = store.list();
          store.create("b", { state: { value: 2 } });
          const secondEntries = store.list();
          const firstEntry = firstEntries[0];

          return {
            firstCount: firstEntries.length,
            secondCount: secondEntries.length,
            firstId: firstEntry?.id,
            firstFrozen: firstEntry ? Object.isFrozen(firstEntry) : undefined,
          };
        },
        expected: {
          firstCount: 1,
          secondCount: 2,
          firstId: "a",
          firstFrozen: true,
        },
      }),
    ] as const,
  };
}