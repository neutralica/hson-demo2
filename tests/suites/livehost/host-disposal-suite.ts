import { create_locus } from "hson-live/locus";
import { create_application_locus_store } from "../../harness/hosted/application-locus-store";
import type { LocusDisposer, LocusSocketLike } from "hson-live/locus";
import type { TestCase, TestSuite } from "../../harness/core/test-contracts";
import { equal_row, preview_value } from "../livemap/test-helpers";

type DisposalSocket = LocusSocketLike & Readonly<{
  receive: (message: unknown) => Promise<void>;
  emit_close: () => void;
  sent: () => readonly Record<string, unknown>[];
  listener_count: () => number;
  close_count: () => number;
}>;

function make_socket(): DisposalSocket {
  const messages = new Set<(message: string) => void>();
  const closes = new Set<() => void>();
  const sent: string[] = [];
  let closeCount = 0;
  return Object.freeze({
    send(message: string): void { sent.push(message); },
    close(): void { closeCount += 1; },
    onMessage(listener: (message: string) => void): LocusDisposer {
      messages.add(listener);
      return () => { messages.delete(listener); };
    },
    onClose(listener: () => void): LocusDisposer {
      closes.add(listener);
      return () => { closes.delete(listener); };
    },
    async receive(message: unknown): Promise<void> {
      const raw = JSON.stringify(message);
      for (const listener of [...messages]) listener(raw);
      for (let index = 0; index < 8; index += 1) await Promise.resolve();
    },
    emit_close(): void { for (const listener of [...closes]) listener(); },
    sent: () => sent.map((message) => JSON.parse(message) as Record<string, unknown>),
    listener_count: () => messages.size + closes.size,
    close_count: () => closeCount,
  });
}

function disposal_case(caseId: string, name: string, act: () => unknown | Promise<unknown>, expected: unknown): TestCase {
  return {
    suite: "livehost/host-disposal",
    caseId,
    name,
    meta: { input: preview_value({}) },
    run: async () => ({ assertRows: [equal_row(`${name}: value`, await act(), expected)] }),
  };
}

export function locus_host_disposal_suite(): TestSuite {
  const SUITE = "livehost/host-disposal";
  return {
    suite: SUITE,
    cases: [
      disposal_case("host-disposal-is-idempotent-inert-and-does-not-own-physical-sockets", "host disposal is idempotent inert and does not own physical sockets", async () => {
        let calls = 0;
        const host = create_locus({
          state: { preserved: true },
          sessionId: () => "dispose-active",
          actions: { act: () => { calls += 1; } },
        });
        const lifecycle: string[] = [];
        host.sessions.on_change((event) => {
          if (event.kind === "revoked") lifecycle.push(`${event.kind}:${event.reason}`);
          else lifecycle.push(event.kind);
        });
        const socket = make_socket();
        host.connect(socket);
        await socket.receive({ type: "hello" });
        const listenersBefore = socket.listener_count();
        host.dispose();
        host.dispose();
        const listenersAfter = socket.listener_count();
        await socket.receive({ type: "action", id: "old-a", name: "act" });
        socket.emit_close();

        const lateSocket = make_socket();
        const lateConnection = host.connect(lateSocket);
        lateConnection();
        lateConnection();
        const response = await host.dispatch_action({ type: "action", id: "direct-a", name: "act" });
        return {
          listenersBefore,
          listenersAfter,
          lateListeners: lateSocket.listener_count(),
          calls,
          lifecycle,
          closeCount: socket.close_count() + lateSocket.close_count(),
          responseType: response.type,
          responseCode: response.type === "error" ? response.error.code : undefined,
          map: host.map.snap(),
          state: host.sessions.debug().sessions[0]?.state,
        };
      }, {
        listenersBefore: 2,
        listenersAfter: 0,
        lateListeners: 0,
        calls: 0,
        lifecycle: ["attached", "revoked:locus_disposed"],
        closeCount: 0,
        responseType: "error",
        responseCode: "LOCUS_DISPOSED",
        map: { preserved: true },
        state: "revoked",
      }),

      disposal_case("host-disposal-revokes-disconnected-sessions-and-cancels-expiry", "host disposal revokes disconnected sessions and cancels expiry", async () => {
        let now = 0;
        let scheduled: (() => void) | undefined;
        let canceled = 0;
        const host = create_locus({
          state: {}, sessionId: () => "dispose-disconnected",
          sessions: {
            graceMs: 20,
            now: () => now,
            schedule: (_delay, callback) => {
              scheduled = callback;
              let active = true;
              return () => { if (active) { active = false; canceled += 1; } };
            },
          },
        });
        const events: string[] = [];
        host.sessions.on_change((event) => {
          events.push(event.kind === "revoked" ? `${event.kind}:${event.reason}` : event.kind);
        });
        const socket = make_socket();
        host.connect(socket);
        await socket.receive({ type: "session-create", id: "create-a" });
        socket.emit_close();
        host.dispose();
        now = 100;
        scheduled?.();
        return { events, canceled, state: host.sessions.debug().sessions[0]?.state };
      }, {
        events: ["attached", "detached", "revoked:locus_disposed"],
        canceled: 1,
        state: "revoked",
      }),

      disposal_case("host-disposal-releases-action-dedupe-retention-resources", "host disposal releases action dedupe retention resources", async () => {
        const scheduled = new Set<() => void>();
        let canceled = 0;
        const host = create_locus({
          state: {},
          actions: { once: () => ({ ok: true }) },
          actionDedupe: {
            terminalRetentionMs: 500,
            schedule: (_delay, callback) => {
              scheduled.add(callback);
              let active = true;
              return () => {
                if (!active) return;
                active = false;
                canceled += 1;
                scheduled.delete(callback);
              };
            },
          },
        });
        const socket = make_socket();
        host.connect(socket);
        await socket.receive({
          type: "action", id: "dedupe-a", clientId: "client-a", requestId: "request-a", name: "once",
        });
        const before = host.actionRequests.debug();
        host.dispose();
        const after = host.actionRequests.debug();
        return {
          beforeRetained: before.retainedTerminalCount,
          beforeDisposed: before.disposed,
          afterRetained: after.retainedTerminalCount,
          afterDisposed: after.disposed,
          scheduled: scheduled.size,
          canceled,
        };
      }, {
        beforeRetained: 1,
        beforeDisposed: false,
        afterRetained: 0,
        afterDisposed: true,
        scheduled: 0,
        canceled: 1,
      }),

      disposal_case("active-recovery-channel-stops-publishing-after-disposal", "active recovery channel stops publishing after disposal", async () => {
        const host = create_locus({ state: { count: 0 }, sessionId: () => "recovery-dispose" });
        const socket = make_socket();
        host.connect(socket);
        await socket.receive({ type: "hello" });
        await socket.receive({
          type: "recover",
          id: "recover-a",
          logicalMapId: host.stream.logicalMapId,
          incarnationId: host.stream.incarnationId,
          lastAppliedRev: host.stream.headRev,
        });
        const before = socket.sent().length;
        host.dispose();
        let mutationCode: string | undefined;
        try {
          await host.mutate((draft) => draft.set(["count"], 1));
        } catch (cause) {
          mutationCode = cause instanceof Error && "code" in cause
            ? String(cause.code)
            : undefined;
        }
        await Promise.resolve();
        return {
          before,
          after: socket.sent().length,
          listeners: socket.listener_count(),
          map: host.map.snap(),
          closeCount: socket.close_count(),
          mutationCode,
        };
      }, {
        before: 3,
        after: 3,
        listeners: 0,
        map: { count: 0 },
        closeCount: 0,
        mutationCode: "LOCUS_AUTHORITY_CLOSED",
      }),

      disposal_case("pending-async-action-keeps-origin-but-cannot-regain-connection-authority", "pending async action keeps origin but cannot regain connection authority", async () => {
        let release: (() => void) | undefined;
        const gate = new Promise<void>((resolve) => { release = resolve; });
        let origin: unknown;
        let emitted: boolean | undefined;
        const host = create_locus<{ finished: boolean }, { delayed: undefined }>({
          state: { finished: false }, sessionId: () => "pending-dispose",
          actions: {
            delayed: async (ctx) => {
              origin = ctx.origin;
              await gate;
              await ctx.mutate((draft) => draft.set(["finished"], true));
              emitted = ctx.emit_event("late", null);
            },
          },
        });
        const socket = make_socket();
        host.connect(socket);
        await socket.receive({ type: "action", id: "pending-a", name: "delayed" });
        host.dispose();
        release?.();
        for (let index = 0; index < 8; index += 1) await Promise.resolve();
        return { origin, emitted, sent: socket.sent(), map: host.map.snap(), listeners: socket.listener_count() };
      }, {
        origin: { kind: "session", sessionId: "pending-dispose", epoch: 1, resumable: false },
        emitted: undefined,
        sent: [],
        map: { finished: false },
        listeners: 0,
      }),

      disposal_case("store-deletion-remains-non-disposing-and-explicit-teardown-is-safe", "store deletion remains non-disposing and explicit teardown is safe", async () => {
        const store = create_application_locus_store();
        const created = store.create("room-a", {
          state: { count: 0 },
          actions: { increment: (ctx) => { void ctx.mutate((draft) => draft.set(["count"], 1)); } },
        });
        if (!created.ok) throw new Error(created.error.message);
        const host = created.value;
        const deleted = store.delete("room-a");
        const responseBeforeDispose = await host.dispatch_action({ type: "action", id: "increment-a", name: "increment" });
        host.dispose();
        const deletedAgain = store.delete("room-a");
        const responseAfterDispose = await host.dispatch_action({ type: "action", id: "increment-b", name: "increment" });
        return {
          deleted,
          deletedAgain,
          storeHas: store.has("room-a"),
          beforeType: responseBeforeDispose.type,
          afterCode: responseAfterDispose.type === "error" ? responseAfterDispose.error.code : undefined,
          count: host.map.at(["count"]).snap(),
        };
      }, {
        deleted: true,
        deletedAgain: false,
        storeHas: false,
        beforeType: "ack",
        afterCode: "LOCUS_DISPOSED",
        count: 1,
      }),
    ] as const,
  };
}
