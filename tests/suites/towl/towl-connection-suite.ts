import {
  LiveHostClientRecoveryError,
  LiveHostClientSessionError,
  LiveHostDisconnectedError,
} from "hson-live/livehost";
import type {
  LiveHostDisposer,
  LiveHostSessionCredential,
  LiveHostSocketLike,
} from "hson-live/types";
import type { TestSuite } from "../../harness/core/test-contracts";
import {
  TOWL_SCHEMA,
  classify_towl_connection_error,
  create_towl_connection_controller,
  create_towl_runtime,
  towl_host_id_for_room,
  type TowlConnectionController,
  type TowlConnectionState,
  type TowlConnectionTransport,
  type TowlRuntime,
  type TowlState,
} from "../../../src/app/demos/towl/index";
import { towl_case } from "./towl-test-helpers";

type SocketEndpoint = LiveHostSocketLike & Readonly<{
  listenerCount(): number;
}>;

type SocketPair = Readonly<{
  host: SocketEndpoint;
  client: SocketEndpoint;
  close(): void;
  holdActions(): void;
  holdRecovery(): void;
  release(): void;
}>;

type CredentialStore = {
  value: LiveHostSessionCredential | undefined;
  writes: Array<LiveHostSessionCredential | undefined>;
};

type ConnectionFixture = Readonly<{
  controller: TowlConnectionController;
  credentials: CredentialStore;
  connectionStates: TowlConnectionState[];
  observedStates: TowlState[];
}>;

function make_socket_pair(): SocketPair {
  const hostMessages = new Set<(message: string) => void>();
  const hostCloses = new Set<() => void>();
  const clientMessages = new Set<(message: string) => void>();
  const clientCloses = new Set<() => void>();
  const heldMessages: string[] = [];
  let holdRecoveryMessages = false;
  let holdActionMessages = false;
  let closed = false;

  const is_recovery_message = (message: string): boolean => {
    try {
      const value = JSON.parse(message) as { type?: unknown };
      return typeof value.type === "string" && value.type.startsWith("recovery-");
    } catch {
      return false;
    }
  };

  const is_action_result = (message: string): boolean => {
    try {
      const value = JSON.parse(message) as { type?: unknown; attemptId?: unknown };
      return (value.type === "ack" || value.type === "error") && typeof value.attemptId === "string";
    } catch {
      return false;
    }
  };

  function send_to(listeners: ReadonlySet<(message: string) => void>, message: string): void {
    if (closed) return;
    for (const listener of [...listeners]) listener(message);
  }

  function close_pair(): void {
    if (closed) return;
    closed = true;
    for (const listener of [...hostCloses]) listener();
    for (const listener of [...clientCloses]) listener();
    hostMessages.clear();
    hostCloses.clear();
    clientMessages.clear();
    clientCloses.clear();
    heldMessages.length = 0;
  }

  const host: SocketEndpoint = Object.freeze({
    send(message: string): void {
      if ((holdRecoveryMessages && is_recovery_message(message))
        || (holdActionMessages && is_action_result(message))) {
        heldMessages.push(message);
        return;
      }
      send_to(clientMessages, message);
    },
    close: close_pair,
    onMessage(listener: (message: string) => void): LiveHostDisposer {
      if (closed) return () => {};
      hostMessages.add(listener);
      return () => hostMessages.delete(listener);
    },
    onClose(listener: () => void): LiveHostDisposer {
      if (closed) {
        listener();
        return () => {};
      }
      hostCloses.add(listener);
      return () => hostCloses.delete(listener);
    },
    listenerCount: () => hostMessages.size + hostCloses.size,
  });

  const client: SocketEndpoint = Object.freeze({
    send: (message: string) => send_to(hostMessages, message),
    close: close_pair,
    onMessage(listener: (message: string) => void): LiveHostDisposer {
      if (closed) return () => {};
      clientMessages.add(listener);
      return () => clientMessages.delete(listener);
    },
    onClose(listener: () => void): LiveHostDisposer {
      if (closed) {
        listener();
        return () => {};
      }
      clientCloses.add(listener);
      return () => clientCloses.delete(listener);
    },
    listenerCount: () => clientMessages.size + clientCloses.size,
  });

  return Object.freeze({
    host,
    client,
    close: close_pair,
    holdActions(): void {
      holdActionMessages = true;
    },
    holdRecovery(): void {
      holdRecoveryMessages = true;
    },
    release(): void {
      holdRecoveryMessages = false;
      holdActionMessages = false;
      for (const message of heldMessages.splice(0)) send_to(clientMessages, message);
    },
  });
}

function connected_transport(runtime: TowlRuntime, pair = make_socket_pair()): TowlConnectionTransport {
  runtime.host.connect(pair.host);
  return Object.freeze({
    socket: pair.client,
    ready: Promise.resolve(),
    dispose: pair.close,
  });
}

function failed_transport(pair = make_socket_pair()): TowlConnectionTransport {
  return Object.freeze({
    socket: pair.client,
    ready: Promise.reject(new LiveHostDisconnectedError()),
    dispose: pair.close,
  });
}

function deferred(): Readonly<{ promise: Promise<void>; resolve(): void }> {
  let resolvePromise!: () => void;
  const promise = new Promise<void>((resolve) => { resolvePromise = resolve; });
  return Object.freeze({ promise, resolve: resolvePromise });
}

async function settle(): Promise<void> {
  for (let index = 0; index < 32; index += 1) await Promise.resolve();
}

async function make_connection(
  logicalMapId: string,
  openTransport: () => TowlConnectionTransport,
  options: Readonly<{
    credential?: LiveHostSessionCredential;
    retryDelaysMs?: readonly number[];
    schedule?: (delayMs: number, callback: () => void) => LiveHostDisposer;
  }> = {},
): Promise<ConnectionFixture> {
  const credentials: CredentialStore = { value: options.credential, writes: [] };
  const connectionStates: TowlConnectionState[] = [];
  const observedStates: TowlState[] = [];
  const controller = create_towl_connection_controller({
    logicalMapId,
    openTransport,
    readCredential: () => credentials.value,
    writeCredential: (credential) => {
      credentials.value = credential;
      credentials.writes.push(credential);
    },
    onState: (state) => observedStates.push(state),
    onConnection: (state) => connectionStates.push(state),
    ...(options.retryDelaysMs === undefined ? {} : { retryDelaysMs: options.retryDelaysMs }),
    ...(options.schedule === undefined ? {} : { schedule: options.schedule }),
  });
  await controller.ready();
  await settle();
  return Object.freeze({ controller, credentials, connectionStates, observedStates });
}

function make_scheduler(): Readonly<{
  schedule(delayMs: number, callback: () => void): LiveHostDisposer;
  runNext(): number | undefined;
  pending(): number;
}> {
  const tasks: Array<{ delayMs: number; active: boolean; callback: () => void }> = [];
  return Object.freeze({
    schedule(delayMs, callback) {
      const task = { delayMs, active: true, callback };
      tasks.push(task);
      return () => { task.active = false; };
    },
    runNext() {
      const task = tasks.find((candidate) => candidate.active);
      if (task === undefined) return undefined;
      task.active = false;
      task.callback();
      return task.delayMs;
    },
    pending: () => tasks.filter((task) => task.active).length,
  });
}

async function with_runtime<TResult>(
  run: (runtime: TowlRuntime) => TResult | Promise<TResult>,
): Promise<TResult> {
  let sessionNumber = 0;
  const runtime = create_towl_runtime({
    logicalMapId: towl_host_id_for_room("connection-room"),
    sessionId: () => `towl-connection-session-${++sessionNumber}`,
  });
  try {
    return await run(runtime);
  } finally {
    runtime.dispose();
  }
}

export function towl_connection_suite(): TestSuite {
  const SUITE = "livehost/towl-connection";
  const logicalMapId = towl_host_id_for_room("connection-room");

  return {
    suite: SUITE,
    cases: [
      towl_case(
        SUITE,
        "structured errors distinguish credential transport and terminal failures",
        () => ({
          credential: classify_towl_connection_error(new LiveHostClientSessionError(
            "LIVEHOST_SESSION_CREDENTIAL_UNKNOWN",
            "unknown",
          )),
          sessionTransport: classify_towl_connection_error(new LiveHostClientSessionError(
            "LIVEHOST_SESSION_DISCONNECTED",
            "disconnected",
          )),
          recoveryTransport: classify_towl_connection_error(new LiveHostClientRecoveryError(
            "LIVEHOST_RECOVERY_DISCONNECTED",
            "disconnected",
          )),
          terminalSession: classify_towl_connection_error(new LiveHostClientSessionError(
            "LIVEHOST_SESSION_ATTACHMENT_FENCED",
            "fenced",
          )),
          terminalRecovery: classify_towl_connection_error(new LiveHostClientRecoveryError(
            "REVISION_AHEAD_OF_AUTHORITY",
            "ahead",
          )),
        }),
        {
          credential: "credential-rejected",
          sessionTransport: "transport",
          recoveryTransport: "transport",
          terminalSession: "terminal",
          terminalRecovery: "terminal",
        },
      ),

      towl_case(
        SUITE,
        "schema-bound mirror renders through one root snap and one root watch",
        () => with_runtime(async (runtime) => {
          const fixture = await make_connection(logicalMapId, () => connected_transport(runtime));
          try {
            const beforeJoin = fixture.observedStates.length;
            await fixture.controller.client?.join();
            await settle();
            const afterJoin = fixture.observedStates.length;
            fixture.controller.dispose();
            const afterDispose = fixture.observedStates.length;
            fixture.controller.mirror.set(["position"], 1);
            await settle();
            return {
              exactSchema: fixture.controller.mirror.schema.get() === TOWL_SCHEMA,
              initialNotifications: beforeJoin,
              changeNotifications: afterJoin - beforeJoin,
              afterDispose: fixture.observedStates.length - afterDispose,
              rootWatchInstallCount: fixture.controller.debug().rootWatchInstallCount,
              status: fixture.controller.state.status,
            };
          } finally {
            fixture.controller.dispose();
          }
        }),
        {
          exactSchema: true,
          initialNotifications: 1,
          changeNotifications: 1,
          afterDispose: 0,
          rootWatchInstallCount: 1,
          status: "disposed",
        },
      ),

      towl_case(
        SUITE,
        "replacement client reuses identity credential mirror and seat without replaying pull",
        () => with_runtime(async (runtime) => {
          const firstPairs: SocketPair[] = [];
          const secondPairs: SocketPair[] = [];
          const first = await make_connection(logicalMapId, () => {
            const pair = make_socket_pair();
            firstPairs.push(pair);
            return connected_transport(runtime, pair);
          }, { retryDelaysMs: [0] });
          const second = await make_connection(logicalMapId, () => {
            const pair = make_socket_pair();
            secondPairs.push(pair);
            return connected_transport(runtime, pair);
          }, { retryDelaysMs: [0] });
          try {
            await first.controller.client?.join();
            await second.controller.client?.join();
            await first.controller.client?.setReady(true);
            await second.controller.client?.setReady(true);
            await settle();
            const oldClientId = first.controller.client?.livehost.clientId;
            const oldCredential = first.credentials.value;
            const mirror = first.controller.mirror;
            firstPairs[0]!.holdActions();
            const uncertainPull = first.controller.client!.pull();
            await settle();
            firstPairs[0]!.close();
            const unavailableDuringReconnect = first.controller.client === undefined;
            await uncertainPull.catch(() => undefined);
            await settle();
            const positionAfterReconnect = first.controller.root.snap().position;
            await first.controller.client?.pull();
            await settle();
            return {
              status: first.controller.state.status,
              sameClientId: first.controller.client?.livehost.clientId === oldClientId,
              sameCredential: first.credentials.value === oldCredential,
              sameMirror: first.controller.mirror === mirror,
              sameSeat: first.controller.client?.seat,
              unavailableDuringReconnect,
              uncertainAction: first.controller.uncertainAction?.name,
              positionAfterReconnect,
              position: first.controller.root.snap().position,
              peerPosition: second.controller.root.snap().position,
              attempts: first.controller.debug().transportAttempts,
              watchers: first.controller.debug().rootWatchInstallCount,
              active: first.controller.debug().hasActiveClient,
              opening: first.controller.debug().hasOpeningClient,
            };
          } finally {
            first.controller.dispose();
            second.controller.dispose();
          }
        }),
        {
          status: "connected",
          sameClientId: true,
          sameCredential: true,
          sameMirror: true,
          sameSeat: "player1",
          unavailableDuringReconnect: true,
          uncertainAction: "pull",
          positionAfterReconnect: 1,
          position: 2,
          peerPosition: 2,
          attempts: 2,
          watchers: 1,
          active: true,
          opening: false,
        },
      ),

      towl_case(
        SUITE,
        "transport failure retains the valid room credential",
        () => with_runtime(async (runtime) => {
          const firstPair = make_socket_pair();
          let attempts = 0;
          const fixture = await make_connection(logicalMapId, () => {
            attempts += 1;
            return attempts === 1
              ? connected_transport(runtime, firstPair)
              : failed_transport();
          }, { retryDelaysMs: [0] });
          try {
            const credential = fixture.credentials.value;
            fixture.credentials.writes.length = 0;
            firstPair.close();
            await settle();
            return {
              status: fixture.controller.state.status,
              retained: fixture.credentials.value === credential,
              cleared: fixture.credentials.writes.includes(undefined),
              attempts: fixture.controller.debug().transportAttempts,
            };
          } finally {
            fixture.controller.dispose();
          }
        }),
        { status: "failed", retained: true, cleared: false, attempts: 2 },
      ),

      towl_case(
        SUITE,
        "definitive stale credential creates a truthful unseated replacement session",
        () => with_runtime(async (runtime) => {
          const fixture = await make_connection(
            logicalMapId,
            () => connected_transport(runtime),
            { credential: "stale-room-credential" },
          );
          try {
            return {
              status: fixture.controller.state.status,
              sessionReplaced: fixture.controller.state.sessionReplaced,
              clearedFirst: fixture.credentials.writes[0] === undefined,
              replacementStored: fixture.credentials.value !== undefined
                && fixture.credentials.value !== "stale-room-credential",
              seat: fixture.controller.client?.seat ?? null,
            };
          } finally {
            fixture.controller.dispose();
          }
        }),
        {
          status: "connected",
          sessionReplaced: true,
          clearedFirst: true,
          replacementStored: true,
          seat: null,
        },
      ),

      towl_case(
        SUITE,
        "bounded retry advances deterministically and success cancels future work",
        () => with_runtime(async (runtime) => {
          const scheduler = make_scheduler();
          const firstPair = make_socket_pair();
          let attempts = 0;
          const fixture = await make_connection(logicalMapId, () => {
            attempts += 1;
            if (attempts === 1) return connected_transport(runtime, firstPair);
            if (attempts === 2) return failed_transport();
            return connected_transport(runtime);
          }, { retryDelaysMs: [5, 10], schedule: scheduler.schedule });
          try {
            firstPair.close();
            const firstDelay = scheduler.runNext();
            await settle();
            const secondDelay = scheduler.runNext();
            await settle();
            return {
              delays: [firstDelay, secondDelay],
              status: fixture.controller.state.status,
              attempts: fixture.controller.debug().transportAttempts,
              pending: scheduler.pending(),
              retryPending: fixture.controller.debug().retryPending,
            };
          } finally {
            fixture.controller.dispose();
          }
        }),
        {
          delays: [5, 10],
          status: "connected",
          attempts: 3,
          pending: 0,
          retryPending: false,
        },
      ),

      towl_case(
        SUITE,
        "retry exhaustion becomes terminal without invisible timers",
        () => with_runtime(async (runtime) => {
          const scheduler = make_scheduler();
          const firstPair = make_socket_pair();
          let attempts = 0;
          const fixture = await make_connection(logicalMapId, () => {
            attempts += 1;
            return attempts === 1 ? connected_transport(runtime, firstPair) : failed_transport();
          }, { retryDelaysMs: [5, 10], schedule: scheduler.schedule });
          try {
            firstPair.close();
            scheduler.runNext();
            await settle();
            scheduler.runNext();
            await settle();
            return {
              status: fixture.controller.state.status,
              attempts: fixture.controller.debug().transportAttempts,
              pending: scheduler.pending(),
              retryPending: fixture.controller.debug().retryPending,
            };
          } finally {
            fixture.controller.dispose();
          }
        }),
        { status: "failed", attempts: 3, pending: 0, retryPending: false },
      ),

      towl_case(
        SUITE,
        "disposal cancels pending retry and makes a late socket opening inert",
        () => with_runtime(async (runtime) => {
          const scheduler = make_scheduler();
          const firstPair = make_socket_pair();
          let attempts = 0;
          const pendingFixture = await make_connection(logicalMapId, () => {
            attempts += 1;
            return connected_transport(runtime, firstPair);
          }, { retryDelaysMs: [5], schedule: scheduler.schedule });
          firstPair.close();
          pendingFixture.controller.dispose();
          scheduler.runNext();
          await settle();

          const opening = deferred();
          const openingPairs: SocketPair[] = [];
          let openingAttempts = 0;
          const openingFixture = await make_connection(logicalMapId, () => {
            openingAttempts += 1;
            const pair = make_socket_pair();
            openingPairs.push(pair);
            if (openingAttempts === 1) return connected_transport(runtime, pair);
            runtime.host.connect(pair.host);
            return Object.freeze({ socket: pair.client, ready: opening.promise, dispose: pair.close });
          }, { retryDelaysMs: [0] });
          openingPairs[0]!.close();
          await settle();
          openingFixture.controller.dispose();
          opening.resolve();
          await settle();
          return {
            pendingAttempts: attempts,
            pendingStatus: pendingFixture.controller.state.status,
            openingAttempts,
            openingStatus: openingFixture.controller.state.status,
            active: openingFixture.controller.debug().hasActiveClient,
            opening: openingFixture.controller.debug().hasOpeningClient,
          };
        }),
        {
          pendingAttempts: 1,
          pendingStatus: "disposed",
          openingAttempts: 2,
          openingStatus: "disposed",
          active: false,
          opening: false,
        },
      ),

      towl_case(
        SUITE,
        "disposal during recovery makes held completion callbacks inert",
        () => with_runtime(async (runtime) => {
          const pairs: SocketPair[] = [];
          const fixture = await make_connection(logicalMapId, () => {
            const pair = make_socket_pair();
            pairs.push(pair);
            if (pairs.length === 2) pair.holdRecovery();
            return connected_transport(runtime, pair);
          }, { retryDelaysMs: [0] });
          pairs[0]!.close();
          await settle();
          const statusBeforeDispose = fixture.controller.state.status;
          fixture.controller.dispose();
          pairs[1]!.release();
          await settle();
          return {
            statusBeforeDispose,
            status: fixture.controller.state.status,
            active: fixture.controller.debug().hasActiveClient,
            opening: fixture.controller.debug().hasOpeningClient,
            watchers: fixture.controller.debug().rootWatchInstallCount,
          };
        }),
        {
          statusBeforeDispose: "reattaching-session",
          status: "disposed",
          active: false,
          opening: false,
          watchers: 1,
        },
      ),
    ],
  };
}
