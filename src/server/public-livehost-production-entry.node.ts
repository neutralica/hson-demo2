import { assert_supported_livehost_node_runtime } from "hson-live/livehost/node";
import { start_public_livehost_server } from "./public-livehost-server";

assert_supported_livehost_node_runtime();
const server = await start_public_livehost_server(process.env, (event) => console.log(JSON.stringify(event)));
console.log(`Public LiveHost server listening at ${server.url} (bind address).`);

let stopping: Promise<void> | undefined;
function stop(signal: "SIGINT" | "SIGTERM"): void {
  void (stopping ??= server.stop()).then(
    () => process.exit(0),
    (error: unknown) => {
      console.error(`Public LiveHost shutdown failed after ${signal}: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    },
  );
}
process.once("SIGINT", () => stop("SIGINT"));
process.once("SIGTERM", () => stop("SIGTERM"));
