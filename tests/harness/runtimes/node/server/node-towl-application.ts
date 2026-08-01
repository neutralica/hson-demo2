import type { WebSocket } from "ws";
import {
  TOWL_ROOM_HOST_PREFIX,
  TOWL_ROOM_ID_MAX_LENGTH,
  TOWL_ROOM_ID_MIN_LENGTH,
  TOWL_ROOM_ID_PATTERN,
} from "../../../../../src/app/demos/towl/index";
import {
  create_towl_authority_application,
  type TowlAuthorityApplication,
  type TowlAuthorityLifecycleOptions,
} from "../../../hosted/towl-authority-application";
import {
  create_node_livehost_socket,
  type NodeApplicationSecurity,
  type NodeHostedApplication,
} from "hson-live/livehost/node";

export const NODE_TOWL_APPLICATION_NAME = "towl";

export type NodeTowlApplication = Readonly<{
  registration: NodeHostedApplication;
  authorities: TowlAuthorityApplication;
  connectionCount(): number;
}>;

export type NodeTowlApplicationOptions = Readonly<{
  security?: NodeApplicationSecurity;
  lifecycle?: TowlAuthorityLifecycleOptions;
}>;

export function create_node_towl_application(
  options: NodeTowlApplicationOptions = {},
): NodeTowlApplication {
  const authorities = create_towl_authority_application(options.lifecycle);
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
    ...(options.security === undefined ? {} : { security: options.security }),
    ready: () => !disposed,
    async acceptWebSocket(authorityId, websocket, context) {
      if (disposed) {
        websocket.close(1012, "TOWL application stopping.");
        return;
      }
      const socket = create_node_livehost_socket(websocket, {
          maxBufferedAmount: context.transportPolicy.maxBufferedAmount,
          onBackpressure: context.transportPolicy.onBackpressure,
      });
      const bounded = options.lifecycle !== undefined;
      if (bounded) websocket.pause();
      let connected;
      try {
        connected = bounded
          ? await authorities.connectBounded(
              authorityId,
              socket,
              {
                ...(context.principal.id === undefined ? {} : { principalId: context.principal.id }),
                attachment: context.principal.value,
              },
            )
          : authorities.connect(
              authorityId,
              socket,
              {
                ...(context.principal.id === undefined ? {} : { principalId: context.principal.id }),
                attachment: context.principal.value,
              },
            );
      } finally {
        if (bounded) websocket.resume();
      }
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
    },
    async dispose() {
      if (disposed) return;
      disposed = true;
      for (const disconnect of connections.values()) disconnect();
      connections.clear();
      await authorities.dispose();
    },
  });

  return Object.freeze({
    registration,
    authorities,
    connectionCount: () => connections.size,
  });
}
