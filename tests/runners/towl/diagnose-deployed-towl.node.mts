import WebSocket from "ws";
import {
  create_browser_locus_socket,
  type BrowserWebSocketConstructor,
} from "hson-live/locus";
import { EchoRecoveryError } from "hson-live/echo";
import { create_towl_client, towl_host_id_for_room } from "../../../src/app/demos/towl/index";

const endpoint = process.env.TOWL_DEPLOYED_WS_URL;
if (endpoint === undefined) {
  throw new Error("TOWL_DEPLOYED_WS_URL is required for the deployed TOWL compatibility probe.");
}

const room = `deploy-probe-${Date.now().toString(36)}`;
const url = new URL(endpoint);
url.searchParams.set("locus", towl_host_id_for_room(room));
let snapshot: unknown;

class DiagnosticWebSocket extends WebSocket {
  constructor(address: string | URL) {
    super(address);
    this.on("message", (raw) => {
      const message = JSON.parse(raw.toString()) as { type?: unknown; snapshot?: unknown };
      if (message.type === "recovery-snapshot") snapshot = message.snapshot;
    });
  }
}

function describe(error: unknown): unknown {
  if (!(error instanceof Error)) return error;
  const value = error as Error & { code?: unknown; cause?: unknown };
  return Object.freeze({
    name: value.name,
    message: value.message,
    code: value.code,
    cause: value.cause === undefined ? undefined : describe(value.cause),
  });
}

const transport = create_browser_locus_socket(
  url.toString(),
  DiagnosticWebSocket as unknown as BrowserWebSocketConstructor,
);
await transport.ready;
const client = create_towl_client({
  socket: transport.socket,
  logicalMapId: towl_host_id_for_room(room),
});
client.connect();

let error: unknown;
try {
  await client.createSession();
  await client.recover();
} catch (cause) {
  error = cause;
} finally {
  client.disconnect();
  client.livehost.session.dispose();
  client.livehost.recovery.dispose();
  transport.dispose();
}

const result = Object.freeze({
  room,
  compatible: error === undefined,
  recoveryError: error instanceof EchoRecoveryError,
  error: error === undefined ? undefined : describe(error),
  snapshot,
});
console.log(JSON.stringify(result, null, 2));
if (!result.compatible) process.exitCode = 1;
