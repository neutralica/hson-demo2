import { hson } from "hson-live";
import { create_locus_client, LocusDisconnectedError } from "hson-live/locus";
import type {
  JsonValue,
  LocusClient,
  LocusClientActionPromise,
  LocusClientActionRequest,
  LocusClientActionResult,
  LocusClientOptions,
  LocusClientRecoveryCursor,
  LocusClientRecoveryResult,
  LocusClientSessionResult,
  LocusDisposer,
  LocusSessionCredential,
} from "hson-live/types";
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
export type TowlUncertainAction = LocusClientActionRequest<TowlActions>;

export function create_towl_client_mirror(): TowlGovernedMap {
  return hson.liveMap.fromJson(create_towl_state()).schema.use(TOWL_SCHEMA);
}

export type TowlClientOptions = Omit<
  LocusClientOptions<TowlGovernedMap>,
  "map" | "recovery" | "session"
> & Readonly<{
  logicalMapId: string;
  credential?: LocusSessionCredential;
  mirror?: TowlGovernedMap;
  recoveryCursor?: LocusClientRecoveryCursor;
  onUncertainAction?: (request: TowlUncertainAction) => void;
}>;

export type TowlClient = Readonly<{
  livehost: LocusClient<TowlGovernedMap, TowlActions>;
  root: TowlGovernedRoot;

  get state(): TowlState;
  get seat(): TowlSeat | undefined;

  connect(): LocusDisposer;
  disconnect(): void;

  createSession(): Promise<LocusClientSessionResult>;
  reattachSession(
    credential?: LocusSessionCredential,
  ): Promise<LocusClientSessionResult>;
  recover(): Promise<LocusClientRecoveryResult>;
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

function unwrap_action_result<TResult extends JsonValue>(
  response: LocusClientActionResult,
): TResult {
  if (response.type === "error") {
    throw new Error(action_error_message(response));
  }

  return response.result as TResult;
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

  const livehost = create_locus_client<
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

  async function createSession(): Promise<LocusClientSessionResult> {
    return livehost.session.create();
  }


  async function reattachSession(
    credential = livehost.session.credential,
  ): Promise<LocusClientSessionResult> {
    return livehost.session.reattach(credential);
  }

  async function recover(): Promise<LocusClientRecoveryResult> {
    return livehost.recovery.recover();
  }

  async function goodbyeSession(): Promise<void> {
    return livehost.session.goodbye();
  }

  async function submit<TResult extends JsonValue>(
    pending: LocusClientActionPromise<TowlActions>,
  ): Promise<TResult> {
    try {
      return unwrap_action_result<TResult>(await pending);
    } catch (error) {
      if (error instanceof LocusDisconnectedError) onUncertainAction?.(pending.request);
      throw error;
    }
  }

  async function join(): Promise<TowlJoinResult> {
    return submit<TowlJoinResult>(livehost.action("join"));
  }

  async function leave(): Promise<TowlLeaveResult> {
    return submit<TowlLeaveResult>(livehost.action("leave"));
  }

  async function setReady(
    ready: boolean,
  ): Promise<TowlReadyResult> {
    return submit<TowlReadyResult>(livehost.action("set_ready", {
      ready,
    }));
  }

  async function pull(): Promise<TowlPullResult> {
    return submit<TowlPullResult>(livehost.action("pull"));
  }

  async function reset(): Promise<TowlResetResult> {
    return submit<TowlResetResult>(livehost.action("reset_round"));
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
