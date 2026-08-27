export const DEVELOPMENT_LIVEHOST_WS_URL = "ws://127.0.0.1:8787";

export type LiveHostBuildEnvironment = Readonly<{
  DEV?: boolean;
  PROD?: boolean;
  VITE_LIVEHOST_WS_URL?: string;
}>;

export type LiveHostWebSocketConfigurationErrorCode =
  | "LIVEHOST_WS_NOT_CONFIGURED"
  | "LIVEHOST_WS_URL_INVALID"
  | "LIVEHOST_WS_URL_INSECURE";

export class LiveHostWebSocketConfigurationError extends Error {
  readonly code: LiveHostWebSocketConfigurationErrorCode;

  constructor(code: LiveHostWebSocketConfigurationErrorCode, message: string) {
    super(message);
    this.name = "LiveHostWebSocketConfigurationError";
    this.code = code;
  }
}

export function is_local_livehost_websocket_origin(url: URL): boolean {
  return url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
}

export function current_livehost_build_environment(): LiveHostBuildEnvironment {
  const environment = (import.meta as ImportMeta & { readonly env?: LiveHostBuildEnvironment }).env;
  return Object.freeze({
    DEV: environment?.DEV ?? false,
    PROD: environment?.PROD ?? false,
    ...(environment?.VITE_LIVEHOST_WS_URL === undefined
      ? {}
      : { VITE_LIVEHOST_WS_URL: environment.VITE_LIVEHOST_WS_URL }),
  });
}

export function resolve_livehost_websocket_base_url(
  environment: LiveHostBuildEnvironment,
  explicitUrl?: string,
): string {
  const configured = explicitUrl ?? environment.VITE_LIVEHOST_WS_URL;
  if (configured === undefined || configured.trim() === "") {
    if (environment.PROD === true) {
      throw new LiveHostWebSocketConfigurationError(
        "LIVEHOST_WS_NOT_CONFIGURED",
        "LiveHost is unavailable because VITE_LIVEHOST_WS_URL was not configured for this production build.",
      );
    }
    return DEVELOPMENT_LIVEHOST_WS_URL;
  }

  let url: URL;
  try { url = new URL(configured); }
  catch {
    throw new LiveHostWebSocketConfigurationError(
      "LIVEHOST_WS_URL_INVALID",
      "The LiveHost WebSocket origin is invalid.",
    );
  }
  if (url.protocol !== "ws:" && url.protocol !== "wss:") {
    throw new LiveHostWebSocketConfigurationError(
      "LIVEHOST_WS_URL_INVALID",
      "The LiveHost WebSocket origin must use ws:// or wss://.",
    );
  }
  if (explicitUrl === undefined && url.pathname !== "/") {
    throw new LiveHostWebSocketConfigurationError(
      "LIVEHOST_WS_URL_INVALID",
      "VITE_LIVEHOST_WS_URL must identify an origin and must not include an application path.",
    );
  }
  if (environment.PROD === true && url.protocol !== "wss:" && !is_local_livehost_websocket_origin(url)) {
    throw new LiveHostWebSocketConfigurationError(
      "LIVEHOST_WS_URL_INSECURE",
      "A public production LiveHost WebSocket origin must use wss://.",
    );
  }
  return url.toString();
}

export function derive_livehost_application_websocket_url(
  base: string,
  path: `/${string}`,
  locus: string,
): string {
  const url = new URL(base);
  url.pathname = path;
  url.searchParams.set("locus", locus);
  return url.toString();
}

/** Derives the anonymous-admission endpoint from the configured socket origin. */
export function derive_livehost_session_url(base: string): string {
  const url = new URL(base);
  url.protocol = url.protocol === "wss:" ? "https:" : "http:";
  url.pathname = "/session";
  return url.toString();
}

const pending_session_bootstraps = new Map<string, Promise<void>>();

/**
 * Establishes the HttpOnly deployment-admission cookie before a public socket
 * is opened. Development has no admission endpoint and deliberately remains
 * direct for local iteration.
 */
export function bootstrap_livehost_browser_session(
  environment: LiveHostBuildEnvironment,
  explicitUrl?: string,
): Promise<void> {
  if (environment.PROD !== true) return Promise.resolve();
  const sessionUrl = derive_livehost_session_url(resolve_livehost_websocket_base_url(environment, explicitUrl));
  const existing = pending_session_bootstraps.get(sessionUrl);
  if (existing !== undefined) return existing;
  const bootstrap = globalThis.fetch(sessionUrl, { credentials: "include" }).then((response) => {
    if (!response.ok) throw new Error("LiveHost service admission is unavailable.");
  }).finally(() => {
    pending_session_bootstraps.delete(sessionUrl);
  });
  pending_session_bootstraps.set(sessionUrl, bootstrap);
  return bootstrap;
}
