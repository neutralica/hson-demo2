import { run_hosted_test_server_process } from "./hosted-test-server-process";

try {
  await run_hosted_test_server_process({
    environment: {
      ...process.env,
      LIVEHOST_DEPLOYMENT: process.env.LIVEHOST_DEPLOYMENT ?? "production",
    },
  });
} catch (error) {
  console.error(`Production LiveHost server failed to start: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
