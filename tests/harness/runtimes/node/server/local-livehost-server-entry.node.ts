import { run_local_livehost_server_process } from "./local-livehost-server-process";

try {
  await run_local_livehost_server_process();
} catch (error) {
  console.error(`Local LiveHost server failed to start: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
