import { TOWL_SEATS, TOWL_WIN_POSITION } from "./towl.consts";
import type {
  TowlActionErrorCode,
  TowlJoinResult,
  TowlLeaveResult,
  TowlPullResult,
  TowlReadyResult,
  TowlResetResult,
  TowlSeatId,
  TowlSeatState,
  TowlState,
  TowlTransitionResult,
} from "./towl.types";

const VACANT_SEAT: TowlSeatState = Object.freeze({
  sessionId: null,
  connected: false,
  ready: false,
});

function reject<TResult>(code: TowlActionErrorCode, message: string): TowlTransitionResult<TResult> {
  return Object.freeze({
    ok: false,
    error: Object.freeze({ code, message }),
  });
}

function accept<TResult>(state: TowlState, result: TResult): TowlTransitionResult<TResult> {
  return Object.freeze({ ok: true, state, result: Object.freeze(result) });
}

function replace_seat(state: TowlState, seat: TowlSeatId, value: TowlSeatState): TowlState {
  return Object.freeze({ ...state, [seat]: Object.freeze(value) });
}

function cancel_round(state: TowlState): TowlState {
  return Object.freeze({
    ...state,
    phase: "lobby",
    player1: Object.freeze({ ...state.player1, ready: false }),
    player2: Object.freeze({ ...state.player2, ready: false }),
    position: 0,
    winner: null,
  });
}

export function create_towl_state(): TowlState {
  return Object.freeze({
    phase: "lobby",
    player1: Object.freeze({ ...VACANT_SEAT }),
    player2: Object.freeze({ ...VACANT_SEAT }),
    position: 0,
    winner: null,
    round: 1,
  });
}

export function seat_for_session(state: TowlState, sessionId: string): TowlSeatId | undefined {
  return TOWL_SEATS.find((seat) => state[seat].sessionId === sessionId);
}

export function occupied_seat_count(state: TowlState): number {
  return TOWL_SEATS.reduce((count, seat) => count + (state[seat].sessionId === null ? 0 : 1), 0);
}

export function derive_lobby_phase(state: TowlState): "lobby" | "ready" {
  return occupied_seat_count(state) === 2 ? "ready" : "lobby";
}

export function join_towl_session(
  state: TowlState,
  sessionId: string,
): TowlTransitionResult<TowlJoinResult> {
  if (seat_for_session(state, sessionId) !== undefined) {
    return reject("TOWL_ALREADY_JOINED", "This LiveHost session already occupies a TOWL seat.");
  }
  const seat = TOWL_SEATS.find((candidate) => state[candidate].sessionId === null);
  if (seat === undefined) return reject("TOWL_ROOM_FULL", "Both TOWL seats are occupied.");
  const assigned = replace_seat(state, seat, {
    sessionId,
    connected: true,
    ready: false,
  });
  const next = Object.freeze({ ...assigned, phase: derive_lobby_phase(assigned) });
  return accept(next, { seat });
}

export function leave_towl_session(
  state: TowlState,
  sessionId: string,
): TowlTransitionResult<TowlLeaveResult> {
  const seat = seat_for_session(state, sessionId);
  if (seat === undefined) return reject("TOWL_NOT_JOINED", "This LiveHost session does not occupy a TOWL seat.");
  const cleared = replace_seat(state, seat, { ...VACANT_SEAT });
  return accept(cancel_round(cleared), { seat });
}

export function set_towl_ready(
  state: TowlState,
  sessionId: string,
  ready: boolean,
): TowlTransitionResult<TowlReadyResult> {
  const seat = seat_for_session(state, sessionId);
  if (seat === undefined) return reject("TOWL_NOT_JOINED", "This LiveHost session does not occupy a TOWL seat.");
  if (state.phase !== "ready") {
    return reject("TOWL_INVALID_PHASE", "TOWL readiness may only change while both players are awaiting play.");
  }
  if (state[seat].ready === ready) return accept(state, { seat, ready });

  const changed = replace_seat(state, seat, { ...state[seat], ready });
  const bothReady = changed.player1.ready && changed.player2.ready;
  const next = bothReady
    ? Object.freeze({ ...changed, phase: "playing" as const, position: 0, winner: null })
    : Object.freeze({ ...changed, phase: "ready" as const });
  return accept(next, { seat, ready });
}

export function pull_towl_rope(
  state: TowlState,
  sessionId: string,
): TowlTransitionResult<TowlPullResult> {
  const seat = seat_for_session(state, sessionId);
  if (seat === undefined) return reject("TOWL_NOT_JOINED", "This LiveHost session does not occupy a TOWL seat.");
  if (state.phase !== "playing") return reject("TOWL_INVALID_PHASE", "The TOWL round is not active.");
  if (occupied_seat_count(state) !== 2) {
    return reject("TOWL_BOTH_PLAYERS_REQUIRED", "Both TOWL seats must remain occupied during play.");
  }

  const delta = seat === "player1" ? 1 : -1;
  const position = Math.max(-TOWL_WIN_POSITION, Math.min(TOWL_WIN_POSITION, state.position + delta));
  const winner: TowlSeatId | null = position === TOWL_WIN_POSITION
    ? "player1"
    : position === -TOWL_WIN_POSITION
      ? "player2"
      : null;
  const next = winner === null
    ? Object.freeze({ ...state, position })
    : Object.freeze({
      ...state,
      phase: "finished" as const,
      player1: Object.freeze({ ...state.player1, ready: false }),
      player2: Object.freeze({ ...state.player2, ready: false }),
      position,
      winner,
    });
  return accept(next, { seat, position, winner });
}

export function reset_towl_round(
  state: TowlState,
  sessionId: string,
): TowlTransitionResult<TowlResetResult> {
  const seat = seat_for_session(state, sessionId);
  if (seat === undefined) return reject("TOWL_NOT_JOINED", "This LiveHost session does not occupy a TOWL seat.");
  if (state.phase !== "finished" || state.winner === null) {
    return reject("TOWL_INVALID_PHASE", "A TOWL round may only reset after a winner is recorded.");
  }
  if (seat !== state.winner) return reject("TOWL_ONLY_WINNER_CAN_RESET", "Only the winning TOWL seat may reset the round.");
  const next: TowlState = Object.freeze({
    ...state,
    phase: derive_lobby_phase(state),
    player1: Object.freeze({ ...state.player1, ready: false }),
    player2: Object.freeze({ ...state.player2, ready: false }),
    position: 0,
    winner: null,
    round: state.round + 1,
  });
  return accept(next, { round: next.round });
}

export function reflect_towl_session_attached(state: TowlState, sessionId: string): TowlState {
  const seat = seat_for_session(state, sessionId);
  if (seat === undefined || state[seat].connected) return state;
  return replace_seat(state, seat, { ...state[seat], connected: true });
}

export function reflect_towl_session_detached(state: TowlState, sessionId: string): TowlState {
  const seat = seat_for_session(state, sessionId);
  if (seat === undefined || !state[seat].connected) return state;
  return replace_seat(state, seat, { ...state[seat], connected: false });
}

export function remove_towl_session(state: TowlState, sessionId: string): TowlState {
  const seat = seat_for_session(state, sessionId);
  if (seat === undefined) return state;
  return cancel_round(replace_seat(state, seat, { ...VACANT_SEAT }));
}
