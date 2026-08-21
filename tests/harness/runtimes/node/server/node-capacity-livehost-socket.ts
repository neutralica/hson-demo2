import type { LiveHostConnection } from "hson-live/livehost";
import type { LocusSocketLike } from "hson-live/types";

export type NodeCapacitySocketSnapshot = Readonly<{
  sending: boolean;
  inFlightMessages: number;
  queuedMessages: number;
  queuedBytes: number;
  saturated: boolean;
}>;

export type NodeCapacityLocusSocket = LocusSocketLike & Readonly<{
  capacity(): NodeCapacitySocketSnapshot;
}>;

/** Application metrics wrapper; physical buffering remains a Node LiveHost concern. */
export function create_node_capacity_locus_socket(
  connection: LiveHostConnection,
  options: Readonly<{
    onSend?(message: string): void;
    onSent?(message: string): void;
    onCapacityChange?(snapshot: NodeCapacitySocketSnapshot): void;
  }> = {},
): NodeCapacityLocusSocket {
  const snapshot = (): NodeCapacitySocketSnapshot => Object.freeze({
    sending: false,
    inFlightMessages: 0,
    queuedMessages: 0,
    queuedBytes: 0,
    saturated: false,
  });
  options.onCapacityChange?.(snapshot());
  return Object.freeze({
    send(message: string) {
      options.onSend?.(message);
      connection.send(message);
      options.onSent?.(message);
    },
    close(code?: number, reason?: string) { connection.close(code, reason); },
    onMessage(listener: (message: string) => void) {
      return connection.onMessage((message) => {
        if (typeof message === "string") listener(message);
        else connection.close(1003, "Locus accepts text messages only.");
      });
    },
    onClose(listener: () => void) { return connection.onClose(listener); },
    capacity: snapshot,
  });
}
