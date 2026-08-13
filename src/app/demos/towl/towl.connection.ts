import {
  LiveHostClientRecoveryError,
  LiveHostClientSessionError,
  LiveHostDisconnectedError,
} from "hson-live/livehost";
import type {
  LiveHostClientRecoveryCursor,
  LiveHostDisposer,
  LiveHostSessionCredential,
  LiveHostSocketLike,
  LiveMap,
  LiveMapPathHandle,
} from "hson-live/types";
import {
  create_towl_client,
  create_towl_client_mirror,
  type TowlClient,
  type TowlUncertainAction,
} from "./towl.client";
import type { TowlState } from "./towl.types";

export const TOWL_RECONNECT_DELAYS_MS = Object.freeze([0, 250, 1_000, 2_000, 5_000, 10_000] as const);

const DEFINITIVE_CREDENTIAL_REJECTIONS = new Set([
  "LIVEHOST_SESSION_CREDENTIAL_MISSING",
  "LIVEHOST_SESSION_CREDENTIAL_MALFORMED",
  "LIVEHOST_SESSION_CREDENTIAL_UNKNOWN",
  "LIVEHOST_SESSION_CREDENTIAL_EXPIRED",
  "LIVEHOST_SESSION_CREDENTIAL_REVOKED",
]);

export type TowlConnectionStatus =
  | "connecting"
  | "creating-session"
  | "reattaching-session"
  | "connected"
  | "reconnecting"
  | "failed"
  | "disposed";

export type TowlConnectionState = Readonly<{
  status: TowlConnectionStatus;
  attempt: number;
  sessionReplaced: boolean;
  sessionRestored: boolean;
  failureKind?: "retry-exhausted" | "terminal";
  error?: Error;
}>;

export type TowlLeaveOutcome = Readonly<{
  leaveAttempted: boolean;
  leaveDelivered: boolean;
  goodbyeAttempted: boolean;
  goodbyeDelivered: boolean;
  remoteDepartureConfirmed: boolean;
}>;

export type TowlConnectionErrorKind = "credential-rejected" | "transport" | "terminal";

export type TowlConnectionTransport = Readonly<{
  socket: LiveHostSocketLike;
  ready: Promise<void>;
  dispose(): void;
}>;

export type TowlConnectionController = Readonly<{
  mirror: LiveMap<TowlState>;
  root: LiveMapPathHandle<TowlState>;
  readonly state: TowlConnectionState;
  readonly client: TowlClient | undefined;
  readonly uncertainAction: TowlUncertainAction | undefined;
  ready(): Promise<void>;
  reconnect(): Promise<void>;
  leaveRoom(): Promise<TowlLeaveOutcome>;
  dispose(): void;
  debug(): Readonly<{
    transportAttempts: number;
    rootWatchInstallCount: number;
    hasActiveClient: boolean;
    hasOpeningClient: boolean;
    retryPending: boolean;
    terminalLeave: boolean;
  }>;
}>;

export type TowlConnectionOptions = Readonly<{
  logicalMapId: string;
  openTransport(): TowlConnectionTransport;
  readCredential(): LiveHostSessionCredential | undefined;
  writeCredential(credential: LiveHostSessionCredential | undefined): void;
  onState(state: TowlState): void;
  onConnection(state: TowlConnectionState): void;
  retryDelaysMs?: readonly number[];
  schedule?: (delayMs: number, callback: () => void) => LiveHostDisposer;
  mirror?: LiveMap<TowlState>;
  clientId?: string;
  leaveRequestTimeoutMs?: number;
}>;

class TowlConnectionCancelled extends Error {
  constructor() {
    super("TOWL connection work was cancelled.");
    this.name = "TowlConnectionCancelled";
  }
}

class TowlConnectionAttemptError extends Error {
  readonly retryable: boolean;
  readonly cause: unknown;

  constructor(error: unknown, retryable: boolean) {
    super(error instanceof Error ? error.message : String(error));
    this.name = "TowlConnectionAttemptError";
    this.retryable = retryable;
    this.cause = error;
  }
}

function default_schedule(delayMs: number, callback: () => void): LiveHostDisposer {
  const timer = setTimeout(callback, delayMs);
  return () => clearTimeout(timer);
}

function bounded_request<T>(request: Promise<T>, timeoutMs: number): Promise<T> {
  if (timeoutMs === 0) return Promise.reject(new Error("TOWL departure request timed out."));
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("TOWL departure request timed out.")), timeoutMs);
    request.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export function classify_towl_connection_error(error: unknown): TowlConnectionErrorKind {
  if (error instanceof LiveHostClientSessionError) {
    if (DEFINITIVE_CREDENTIAL_REJECTIONS.has(error.code)) return "credential-rejected";
    if (error.code === "LIVEHOST_SESSION_DISCONNECTED") return "transport";
    return "terminal";
  }
  if (error instanceof LiveHostDisconnectedError) return "transport";
  if (error instanceof LiveHostClientRecoveryError) {
    return error.code === "LIVEHOST_RECOVERY_DISCONNECTED" ? "transport" : "terminal";
  }
  return "terminal";
}

function dispose_client(client: TowlClient | undefined): void {
  if (client === undefined) return;
  client.disconnect();
  client.livehost.session.dispose();
  client.livehost.recovery.dispose();
}

export function create_towl_connection_controller(
  options: TowlConnectionOptions,
): TowlConnectionController {
  const retryDelays = Object.freeze([...(options.retryDelaysMs ?? TOWL_RECONNECT_DELAYS_MS)]);
  if (retryDelays.some((delay) => !Number.isFinite(delay) || delay < 0)) {
    throw new Error("TOWL reconnect delays must be finite non-negative numbers.");
  }
  const schedule = options.schedule ?? default_schedule;
  const leaveRequestTimeoutMs = options.leaveRequestTimeoutMs ?? 2_000;
  if (!Number.isFinite(leaveRequestTimeoutMs) || leaveRequestTimeoutMs < 0) {
    throw new Error("TOWL leave request timeout must be a finite non-negative number.");
  }
  const mirror = options.mirror ?? create_towl_client_mirror();
  const root = mirror.at([]);

  let connectionState: TowlConnectionState = Object.freeze({
    status: "connecting",
    attempt: 0,
    sessionReplaced: false,
    sessionRestored: false,
  });
  let disposed = false;
  let generation = 0;
  let credentialLoaded = false;
  let credential: LiveHostSessionCredential | undefined;
  let logicalClientId = options.clientId;
  let recoveryCursor: LiveHostClientRecoveryCursor | undefined;
  let activeClient: TowlClient | undefined;
  let activeTransport: TowlConnectionTransport | undefined;
  let stopActiveClose: LiveHostDisposer | undefined;
  let openingClient: TowlClient | undefined;
  let openingTransport: TowlConnectionTransport | undefined;
  let stopRootWatch: LiveHostDisposer | undefined;
  let cancelRetryDelay: LiveHostDisposer | undefined;
  let reconnecting: Promise<void> | undefined;
  let transportAttempts = 0;
  let rootWatchInstallCount = 0;
  let uncertainAction: TowlUncertainAction | undefined;
  let terminalLeave = false;
  let leavePromise: Promise<TowlLeaveOutcome> | undefined;

  const publish = (
    status: TowlConnectionStatus,
    attempt = connectionState.attempt,
    sessionReplaced = connectionState.sessionReplaced,
    error?: Error,
    failureKind?: TowlConnectionState["failureKind"],
    sessionRestored = connectionState.sessionRestored,
  ): void => {
    if (disposed && status !== "disposed") return;
    connectionState = Object.freeze({
      status,
      attempt,
      sessionReplaced,
      sessionRestored,
      ...(failureKind === undefined ? {} : { failureKind }),
      ...(error === undefined ? {} : { error }),
    });
    options.onConnection(connectionState);
  };

  const assert_current = (attemptGeneration: number): void => {
    if (disposed || generation !== attemptGeneration) throw new TowlConnectionCancelled();
  };

  const load_credential = (): LiveHostSessionCredential | undefined => {
    if (!credentialLoaded) {
      credentialLoaded = true;
      credential = options.readCredential();
    }
    return credential;
  };

  const store_credential = (next: LiveHostSessionCredential | undefined): void => {
    credentialLoaded = true;
    credential = next;
    options.writeCredential(next);
  };

  const record_recovery_evidence = (client: TowlClient): void => {
    logicalClientId ??= client.livehost.clientId;
    const incarnationId = client.livehost.recovery.incarnationId;
    const lastAppliedRev = client.livehost.recovery.lastAppliedRev;
    recoveryCursor = incarnationId !== undefined
      && lastAppliedRev !== undefined
      && lastAppliedRev === mirror.rev
      ? Object.freeze({ incarnationId, lastAppliedRev })
      : undefined;
  };

  const wait_delay = (delayMs: number, attemptGeneration: number): Promise<void> => {
    if (delayMs === 0) return Promise.resolve();
    return new Promise<void>((resolve) => {
      let settled = false;
      const finish = (): void => {
        if (settled) return;
        settled = true;
        cancelRetryDelay = undefined;
        resolve();
      };
      const cancelScheduled = schedule(delayMs, finish);
      cancelRetryDelay = () => {
        cancelScheduled();
        finish();
      };
      if (disposed || generation !== attemptGeneration) cancelRetryDelay();
    });
  };

  const install_root_watch = (): void => {
    if (stopRootWatch !== undefined) return;
    stopRootWatch = root.watch(options.onState);
    rootWatchInstallCount += 1;
    options.onState(root.snap());
  };

  async function open(attemptGeneration: number, reconnectAttempt: number): Promise<void> {
    let nextTransport: TowlConnectionTransport | undefined;
    let nextClient: TowlClient | undefined;
    let stopNextClose: LiveHostDisposer | undefined;
    let closeBeforeInstall = false;
    let installed = false;
    let stage: "transport" | "session" | "recovery" = "transport";
    let sessionReplaced = false;
    let sessionRestored = false;
    try {
      transportAttempts += 1;
      nextTransport = options.openTransport();
      openingTransport = nextTransport;
      stopNextClose = nextTransport.socket.onClose(() => {
        if (!installed) {
          closeBeforeInstall = true;
          return;
        }
        if (disposed || activeTransport !== nextTransport || activeClient !== nextClient) return;
        record_recovery_evidence(nextClient!);
        stopActiveClose?.();
        stopActiveClose = undefined;
        publish("reconnecting", 0, false);
        void ensure_reconnected();
      }) ?? undefined;
      await nextTransport.ready;
      assert_current(attemptGeneration);
      if (closeBeforeInstall) throw new LiveHostDisconnectedError();

      const currentCredential = load_credential();
      nextClient = create_towl_client({
        socket: nextTransport.socket,
        logicalMapId: options.logicalMapId,
        mirror,
        ...(logicalClientId === undefined ? {} : { clientId: logicalClientId }),
        ...(currentCredential === undefined ? {} : { credential: currentCredential }),
        ...(recoveryCursor === undefined ? {} : { recoveryCursor }),
        onUncertainAction: (request) => { uncertainAction = request; },
      });
      openingClient = nextClient;
      logicalClientId ??= nextClient.livehost.clientId;
      nextClient.connect();

      stage = "session";
      if (currentCredential === undefined) {
        publish("creating-session", reconnectAttempt, false);
        await nextClient.createSession();
        assert_current(attemptGeneration);
        store_credential(nextClient.livehost.session.credential);
      } else {
        publish("reattaching-session", reconnectAttempt, false);
        try {
          await nextClient.reattachSession(currentCredential);
          sessionRestored = true;
        } catch (error) {
          assert_current(attemptGeneration);
          if (classify_towl_connection_error(error) !== "credential-rejected") throw error;
          store_credential(undefined);
          sessionReplaced = true;
          publish("creating-session", reconnectAttempt, true);
          await nextClient.createSession();
          assert_current(attemptGeneration);
          store_credential(nextClient.livehost.session.credential);
        }
      }

      stage = "recovery";
      await nextClient.recover();
      assert_current(attemptGeneration);
      if (closeBeforeInstall
        || nextClient.livehost.session.status !== "attached"
        || nextClient.livehost.recovery.status !== "caught_up") {
        throw new LiveHostDisconnectedError();
      }
      record_recovery_evidence(nextClient);

      const priorClient = activeClient;
      const priorTransport = activeTransport;
      const priorStopClose = stopActiveClose;
      activeClient = nextClient;
      activeTransport = nextTransport;
      stopActiveClose = stopNextClose;
      openingClient = undefined;
      openingTransport = undefined;
      installed = true;
      priorStopClose?.();
      dispose_client(priorClient);
      priorTransport?.dispose();
      const observationAlreadyInstalled = stopRootWatch !== undefined;
      publish("connected", reconnectAttempt, sessionReplaced, undefined, undefined, sessionRestored);
      if (observationAlreadyInstalled) options.onState(root.snap());
      else install_root_watch();
    } catch (error) {
      if (nextClient !== undefined) record_recovery_evidence(nextClient);
      stopNextClose?.();
      dispose_client(nextClient);
      nextTransport?.dispose();
      if (openingClient === nextClient) openingClient = undefined;
      if (openingTransport === nextTransport) openingTransport = undefined;
      if (error instanceof TowlConnectionCancelled) throw error;
      const retryable = stage === "transport" || classify_towl_connection_error(error) === "transport";
      throw new TowlConnectionAttemptError(error, retryable);
    }
  }

  async function ensure_reconnected(): Promise<void> {
    if (disposed || terminalLeave) throw new TowlConnectionCancelled();
    if (connectionState.status !== "reconnecting" && connectionState.status !== "failed") return;
    if (reconnecting !== undefined) return reconnecting;
    const attemptGeneration = ++generation;
    reconnecting = (async () => {
      let lastError = new Error("TOWL transport disconnected.");
      for (let index = 0; index < retryDelays.length; index += 1) {
        const attempt = index + 1;
        publish("reconnecting", attempt, false);
        await wait_delay(retryDelays[index]!, attemptGeneration);
        assert_current(attemptGeneration);
        try {
          await open(attemptGeneration, attempt);
          return;
        } catch (error) {
          if (error instanceof TowlConnectionCancelled) throw error;
          if (!(error instanceof TowlConnectionAttemptError)) throw error;
          lastError = error;
          if (!error.retryable) {
            publish("failed", attempt, false, error, "terminal");
            return;
          }
        }
      }
      publish("failed", retryDelays.length, false, lastError, "retry-exhausted");
    })().catch((error: unknown) => {
      if (!(error instanceof TowlConnectionCancelled)) throw error;
    }).finally(() => {
      reconnecting = undefined;
    });
    return reconnecting;
  }

  const initialGeneration = ++generation;
  const readiness = open(initialGeneration, 0).catch((error: unknown) => {
    if (error instanceof TowlConnectionCancelled) return;
    const normalized = error instanceof Error ? error : new Error(String(error));
    const failureKind = error instanceof TowlConnectionAttemptError && error.retryable
      ? "retry-exhausted"
      : "terminal";
    publish("failed", 0, false, normalized, failureKind);
  });

  const cancel_reconnect_work = (): void => {
    generation += 1;
    cancelRetryDelay?.();
    cancelRetryDelay = undefined;
    stopActiveClose?.();
    stopActiveClose = undefined;
    dispose_client(openingClient);
    openingClient = undefined;
    openingTransport?.dispose();
    openingTransport = undefined;
  };

  const dispose_all = (): void => {
    if (disposed) return;
    disposed = true;
    cancel_reconnect_work();
    stopRootWatch?.();
    stopRootWatch = undefined;
    dispose_client(activeClient);
    activeClient = undefined;
    activeTransport?.dispose();
    activeTransport = undefined;
    publish("disposed", connectionState.attempt, connectionState.sessionReplaced);
  };

  const leave_room = (): Promise<TowlLeaveOutcome> => {
    if (leavePromise !== undefined) return leavePromise;
    terminalLeave = true;
    const connectedClient = connectionState.status === "connected" ? activeClient : undefined;
    cancel_reconnect_work();

    leavePromise = (async (): Promise<TowlLeaveOutcome> => {
      const leaveAttempted = connectedClient?.seat !== undefined;
      let leaveDelivered = false;
      const goodbyeAttempted = connectedClient?.livehost.session.status === "attached";
      let goodbyeDelivered = false;

      if (leaveAttempted) {
        try {
          await bounded_request(connectedClient!.leave(), leaveRequestTimeoutMs);
          leaveDelivered = true;
        } catch {
          // Local terminal departure still completes; authority expiry remains truthful fallback.
        }
      }
      if (goodbyeAttempted) {
        try {
          await bounded_request(connectedClient!.goodbyeSession(), leaveRequestTimeoutMs);
          goodbyeDelivered = true;
        } catch {
          // A disconnected/fenced session can only disappear through existing grace/expiry.
        }
      }

      store_credential(undefined);
      dispose_all();
      return Object.freeze({
        leaveAttempted,
        leaveDelivered,
        goodbyeAttempted,
        goodbyeDelivered,
        remoteDepartureConfirmed: leaveDelivered || goodbyeDelivered,
      });
    })();
    return leavePromise;
  };

  return Object.freeze({
    mirror,
    root,
    get state() { return connectionState; },
    get client() { return connectionState.status === "connected" && !terminalLeave ? activeClient : undefined; },
    get uncertainAction() { return uncertainAction; },
    ready: () => readiness,
    reconnect: ensure_reconnected,
    leaveRoom: leave_room,
    dispose: dispose_all,
    debug: () => Object.freeze({
      transportAttempts,
      rootWatchInstallCount,
      hasActiveClient: activeClient !== undefined,
      hasOpeningClient: openingClient !== undefined,
      retryPending: cancelRetryDelay !== undefined || reconnecting !== undefined,
      terminalLeave,
    }),
  });
}
