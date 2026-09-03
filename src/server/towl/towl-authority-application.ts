import type {
  LocusConnectionContext,
  LocusResult,
  LocusSessionOptions,
  LocusSocketLike,
} from "hson-live/types";
import { create_livehost_locus_registry, type LiveHostLocusEvictionResult } from "hson-live/livehost";
import { create_application_locus_store, type ApplicationLocusStore } from "../livehost/application-locus-store";
import { create_application_idle_sweep, type ApplicationIdleSweep } from "../livehost/application-idle-sweep";
import {
  create_towl_runtime,
  towl_room_id_from_host_id,
  type TowlRuntime,
} from "../../app/demos/towl/index";

export type TowlAuthorityApplication = Readonly<{
  store: ApplicationLocusStore;
  roomCount(): number;
  hasRoom(hostId: string): boolean;
  connect(
    hostId: string,
    socket: LocusSocketLike,
    context?: LocusConnectionContext,
  ): ReturnType<ApplicationLocusStore["connect"]>;
  connectBounded(
    hostId: string,
    socket: LocusSocketLike,
    context?: LocusConnectionContext,
  ): Promise<LocusResult<() => void>>;
  disposeRoom(hostId: string): boolean;
  evictRoom(hostId: string): Promise<LiveHostLocusEvictionResult>;
  sweep(): Promise<number>;
  dispose(): void | Promise<void>;
}>;

export type TowlAuthorityLifecycleOptions = Readonly<{
  maxRooms: number;
  idleMs: number;
  sweepIntervalMs?: number;
  now?: () => number;
  schedule?: (delayMs: number, callback: () => void) => () => void;
  sessions?: LocusSessionOptions;
}>;

type ManagedTowlRuntime = TowlRuntime & Readonly<{ activity: TowlRuntime["host"]["activity"] }>;

export function create_towl_authority_application(
  lifecycle?: TowlAuthorityLifecycleOptions,
): TowlAuthorityApplication {
  const store = create_application_locus_store();
  if (lifecycle !== undefined) {
    const boundedIds = new Set<string>();
    let idleSweep: ApplicationIdleSweep | undefined;
    const registry = create_livehost_locus_registry<ManagedTowlRuntime>({
      maxLoci: lifecycle.maxRooms,
      idleMs: lifecycle.idleMs,
      automaticSweep: false,
      create(hostId) {
        if (towl_room_id_from_host_id(hostId) === undefined) {
          throw new Error("Unknown TOWL room authority.");
        }
        const runtime = create_towl_runtime({
          logicalMapId: hostId,
          ...(lifecycle.sessions === undefined ? {} : { sessions: lifecycle.sessions }),
        });
        boundedIds.add(hostId);
        const managed = Object.freeze({ ...runtime, activity: runtime.host.activity });
        idleSweep?.track(hostId, managed.activity);
        return managed;
      },
      dispose(runtime) {
        const hostId = runtime.host.stream.logicalMapId;
        boundedIds.delete(hostId);
        idleSweep?.remove(hostId);
        runtime.dispose();
      },
    });
    idleSweep = create_application_idle_sweep({
      idleMs: lifecycle.idleMs,
      ...(lifecycle.sweepIntervalMs === undefined ? {} : { sweepIntervalMs: lifecycle.sweepIntervalMs }),
      ...(lifecycle.now === undefined ? {} : { now: lifecycle.now }),
      ...(lifecycle.schedule === undefined ? {} : { schedule: lifecycle.schedule }),
      evict: (hostId) => registry.evict(hostId),
    });
    let disposed = false;
    const application = {
      store,

      roomCount: () => boundedIds.size,

      hasRoom: (hostId: string) => registry.has(hostId),

      connect(
        _hostId: string,
        _socket: LocusSocketLike,
        _context?: LocusConnectionContext,
      ): ReturnType<ApplicationLocusStore["connect"]> {
        return {
          ok: false,
          error: {
            code: "TOWL_BOUNDED_ACQUISITION_REQUIRED",
            message:
              "Bounded TOWL authorities require asynchronous acquisition.",
          },
        };
      },

      async connectBounded(
        hostId: string,
        socket: LocusSocketLike,
        context?: LocusConnectionContext,
      ): Promise<LocusResult<() => void>> {
        if (
          disposed ||
          towl_room_id_from_host_id(hostId) === undefined
        ) {
          return {
            ok: false,
            error: {
              code: "LOCUS_STORE_UNKNOWN_ID",
              message: "Unknown TOWL room authority.",
            },
          };
        }
        const acquired = await registry.acquire(hostId);
        if (!acquired.ok) {
          return acquired;
        }
        idleSweep?.beginAcquisition(hostId);
        try {
          const connection =
            acquired.value.locus.host.connect(
              socket,
              context,
            );

          return {
            ok: true,
            value: connection,
          };
        } finally {
          acquired.value.release();
          idleSweep?.endAcquisition(hostId);
        }
      },
      disposeRoom: (_hostId: string) => false,
      evictRoom: (hostId: string) =>
        registry.evict(hostId),
      async sweep(): Promise<number> {
        return idleSweep?.sweep() ?? 0;
      },
      async dispose(): Promise<void> {
        if (disposed) {
          return;
        }

        disposed = true;
        idleSweep?.dispose();
        await registry.dispose();
      },
    } satisfies TowlAuthorityApplication;

    return Object.freeze(application);
  }
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
    hasRoom: (hostId) => rooms.has(hostId),
    connect(hostId, socket, context) {
      ensure_room(hostId);
      return store.connect(hostId, socket, context);
    },
    async connectBounded(hostId, socket, context) {
      return store.connect(hostId, socket, context);
    },
    disposeRoom: dispose_room,
    async evictRoom(hostId) {
      return dispose_room(hostId)
        ? { status: "evicted" }
        : { status: "not-found" };
    },
    sweep: async () => 0,
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const hostId of [...rooms.keys()]) dispose_room(hostId);
    },
  });
}
