import { start_hosted_test_server } from "./hosted-test-server";

const host = process.env.HOSTED_TEST_HOST ?? "127.0.0.1";
const parsedPort = Number(process.env.HOSTED_TEST_PORT ?? "8787");
if (!Number.isInteger(parsedPort) || parsedPort < 0 || parsedPort > 65535) {
  throw new Error("HOSTED_TEST_PORT must be an integer from 0 through 65535.");
}

const server = await start_hosted_test_server({ host, port: parsedPort });
console.log(`Hosted-test LiveHost listening at ${server.url}`);

let stopping = false;
async function stop(): Promise<void> {
  if (stopping) return;
  stopping = true;
  await server.stop();
}
process.once("SIGINT", () => { void stop().then(() => process.exit(0)); });
process.once("SIGTERM", () => { void stop().then(() => process.exit(0)); });
