import type {
  TowlSeatState,
  TowlState,
} from "./towl.types";

function createSeatState(): TowlSeatState {
  return Object.freeze({
    sessionId: null,
    connected: false,
    ready: false,
  });
}

export function create_towl_state(): TowlState {
  return Object.freeze({
    phase: "lobby",
    player1: createSeatState(),
    player2: createSeatState(),
    position: 0,
    winner: null,
    round: 1,
  });
}