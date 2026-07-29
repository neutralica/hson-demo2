import type { WebSocket } from "ws";
import {
  TOWL_ROOM_HOST_PREFIX,
  TOWL_ROOM_ID_MAX_LENGTH,
  TOWL_ROOM_ID_MIN_LENGTH,
  TOWL_ROOM_ID_PATTERN,
} from "../../app/demos/towl";
import {
  create_towl_authority_application,
  type TowlAuthorityApplication,
} from "../towl-authority-application";
import { make_node_websocket_livehost_socket } from "./node-websocket-socket";
import type { NodeHostedApplication } from "./node-application-host";

export const NODE_TOWL_APPLICATION_NAME = "towl";

export type NodeTowlApplication = Readonly<{
  registration: NodeHostedApplication;
  authorities: TowlAuthorityApplication;
  connectionCount(): number;
}>;

export function create_node_towl_application(): NodeTowlApplication {
  const authorities = create_towl_authority_application();
  const connections = new Map<WebSocket, () => void>();
  let disposed = false;

  const registration: NodeHostedApplication = Object.freeze({
    name: NODE_TOWL_APPLICATION_NAME,
    authorities: Object.freeze([
      Object.freeze({
        kind: "prefix" as const,
        value: TOWL_ROOM_HOST_PREFIX,
        suffix: Object.freeze({
          minLength: TOWL_ROOM_ID_MIN_LENGTH,
          maxLength: TOWL_ROOM_ID_MAX_LENGTH,
          pattern: TOWL_ROOM_ID_PATTERN,
        }),
      }),
    ]),
    ready: () => !disposed,
    acceptWebSocket(authorityId, websocket) {
      if (disposed) {
        websocket.close(1012, "TOWL application stopping.");
        return;
      }
      const connected = authorities.connect(authorityId, make_node_websocket_livehost_socket(websocket));
      if (!connected.ok) {
        websocket.close(1008, connected.error.code ?? "Unknown TOWL room.");
        return;
      }
      const disconnect = connected.value;
      connections.set(websocket, disconnect);
      websocket.once("close", () => {
        connections.get(websocket)?.();
        connections.delete(websocket);
      });
      websocket.once("error", () => websocket.close(1011, "TOWL WebSocket error."));
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const disconnect of connections.values()) disconnect();
      connections.clear();
      authorities.dispose();
    },
  });

  return Object.freeze({
    registration,
    authorities,
    connectionCount: () => connections.size,
  });
}
