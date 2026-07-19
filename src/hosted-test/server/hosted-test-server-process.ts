import { start_hosted_test_server, type HostedTestServer } from "./hosted-test-server";

export type HostedTestServerEnvironment = Readonly<{
  HOST?: string;
  PORT?: string;
}>;

export type HostedTestServerProcess = Readonly<{
  once(signal: "SIGINT" | "SIGTERM", listener: () => void): unknown;
  exit(code: number): void;
}>;

export type HostedTestServerProcessOptions = Readonly<{
  environment?: HostedTestServerEnvironment;
  process?: HostedTestServerProcess;
  startServer?: (options: Readonly<{ host: string; port: number }>) => Promise<HostedTestServer>;
  log?: (message: string) => void;
  logError?: (message: string) => void;
}>;

export function hosted_test_server_bind_options(
  environment: HostedTestServerEnvironment,
): Readonly<{ host: string; port: number }> {
  const host = environment.HOST ?? "127.0.0.1";
  if (host.trim() === "") throw new Error("HOST must be a non-empty bind address.");
  const rawPort = environment.PORT ?? "8787";
  if (!/^\d+$/.test(rawPort)) throw new Error("PORT must be an integer from 1 through 65535.");
  const port = Number(rawPort);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer from 1 through 65535.");
  }
  return Object.freeze({ host, port });
}

export async function run_hosted_test_server_process(
  options: HostedTestServerProcessOptions = {},
): Promise<HostedTestServer> {
  const environment = options.environment ?? process.env;
  const processHandle = options.process ?? process;
  const startServer = options.startServer ?? start_hosted_test_server;
  const log = options.log ?? console.log;
  const logError = options.logError ?? console.error;
  const bind = hosted_test_server_bind_options(environment);
  const server = await startServer(bind);
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
