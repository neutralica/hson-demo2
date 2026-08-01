import type { TestSuite } from "../../app/demos/test/tests.types";
import {
  create_towl_state,
  join_towl_session,
  leave_towl_session,
  pull_towl_rope,
  reflect_towl_session_attached,
  reflect_towl_session_detached,
  remove_towl_session,
  reset_towl_round,
  seat_for_session,
  set_towl_ready,
  TOWL_WIN_POSITION,
  type TowlState,
} from "../../app/demos/towl";
import { towl_case } from "./towl-test-helpers";

function accepted<T>(result: Readonly<{ ok: true; state: T }> | Readonly<{ ok: false }>): T {
  if (!result.ok) throw new Error("Expected accepted TOWL transition.");
  return result.state;
}

function joined_state(): TowlState {
  return accepted(join_towl_session(accepted(join_towl_session(create_towl_state(), "a")), "b"));
}

function playing_state(): TowlState {
  const joined = joined_state();
  const firstReady = accepted(set_towl_ready(joined, "a", true));
  return accepted(set_towl_ready(firstReady, "b", true));
}

function won_state(winner: "player1" | "player2"): TowlState {
  let state = playing_state();
  const sessionId = winner === "player1" ? "a" : "b";
  for (let index = 0; index < TOWL_WIN_POSITION; index += 1) {
    state = accepted(pull_towl_rope(state, sessionId));
  }
  return state;
}

export function towl_transition_suite(): TestSuite {
  const SUITE = "unit/towl-transitions";
  return {
    suite: SUITE,
    cases: [
      towl_case(SUITE, "join assigns fixed seats in deterministic order", () => {
        const first = join_towl_session(create_towl_state(), "a");
        if (!first.ok) throw new Error(first.error.message);
        const second = join_towl_session(first.state, "b");
        if (!second.ok) throw new Error(second.error.message);
        return { first: first.result, second: second.result, phase: second.state.phase };
      }, { first: { seat: "player1" }, second: { seat: "player2" }, phase: "ready" }),
      towl_case(SUITE, "duplicate and third joins are rejected without state", () => {
        const state = joined_state();
        const duplicate = join_towl_session(state, "a");
        const full = join_towl_session(state, "c");
        return {
          duplicate: duplicate.ok ? undefined : duplicate.error.code,
          full: full.ok ? undefined : full.error.code,
          same: !duplicate.ok && !full.ok,
        };
      }, { duplicate: "TOWL_ALREADY_JOINED", full: "TOWL_ROOM_FULL", same: true }),
      towl_case(SUITE, "seat lookup is stable session identity", () => {
        const state = joined_state();
        return { a: seat_for_session(state, "a"), b: seat_for_session(state, "b"), c: seat_for_session(state, "c") };
      }, { a: "player1", b: "player2", c: undefined }),
      towl_case(SUITE, "both ready transitions start one centered round", () => {
        const state = joined_state();
        const first = set_towl_ready(state, "a", true);
        if (!first.ok) throw new Error(first.error.message);
        const second = set_towl_ready(first.state, "b", true);
        if (!second.ok) throw new Error(second.error.message);
        return {
          firstPhase: first.state.phase,
          secondPhase: second.state.phase,
          position: second.state.position,
          winner: second.state.winner,
          ready: [second.state.player1.ready, second.state.player2.ready],
        };
      }, { firstPhase: "ready", secondPhase: "playing", position: 0, winner: null, ready: [true, true] }),
      towl_case(SUITE, "same ready value is an identity no-op success", () => {
        const state = joined_state();
        const first = accepted(set_towl_ready(state, "a", true));
        const repeated = set_towl_ready(first, "a", true);
        return repeated.ok ? { same: repeated.state === first, result: repeated.result } : repeated;
      }, { same: true, result: { seat: "player1", ready: true } }),
      towl_case(SUITE, "ready rejects unseated and active sessions", () => {
        const unseated = set_towl_ready(joined_state(), "c", true);
        const active = set_towl_ready(playing_state(), "a", false);
        return {
          unseated: unseated.ok ? undefined : unseated.error.code,
          active: active.ok ? undefined : active.error.code,
        };
      }, { unseated: "TOWL_NOT_JOINED", active: "TOWL_INVALID_PHASE" }),
      towl_case(SUITE, "pull directions are exact signed units", () => {
        const state = playing_state();
        const right = pull_towl_rope(state, "a");
        const left = pull_towl_rope(state, "b");
        return {
          player1: right.ok ? right.state.position : undefined,
          player2: left.ok ? left.state.position : undefined,
        };
      }, { player1: 1, player2: -1 }),
      towl_case(SUITE, "pull rejects unseated and inactive sessions", () => {
        const unseated = pull_towl_rope(playing_state(), "c");
        const inactive = pull_towl_rope(joined_state(), "a");
        return {
          unseated: unseated.ok ? undefined : unseated.error.code,
          inactive: inactive.ok ? undefined : inactive.error.code,
        };
      }, { unseated: "TOWL_NOT_JOINED", inactive: "TOWL_INVALID_PHASE" }),
      towl_case(SUITE, "player1 winning pull fixes the boundary atomically", () => {
        const state = won_state("player1");
        return {
          phase: state.phase,
          position: state.position,
          winner: state.winner,
          ready: [state.player1.ready, state.player2.ready],
        };
      }, { phase: "finished", position: TOWL_WIN_POSITION, winner: "player1", ready: [false, false] }),
      towl_case(SUITE, "player2 winning pull fixes the boundary atomically", () => {
        const state = won_state("player2");
        return { phase: state.phase, position: state.position, winner: state.winner };
      }, { phase: "finished", position: -TOWL_WIN_POSITION, winner: "player2" }),
      towl_case(SUITE, "pull after finish is rejected", () => {
        const result = pull_towl_rope(won_state("player1"), "a");
        return result.ok ? undefined : result.error.code;
      }, "TOWL_INVALID_PHASE"),
      towl_case(SUITE, "winner-only reset preserves seats and increments round", () => {
        const state = won_state("player1");
        const loser = reset_towl_round(state, "b");
        const winner = reset_towl_round(state, "a");
        return {
          loser: loser.ok ? undefined : loser.error.code,
          winner: winner.ok ? {
            round: winner.state.round,
            phase: winner.state.phase,
            sessions: [winner.state.player1.sessionId, winner.state.player2.sessionId],
            position: winner.state.position,
            recordedWinner: winner.state.winner,
          } : undefined,
        };
      }, {
        loser: "TOWL_ONLY_WINNER_CAN_RESET",
        winner: { round: 2, phase: "ready", sessions: ["a", "b"], position: 0, recordedWinner: null },
      }),
      towl_case(SUITE, "leave vacates only caller and cancels the round", () => {
        const left = leave_towl_session(playing_state(), "a");
        if (!left.ok) throw new Error(left.error.message);
        return left.state;
      }, {
        phase: "lobby",
        player1: { sessionId: null, connected: false, ready: false },
        player2: { sessionId: "b", connected: true, ready: false },
        position: 0,
        winner: null,
        round: 1,
      }),
      towl_case(SUITE, "vacated seat may be reclaimed in this layer", () => {
        const left = accepted(leave_towl_session(joined_state(), "a"));
        const joined = join_towl_session(left, "c");
        return joined.ok ? { result: joined.result, sessionId: joined.state.player1.sessionId } : joined;
      }, { result: { seat: "player1" }, sessionId: "c" }),
      towl_case(SUITE, "detach and attach reflect presence without losing seat", () => {
        const state = playing_state();
        const detached = reflect_towl_session_detached(state, "a");
        const attached = reflect_towl_session_attached(detached, "a");
        return {
          detached: { connected: detached.player1.connected, position: detached.position, phase: detached.phase },
          attached: { connected: attached.player1.connected, sessionId: attached.player1.sessionId },
        };
      }, {
        detached: { connected: false, position: 0, phase: "playing" },
        attached: { connected: true, sessionId: "a" },
      }),
      towl_case(SUITE, "session removal vacates seat and cancels active state", () => {
        const state = remove_towl_session(accepted(pull_towl_rope(playing_state(), "a")), "b");
        return { phase: state.phase, player2: state.player2, position: state.position, ready: state.player1.ready };
      }, {
        phase: "lobby",
        player2: { sessionId: null, connected: false, ready: false },
        position: 0,
        ready: false,
      }),
      towl_case(SUITE, "pure transition sequence is deterministic", () => {
        const run = (): TowlState => {
          let state = create_towl_state();
          state = accepted(join_towl_session(state, "a"));
          state = accepted(join_towl_session(state, "b"));
          state = accepted(set_towl_ready(state, "a", true));
          state = accepted(set_towl_ready(state, "b", true));
          state = accepted(pull_towl_rope(state, "a"));
          state = accepted(pull_towl_rope(state, "b"));
          for (let index = 0; index < TOWL_WIN_POSITION; index += 1) state = accepted(pull_towl_rope(state, "a"));
          return accepted(reset_towl_round(state, "a"));
        };
        const first = run();
        const second = run();
        return { equal: JSON.stringify(first) === JSON.stringify(second), first };
      }, {
        equal: true,
        first: {
          phase: "ready",
          player1: { sessionId: "a", connected: true, ready: false },
          player2: { sessionId: "b", connected: true, ready: false },
          position: 0,
          winner: null,
          round: 2,
        },
      }),
    ],
  };
}
