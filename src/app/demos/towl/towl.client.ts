// towl.client.ts

import { create_livehost_client } from "hson-live/livehost";
import type { LiveHostClientOptions, LiveHostSessionCredential, LiveHostClient, LiveHostDisposer, LiveHostClientSessionResult, LiveHostClientActionResult, JsonValue } from "hson-live/types";
import type { TowlState, TowlActions } from "./towl.types";


export type TowlSeat = "player1" | "player2";

export type TowlJoinResult = Readonly<{
  seat: TowlSeat;
}>;

export type TowlReadyResult = Readonly<{
  seat: TowlSeat;
  ready: boolean;
}>;

export type TowlPullResult = Readonly<{
  seat: TowlSeat;
  position: number;
  winner: TowlSeat | null;
}>;

export type TowlResetResult = Readonly<{
  round: number;
}>;

export type TowlClientOptions = Omit<
  LiveHostClientOptions<TowlState>,
  "session"
> & Readonly<{
  credential?: LiveHostSessionCredential;
}>;

export type TowlClient = Readonly<{
  livehost: LiveHostClient<TowlState, TowlActions>;

  get state(): TowlState;
  get seat(): TowlSeat | undefined;

  connect(): LiveHostDisposer;
  disconnect(): void;

  createSession(): Promise<LiveHostClientSessionResult>;
  reattachSession(
    credential?: LiveHostSessionCredential,
  ): Promise<LiveHostClientSessionResult>;
  goodbyeSession(): Promise<void>;

  join(): Promise<TowlJoinResult>;
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
    ...clientOptions
  } = options;

  const livehost = create_livehost_client<
    TowlState,
    TowlActions
  >({
    ...clientOptions,
    session: credential === undefined
      ? {}
      : {
        credential,
      },
  });

  function connect(): LiveHostDisposer {
    return livehost.connect();
  }

  function disconnect(): void {
    livehost.disconnect();
  }

  async function createSession(): Promise<LiveHostClientSessionResult> {
    const result = await livehost.session.create();
    livehost.subscribe([]);
    return result;
  }


  async function reattachSession(
    credential = livehost.session.credential,
  ): Promise<LiveHostClientSessionResult> {
    const result = await livehost.session.reattach(credential);
    livehost.subscribe([]);
    return result;
  }

  async function goodbyeSession(): Promise<void> {
    return livehost.session.goodbye();
  }

  async function join(): Promise<TowlJoinResult> {
    const response = await livehost.action("join");

    return unwrap_action_result<TowlJoinResult>(
      response,
    );
  }

  async function setReady(
    ready: boolean,
  ): Promise<TowlReadyResult> {
    const response = await livehost.action("set_ready", {
      ready,
    });

    return unwrap_action_result<TowlReadyResult>(
      response,
    );
  }

  async function pull(): Promise<TowlPullResult> {
    const response = await livehost.action("pull");

    return unwrap_action_result<TowlPullResult>(
      response,
    );
  }

  async function reset(): Promise<TowlResetResult> {
    const response = await livehost.action("reset_round");

    return unwrap_action_result<TowlResetResult>(
      response,
    );
  }

  return Object.freeze({
    livehost,

    get state(): TowlState {
      return livehost.map.snap();
    },

    get seat(): TowlSeat | undefined {
      return seat_for_state(
        livehost.map.snap(),
        livehost.session.sessionId,
      );
    },

    connect,
    disconnect,

    createSession,
    reattachSession,
    goodbyeSession,

    join,
    setReady,
    pull,
    reset,
  });
}