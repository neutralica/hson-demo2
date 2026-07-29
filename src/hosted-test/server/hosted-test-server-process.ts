import {
  start_hosted_test_server,
  type HostedTestServer,
  type HostedTestServerOptions,
} from "./hosted-test-server";
import { assert_supported_livehost_node_runtime } from "hson-live/livehost/node";
import { create_node_production_security } from "./node-production-security";

export type HostedTestServerEnvironment = Readonly<{
  HOST?: string;
  PORT?: string;
  SHUTDOWN_TIMEOUT_MS?: string;
  LIVEHOST_DEPLOYMENT?: string;
  LIVEHOST_ALLOWED_ORIGINS?: string;
  LIVEHOST_BEARER_TOKEN?: string;
  LIVEHOST_AUTH_COOKIE_NAME?: string;
  LIVEHOST_TRUSTED_PROXY_PEERS?: string;
  LIVEHOST_FORWARDED_FOR_HOP?: string;
  LIVEHOST_MAX_TOWL_ROOMS?: string;
  LIVEHOST_TOWL_IDLE_MS?: string;
  LIVEHOST_MAX_HOSTED_REPORTS?: string;
  LIVEHOST_HOSTED_REPORT_RETENTION_MS?: string;
  LIVEHOST_AUTHORITY_SWEEP_INTERVAL_MS?: string;
}>;

export type HostedTestServerProcess = Readonly<{
  once(signal: "SIGINT" | "SIGTERM", listener: () => void): unknown;
  exit(code: number): void;
}>;

export type HostedTestServerProcessOptions = Readonly<{
  environment?: HostedTestServerEnvironment;
  process?: HostedTestServerProcess;
  startServer?: (options: Readonly<{ host: string; port: number; shutdownTimeoutMs: number }>) => Promise<HostedTestServer>;
  log?: (message: string) => void;
  logError?: (message: string) => void;
}>;

export function hosted_test_server_bind_options(
  environment: HostedTestServerEnvironment,
): Readonly<{ host: string; port: number; shutdownTimeoutMs: number }> {
  const host = environment.HOST ?? "127.0.0.1";
  if (host.trim() === "") throw new Error("HOST must be a non-empty bind address.");
  const rawPort = environment.PORT ?? "8787";
  if (!/^\d+$/.test(rawPort)) throw new Error("PORT must be an integer from 1 through 65535.");
  const port = Number(rawPort);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer from 1 through 65535.");
  }
  const rawShutdownTimeout = environment.SHUTDOWN_TIMEOUT_MS ?? "5000";
  if (!/^\d+$/.test(rawShutdownTimeout)) {
    throw new Error("SHUTDOWN_TIMEOUT_MS must be a positive integer.");
  }
  const shutdownTimeoutMs = Number(rawShutdownTimeout);
  if (!Number.isSafeInteger(shutdownTimeoutMs) || shutdownTimeoutMs <= 0) {
    throw new Error("SHUTDOWN_TIMEOUT_MS must be a positive integer.");
  }
  return Object.freeze({ host, port, shutdownTimeoutMs });
}

function positive_environment_integer(
  value: string | undefined,
  fallback: number,
  name: string,
): number {
  const raw = value ?? String(fallback);
  if (!/^\d+$/.test(raw)) throw new Error(`${name} must be a positive integer.`);
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer.`);
  return parsed;
}

export function hosted_test_authority_lifecycle_options(
  environment: HostedTestServerEnvironment,
): NonNullable<HostedTestServerOptions["authorityLifecycle"]> {
  const maxTowlRooms = positive_environment_integer(environment.LIVEHOST_MAX_TOWL_ROOMS, 128, "LIVEHOST_MAX_TOWL_ROOMS");
  const towlIdleMs = positive_environment_integer(environment.LIVEHOST_TOWL_IDLE_MS, 30 * 60_000, "LIVEHOST_TOWL_IDLE_MS");
  const maxHostedReports = positive_environment_integer(environment.LIVEHOST_MAX_HOSTED_REPORTS, 16, "LIVEHOST_MAX_HOSTED_REPORTS");
  const hostedReportRetentionMs = positive_environment_integer(
    environment.LIVEHOST_HOSTED_REPORT_RETENTION_MS,
    10 * 60_000,
    "LIVEHOST_HOSTED_REPORT_RETENTION_MS",
  );
  const sweepIntervalMs = positive_environment_integer(
    environment.LIVEHOST_AUTHORITY_SWEEP_INTERVAL_MS,
    30_000,
    "LIVEHOST_AUTHORITY_SWEEP_INTERVAL_MS",
  );
  if (towlIdleMs < 30_000) {
    throw new Error("LIVEHOST_TOWL_IDLE_MS must be at least the default 30000ms resumable-session grace.");
  }
  if (sweepIntervalMs > Math.min(towlIdleMs, hostedReportRetentionMs)) {
    throw new Error("LIVEHOST_AUTHORITY_SWEEP_INTERVAL_MS must not exceed configured idle/retention durations.");
  }
  return Object.freeze({
    maxTowlRooms,
    towlIdleMs,
    maxHostedReports,
    hostedReportRetentionMs,
    sweepIntervalMs,
  });
}

export async function run_hosted_test_server_process(
  options: HostedTestServerProcessOptions = {},
): Promise<HostedTestServer> {
  const environment = options.environment ?? process.env;
  const processHandle = options.process ?? process;
  const log = options.log ?? console.log;
  const logError = options.logError ?? console.error;
  const bind = hosted_test_server_bind_options(environment);
  const authorityLifecycle = hosted_test_authority_lifecycle_options(environment);
  let server: HostedTestServer;
  if (options.startServer !== undefined) {
    server = await options.startServer(bind);
  } else {
    assert_supported_livehost_node_runtime();
    if (environment.LIVEHOST_DEPLOYMENT === undefined || environment.LIVEHOST_DEPLOYMENT === "development") {
      server = await start_hosted_test_server({
        ...bind,
        authorityLifecycle,
        deployment: { mode: "development" },
        log(event) { log(JSON.stringify(event)); },
      });
    } else if (environment.LIVEHOST_DEPLOYMENT === "production") {
      const allowedOrigins = (environment.LIVEHOST_ALLOWED_ORIGINS ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter((value) => value !== "");
      const trustedProxyPeers = (environment.LIVEHOST_TRUSTED_PROXY_PEERS ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter((value) => value !== "");
      const forwardedForHop = environment.LIVEHOST_FORWARDED_FOR_HOP;
      if (forwardedForHop !== undefined && forwardedForHop !== "first" && forwardedForHop !== "last") {
        throw new Error("LIVEHOST_FORWARDED_FOR_HOP must be first or last.");
      }
      const production = create_node_production_security({
        allowedOrigins,
        bearerToken: environment.LIVEHOST_BEARER_TOKEN ?? "",
        ...(environment.LIVEHOST_AUTH_COOKIE_NAME === undefined
          ? {}
          : { cookieName: environment.LIVEHOST_AUTH_COOKIE_NAME }),
        trustedProxyPeers,
        ...(forwardedForHop === undefined ? {} : { forwardedForHop }),
      });
      server = await start_hosted_test_server({
        ...bind,
        authorityLifecycle,
        deployment: production.deployment,
        security: production.applicationSecurity,
        log(event) { log(JSON.stringify(event)); },
      });
    } else {
      throw new Error("LIVEHOST_DEPLOYMENT must be development or production.");
    }
  }
  log(`Hosted-test server listening at ${server.url} (bind address).`);

  let shutdown: Promise<void> | undefined;
  const stop = (): Promise<void> => shutdown ??= server.stop();
  const handleSignal = (signal: "SIGINT" | "SIGTERM"): void => {
    void stop().then(
      () => processHandle.exit(0),
      (error: unknown) => {
        logError(`Hosted-test server shutdown failed after ${signal}: ${error instanceof Error ? error.message : String(error)}`);
        processHandle.exit(1);
      },
    );
  };
  processHandle.once("SIGINT", () => handleSignal("SIGINT"));
  processHandle.once("SIGTERM", () => handleSignal("SIGTERM"));
  return server;
}
