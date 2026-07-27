import type {
  LiveHost,
  LiveHostSessionOptions,
} from "hson-live/livehost";

export type TowlSeatId = "player1" | "player2";
export type TowlPhase = "lobby" | "ready" | "playing" | "finished";

export type TowlSeatState = Readonly<{
  sessionId: string | null;
  connected: boolean;
  ready: boolean;
}>;

export type TowlState = Readonly<{
  phase: TowlPhase;
  player1: TowlSeatState;
  player2: TowlSeatState;
  position: number;
  winner: TowlSeatId | null;
  round: number;
}>;

export type TowlActions = Readonly<{
  join: undefined;
  leave: undefined;
  set_ready: Readonly<{ ready: boolean }>;
  pull: undefined;
  reset_round: undefined;
}>;

export type TowlActionErrorCode =
  | "TOWL_SESSION_REQUIRED"
  | "TOWL_RESUMABLE_SESSION_REQUIRED"
  | "TOWL_ALREADY_JOINED"
  | "TOWL_ROOM_FULL"
  | "TOWL_NOT_JOINED"
  | "TOWL_INVALID_PHASE"
  | "TOWL_BOTH_PLAYERS_REQUIRED"
  | "TOWL_ONLY_WINNER_CAN_RESET";

export type TowlDomainError = Readonly<{
  code: TowlActionErrorCode;
  message: string;
}>;

export type TowlTransitionResult<TResult> =
  | Readonly<{ ok: true; state: TowlState; result: TResult }>
  | Readonly<{ ok: false; error: TowlDomainError }>;

export type TowlJoinResult = Readonly<{ seat: TowlSeatId }>;
export type TowlLeaveResult = Readonly<{ seat: TowlSeatId }>;
export type TowlReadyResult = Readonly<{ seat: TowlSeatId; ready: boolean }>;
export type TowlPullResult = Readonly<{
  seat: TowlSeatId;
  position: number;
  winner: TowlSeatId | null;
}>;
export type TowlResetResult = Readonly<{ round: number }>;

export type TowlRuntimeOptions = Readonly<{
  logicalMapId?: string;
  sessionId?: string | (() => string);
  sessions?: LiveHostSessionOptions;
}>;

export type TowlRuntime = Readonly<{
  host: LiveHost<TowlState, TowlActions>;
  dispose: () => void;
}>;


export type TowlErrorCode =
  | "TOWL_SESSION_REQUIRED"
  | "TOWL_RESUMABLE_SESSION_REQUIRED"
  | "TOWL_ALREADY_JOINED"
  | "TOWL_ROOM_FULL"
  | "TOWL_NOT_JOINED"
  | "TOWL_INVALID_PHASE"
  | "TOWL_BOTH_PLAYERS_REQUIRED"
  | "TOWL_GAME_NOT_ACTIVE"
  | "TOWL_GAME_ALREADY_FINISHED"
  | "TOWL_ONLY_WINNER_CAN_RESET"
  | "TOWL_RESET_NOT_AVAILABLE";
