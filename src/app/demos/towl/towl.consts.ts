import type { TowlSeatId } from "./towl.types";

export const TOWL_SEATS = Object.freeze([
  "player1",
  "player2",
] as const satisfies readonly TowlSeatId[]);

export const TOWL_WIN_POSITION = 10;
