import type { LiveHostConnectionContext, LiveHostSocketLike, LiveHostStore } from "hson-live/types";
import { towl_room_id_from_host_id } from "../../../src/app/demos/towl/index";
import type { HostedTestApplication } from "./hosted-test-application";
import type { TowlAuthorityApplication } from "./towl-authority-application";

export type LiveHostAuthorityConnector = Readonly<{
  connectBounded(
    hostId: string,
    socket: LiveHostSocketLike,
    context?: LiveHostConnectionContext,
  ): Promise<ReturnType<LiveHostStore["connect"]>>;
  dispose(): void | Promise<void>;
}>;

export function compose_worker_authority_application(
  hostedTests: HostedTestApplication,
  towl: TowlAuthorityApplication,
): LiveHostAuthorityConnector {
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
