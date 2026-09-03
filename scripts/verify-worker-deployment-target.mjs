import { load_worker_deployment_target } from "./worker-deployment-target.mjs";

try {
  const target = await load_worker_deployment_target();
  console.log(`TOWL Worker target verified: ${target.name} (${target.wranglerEnvironment ?? "default"}) at ${target.publicWebSocketOrigin}.`);
} catch (error) {
  console.error(`verify:worker-target: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
