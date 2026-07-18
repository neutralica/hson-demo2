import type { LiveTree } from "hson-live";
import type { LiveHostSessionCredential } from "hson-live/types";
import { TOWL_HOST_ID, TOWL_WIN_POSITION, create_towl_client, type TowlClient, type TowlSeat, type TowlState } from "../../../towl";
import { make_hosted_test_browser_websocket, type HostedTestBrowserSocket } from "../../hosted-test/browser-websocket-socket";
import {
  TOWL_ACTIONS_CSS,
  TOWL_BUTTON_CSS,
  TOWL_CARD_CSS,
  TOWL_ERROR_CSS,
  TOWL_MARKER_CSS,
  TOWL_META_CSS,
  TOWL_RESULT_CSS,
  TOWL_ROOT_CSS,
  TOWL_ROPE_CSS,
  TOWL_SEAT_CSS,
  TOWL_SEAT_LOCAL_CSS,
  TOWL_SEATS_CSS,
  TOWL_TITLE_CSS,
  TOWL_TRACK_CSS,
} from "./towl.css";

const TOWL_CREDENTIAL_KEY = "hson-livedemo.towl.livehost-credential";

type TowlActionName = "join" | "ready" | "pull" | "reset";

export type TowlPanel = Readonly<{
  root: LiveTree;
  dispose(): void;
}>;

type TowlView = Readonly<{
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

function configured_url(): string {
  const meta = import.meta as ImportMeta & { readonly env?: Readonly<{
    VITE_TOWL_WS_URL?: string;
    VITE_HOSTED_TEST_WS_URL?: string;
  }> };
  const base = meta.env?.VITE_TOWL_WS_URL ?? meta.env?.VITE_HOSTED_TEST_WS_URL ?? "ws://127.0.0.1:8787";
  const url = new URL(base);
  url.searchParams.set("livehost", TOWL_HOST_ID);
  return url.toString();
}

function remembered_credential(): LiveHostSessionCredential | undefined {
  try {
    return globalThis.localStorage?.getItem(TOWL_CREDENTIAL_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

function remember_credential(credential: LiveHostSessionCredential | undefined): void {
  try {
    if (credential === undefined) globalThis.localStorage?.removeItem(TOWL_CREDENTIAL_KEY);
    else globalThis.localStorage?.setItem(TOWL_CREDENTIAL_KEY, credential);
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }
}

function error_message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function set_disabled(button: LiveTree, disabled: boolean): void {
  if (disabled) {
    button.flag.set("disabled");
    button.attr.set("aria-disabled", "true");
  } else {
    button.flag.clear("disabled");
    button.attr.drop("aria-disabled");
  }
}

function seat_text(state: TowlState, seat: TowlSeat, localSeat: TowlSeat | undefined): string {
  const player = state[seat];
  const label = seat === "player1" ? "player 1" : "player 2";
  if (player.sessionId === null) return `${label}\nvacant`;
  const local = seat === localSeat ? " · you" : "";
  return `${label}${local}\njoined · ${player.connected ? "connected" : "disconnected"}\n${player.ready ? "ready" : "not ready"}`;
}

function create_view(host: LiveTree): TowlView & Readonly<{ root: LiveTree }> {
  host.empty();
  const root = host.create.section().attr.set("data-demo-towl", "true").css.setMany(TOWL_ROOT_CSS);
  const card = root.create.div().css.setMany(TOWL_CARD_CSS);
  card.create.h1().text.set("TOWL").css.setMany(TOWL_TITLE_CSS);

  const meta = card.create.div().css.setMany(TOWL_META_CSS);
  const status = meta.create.div().text.set("connection: starting");
  const localSeat = meta.create.div().text.set("local seat: unseated");
  const phase = meta.create.div().text.set("phase: —");
  const round = meta.create.div().text.set("round: —");

  const seats = card.create.div().css.setMany(TOWL_SEATS_CSS);
  const player1 = seats.create.div().text.set("player 1\nwaiting for state").css.setMany(TOWL_SEAT_CSS);
  const player2 = seats.create.div().text.set("player 2\nwaiting for state").css.setMany(TOWL_SEAT_CSS);

  const rope = card.create.div().css.setMany(TOWL_ROPE_CSS);
  const ropeValue = rope.create.div().text.set("rope: —");
  const track = rope.create.div().attr.set("aria-label", "TOWL rope position").css.setMany(TOWL_TRACK_CSS);
  const ropeMarker = track.create.div().css.setMany({ ...TOWL_MARKER_CSS, left: "50%" });
  const result = card.create.div().attr.set("aria-live", "polite").css.setMany(TOWL_RESULT_CSS);

  const actions = card.create.div().css.setMany(TOWL_ACTIONS_CSS);
  const button = (label: string): LiveTree => actions.create.button().attr.set("type", "button").text.set(label).css.setMany(TOWL_BUTTON_CSS);
  const join = button("join");
  const ready = button("ready");
  const pull = button("pull");
  const reset = button("reset round");
  const error = card.create.div().attr.set("role", "alert").css.setMany(TOWL_ERROR_CSS);

  return { root, status, localSeat, phase, round, player1, player2, ropeValue, ropeMarker, result, error, join, ready, pull, reset };
}

export function mount_towl_panel(host: LiveTree): TowlPanel {
  const view = create_view(host);
  let transport: HostedTestBrowserSocket | undefined;
  let client: TowlClient | undefined;
  let state: TowlState | undefined;
  let pending: TowlActionName | undefined;
  let connectionStatus = "starting";
  let disposed = false;
  let stopMap: (() => void) | undefined;
  let stopClose: (() => void) | undefined;

  function render(): void {
    if (disposed) return;
    const seat = state === undefined ? undefined : client?.seat;
    view.status.text.set(`connection: ${connectionStatus}`);
    view.localSeat.text.set(`local seat: ${seat ?? "unseated"}`);

    if (state === undefined) {
      for (const button of [view.join, view.ready, view.pull, view.reset]) set_disabled(button, true);
      return;
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
    set_disabled(view.join, !attached || seat !== undefined || (state.player1.sessionId !== null && state.player2.sessionId !== null) || pending === "join");
    set_disabled(view.ready, !attached || seat === undefined || state.phase !== "ready" || pending === "ready");
    set_disabled(view.pull, !attached || seat === undefined || state.phase !== "playing" || !occupied || pending === "pull");
    set_disabled(view.reset, !attached || seat === undefined || state.phase !== "finished" || state.winner !== seat || pending === "reset");
    view.ready.text.set(seat !== undefined && state[seat].ready ? "not ready" : "ready");
  }

  async function run_action(name: TowlActionName, action: (active: TowlClient) => Promise<unknown>): Promise<void> {
    if (disposed || pending === name || client === undefined) return;
    pending = name;
    view.error.text.set("");
    render();
    try {
      await action(client);
    } catch (error) {
      if (!disposed) view.error.text.set(error_message(error));
    } finally {
      if (!disposed && pending === name) {
        pending = undefined;
        render();
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

  async function initialize(): Promise<void> {
    try {
      connectionStatus = "connecting";
      render();
      const nextTransport = make_hosted_test_browser_websocket(configured_url());
      transport = nextTransport;
      await nextTransport.ready;
      if (disposed) return;

      const credential = remembered_credential();
      const nextClient = create_towl_client({
        socket: nextTransport.socket,
        ...(credential !== undefined ? { credential } : {}),
      });
      client = nextClient;
      nextClient.connect();
      stopMap = nextClient.livehost.map.sub((next) => {
        state = next;
        render();
      });
      stopClose = nextTransport.socket.onClose(() => {
        if (!disposed) {
          connectionStatus = "disconnected";
          render();
        }
      }) ?? undefined;

      connectionStatus = credential === undefined ? "creating session" : "reattaching session";
      render();
      if (credential !== undefined) {
        try {
          await nextClient.reattachSession(credential);
        } catch {
          remember_credential(undefined);
          if (disposed) return;
          connectionStatus = "creating replacement session";
          render();
          await nextClient.createSession();
        }
      } else {
        await nextClient.createSession();
      }
      if (disposed) return;
      remember_credential(nextClient.livehost.session.credential);
      connectionStatus = "connected · session attached";
      render();
    } catch (error) {
      if (!disposed) {
        connectionStatus = "failed";
        view.error.text.set(error_message(error));
        render();
      }
    }
  }

  void initialize();

  return Object.freeze({
    root: view.root,
    dispose(): void {
      if (disposed) return;
      disposed = true;
      joinListener.off();
      readyListener.off();
      pullListener.off();
      resetListener.off();
      stopMap?.();
      stopClose?.();
      if (client !== undefined) {
        if (client.livehost.session.status === "attached") client.livehost.unsubscribe([]);
        client.disconnect();
        client.livehost.session.dispose();
        client.livehost.recovery.dispose();
      }
      transport?.dispose();
      if (!view.root.isDisposed) view.root.remove();
    },
  });
}
