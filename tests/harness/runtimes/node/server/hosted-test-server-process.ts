import {
  start_hosted_test_server,
  type HostedTestServer,
  type HostedTestServerOptions,
} from "./hosted-test-server";
import { assert_supported_livehost_node_runtime } from "hson-live/livehost/node";
import { create_node_production_security } from "./node-production-security";
import { HOSTED_TEST_AUTHORITY_LIFECYCLE } from "../../../hosted/hosted-test-application";

export type HostedTestServerEnvironment = Readonly<{
  HOST?: string;
  PORT?: string;
  SHUTDOWN_TIMEOUT_MS?: string;
  LOCUS_DEPLOYMENT?: string;
  LOCUS_ALLOWED_ORIGINS?: string;
  LOCUS_BEARER_TOKEN?: string;
  LOCUS_AUTH_COOKIE_NAME?: string;
  LOCUS_TRUSTED_PROXY_PEERS?: string;
  LOCUS_FORWARDED_FOR_HOP?: string;
  LOCUS_MAX_TOWL_ROOMS?: string;
  LOCUS_TOWL_IDLE_MS?: string;
  LOCUS_MAX_HOSTED_REPORTS?: string;
  LOCUS_HOSTED_REPORT_RETENTION_MS?: string;
  LOCUS_AUTHORITY_SWEEP_INTERVAL_MS?: string;
  /** Internal Playwright web-server ownership; the server exits if this process disappears. */
  HSON_PLAYWRIGHT_OWNER_PID?: string;
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
  ownerProcessExists?: (pid: number) => boolean;
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

function optional_process_id(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (!/^\d+$/.test(value)) throw new Error("HSON_PLAYWRIGHT_OWNER_PID must be a positive process ID.");
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error("HSON_PLAYWRIGHT_OWNER_PID must be a positive process ID.");
  return parsed;
}

function process_exists(pid: number): boolean {
  try { process.kill(pid, 0); return true; }
  catch (error) { return (error as NodeJS.ErrnoException).code !== "ESRCH"; }
}

export function hosted_test_authority_lifecycle_options(
  environment: HostedTestServerEnvironment,
): NonNullable<HostedTestServerOptions["authorityLifecycle"]> {
  const maxTowlRooms = positive_environment_integer(environment.LOCUS_MAX_TOWL_ROOMS, 128, "LOCUS_MAX_TOWL_ROOMS");
  const towlIdleMs = positive_environment_integer(environment.LOCUS_TOWL_IDLE_MS, 30 * 60_000, "LOCUS_TOWL_IDLE_MS");
  const maxHostedReports = positive_environment_integer(
    environment.LOCUS_MAX_HOSTED_REPORTS,
    HOSTED_TEST_AUTHORITY_LIFECYCLE.maxReports,
    "LOCUS_MAX_HOSTED_REPORTS",
  );
  const hostedReportRetentionMs = positive_environment_integer(
    environment.LOCUS_HOSTED_REPORT_RETENTION_MS,
    HOSTED_TEST_AUTHORITY_LIFECYCLE.terminalRetentionMs,
    "LOCUS_HOSTED_REPORT_RETENTION_MS",
  );
  const sweepIntervalMs = positive_environment_integer(
    environment.LOCUS_AUTHORITY_SWEEP_INTERVAL_MS,
    HOSTED_TEST_AUTHORITY_LIFECYCLE.sweepIntervalMs,
    "LOCUS_AUTHORITY_SWEEP_INTERVAL_MS",
  );
  if (towlIdleMs < 30_000) {
    throw new Error("LOCUS_TOWL_IDLE_MS must be at least the default 30000ms resumable-session grace.");
  }
  if (sweepIntervalMs > Math.min(towlIdleMs, hostedReportRetentionMs)) {
    throw new Error("LOCUS_AUTHORITY_SWEEP_INTERVAL_MS must not exceed configured idle/retention durations.");
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
  const ownerPid = optional_process_id(environment.HSON_PLAYWRIGHT_OWNER_PID);
  const ownerProcessExists = options.ownerProcessExists ?? process_exists;
  let server: HostedTestServer;
  if (options.startServer !== undefined) {
    server = await options.startServer(bind);
  } else {
assert_supported_livehost_node_runtime();
    if (environment.LOCUS_DEPLOYMENT === undefined || environment.LOCUS_DEPLOYMENT === "development") {
      server = await start_hosted_test_server({
        ...bind,
        authorityLifecycle,
        deployment: { mode: "development" },
        log(event) { log(JSON.stringify(event)); },
      });
    } else if (environment.LOCUS_DEPLOYMENT === "production") {
      const allowedOrigins = (environment.LOCUS_ALLOWED_ORIGINS ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter((value) => value !== "");
      const trustedProxyPeers = (environment.LOCUS_TRUSTED_PROXY_PEERS ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter((value) => value !== "");
      const forwardedForHop = environment.LOCUS_FORWARDED_FOR_HOP;
      if (forwardedForHop !== undefined && forwardedForHop !== "first" && forwardedForHop !== "last") {
        throw new Error("LOCUS_FORWARDED_FOR_HOP must be first or last.");
      }
      const production = create_node_production_security({
        allowedOrigins,
        bearerToken: environment.LOCUS_BEARER_TOKEN ?? "",
        ...(environment.LOCUS_AUTH_COOKIE_NAME === undefined
          ? {}
          : { cookieName: environment.LOCUS_AUTH_COOKIE_NAME }),
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
      throw new Error("LOCUS_DEPLOYMENT must be development or production.");
    }
  }
  log(`Hosted-test server listening at ${server.url} (bind address).`);

  let shutdown: Promise<void> | undefined;
  let ownerTimer: ReturnType<typeof setInterval> | undefined;
  const stop = (): Promise<void> => {
    if (ownerTimer !== undefined) clearInterval(ownerTimer);
    return shutdown ??= server.stop();
  };
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
  if (ownerPid !== undefined) {
    ownerTimer = setInterval(() => {
      if (ownerProcessExists(ownerPid)) return;
      clearInterval(ownerTimer);
      ownerTimer = undefined;
      handleSignal("SIGTERM");
    }, 100);
  }
  return server;
}
