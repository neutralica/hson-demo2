import type { LiveHostSocketLike, LiveHostStore } from "hson-live/types";
import { create_livehost_store } from "hson-live/livehost";
import {
  create_towl_runtime,
  towl_room_id_from_host_id,
  type TowlRuntime,
} from "../app/demos/towl";

export type TowlAuthorityApplication = Readonly<{
  store: LiveHostStore;
  roomCount(): number;
  connect(hostId: string, socket: LiveHostSocketLike): ReturnType<LiveHostStore["connect"]>;
  disposeRoom(hostId: string): boolean;
  dispose(): void;
}>;

export function create_towl_authority_application(): TowlAuthorityApplication {
  const store = create_livehost_store();
  const rooms = new Map<string, TowlRuntime>();
  let disposed = false;

  function ensure_room(hostId: string): boolean {
    if (disposed || towl_room_id_from_host_id(hostId) === undefined) return false;
    if (rooms.has(hostId)) return true;
    const runtime = create_towl_runtime({ logicalMapId: hostId });
    const stored = store.set(hostId, runtime.host);
    if (!stored.ok) {
      runtime.dispose();
      throw new Error(stored.error.message);
    }
    rooms.set(hostId, runtime);
    return true;
  }

  function dispose_room(hostId: string): boolean {
    const runtime = rooms.get(hostId);
    if (runtime === undefined) return false;
    runtime.dispose();
    store.delete(hostId);
    rooms.delete(hostId);
    return true;
  }

  return Object.freeze({
    store,
    roomCount: () => rooms.size,
    connect(hostId, socket) {
      ensure_room(hostId);
      return store.connect(hostId, socket);
    },
    disposeRoom: dispose_room,
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const hostId of [...rooms.keys()]) dispose_room(hostId);
    },
  });
}
