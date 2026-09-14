import { create_echo, hson, LocusDisconnectedError } from "hson-live";
import type {
  Echo,
  EchoActionPromise,
  EchoActionRequest,
  EchoOptions,
  EchoRecoveryCursor,
  EchoRecoveryResult,
  EchoSessionResult,
} from "hson-live/echo";
import type { LocusClientActionResult, LocusDisposer, LocusSessionCredential } from "hson-live/locus";
import { TOWL_SCHEMA } from "./towl.schema";
import { create_towl_state } from "./towl.transitions";
import type {
  TowlActions,
  TowlGovernedMap,
  TowlGovernedRoot,
  TowlJoinResult,
  TowlLeaveResult,
  TowlPullResult,
  TowlReadyResult,
  TowlResetResult,
  TowlSeatId,
  TowlState,
} from "./towl.types";

export type TowlSeat = TowlSeatId;
export type TowlUncertainAction = EchoActionRequest<TowlActions>;

export function create_towl_client_mirror(): TowlGovernedMap {
  return hson.liveMap.fromJson(create_towl_state()).schema.use(TOWL_SCHEMA);
}

export type TowlClientOptions = Omit<
  EchoOptions<TowlGovernedMap>,
  "map" | "recovery" | "session"
> & Readonly<{
  logicalMapId: string;
  credential?: LocusSessionCredential;
  mirror?: TowlGovernedMap;
  recoveryCursor?: EchoRecoveryCursor;
  onUncertainAction?: (request: TowlUncertainAction) => void;
}>;

export type TowlClient = Readonly<{
  livehost: Echo<TowlGovernedMap, TowlActions>;
  root: TowlGovernedRoot;

  get state(): TowlState;
  get seat(): TowlSeat | undefined;

  connect(): LocusDisposer;
  disconnect(): void;

  createSession(): Promise<EchoSessionResult>;
  reattachSession(
    credential?: LocusSessionCredential,
  ): Promise<EchoSessionResult>;
  recover(): Promise<EchoRecoveryResult>;
  goodbyeSession(): Promise<void>;

  join(): Promise<TowlJoinResult>;
  leave(): Promise<TowlLeaveResult>;
  setReady(ready: boolean): Promise<TowlReadyResult>;
  pull(): Promise<TowlPullResult>;
  reset(): Promise<TowlResetResult>;
}>;

function action_error_message(
  response: Extract<LocusClientActionResult, { type: "error" }>,
): string {
  const error = response.error;

  if (
    typeof error === "object"
    && error !== null
    && "message" in error
    && typeof error.message === "string"
  ) {
    return error.message;
  }

  return "The TOWL action was rejected.";
}

function action_result_value(response: LocusClientActionResult): unknown {
  if (response.type === "error") {
    throw new Error(action_error_message(response));
  }
  if (response.result === undefined) {
    throw new Error("The TOWL action completed without a result.");
  }
  return response.result.materialize();
}

function result_record(value: unknown): Readonly<Record<string, unknown>> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : undefined;
}

function has_exact_keys(record: Readonly<Record<string, unknown>>, keys: readonly string[]): boolean {
  return Object.keys(record).length === keys.length && keys.every((key) => Object.hasOwn(record, key));
}

function result_seat(value: unknown): TowlSeat | undefined {
  return value === "player1" || value === "player2" ? value : undefined;
}

function is_safe_integer(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value);
}

function decode_join_result(value: unknown): TowlJoinResult {
  const record = result_record(value);
  const seat = record === undefined ? undefined : result_seat(record.seat);
  if (record === undefined || !has_exact_keys(record, ["seat"]) || seat === undefined) {
    throw new Error("TOWL join returned an invalid result.");
  }
  return { seat };
}

function decode_leave_result(value: unknown): TowlLeaveResult {
  const record = result_record(value);
  const seat = record === undefined ? undefined : result_seat(record.seat);
  if (record === undefined || !has_exact_keys(record, ["seat"]) || seat === undefined) {
    throw new Error("TOWL leave returned an invalid result.");
  }
  return { seat };
}

function decode_ready_result(value: unknown): TowlReadyResult {
  const record = result_record(value);
  const seat = record === undefined ? undefined : result_seat(record.seat);
  if (record === undefined || !has_exact_keys(record, ["seat", "ready"]) || seat === undefined || typeof record.ready !== "boolean") {
    throw new Error("TOWL set_ready returned an invalid result.");
  }
  return { seat, ready: record.ready };
}

function decode_pull_result(value: unknown): TowlPullResult {
  const record = result_record(value);
  const seat = record === undefined ? undefined : result_seat(record.seat);
  const position = record?.position;
  if (
    record === undefined || !has_exact_keys(record, ["seat", "position", "winner"])
    || seat === undefined || !is_safe_integer(position)
  ) {
    throw new Error("TOWL pull returned an invalid result.");
  }
  if (record.winner === null) return { seat, position, winner: null };
  const winner = result_seat(record.winner);
  if (winner === undefined) throw new Error("TOWL pull returned an invalid result.");
  return { seat, position, winner };
}

function decode_reset_result(value: unknown): TowlResetResult {
  const record = result_record(value);
  const round = record?.round;
  if (record === undefined || !has_exact_keys(record, ["round"]) || !is_safe_integer(round) || round < 1) {
    throw new Error("TOWL reset_round returned an invalid result.");
  }
  return { round };
}

function seat_for_state(
  state: TowlState,
  sessionId: string | undefined,
): TowlSeat | undefined {
  if (sessionId === undefined) return undefined;

  if (state.player1?.sessionId === sessionId) {
    return "player1";
  }

  if (state.player2?.sessionId === sessionId) {
    return "player2";
  }

  return undefined;
}

export function create_towl_client(
  options: TowlClientOptions,
): TowlClient {
  const {
    credential,
    logicalMapId,
    mirror = create_towl_client_mirror(),
    recoveryCursor,
    onUncertainAction,
    ...clientOptions
  } = options;

  const livehost = create_echo<
    TowlGovernedMap,
    TowlActions
  >({
    ...clientOptions,
    map: mirror,
    recovery: {
      logicalMapId,
      ...(recoveryCursor === undefined ? {} : { cursor: recoveryCursor }),
    },
    session: credential === undefined
      ? {}
      : {
        credential,
      },
  });
  const root = livehost.map.at([]);

  function connect(): LocusDisposer {
    return livehost.connect();
  }

  function disconnect(): void {
    livehost.disconnect();
  }

  async function createSession(): Promise<EchoSessionResult> {
    return livehost.session.create();
  }


  async function reattachSession(
    credential = livehost.session.credential,
  ): Promise<EchoSessionResult> {
    return livehost.session.reattach(credential);
  }

  async function recover(): Promise<EchoRecoveryResult> {
    return livehost.recovery.recover();
  }

  async function goodbyeSession(): Promise<void> {
    return livehost.session.goodbye();
  }

  async function submit(pending: EchoActionPromise<TowlActions>): Promise<unknown> {
    try {
      return action_result_value(await pending);
    } catch (error) {
      if (error instanceof LocusDisconnectedError) onUncertainAction?.(pending.request);
      throw error;
    }
  }

  async function join(): Promise<TowlJoinResult> {
    return decode_join_result(await submit(livehost.action("join")));
  }

  async function leave(): Promise<TowlLeaveResult> {
    return decode_leave_result(await submit(livehost.action("leave")));
  }

  async function setReady(
    ready: boolean,
  ): Promise<TowlReadyResult> {
    return decode_ready_result(await submit(livehost.action("set_ready", {
      ready,
    })));
  }

  async function pull(): Promise<TowlPullResult> {
    return decode_pull_result(await submit(livehost.action("pull")));
  }

  async function reset(): Promise<TowlResetResult> {
    return decode_reset_result(await submit(livehost.action("reset_round")));
  }

  return Object.freeze({
    livehost,
    root,

    get state(): TowlState {
      return root.snap();
    },

    get seat(): TowlSeat | undefined {
      return seat_for_state(
        root.snap(),
        livehost.session.sessionId,
      );
    },

    connect,
    disconnect,

    createSession,
    reattachSession,
    recover,
    goodbyeSession,

    join,
    leave,
    setReady,
    pull,
    reset,
  });
}
