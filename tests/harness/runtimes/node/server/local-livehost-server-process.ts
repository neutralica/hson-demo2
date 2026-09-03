import { assert_supported_livehost_node_runtime } from "hson-live/livehost/node";
import {
  start_local_livehost_server,
  type LocalLiveHostServer,
  type LocalLiveHostServerOptions,
} from "./local-livehost-server";

export type LocalLiveHostServerEnvironment = Readonly<{
  HOST?: string;
  PORT?: string;
  SHUTDOWN_TIMEOUT_MS?: string;
  LOCUS_MAX_TOWL_ROOMS?: string;
  LOCUS_TOWL_IDLE_MS?: string;
  LOCUS_AUTHORITY_SWEEP_INTERVAL_MS?: string;
  HSON_PLAYWRIGHT_OWNER_PID?: string;
}>;

export type LocalLiveHostServerProcess = Readonly<{
  once(signal: "SIGINT" | "SIGTERM", listener: () => void): unknown;
  exit(code: number): void;
}>;

export type LocalLiveHostServerProcessOptions = Readonly<{
  environment?: LocalLiveHostServerEnvironment;
  process?: LocalLiveHostServerProcess;
  startServer?: (options: Readonly<{ host: string; port: number; shutdownTimeoutMs: number }>) => Promise<LocalLiveHostServer>;
  log?: (message: string) => void;
  logError?: (message: string) => void;
  ownerProcessExists?: (pid: number) => boolean;
}>;

export function local_livehost_server_bind_options(
  environment: LocalLiveHostServerEnvironment,
): Readonly<{ host: string; port: number; shutdownTimeoutMs: number }> {
  const host = environment.HOST ?? "127.0.0.1";
  if (host.trim() === "") throw new Error("HOST must be a non-empty bind address.");
  const rawPort = environment.PORT ?? "8787";
  if (!/^\d+$/.test(rawPort)) throw new Error("PORT must be an integer from 1 through 65535.");
  const port = Number(rawPort);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) throw new Error("PORT must be an integer from 1 through 65535.");
  const rawShutdownTimeout = environment.SHUTDOWN_TIMEOUT_MS ?? "5000";
  if (!/^\d+$/.test(rawShutdownTimeout)) throw new Error("SHUTDOWN_TIMEOUT_MS must be a positive integer.");
  const shutdownTimeoutMs = Number(rawShutdownTimeout);
  if (!Number.isSafeInteger(shutdownTimeoutMs) || shutdownTimeoutMs <= 0) throw new Error("SHUTDOWN_TIMEOUT_MS must be a positive integer.");
  return Object.freeze({ host, port, shutdownTimeoutMs });
}

function positive_integer(value: string | undefined, fallback: number, name: string): number {
  const raw = value ?? String(fallback);
  if (!/^\d+$/.test(raw)) throw new Error(`${name} must be a positive integer.`);
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer.`);
  return parsed;
}

export function local_livehost_authority_lifecycle_options(
  environment: LocalLiveHostServerEnvironment,
): NonNullable<LocalLiveHostServerOptions["authorityLifecycle"]> {
  const maxTowlRooms = positive_integer(environment.LOCUS_MAX_TOWL_ROOMS, 128, "LOCUS_MAX_TOWL_ROOMS");
  const towlIdleMs = positive_integer(environment.LOCUS_TOWL_IDLE_MS, 30 * 60_000, "LOCUS_TOWL_IDLE_MS");
  const sweepIntervalMs = positive_integer(environment.LOCUS_AUTHORITY_SWEEP_INTERVAL_MS, 60_000, "LOCUS_AUTHORITY_SWEEP_INTERVAL_MS");
  if (towlIdleMs < 30_000) throw new Error("LOCUS_TOWL_IDLE_MS must be at least the default 30000ms resumable-session grace.");
  if (sweepIntervalMs > towlIdleMs) throw new Error("LOCUS_AUTHORITY_SWEEP_INTERVAL_MS must not exceed configured idle duration.");
  return Object.freeze({ maxTowlRooms, towlIdleMs, sweepIntervalMs });
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

export async function run_local_livehost_server_process(
  options: LocalLiveHostServerProcessOptions = {},
): Promise<LocalLiveHostServer> {
  const environment = options.environment ?? process.env;
  const processHandle = options.process ?? process;
  const log = options.log ?? console.log;
  const logError = options.logError ?? console.error;
  const bind = local_livehost_server_bind_options(environment);
  const lifecycle = local_livehost_authority_lifecycle_options(environment);
  const ownerPid = optional_process_id(environment.HSON_PLAYWRIGHT_OWNER_PID);
  const ownerProcessExists = options.ownerProcessExists ?? process_exists;
  assert_supported_livehost_node_runtime();
  const server = options.startServer === undefined
    ? await start_local_livehost_server({ ...bind, authorityLifecycle: lifecycle, log(event) { log(JSON.stringify(event)); } })
    : await options.startServer(bind);
  log(`Local LiveHost server listening at ${server.url} (bind address).`);

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
        logError(`Local LiveHost server shutdown failed after ${signal}: ${error instanceof Error ? error.message : String(error)}`);
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
