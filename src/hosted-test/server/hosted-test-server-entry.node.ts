import { run_hosted_test_server_process } from "./hosted-test-server-process";

try {
  await run_hosted_test_server_process();
} catch (error) {
  console.error(`Hosted-test server failed to start: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
