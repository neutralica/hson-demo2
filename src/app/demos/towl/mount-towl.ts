import type { LiveTree } from "hson-live/livetree";
import type { LiveHostSessionCredential } from "hson-live/types";
import {
  create_browser_livehost_socket,
} from "hson-live/livehost";
import {
  TOWL_WIN_POSITION,
  create_towl_connection_controller,
  resolve_towl_room_url,
  towl_host_id_for_room,
  towl_room_credential_key,
  type TowlClient,
  type TowlConnectionController,
  type TowlConnectionState,
  type TowlSeat,
  type TowlState,
} from "./index";
import {
  TOWL_ACTIONS_CSS,
  TOWL_BUTTON_CSS,
  TOWL_CARD_CSS,
  TOWL_ERROR_CSS,
  TOWL_MARKER_CSS,
  TOWL_META_CSS,
  TOWL_INVITE_STATUS_CSS,
  TOWL_RESULT_CSS,
  TOWL_ROOM_CSS,
  TOWL_ROOT_CSS,
  TOWL_ROPE_CSS,
  TOWL_SEAT_CSS,
  TOWL_SEAT_LOCAL_CSS,
  TOWL_SEATS_CSS,
  TOWL_TITLE_CSS,
  TOWL_TRACK_CSS,
} from "./towl.css";

type TowlActionName = "join" | "ready" | "pull" | "reset";

export type TowlPanel = Readonly<{
  root: LiveTree;
  dispose(): void;
}>;

type TowlView = Readonly<{
  room: LiveTree;
  copyInvite: LiveTree;
  inviteStatus: LiveTree;
  status: LiveTree;
  localSeat: LiveTree;
  phase: LiveTree;
  round: LiveTree;
  player1: LiveTree;
  player2: LiveTree;
  ropeValue: LiveTree;
  ropeMarker: LiveTree;
  result: LiveTree;
  error: LiveTree;
  join: LiveTree;
  ready: LiveTree;
  pull: LiveTree;
  reset: LiveTree;
}>;

function configured_url(roomId: string): string {
  const base = import.meta.env.VITE_TOWL_WS_URL ?? import.meta.env.VITE_HOSTED_TEST_WS_URL ?? "ws://127.0.0.1:8787";
  const url = new URL(base);
  url.searchParams.set("livehost", towl_host_id_for_room(roomId));
  return url.toString();
}

function remembered_credential(roomId: string): LiveHostSessionCredential | undefined {
  try {
    return globalThis.localStorage?.getItem(towl_room_credential_key(roomId)) ?? undefined;
  } catch {
    return undefined;
  }
}

function remember_credential(roomId: string, credential: LiveHostSessionCredential | undefined): void {
  try {
    const key = towl_room_credential_key(roomId);
    if (credential === undefined) globalThis.localStorage?.removeItem(key);
    else globalThis.localStorage?.setItem(key, credential);
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }
}

function error_message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function set_disabled(button: LiveTree, disabled: boolean): void {
  if (disabled) {
    button.flags.set("disabled");
    button.attrs.set("aria-disabled", "true");
  } else {
    button.flags.clear("disabled");
    button.attrs.drop("aria-disabled");
  }
}

function seat_text(state: TowlState, seat: TowlSeat, localSeat: TowlSeat | undefined): string {
  const player = state[seat];
  const label = seat === "player1" ? "player 1" : "player 2";
  if (player.sessionId === null) return `${label}\nvacant`;
  const local = seat === localSeat ? " · you" : "";
  return `${label}${local}\njoined · ${player.connected ? "connected" : "disconnected"}\n${player.ready ? "ready" : "not ready"}`;
}

function seat_for_session(state: TowlState, sessionId: string | undefined): TowlSeat | undefined {
  if (sessionId === undefined) return undefined;
  if (state.player1.sessionId === sessionId) return "player1";
  if (state.player2.sessionId === sessionId) return "player2";
  return undefined;
}

function create_view(host: LiveTree, roomId: string): TowlView & Readonly<{ root: LiveTree }> {
  host.empty();
  const root = host.create.section().attrs.setMany({ "data-demo-towl": "true", "data-testid": "towl-root" }).css.setMany(TOWL_ROOT_CSS);
  const card = root.create.div().css.setMany(TOWL_CARD_CSS);
  card.create.h1().text.set("tug of war live").css.setMany(TOWL_TITLE_CSS);

  const roomRow = card.create.div().css.setMany(TOWL_ROOM_CSS);
  const room = roomRow.create.span().attrs.set("data-testid", "towl-room").text.set(`room ${roomId}`);
  const copyInvite = roomRow.create.button().attrs.set("type", "button").text.set("copy invite link").css.setMany(TOWL_BUTTON_CSS);
  const inviteStatus = roomRow.create.span().attrs.setMany({ "aria-live": "polite", "data-testid": "towl-invite-status" }).css.setMany(TOWL_INVITE_STATUS_CSS);

  const meta = card.create.div().css.setMany(TOWL_META_CSS);
  const status = meta.create.div().attrs.set("data-testid", "towl-status").text.set("connection: starting");
  const localSeat = meta.create.div().attrs.set("data-testid", "towl-local-seat").text.set("local seat: unseated");
  const phase = meta.create.div().attrs.set("data-testid", "towl-phase").text.set("phase: —");
  const round = meta.create.div().text.set("round: —");

  const seats = card.create.div().css.setMany(TOWL_SEATS_CSS);
  const player1 = seats.create.div().attrs.set("data-testid", "towl-player1").text.set("player 1\nwaiting for state").css.setMany(TOWL_SEAT_CSS);
  const player2 = seats.create.div().attrs.set("data-testid", "towl-player2").text.set("player 2\nwaiting for state").css.setMany(TOWL_SEAT_CSS);

  const rope = card.create.div().css.setMany(TOWL_ROPE_CSS);
  const ropeValue = rope.create.div().text.set("rope: —");
  const track = rope.create.div().attrs.set("aria-label", "TOWL rope position").css.setMany(TOWL_TRACK_CSS);
  const ropeMarker = track.create.div().css.setMany({ ...TOWL_MARKER_CSS, left: "50%" });
  const result = card.create.div().attrs.set("aria-live", "polite").css.setMany(TOWL_RESULT_CSS);

  const actions = card.create.div().css.setMany(TOWL_ACTIONS_CSS);
  const button = (label: string): LiveTree => actions.create.button().attrs.set("type", "button").text.set(label).css.setMany(TOWL_BUTTON_CSS);
  const join = button("join");
  const ready = button("ready");
  const pull = button("pull");
  const reset = button("reset round");
  const error = card.create.div().attrs.set("role", "alert").css.setMany(TOWL_ERROR_CSS);

  return { root, room, copyInvite, inviteStatus, status, localSeat, phase, round, player1, player2, ropeValue, ropeMarker, result, error, join, ready, pull, reset };
}

export function mount_towl_panel(host: LiveTree): TowlPanel {
  const roomAddress = resolve_towl_room_url(new URL(globalThis.location.href));
  if (roomAddress.changed) {
    globalThis.history.replaceState(globalThis.history.state, "", roomAddress.url.toString());
  }
  const { roomId } = roomAddress;
  const inviteUrl = roomAddress.url.toString();
  const view = create_view(host, roomId);
  let connection: TowlConnectionController | undefined;
  let pending: TowlActionName | undefined;
  let copyPending = false;
  let disposed = false;

  function disable_game_actions(): void {
    for (const button of [view.join, view.ready, view.pull, view.reset]) {
      set_disabled(button, true);
    }
  }

  function render_connection(next: TowlConnectionState): void {
    if (disposed) return;
    const label = next.status === "creating-session"
      ? next.sessionReplaced ? "creating replacement session" : "creating session"
      : next.status === "reattaching-session"
        ? "reattaching session"
        : next.status === "connected"
          ? "connected · session attached"
          : next.status === "reconnecting"
            ? `reconnecting · attempt ${next.attempt}`
            : next.status;
    view.status.text.set(`connection: ${label}`);
    if (next.status !== "connected") disable_game_actions();
    if (next.error !== undefined) view.error.text.set(error_message(next.error));
  }

  function render_state(state: TowlState): void {
    if (disposed) return;
    const client = connection?.client;
    const seat = seat_for_session(state, client?.livehost.session.sessionId);
    view.localSeat.text.set(`local seat: ${seat ?? "unseated"}`);

    if (client === undefined) {
      disable_game_actions();
    }

    view.phase.text.set(`phase: ${state.phase}`);
    view.round.text.set(`round: ${state.round}`);
    view.player1.text.set(seat_text(state, "player1", seat)).css.setMany(seat === "player1" ? { ...TOWL_SEAT_CSS, ...TOWL_SEAT_LOCAL_CSS } : TOWL_SEAT_CSS);
    view.player2.text.set(seat_text(state, "player2", seat)).css.setMany(seat === "player2" ? { ...TOWL_SEAT_CSS, ...TOWL_SEAT_LOCAL_CSS } : TOWL_SEAT_CSS);
    view.ropeValue.text.set(`rope: ${state.position}  (${state.position > 0 ? "player 1" : state.position < 0 ? "player 2" : "center"})`);
    view.ropeMarker.css.setMany({ left: `${((state.position + TOWL_WIN_POSITION) / (TOWL_WIN_POSITION * 2)) * 100}%` });
    view.result.text.set(state.winner === null ? "" : `${state.winner === "player1" ? "player 1" : "player 2"} wins round ${state.round}`);

    const attached = client?.livehost.session.status === "attached";
    const occupied = state.player1.sessionId !== null && state.player2.sessionId !== null;
    set_disabled(view.join, !attached || seat !== undefined || occupied);
    set_disabled(view.ready, !attached || seat === undefined || state.phase !== "ready");
    set_disabled(view.pull, !attached || seat === undefined || state.phase !== "playing" || !occupied);
    set_disabled(view.reset, !attached || seat === undefined || state.phase !== "finished" || state.winner !== seat);
    view.ready.text.set(seat !== undefined && state[seat].ready ? "not ready" : "ready");
  }

  async function run_action(name: TowlActionName, action: (active: TowlClient) => Promise<unknown>): Promise<void> {
    const client = connection?.client;
    if (disposed || pending === name || client === undefined) return;
    pending = name;
    view.error.text.set("");
    try {
      await action(client);
    } catch (error) {
      if (!disposed) view.error.text.set(error_message(error));
    } finally {
      if (!disposed && pending === name) {
        pending = undefined;
      }
    }
  }

  const joinListener = view.join.listen.onClick(() => void run_action("join", (active) => active.join()));
  const readyListener = view.ready.listen.onClick(() => void run_action("ready", (active) => {
    const seat = active.seat;
    return active.setReady(seat === undefined || !active.state[seat].ready);
  }));
  const pullListener = view.pull.listen.onClick(() => void run_action("pull", (active) => active.pull()));
  const resetListener = view.reset.listen.onClick(() => void run_action("reset", (active) => active.reset()));
  const copyInviteListener = view.copyInvite.listen.onClick(() => {
    if (disposed || copyPending) return;
    copyPending = true;
    set_disabled(view.copyInvite, true);
    view.inviteStatus.text.set("");
    const writeText = globalThis.navigator?.clipboard?.writeText;
    const copied = writeText === undefined
      ? Promise.reject(new Error("Clipboard access is unavailable."))
      : writeText.call(globalThis.navigator.clipboard, inviteUrl);
    void copied.then(
      () => {
        if (!disposed) view.inviteStatus.text.set("copied");
      },
      (error: unknown) => {
        if (!disposed) view.inviteStatus.text.set(error_message(error));
      },
    ).finally(() => {
      if (!disposed) {
        copyPending = false;
        set_disabled(view.copyInvite, false);
      }
    });
  });

  disable_game_actions();
  connection = create_towl_connection_controller({
    logicalMapId: towl_host_id_for_room(roomId),
    openTransport: () => create_browser_livehost_socket(configured_url(roomId)),
    readCredential: () => remembered_credential(roomId),
    writeCredential: (credential) => remember_credential(roomId, credential),
    onState: render_state,
    onConnection: render_connection,
  });

  return Object.freeze({
    root: view.root,
    dispose(): void {
      if (disposed) return;
      disposed = true;
      joinListener.off();
      readyListener.off();
      pullListener.off();
      resetListener.off();
      copyInviteListener.off();
      connection?.dispose();
      connection = undefined;
      if (!view.root.isDisposed) view.root.remove();
    },
  });
}
