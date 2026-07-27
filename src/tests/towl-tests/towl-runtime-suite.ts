import type { LiveHostDisposer } from "hson-live/livehost";
import type { TestSuite } from "../../app/demos/test/tests.types";
import {
  create_towl_runtime,
  TOWL_WIN_POSITION,
  type TowlRuntime,
} from "../../app/demos/towl";
import {
  create_towl_session,
  join_towl_pair,
  make_towl_socket,
  send_towl_action,
  start_towl_round,
  towl_case,
} from "./towl-test-helpers";

type ScheduledTask = Readonly<{ at: number; callback: () => void }>;

function make_clock() {
  let time = 100;
  let nextId = 0;
  const tasks = new Map<number, ScheduledTask>();
  return Object.freeze({
    now: () => time,
    schedule(delayMs: number, callback: () => void): LiveHostDisposer {
      const id = ++nextId;
      tasks.set(id, Object.freeze({ at: time + delayMs, callback }));
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        tasks.delete(id);
      };
    },
    advance(ms: number): void {
      time += ms;
      for (const [id, task] of [...tasks].sort((left, right) => left[1].at - right[1].at)) {
        if (task.at > time) continue;
        tasks.delete(id);
        task.callback();
      }
    },
    pending: () => tasks.size,
  });
}

function error_code(response: Record<string, unknown>): unknown {
  const error = response.error;
  return typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
}

function result_value(response: Record<string, unknown>): unknown {
  return response.type === "ack" ? response.result : undefined;
}

async function with_runtime<TResult>(
  run: (runtime: TowlRuntime) => TResult | Promise<TResult>,
): Promise<TResult> {
  let nextSession = 0;
  const runtime = create_towl_runtime({ sessionId: () => `towl-session-${++nextSession}` });
  try {
    return await run(runtime);
  } finally {
    runtime.dispose();
  }
}

export function towl_runtime_suite(): TestSuite {
  const SUITE = "livehost/towl-runtime";
  return {
    suite: SUITE,
    cases: [
      towl_case(SUITE, "direct dispatch cannot claim player authority", async () => with_runtime(async (runtime) => {
        const before = runtime.host.map.rev;
        const response = await runtime.host.dispatch_action({ type: "action", id: "direct-join", name: "join" });
        return { type: response.type, code: response.type === "error" ? response.error.code : undefined, rev: runtime.host.map.rev - before };
      }), { type: "error", code: "TOWL_SESSION_REQUIRED", rev: 0 }),
      towl_case(SUITE, "lazy non-resumable session cannot occupy a seat", async () => with_runtime(async (runtime) => {
        const socket = make_towl_socket();
        runtime.host.connect(socket);
        await socket.receive({ type: "hello" });
        const response = await send_towl_action(socket, "join");
        return { code: error_code(response), state: runtime.host.map.snap() };
      }), {
        code: "TOWL_RESUMABLE_SESSION_REQUIRED",
        state: {
          phase: "lobby",
          player1: { sessionId: null, connected: false, ready: false },
          player2: { sessionId: null, connected: false, ready: false },
          position: 0,
          winner: null,
          round: 1,
        },
      }),
      towl_case(SUITE, "resumable sessions claim seats by server identity", async () => with_runtime(async (runtime) => {
        const pair = await join_towl_pair(runtime);
        return {
          sessions: [runtime.host.map.snap().player1.sessionId, runtime.host.map.snap().player2.sessionId],
          expected: [pair.firstSessionId, pair.secondSessionId],
          phase: runtime.host.map.snap().phase,
        };
      }), {
        sessions: ["towl-session-1", "towl-session-2"],
        expected: ["towl-session-1", "towl-session-2"],
        phase: "ready",
      }),
      towl_case(SUITE, "clientId cannot select or spoof seat authority", async () => with_runtime(async (runtime) => {
        const first = make_towl_socket();
        const second = make_towl_socket();
        await create_towl_session(runtime, first, "spoof-create-a");
        await create_towl_session(runtime, second, "spoof-create-b");
        const firstJoin = await send_towl_action(
          first,
          "join",
          undefined,
          {
            clientId: "shared-spoof",
            requestId: "spoof-join-first",
          },
        );
        const secondJoin = await send_towl_action(
          second,
          "join",
          undefined,
          {
            clientId: "shared-spoof",
            requestId: "spoof-join-second",
          },
        );
        return {
          results: [result_value(firstJoin), result_value(secondJoin)],
          sessions: [runtime.host.map.snap().player1.sessionId, runtime.host.map.snap().player2.sessionId],
        };
      }), {
        results: [{ seat: "player1" }, { seat: "player2" }],
        sessions: ["towl-session-1", "towl-session-2"],
      }),
      towl_case(SUITE, "third session is rejected without a commit", async () => with_runtime(async (runtime) => {
        await join_towl_pair(runtime);
        const third = make_towl_socket();
        await create_towl_session(runtime, third, "third-create");
        const before = runtime.host.map.rev;
        const response = await send_towl_action(third, "join");
        return { code: error_code(response), revDelta: runtime.host.map.rev - before };
      }), { code: "TOWL_ROOM_FULL", revDelta: 0 }),
      towl_case(SUITE, "ready actions start play in one commit each", async () => with_runtime(async (runtime) => {
        const pair = await join_towl_pair(runtime);
        const commits: unknown[] = [];
        const stop = runtime.host.stream.on_commit((commit) => commits.push(commit));
        const before = runtime.host.map.rev;
        await send_towl_action(pair.first, "set_ready", { ready: true });
        const afterFirst = runtime.host.map.snap().phase;
        await send_towl_action(pair.second, "set_ready", { ready: true });
        stop();
        return {
          afterFirst,
          final: runtime.host.map.snap(),
          revDelta: runtime.host.map.rev - before,
          commits: commits.length,
        };
      }), {
        afterFirst: "ready",
        final: {
          phase: "playing",
          player1: { sessionId: "towl-session-1", connected: true, ready: true },
          player2: { sessionId: "towl-session-2", connected: true, ready: true },
          position: 0,
          winner: null,
          round: 1,
        },
        revDelta: 2,
        commits: 2,
      }),
      towl_case(SUITE, "same-value ready is a successful no-op commit", async () => with_runtime(async (runtime) => {
        const pair = await join_towl_pair(runtime);
        await send_towl_action(pair.first, "set_ready", { ready: true });
        const before = runtime.host.map.rev;
        const response = await send_towl_action(pair.first, "set_ready", { ready: true });
        return { type: response.type, result: result_value(response), revDelta: runtime.host.map.rev - before };
      }), { type: "ack", result: { seat: "player1", ready: true }, revDelta: 0 }),
      towl_case(SUITE, "malformed action payload is rejected before game code", async () => with_runtime(async (runtime) => {
        const pair = await join_towl_pair(runtime);
        const before = runtime.host.map.rev;
        await pair.first.receive({
          type: "action",
          id: "invalid-ready",
          name: "set_ready",
          payload: { ready: true, extra: true },
        });
        const response = pair.first.sent().find((message) => message.id === "invalid-ready");
        return { code: response === undefined ? undefined : error_code(response), revDelta: runtime.host.map.rev - before };
      }), { code: "LIVEHOST_SCHEMA_INVALID_PAYLOAD", revDelta: 0 }),
      towl_case(SUITE, "pull actions move exactly once and dedupe retries", async () => with_runtime(async (runtime) => {
        const pair = await start_towl_round(runtime);
        const before = runtime.host.map.rev;
        const first = await send_towl_action(pair.first, "pull", undefined, { clientId: "puller", requestId: "pull-once" });
        const retry = await send_towl_action(pair.first, "pull", undefined, { clientId: "puller", requestId: "pull-once" });
        return {
          first: result_value(first),
          retry: result_value(retry),
          position: runtime.host.map.snap().position,
          revDelta: runtime.host.map.rev - before,
        };
      }), {
        first: { seat: "player1", position: 1, winner: null },
        retry: { seat: "player1", position: 1, winner: null },
        position: 1,
        revDelta: 1,
      }),
      towl_case(SUITE, "winning pull publishes one coherent final commit", async () => with_runtime(async (runtime) => {
        const pair = await start_towl_round(runtime);
        for (let index = 1; index < TOWL_WIN_POSITION; index += 1) await send_towl_action(pair.first, "pull");
        const snapshots: unknown[] = [];
        const stop = runtime.host.stream.on_commit(() => snapshots.push(runtime.host.map.snap()));
        const before = runtime.host.map.rev;
        const response = await send_towl_action(pair.first, "pull");
        stop();
        const rejected = await send_towl_action(pair.second, "pull");
        return {
          result: result_value(response),
          snapshot: snapshots[0],
          commits: snapshots.length,
          revDelta: runtime.host.map.rev - before,
          rejected: error_code(rejected),
        };
      }), {
        result: { seat: "player1", position: TOWL_WIN_POSITION, winner: "player1" },
        snapshot: {
          phase: "finished",
          player1: { sessionId: "towl-session-1", connected: true, ready: false },
          player2: { sessionId: "towl-session-2", connected: true, ready: false },
          position: TOWL_WIN_POSITION,
          winner: "player1",
          round: 1,
        },
        commits: 1,
        revDelta: 1,
        rejected: "TOWL_INVALID_PHASE",
      }),
      towl_case(SUITE, "winner reset is deduped and preserves both seats", async () => with_runtime(async (runtime) => {
        const pair = await start_towl_round(runtime);
        for (let index = 0; index < TOWL_WIN_POSITION; index += 1) await send_towl_action(pair.first, "pull");
        const before = runtime.host.map.rev;
        const first = await send_towl_action(pair.first, "reset_round", undefined, { clientId: "winner", requestId: "reset-once" });
        const retry = await send_towl_action(pair.first, "reset_round", undefined, { clientId: "winner", requestId: "reset-once" });
        return {
          results: [result_value(first), result_value(retry)],
          state: runtime.host.map.snap(),
          revDelta: runtime.host.map.rev - before,
        };
      }), {
        results: [{ round: 2 }, { round: 2 }],
        state: {
          phase: "ready",
          player1: { sessionId: "towl-session-1", connected: true, ready: false },
          player2: { sessionId: "towl-session-2", connected: true, ready: false },
          position: 0,
          winner: null,
          round: 2,
        },
        revDelta: 1,
      }),
      towl_case(SUITE, "voluntary leave atomically cancels play", async () => with_runtime(async (runtime) => {
        const pair = await start_towl_round(runtime);
        await send_towl_action(pair.first, "pull");
        const before = runtime.host.map.rev;
        const response = await send_towl_action(pair.first, "leave");
        const pull = await send_towl_action(pair.first, "pull");
        return {
          result: result_value(response),
          state: runtime.host.map.snap(),
          revDelta: runtime.host.map.rev - before,
          departedPull: error_code(pull),
        };
      }), {
        result: { seat: "player1" },
        state: {
          phase: "lobby",
          player1: { sessionId: null, connected: false, ready: false },
          player2: { sessionId: "towl-session-2", connected: true, ready: false },
          position: 0,
          winner: null,
          round: 1,
        },
        revDelta: 1,
        departedPull: "TOWL_NOT_JOINED",
      }),
      towl_case(SUITE, "disconnect preserves seat and reattach restores presence", async () => with_runtime(async (runtime) => {
        const first = make_towl_socket();
        const created = await create_towl_session(runtime, first, "reconnect-create");
        await send_towl_action(first, "join");
        first.emit_close();
        const detached = runtime.host.map.snap();
        const second = make_towl_socket();
        runtime.host.connect(second);
        await second.receive({ type: "session-attach", id: "reconnect-attach", credential: created.credential });
        const attached = runtime.host.map.snap();
        return {
          detached: { sessionId: detached.player1.sessionId, connected: detached.player1.connected },
          attached: { sessionId: attached.player1.sessionId, connected: attached.player1.connected },
          oldListeners: first.listener_count(),
        };
      }), {
        detached: { sessionId: "towl-session-1", connected: false },
        attached: { sessionId: "towl-session-1", connected: true },
        oldListeners: 0,
      }),
      towl_case(SUITE, "active reattachment fences old socket without vacating seat", async () => with_runtime(async (runtime) => {
        const first = make_towl_socket();
        const created = await create_towl_session(runtime, first, "fence-create");
        await send_towl_action(first, "join");
        const second = make_towl_socket();
        runtime.host.connect(second);
        await second.receive({ type: "session-attach", id: "fence-attach", credential: created.credential });
        const before = runtime.host.map.rev;
        const oldSent = first.sent().length;
        await first.receive({ type: "action", id: "stale-leave", name: "leave" });
        const response = await send_towl_action(second, "leave");
        return {
          staleResponse: first.sent().slice(oldSent).find((message) => message.id === "stale-leave"),
          newResult: result_value(response),
          revDelta: runtime.host.map.rev - before,
        };
      }), { staleResponse: undefined, newResult: { seat: "player1" }, revDelta: 1 }),
      towl_case(SUITE, "session expiry clears its seat and cancels play", async () => {
        const clock = make_clock();
        let nextSession = 0;
        const runtime = create_towl_runtime({
          sessionId: () => `expiry-${++nextSession}`,
          sessions: { graceMs: 50, now: clock.now, schedule: clock.schedule },
        });
        try {
          const pair = await start_towl_round(runtime);
          await send_towl_action(pair.first, "pull");
          const before = runtime.host.map.rev;
          pair.second.emit_close();
          const detached = runtime.host.map.snap().player2.connected;
          clock.advance(50);
          return {
            detached,
            state: runtime.host.map.snap(),
            revDelta: runtime.host.map.rev - before,
            pending: clock.pending(),
          };
        } finally {
          runtime.dispose();
        }
      }, {
        detached: false,
        state: {
          phase: "lobby",
          player1: { sessionId: "expiry-1", connected: true, ready: false },
          player2: { sessionId: null, connected: false, ready: false },
          position: 0,
          winner: null,
          round: 1,
        },
        revDelta: 2,
        pending: 0,
      }),
      towl_case(SUITE, "session goodbye terminally clears its seat", async () => with_runtime(async (runtime) => {
        const pair = await join_towl_pair(runtime);
        const before = runtime.host.map.rev;
        await pair.first.receive({ type: "session-goodbye", id: "goodbye" });
        return { state: runtime.host.map.snap(), revDelta: runtime.host.map.rev - before };
      }), {
        state: {
          phase: "lobby",
          player1: { sessionId: null, connected: false, ready: false },
          player2: { sessionId: "towl-session-2", connected: true, ready: false },
          position: 0,
          winner: null,
          round: 1,
        },
        revDelta: 1,
      }),
      towl_case(SUITE, "runtime disposal is idempotent and removes listeners", async () => {
        const runtime = create_towl_runtime({ sessionId: () => "dispose-session" });
        const socket = make_towl_socket();
        await create_towl_session(runtime, socket, "dispose-create");
        runtime.dispose();
        runtime.dispose();
        const before = runtime.host.map.rev;
        await socket.receive({ type: "action", id: "after-dispose", name: "join" });
        return { listeners: socket.listener_count(), revDelta: runtime.host.map.rev - before };
      }, { listeners: 0, revDelta: 0 }),
      towl_case(SUITE, "canonical history reproduces the accepted transition sequence", async () => with_runtime(async (runtime) => {
        const pair = await start_towl_round(runtime);
        await send_towl_action(pair.first, "pull");
        await send_towl_action(pair.second, "pull");
        const history = runtime.host.stream.history.replay_after(1);
        return {
          commits: history?.length,
          revs: history?.map((commit) => [
            commit.prevRev,
            commit.rev,
          ]),
          headRev: runtime.host.stream.headRev,
          mapRev: runtime.host.map.rev,
          state: runtime.host.map.snap(),
        };
      }), {
        commits: 6,
        revs: [
          [1, 2],
          [2, 3],
          [3, 4],
          [4, 5],
          [5, 6],
          [6, 7],
        ],
        headRev: 7,
        mapRev: 7,
        state: {
          phase: "playing",
          player1: {
            sessionId: "towl-session-1",
            connected: true,
            ready: true,
          },
          player2: {
            sessionId: "towl-session-2",
            connected: true,
            ready: true,
          },
          position: 0,
          winner: null,
          round: 1,
        },
      }),
    ],
  };
}
