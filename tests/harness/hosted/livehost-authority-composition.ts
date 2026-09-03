import type { LocusConnectionContext, LocusSocketLike } from "hson-live/types";
import type { ApplicationLocusStore } from "./application-locus-store";
import { towl_room_id_from_host_id } from "../../../src/app/demos/towl/index";
import type { TowlAuthorityApplication } from "./towl-authority-application";

export type LocusAuthorityConnector = Readonly<{
  connectBounded(
    hostId: string,
    socket: LocusSocketLike,
    context?: LocusConnectionContext,
  ): Promise<ReturnType<ApplicationLocusStore["connect"]>>;
  dispose(): void | Promise<void>;
}>;

export function compose_worker_authority_application(
  hostedTests: LocusAuthorityConnector,
  towl: TowlAuthorityApplication,
): LocusAuthorityConnector {
  let disposed = false;
  return Object.freeze({
    connectBounded(hostId, socket, context) {
      return towl_room_id_from_host_id(hostId) === undefined
        ? hostedTests.connectBounded(hostId, socket, context)
        : Promise.resolve(towl.connect(hostId, socket, context));
    },
    async dispose() {
      if (disposed) return;
      disposed = true;
      await Promise.all([hostedTests.dispose(), towl.dispose()]);
    },
  });
}
