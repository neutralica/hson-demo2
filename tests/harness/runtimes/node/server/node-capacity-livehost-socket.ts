import type { LiveHostSocketLike } from "hson-live/types";
import { create_node_livehost_socket } from "hson-live/livehost/node";
import WebSocket from "ws";

export type NodeCapacitySocketSnapshot = Readonly<{
  sending: boolean;
  inFlightMessages: number;
  queuedMessages: number;
  queuedBytes: number;
  saturated: boolean;
}>;

export type NodeCapacityLiveHostSocket = LiveHostSocketLike & Readonly<{
  capacity(): NodeCapacitySocketSnapshot;
}>;

type PendingMessage = Readonly<{ value: string; bytes: number }>;

/**
 * Orders application messages through the WebSocket's existing high-water mark
 * and a bounded waiting queue. Crossing `maxBufferedAmount` pauses additional
 * dispatch instead of treating temporary kernel pressure as terminal. The
 * queue permits one arbitrarily sized canonical frame plus one high-water
 * budget of following messages, then closes truthfully with 1013.
 */
export function create_node_capacity_livehost_socket(
  websocket: WebSocket,
  options: Readonly<{
    maxBufferedAmount: number;
    onSend?(message: string): void;
    onBackpressure?(): void;
    onCapacityChange?(snapshot: NodeCapacitySocketSnapshot): void;
  }>,
): NodeCapacityLiveHostSocket {
  const base = create_node_livehost_socket(websocket);
  const queue: PendingMessage[] = [];
  let queuedBytes = 0;
  let inFlight = 0;
  let saturated = false;
  let closed = false;
  let flushTimer: ReturnType<typeof setTimeout> | undefined;

  const snapshot = (): NodeCapacitySocketSnapshot => Object.freeze({
    sending: inFlight > 0,
    inFlightMessages: inFlight,
    queuedMessages: queue.length,
    queuedBytes,
    saturated,
  });
  const publish = (): void => options.onCapacityChange?.(snapshot());

  const clear_timer = (): void => {
    if (flushTimer === undefined) return;
    clearTimeout(flushTimer);
    flushTimer = undefined;
  };

  const release_queue = (): void => {
    clear_timer();
    queue.length = 0;
    queuedBytes = 0;
    inFlight = 0;
    publish();
  };

  websocket.once("close", () => {
    closed = true;
    release_queue();
  });

  const fail_transport = (code: number, reason: string): void => {
    if (closed) return;
    closed = true;
    release_queue();
    base.close(code, reason);
  };

  const saturate = (): void => {
    if (saturated || closed) return;
    saturated = true;
    publish();
    options.onBackpressure?.();
    fail_transport(1013, "LiveHost transport waiting capacity exceeded.");
  };

  const queue_capacity = (candidateBytes: number): number => {
    let largest = candidateBytes;
    for (const pending of queue) largest = Math.max(largest, pending.bytes);
    return options.maxBufferedAmount + largest;
  };

  const enqueue = (message: string): void => {
    const pending = Object.freeze({ value: message, bytes: Buffer.byteLength(message, "utf8") });
    if (queuedBytes + pending.bytes > queue_capacity(pending.bytes)) {
      saturate();
      return;
    }
    queue.push(pending);
    queuedBytes += pending.bytes;
    publish();
  };

  let flush = (): void => undefined;
  const transmit = (pending: PendingMessage): void => {
    if (closed || websocket.readyState !== WebSocket.OPEN) return;
    inFlight += 1;
    publish();
    options.onSend?.(pending.value);
    try {
      websocket.send(pending.value, (error) => {
        if (closed) return;
        inFlight = Math.max(0, inFlight - 1);
        publish();
        if (error != null) {
          fail_transport(1011, "LiveHost WebSocket send failed.");
          return;
        }
        flush();
      });
    } catch {
      inFlight = Math.max(0, inFlight - 1);
      publish();
      fail_transport(1011, "LiveHost WebSocket send failed.");
    }
  };

  const schedule_flush = (): void => {
    if (flushTimer !== undefined || closed) return;
    flushTimer = setTimeout(() => {
      flushTimer = undefined;
      flush();
    }, 1);
    flushTimer.unref?.();
  };

  flush = (): void => {
    if (closed || queue.length === 0) return;
    if (websocket.readyState !== WebSocket.OPEN) {
      release_queue();
      return;
    }
    if (websocket.bufferedAmount > options.maxBufferedAmount) {
      schedule_flush();
      return;
    }
    while (!closed && queue.length > 0 && websocket.bufferedAmount <= options.maxBufferedAmount) {
      const pending = queue.shift();
      if (pending === undefined) return;
      queuedBytes -= pending.bytes;
      publish();
      transmit(pending);
    }
    if (!closed && queue.length > 0) schedule_flush();
  };

  return Object.freeze({
    ...base,
    send(message) {
      if (closed || websocket.readyState !== WebSocket.OPEN) return;
      if (queue.length > 0 || websocket.bufferedAmount > options.maxBufferedAmount) {
        enqueue(message);
        flush();
        return;
      }
      transmit(Object.freeze({ value: message, bytes: Buffer.byteLength(message, "utf8") }));
    },
    close(code, reason) {
      if (closed) return;
      closed = true;
      release_queue();
      base.close(code, reason);
    },
    capacity: snapshot,
  });
}
