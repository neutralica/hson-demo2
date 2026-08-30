import { create_locus } from "hson-live/locus";
import { hson } from "hson-live";
import type { LiveMap, LocusActionContext, LocusSessionLifecycleEvent, LocusActions, LocusSchema } from "hson-live/types";
import { TOWL_SCHEMA } from "./towl.schema";
import { reflect_towl_session_attached, reflect_towl_session_detached, remove_towl_session, join_towl_session, leave_towl_session, set_towl_ready, pull_towl_rope, reset_towl_round, create_towl_state } from "./towl.transitions";
import type { TowlDomainError, TowlState, TowlJoinResult, TowlLeaveResult, TowlReadyResult, TowlPullResult, TowlResetResult, TowlTransitionResult, TowlRuntime, TowlRuntimeOptions, TowlActions } from "./towl.types";

class TowlActionError extends Error {
  readonly code: TowlDomainError["code"];

  constructor(error: TowlDomainError) {
    super(error.message);
    this.name = "TowlActionError";
    this.code = error.code;
  }
}

function decode_empty(value: unknown) {
  return value === undefined
    ? { ok: true as const, value: undefined }
    : { ok: false as const, issues: ["TOWL action requires no payload."] };
}

function decode_ready(value: unknown) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { ok: false as const, issues: ["TOWL set_ready requires one ready boolean."] };
  }
  const record = value as Readonly<Record<string, unknown>>;
  if (Object.keys(record).length !== 1 || typeof record.ready !== "boolean") {
    return { ok: false as const, issues: ["TOWL set_ready requires one ready boolean."] };
  }
  return { ok: true as const, value: { ready: record.ready } };
}

function require_session(context: LocusActionContext<LiveMap<TowlState>>): string {
  if (context.origin.kind !== "session") {
    throw new TowlActionError({
      code: "TOWL_SESSION_REQUIRED",
      message: "TOWL player actions require a trusted Locus session.",
    });
  }
  if (!context.origin.resumable) {
    throw new TowlActionError({
      code: "TOWL_RESUMABLE_SESSION_REQUIRED",
      message: "TOWL seats require a resumable Locus session.",
    });
  }
  return context.origin.sessionId;
}

async function apply_transition<TResult extends
  TowlJoinResult | TowlLeaveResult | TowlReadyResult | TowlPullResult | TowlResetResult>(
  context: LocusActionContext<LiveMap<TowlState>>,
  transition: TowlTransitionResult<TResult>,
): Promise<TResult> {
  if (!transition.ok) throw new TowlActionError(transition.error);
  await context.mutate((draft) => draft.replace(transition.state));
  return transition.result;
}

function reflect_lifecycle(
  host: TowlRuntime["host"],
  event: LocusSessionLifecycleEvent,
): void {
  const state = host.map.snap();

  const next = event.kind === "attached"
    ? reflect_towl_session_attached(state, event.session.sessionId)
    : event.kind === "detached"
      ? reflect_towl_session_detached(state, event.session.sessionId)
      : event.kind === "expired"
        ? remove_towl_session(state, event.session.sessionId)
        : event.kind === "revoked" && event.reason === "goodbye"
          ? remove_towl_session(state, event.session.sessionId)
          : state;

  const unchanged = next.phase === state.phase
    && next.position === state.position
    && next.winner === state.winner
    && next.round === state.round
    && next.player1.sessionId === state.player1.sessionId
    && next.player1.connected === state.player1.connected
    && next.player1.ready === state.player1.ready
    && next.player2.sessionId === state.player2.sessionId
    && next.player2.connected === state.player2.connected
    && next.player2.ready === state.player2.ready;

  if (!unchanged) {
    void host.mutate((draft) => draft.replace(next)).catch(() => undefined);
  }
}

export function create_towl_runtime(options: TowlRuntimeOptions = {}): TowlRuntime {
  const actions: LocusActions<TowlActions, LiveMap<TowlState>> = {
    join: (context) => apply_transition(context, join_towl_session(context.map.snap(), require_session(context))),
    leave: (context) => apply_transition(context, leave_towl_session(context.map.snap(), require_session(context))),
    set_ready: (context, payload) => apply_transition(
      context,
      set_towl_ready(context.map.snap(), require_session(context), payload.ready),
    ),
    pull: (context) => apply_transition(context, pull_towl_rope(context.map.snap(), require_session(context))),
    reset_round: (context) => apply_transition(context, reset_towl_round(context.map.snap(), require_session(context))),
  };
  const schema: LocusSchema<TowlState, TowlActions> = {
    actions: {
      join: { payload: decode_empty },
      leave: { payload: decode_empty },
      set_ready: { payload: decode_ready },
      pull: { payload: decode_empty },
      reset_round: { payload: decode_empty },
    },
  };
  const map = hson.liveMap.fromJson(create_towl_state()).schema.use<TowlState>(TOWL_SCHEMA);
  const host = create_locus({
    map,
    actions,
    schema,
    ...(options.logicalMapId !== undefined ? { logicalMapId: options.logicalMapId } : {}),
    ...(options.sessionId !== undefined ? { sessionId: options.sessionId } : {}),
    ...(options.sessions !== undefined ? { sessions: options.sessions } : {}),
  });
  let disposed = false;
  const stopLifecycle = host.sessions.on_change((event) => {
    if (!disposed && !(event.kind === "revoked" && event.reason === "locus_disposed")) {
      reflect_lifecycle(host, event);
    }
  });

  return Object.freeze({
    host,
    dispose(): void {
      if (disposed) return;
      disposed = true;
      stopLifecycle();
      host.dispose();
    },
  });
}
