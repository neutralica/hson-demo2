import type { LiveHostSocketLike } from "hson-live/types";
import WebSocket from "ws";

export function make_node_websocket_livehost_socket(
  websocket: WebSocket,
  onSend?: (message: string) => void,
): LiveHostSocketLike {
  return {
    send(message) {
      if (websocket.readyState !== WebSocket.OPEN) return;
      onSend?.(message);
      websocket.send(message);
    },
    close(code, reason) {
      websocket.close(code, reason);
    },
    onMessage(listener) {
      const handle = (data: WebSocket.RawData, isBinary: boolean): void => {
        if (isBinary) {
          websocket.close(1003, "LiveHost accepts text messages only.");
          return;
        }
        listener(data.toString("utf8"));
      };
      websocket.on("message", handle);
      return () => websocket.off("message", handle);
    },
    onClose(listener) {
      websocket.on("close", listener);
      return () => websocket.off("close", listener);
    },
  };
}
