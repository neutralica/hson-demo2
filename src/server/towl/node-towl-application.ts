import type {
  LiveHostApplication,
  LiveHostApplicationContext,
  LiveHostConnection,
} from "hson-live/livehost";
import type { NodeApplicationSecurity } from "hson-live/livehost/node";
import type { LocusSocketLike } from "hson-live/types";
import { towl_room_id_from_host_id } from "../../app/demos/towl/index";
import {
  create_towl_authority_application,
  type TowlAuthorityApplication,
  type TowlAuthorityLifecycleOptions,
} from "./towl-authority-application";

export const NODE_TOWL_APPLICATION_NAME = "towl";
export const NODE_TOWL_CONNECTION_PATH = "/towl";

export type NodeTowlApplication = Readonly<{
  registration: LiveHostApplication;
  security?: NodeApplicationSecurity;
  authorities: TowlAuthorityApplication;
  connectionCount(): number;
}>;

export type NodeTowlApplicationOptions = Readonly<{
  security?: NodeApplicationSecurity;
  lifecycle?: TowlAuthorityLifecycleOptions;
}>;

function locus_socket(connection: LiveHostConnection): LocusSocketLike {
  return Object.freeze({
    send(message: string) { connection.send(message); },
    close(code?: number, reason?: string) { connection.close(code, reason); },
    onMessage(listener: (message: string) => void) {
      return connection.onMessage((message) => {
        if (typeof message === "string") listener(message);
        else connection.close(1003, "Locus accepts text messages only.");
      });
    },
    onClose(listener: () => void) { return connection.onClose(listener); },
  });
}

export function create_node_towl_application(
  options: NodeTowlApplicationOptions = {},
): NodeTowlApplication {
  const authorities = create_towl_authority_application(options.lifecycle);
  const connections = new Map<LiveHostConnection, () => void>();
  let disposed = false;

  const registration: LiveHostApplication = Object.freeze({
    name: NODE_TOWL_APPLICATION_NAME,
    connections: Object.freeze([Object.freeze({
      path: NODE_TOWL_CONNECTION_PATH,
      async accept(request: Request, connection: LiveHostConnection, context: LiveHostApplicationContext) {
        if (disposed) { connection.close(1012, "TOWL application stopping."); return; }
        const locusId = new URL(request.url).searchParams.get("locus") ?? "";
        if (towl_room_id_from_host_id(locusId) === undefined) {
          connection.close(1008, "Unknown TOWL room.");
          return;
        }
        const socket = locus_socket(connection);
        const connected = options.lifecycle === undefined
          ? authorities.connect(locusId, socket, {
              ...(context.principal.id === undefined ? {} : { principalId: context.principal.id }),
              attachment: context.principal.value,
            })
          : await authorities.connectBounded(locusId, socket, {
              ...(context.principal.id === undefined ? {} : { principalId: context.principal.id }),
              attachment: context.principal.value,
            });
        if (!connected.ok) { connection.close(1008, connected.error.code ?? "Unknown TOWL room."); return; }
        connections.set(connection, connected.value);
        connection.onClose(() => {
          connections.get(connection)?.();
          connections.delete(connection);
        });
      },
    })]),
    ready: () => !disposed,
    async dispose() {
      if (disposed) return;
      disposed = true;
      for (const [connection, disconnect] of connections) {
        disconnect();
        connection.close(1012, "TOWL application stopping.");
      }
      connections.clear();
      await authorities.dispose();
    },
  });

  return Object.freeze({
    registration,
    ...(options.security === undefined ? {} : { security: options.security }),
    authorities,
    connectionCount: () => connections.size,
  });
}
