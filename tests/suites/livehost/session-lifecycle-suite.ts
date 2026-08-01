import { create_livehost } from "hson-live/livehost";
import type {
  LiveHostDisposer,
  LiveHostSessionLifecycleEvent,
  LiveHostSocketLike,
} from "hson-live/livehost";
import type { TestCase, TestSuite } from "../../harness/core/test-contracts";
import { equal_row, preview_value } from "../livemap/test-helpers";

type MemorySocket = LiveHostSocketLike & Readonly<{
  receive: (message: unknown) => Promise<void>;
  emit_close: () => void;
  sent: () => readonly Record<string, unknown>[];
  listener_count: () => number;
  close_count: () => number;
}>;

type ScheduledTask = { at: number; callback: () => void };

function make_clock() {
  let time = 100;
  let nextId = 0;
  const tasks = new Map<number, ScheduledTask>();
  return Object.freeze({
    now: () => time,
    schedule(delayMs: number, callback: () => void): LiveHostDisposer {
      const id = ++nextId;
      tasks.set(id, { at: time + delayMs, callback });
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        tasks.delete(id);
      };
    },
    advance(ms: number): void {
      time += ms;
      for (const [id, task] of [...tasks].sort((a, b) => a[1].at - b[1].at)) {
        if (task.at > time) continue;
        tasks.delete(id);
        task.callback();
      }
    },
    pending: () => tasks.size,
  });
}

function make_socket(): MemorySocket {
  const messages = new Set<(message: string) => void>();
  const closes = new Set<() => void>();
  const sent: string[] = [];
  let closeCount = 0;
  return Object.freeze({
    send(message: string): void { sent.push(message); },
    close(): void { closeCount += 1; },
    onMessage(listener: (message: string) => void): LiveHostDisposer {
      messages.add(listener);
      return () => { messages.delete(listener); };
    },
    onClose(listener: () => void): LiveHostDisposer {
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

function label(event: LiveHostSessionLifecycleEvent): string {
  if (event.kind === "attached") return `attached:${event.attachment}:${event.session.activeConnectionEpoch}`;
  if (event.kind === "fenced") return `fenced:${event.epoch}`;
  if (event.kind === "revoked") return `revoked:${event.reason}`;
  return event.kind;
}

function credential(socket: MemorySocket): string {
  const message = socket.sent().find((item) => item.type === "session-created");
  if (typeof message?.credential !== "string") throw new Error("Expected a session credential.");
  return message.credential;
}

function lifecycle_case(
  name: string,
  act: () => unknown | Promise<unknown>,
  expected: unknown,
): TestCase {
  return {
    suite: "livehost/session-lifecycle",
    name,
    meta: { input: preview_value({}) },
    run: async () => ({
      assertRows: [equal_row(`${name}: value`, await act(), expected)],
    }),
  };
}

export function livehost_session_lifecycle_suite(): TestSuite {
  const SUITE = "livehost/session-lifecycle";
  return {
    suite: SUITE,
    cases: [
      lifecycle_case("lazy session emits attached detached expired in order", async () => {
        const host = create_livehost({ state: {}, sessionId: () => "lazy-a" });
        const events: string[] = [];
        host.sessions.on_change((event) => events.push(label(event)));
        const socket = make_socket();
        host.connect(socket);
        await socket.receive({ type: "hello" });
        socket.emit_close();
        return { events, state: host.sessions.debug().sessions[0]?.state };
      }, { events: ["attached:created:1", "detached", "expired"], state: "expired" }),

      lifecycle_case("explicit resumable creation emits attached created", async () => {
        const host = create_livehost({ state: {}, sessionId: () => "resume-a" });
        const events: string[] = [];
        host.sessions.on_change((event) => events.push(label(event)));
        const socket = make_socket();
        host.connect(socket);
        await socket.receive({ type: "session-create", id: "create-a" });
        const session = host.sessions.debug().sessions[0];
        return { events, resumable: session?.resumable, state: session?.state };
      }, { events: ["attached:created:1"], resumable: true, state: "attached" }),

      lifecycle_case("resumable close emits detached with matching timestamps", async () => {
        const clock = make_clock();
        const host = create_livehost({
          state: {},
          sessionId: () => "resume-b",
          sessions: { graceMs: 50, now: clock.now, schedule: clock.schedule },
        });
        const snapshots: unknown[] = [];
        host.sessions.on_change((event) => {
          if (event.kind === "detached") snapshots.push(event.session);
        });
        const socket = make_socket();
        host.connect(socket);
        await socket.receive({ type: "session-create", id: "create-b" });
        socket.emit_close();
        const current = host.sessions.debug().sessions[0];
        return {
          event: snapshots[0],
          current,
          pending: clock.pending(),
        };
      }, {
        event: {
          sessionId: "resume-b", state: "disconnected", resumable: true,
          activeConnectionEpoch: 1, transportAttached: false, subscriptionCount: 0,
          disconnectedAt: 100, expiresAt: 150, reattachmentCount: 0, fencingCount: 0, expiryCount: 0,
        },
        current: {
          sessionId: "resume-b", state: "disconnected", resumable: true,
          activeConnectionEpoch: 1, transportAttached: false, subscriptionCount: 0,
          disconnectedAt: 100, expiresAt: 150, reattachmentCount: 0, fencingCount: 0, expiryCount: 0,
        },
        pending: 1,
      }),

      lifecycle_case("active reattachment fences old epoch before attaching new epoch", async () => {
        let next = 0;
        const host = create_livehost({ state: {}, sessionId: () => `fence-${++next}` });
        const events: string[] = [];
        host.sessions.on_change((event) => events.push(label(event)));
        const first = make_socket();
        host.connect(first);
        await first.receive({ type: "session-create", id: "create-c" });
        const token = credential(first);
        const second = make_socket();
        host.connect(second);
        await second.receive({ type: "session-attach", id: "attach-c", credential: token });
        return {
          events,
          firstFenced: first.sent().some((item) => item.type === "session-fenced" && item.epoch === 1),
          epoch: host.sessions.debug().sessions[0]?.activeConnectionEpoch,
        };
      }, {
        events: ["attached:created:1", "fenced:1", "attached:reattached:2"],
        firstFenced: true,
        epoch: 2,
      }),

      lifecycle_case("reattach during grace cancels expiry and preserves session identity", async () => {
        const clock = make_clock();
        const origins: unknown[] = [];
        const host = create_livehost({
          state: {},
          sessionId: () => "grace-a",
          sessions: { graceMs: 50, now: clock.now, schedule: clock.schedule },
          actions: { inspect: (ctx) => { origins.push(ctx.origin); } },
        });
        const events: string[] = [];
        host.sessions.on_change((event) => events.push(label(event)));
        const first = make_socket();
        host.connect(first);
        await first.receive({ type: "session-create", id: "create-d" });
        const token = credential(first);
        first.emit_close();
        const second = make_socket();
        host.connect(second);
        await second.receive({ type: "session-attach", id: "attach-d", credential: token });
        await second.receive({
          type: "action", id: "inspect-d", clientId: "spoof", requestId: "inspect-request-d", name: "inspect",
        });
        clock.advance(100);
        return {
          events,
          origin: origins[0],
          pending: clock.pending(),
          state: host.sessions.debug().sessions[0]?.state,
        };
      }, {
        events: ["attached:created:1", "detached", "attached:reattached:2"],
        origin: { kind: "session", sessionId: "grace-a", epoch: 2, resumable: true },
        pending: 0,
        state: "attached",
      }),

      lifecycle_case("grace expiry emits detached then expired and disposes resources", async () => {
        const clock = make_clock();
        const host = create_livehost({
          state: { value: 1 },
          sessionId: () => "expiry-a",
          sessions: { graceMs: 10, now: clock.now, schedule: clock.schedule },
        });
        const events: string[] = [];
        host.sessions.on_change((event) => events.push(label(event)));
        const socket = make_socket();
        host.connect(socket);
        await socket.receive({ type: "session-create", id: "create-e" });
        await socket.receive({ type: "subscribe", path: ["value"] });
        socket.emit_close();
        clock.advance(10);
        return {
          events,
          session: host.sessions.debug().sessions[0],
          pending: clock.pending(),
        };
      }, {
        events: ["attached:created:1", "detached", "expired"],
        session: {
          sessionId: "expiry-a", state: "expired", resumable: true,
          activeConnectionEpoch: 1, transportAttached: false, subscriptionCount: 0,
          disconnectedAt: 100, reattachmentCount: 0, fencingCount: 0, expiryCount: 1,
        },
        pending: 0,
      }),

      lifecycle_case("goodbye revokes once and prevents later expiry", async () => {
        const clock = make_clock();
        const host = create_livehost({
          state: {}, sessionId: () => "goodbye-a",
          sessions: { graceMs: 10, now: clock.now, schedule: clock.schedule },
        });
        const events: string[] = [];
        host.sessions.on_change((event) => events.push(label(event)));
        const socket = make_socket();
        host.connect(socket);
        await socket.receive({ type: "session-create", id: "create-f" });
        await socket.receive({ type: "session-goodbye", id: "goodbye-f" });
        socket.emit_close();
        clock.advance(100);
        return { events, pending: clock.pending(), state: host.sessions.debug().sessions[0]?.state };
      }, {
        events: ["attached:created:1", "revoked:goodbye"], pending: 0, state: "revoked",
      }),

      lifecycle_case("rejected attachment attempts emit no lifecycle success", async () => {
        const clock = make_clock();
        let next = 0;
        const host = create_livehost({
          state: {}, sessionId: () => `reject-${++next}`,
          sessions: { graceMs: 5, now: clock.now, schedule: clock.schedule },
        });
        const events: string[] = [];
        host.sessions.on_change((event) => events.push(label(event)));
        const owner = make_socket();
        host.connect(owner);
        await owner.receive({ type: "session-create", id: "create-g" });
        const token = credential(owner);
        await owner.receive({ type: "session-goodbye", id: "goodbye-g" });
        const expiringOwner = make_socket();
        host.connect(expiringOwner);
        await expiringOwner.receive({ type: "session-create", id: "create-expired-g" });
        const expiredToken = credential(expiringOwner);
        expiringOwner.emit_close();
        clock.advance(5);
        const invalid = make_socket();
        host.connect(invalid);
        await invalid.receive({ type: "session-attach", id: "invalid-g", credential: "not-a-valid-credential" });
        const revoked = make_socket();
        host.connect(revoked);
        await revoked.receive({ type: "session-attach", id: "revoked-g", credential: token });
        const expired = make_socket();
        host.connect(expired);
        await expired.receive({ type: "session-attach", id: "expired-g", credential: expiredToken });
        return {
          events,
          rejected: [...invalid.sent(), ...revoked.sent(), ...expired.sent()].filter((item) => item.type === "session-rejected").length,
        };
      }, {
        events: ["attached:created:1", "revoked:goodbye", "attached:created:1", "detached", "expired"],
        rejected: 3,
      }),

      lifecycle_case("listener disposal exceptions and debug snapshots are isolated", async () => {
        const host = create_livehost({ state: {}, sessionId: () => "listener-a" });
        const delivered: string[] = [];
        const agreements: boolean[] = [];
        host.sessions.on_change(() => { throw new Error("observer failure"); });
        const stop = host.sessions.on_change((event) => {
          delivered.push(label(event));
          if ("session" in event) {
            const current = host.sessions.debug().sessions.find((item) => item.sessionId === event.session.sessionId);
            agreements.push(JSON.stringify(current) === JSON.stringify(event.session));
          }
        });
        const socket = make_socket();
        host.connect(socket);
        await socket.receive({ type: "hello" });
        stop();
        stop();
        socket.emit_close();
        return { delivered, agreements, finalState: host.sessions.debug().sessions[0]?.state };
      }, { delivered: ["attached:created:1"], agreements: [true], finalState: "expired" }),

      lifecycle_case("fenced socket cannot act while replacement acts with incremented epoch", async () => {
        let calls = 0;
        const origins: unknown[] = [];
        const host = create_livehost({
          state: {}, sessionId: () => "authority-a",
          actions: { inspect: (ctx) => { calls += 1; origins.push(ctx.origin); } },
        });
        const first = make_socket();
        host.connect(first);
        await first.receive({ type: "session-create", id: "create-h" });
        const second = make_socket();
        host.connect(second);
        await second.receive({ type: "session-attach", id: "attach-h", credential: credential(first) });
        await first.receive({ type: "action", id: "stale-h", name: "inspect" });
        await second.receive({ type: "action", id: "fresh-h", name: "inspect" });
        return { calls, origins, staleAck: first.sent().some((item) => item.id === "stale-h") };
      }, {
        calls: 1,
        origins: [{ kind: "session", sessionId: "authority-a", epoch: 2, resumable: true }],
        staleAck: false,
      }),

      lifecycle_case("session manager disposal revokes live sessions and leaves observation inert", async () => {
        const clock = make_clock();
        let next = 0;
        const host = create_livehost({
          state: {}, sessionId: () => `dispose-${++next}`,
          sessions: { graceMs: 20, now: clock.now, schedule: clock.schedule },
        });
        const events: string[] = [];
        host.sessions.on_change((event) => events.push(label(event)));
        const attached = make_socket();
        const disconnected = make_socket();
        host.connect(attached);
        host.connect(disconnected);
        await attached.receive({ type: "session-create", id: "create-i" });
        await disconnected.receive({ type: "session-create", id: "create-j" });
        disconnected.emit_close();
        host.sessions.dispose();
        host.sessions.dispose();
        let replayed = false;
        host.sessions.on_change(() => { replayed = true; })();
        clock.advance(100);
        return {
          events,
          states: host.sessions.debug().sessions.map((session) => session.state),
          pending: clock.pending(),
          replayed,
        };
      }, {
        events: [
          "attached:created:1", "attached:created:1", "detached",
          "revoked:host_disposed", "revoked:host_disposed",
        ],
        states: ["revoked", "revoked"], pending: 0, replayed: false,
      }),
    ] as const,
  };
}
