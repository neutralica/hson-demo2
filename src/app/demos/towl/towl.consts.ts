import type {
  TowlErrorCode,
  TowlSeatId,
} from "./towl.types";

export const TOWL_SEATS = Object.freeze([
  "player1",
  "player2",
] as const satisfies readonly TowlSeatId[]);

export const TOWL_WIN_POSITION = 10;

export const TOWL_MIN_POSITION = -TOWL_WIN_POSITION;

export const TOWL_MAX_POSITION = TOWL_WIN_POSITION;

export const TOWL_ERROR_MESSAGES = Object.freeze({
  TOWL_SESSION_REQUIRED:
    "This TOWL action requires an attached LiveHost session.",

  TOWL_RESUMABLE_SESSION_REQUIRED:
    "A resumable LiveHost session is required to occupy a TOWL seat.",

  TOWL_ALREADY_JOINED:
    "This session already occupies a TOWL seat.",

  TOWL_ROOM_FULL:
    "Both TOWL seats are already occupied.",

  TOWL_NOT_JOINED:
    "This session does not occupy a TOWL seat.",

  TOWL_INVALID_PHASE:
    "This TOWL action is not available during the current game phase.",

  TOWL_BOTH_PLAYERS_REQUIRED:
    "Both TOWL seats must be occupied for this action.",

  TOWL_GAME_NOT_ACTIVE:
    "The TOWL round is not currently active.",

  TOWL_GAME_ALREADY_FINISHED:
    "The TOWL round has already finished.",

  TOWL_ONLY_WINNER_CAN_RESET:
    "Only the winning player may reset the completed round.",

  TOWL_RESET_NOT_AVAILABLE:
    "The TOWL round cannot currently be reset.",
} satisfies Readonly<Record<TowlErrorCode, string>>);
