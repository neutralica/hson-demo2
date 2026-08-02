import type { WebSocket } from "ws";
import {
  create_node_livehost_socket,
  type NodeApplicationSecurity,
  type NodeHostedApplication,
} from "hson-live/livehost/node";
import {
  CIRCUIT_VERIFICATION_HOST_ID,
} from "../../../hosted/circuit-verification-contract";
import { create_circuit_verification_livehost } from "../../../hosted/circuit-verification-livehost";
import {
  create_circuit_verification_service,
  type CircuitVerificationService,
} from "../circuit-verification-service";

export const NODE_CIRCUIT_VERIFICATION_APPLICATION_NAME = "circuit-verification";

export type NodeCircuitVerificationApplicationOptions = Readonly<{
  security?: NodeApplicationSecurity;
  service?: CircuitVerificationService;
}>;

export type NodeCircuitVerificationApplication = Readonly<{
  registration: NodeHostedApplication;
  service: CircuitVerificationService;
  connectionCount(): number;
  disconnectConnections(): void;
  metrics(): Readonly<{ sentMessages: number; sentBytes: number }>;
}>;

export async function create_node_circuit_verification_application(
  options: NodeCircuitVerificationApplicationOptions = {},
): Promise<NodeCircuitVerificationApplication> {
  const service = options.service ?? create_circuit_verification_service();
  try {
    await service.ready();
  } catch (error) {
    await service.dispose();
    throw error;
  }

  const authority = create_circuit_verification_livehost(service);
  const connections = new Map<WebSocket, () => void>();
  let disposed = false;
  let sentMessages = 0;
  let sentBytes = 0;

  const registration: NodeHostedApplication = Object.freeze({
    name: NODE_CIRCUIT_VERIFICATION_APPLICATION_NAME,
    authorities: Object.freeze([Object.freeze({ kind: "exact" as const, value: CIRCUIT_VERIFICATION_HOST_ID })]),
    ...(options.security === undefined ? {} : { security: options.security }),
    ready: () => !disposed,
    acceptWebSocket(_authorityId, websocket, context) {
      if (disposed) {
        websocket.close(1012, "Circuit verifier stopping.");
        return;
      }
      const socket = create_node_livehost_socket(websocket, {
        onSend(message) {
          sentMessages += 1;
          sentBytes += Buffer.byteLength(message, "utf8");
        },
        maxBufferedAmount: context.transportPolicy.maxBufferedAmount,
        onBackpressure: context.transportPolicy.onBackpressure,
      });
      const disconnect = authority.connect(socket, {
        ...(context.principal.id === undefined ? {} : { principalId: context.principal.id }),
        attachment: context.principal.value,
      });
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
      authority.dispose();
      await service.dispose();
    },
  });

  return Object.freeze({
    registration,
    service,
    connectionCount: () => connections.size,
    disconnectConnections() {
      for (const [websocket, disconnect] of [...connections]) {
        disconnect();
        websocket.close(1012, "Circuit verification connection interrupted.");
      }
    },
    metrics: () => Object.freeze({ sentMessages, sentBytes }),
  });
}
