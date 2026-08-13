import { hson } from "hson-live";
import { create_livehost_client, LiveHostDisconnectedError } from "hson-live/livehost";
import type {
  JsonValue,
  LiveHostClient,
  LiveHostClientActionPromise,
  LiveHostClientActionRequest,
  LiveHostClientActionResult,
  LiveHostClientOptions,
  LiveHostClientRecoveryCursor,
  LiveHostClientRecoveryResult,
  LiveHostClientSessionResult,
  LiveHostDisposer,
  LiveHostSessionCredential,
  LiveMap,
  LiveMapPathHandle,
} from "hson-live/types";
import { TOWL_SCHEMA } from "./towl.schema";
import { create_towl_state } from "./towl.transitions";
import type {
  TowlActions,
  TowlJoinResult,
  TowlLeaveResult,
  TowlPullResult,
  TowlReadyResult,
  TowlResetResult,
  TowlSeatId,
  TowlState,
} from "./towl.types";

export type TowlSeat = TowlSeatId;
export type TowlUncertainAction = LiveHostClientActionRequest<TowlActions>;

export function create_towl_client_mirror(): LiveMap<TowlState> {
  return hson.liveMap.fromJson(create_towl_state()).schema.use(TOWL_SCHEMA);
}

export type TowlClientOptions = Omit<
  LiveHostClientOptions<TowlState>,
  "map" | "recovery" | "session"
> & Readonly<{
  logicalMapId: string;
  credential?: LiveHostSessionCredential;
  mirror?: LiveMap<TowlState>;
  recoveryCursor?: LiveHostClientRecoveryCursor;
  onUncertainAction?: (request: TowlUncertainAction) => void;
}>;

export type TowlClient = Readonly<{
  livehost: LiveHostClient<TowlState, TowlActions>;
  root: LiveMapPathHandle<TowlState>;

  get state(): TowlState;
  get seat(): TowlSeat | undefined;

  connect(): LiveHostDisposer;
  disconnect(): void;

  createSession(): Promise<LiveHostClientSessionResult>;
  reattachSession(
    credential?: LiveHostSessionCredential,
  ): Promise<LiveHostClientSessionResult>;
  recover(): Promise<LiveHostClientRecoveryResult>;
  goodbyeSession(): Promise<void>;

  join(): Promise<TowlJoinResult>;
  leave(): Promise<TowlLeaveResult>;
  setReady(ready: boolean): Promise<TowlReadyResult>;
  pull(): Promise<TowlPullResult>;
  reset(): Promise<TowlResetResult>;
}>;

function action_error_message(
  response: Extract<LiveHostClientActionResult, { type: "error" }>,
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
  response: LiveHostClientActionResult,
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

  const livehost = create_livehost_client<
    TowlState,
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

  function connect(): LiveHostDisposer {
    return livehost.connect();
  }

  function disconnect(): void {
    livehost.disconnect();
  }

  async function createSession(): Promise<LiveHostClientSessionResult> {
    return livehost.session.create();
  }


  async function reattachSession(
    credential = livehost.session.credential,
  ): Promise<LiveHostClientSessionResult> {
    return livehost.session.reattach(credential);
  }

  async function recover(): Promise<LiveHostClientRecoveryResult> {
    return livehost.recovery.recover();
  }

  async function goodbyeSession(): Promise<void> {
    return livehost.session.goodbye();
  }

  async function submit<TResult extends JsonValue>(
    pending: LiveHostClientActionPromise<TowlActions>,
  ): Promise<TResult> {
    try {
      return unwrap_action_result<TResult>(await pending);
    } catch (error) {
      if (error instanceof LiveHostDisconnectedError) onUncertainAction?.(pending.request);
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
