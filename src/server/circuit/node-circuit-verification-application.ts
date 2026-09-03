import type { LiveHostApplication, LiveHostApplicationContext, LiveHostConnection } from "hson-live/livehost";
import type { NodeApplicationSecurity } from "hson-live/livehost/node";
import type { LocusSocketLike } from "hson-live/types";
import { CIRCUIT_VERIFICATION_HOST_ID } from "../../shared/circuit-verification-contract";
import { create_circuit_verification_livehost } from "./circuit-verification-livehost";
import {
  create_circuit_verification_service,
  type CircuitVerificationService,
} from "./circuit-verification-service";

export const NODE_CIRCUIT_VERIFICATION_APPLICATION_NAME = "circuit-verification";
export const NODE_CIRCUIT_VERIFICATION_CONNECTION_PATH = "/circuit-verification";

export type NodeCircuitVerificationApplicationOptions = Readonly<{
  security?: NodeApplicationSecurity;
  service?: CircuitVerificationService;
}>;

export type NodeCircuitVerificationApplication = Readonly<{
  registration: LiveHostApplication;
  security?: NodeApplicationSecurity;
  service: CircuitVerificationService;
  connectionCount(): number;
  disconnectConnections(): void;
  metrics(): Readonly<{ sentMessages: number; sentBytes: number }>;
}>;

function locus_socket(connection: LiveHostConnection, onSend: (message: string) => void): LocusSocketLike {
  return Object.freeze({
    send(message: string) { onSend(message); connection.send(message); },
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

export async function create_node_circuit_verification_application(
  options: NodeCircuitVerificationApplicationOptions = {},
): Promise<NodeCircuitVerificationApplication> {
  const service = options.service ?? create_circuit_verification_service();
  try { await service.ready(); }
  catch (error) { await service.dispose(); throw error; }

  const locus = create_circuit_verification_livehost(service);
  const connections = new Map<LiveHostConnection, () => void>();
  let disposed = false;
  let sentMessages = 0;
  let sentBytes = 0;

  const registration: LiveHostApplication = Object.freeze({
    name: NODE_CIRCUIT_VERIFICATION_APPLICATION_NAME,
    connections: Object.freeze([Object.freeze({
      path: NODE_CIRCUIT_VERIFICATION_CONNECTION_PATH,
      accept(request: Request, connection: LiveHostConnection, context: LiveHostApplicationContext) {
        if (disposed) { connection.close(1012, "Circuit verifier stopping."); return; }
        if (new URL(request.url).searchParams.get("locus") !== CIRCUIT_VERIFICATION_HOST_ID) {
          connection.close(1008, "Unknown circuit-verification Locus.");
          return;
        }
        const disconnect = locus.connect(locus_socket(connection, (message) => {
          sentMessages += 1;
          sentBytes += Buffer.byteLength(message, "utf8");
        }), {
          ...(context.principal.id === undefined ? {} : { principalId: context.principal.id }),
          attachment: context.principal.value,
        });
        connections.set(connection, disconnect);
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
        connection.close(1012, "Circuit verification connection interrupted.");
      }
      connections.clear();
      locus.dispose();
      await service.dispose();
    },
  });

  return Object.freeze({
    registration,
    ...(options.security === undefined ? {} : { security: options.security }),
    service,
    connectionCount: () => connections.size,
    disconnectConnections() {
      for (const [connection, disconnect] of [...connections]) {
        disconnect();
        connection.close(1012, "Circuit verification connection interrupted.");
      }
    },
    metrics: () => Object.freeze({ sentMessages, sentBytes }),
  });
}
