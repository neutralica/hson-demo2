import type { LiveHostConnectionContext, LiveHostSocketLike, LiveHostStore } from "hson-live/types";
import { towl_room_id_from_host_id } from "../app/demos/towl";
import type { HostedTestApplication } from "./hosted-test-application";
import type { TowlAuthorityApplication } from "./towl-authority-application";

export type LiveHostAuthorityConnector = Readonly<{
  connect(
    hostId: string,
    socket: LiveHostSocketLike,
    context?: LiveHostConnectionContext,
  ): ReturnType<LiveHostStore["connect"]>;
  dispose(): void;
}>;

export function compose_worker_authority_application(
  hostedTests: HostedTestApplication,
  towl: TowlAuthorityApplication,
): LiveHostAuthorityConnector {
  let disposed = false;
  return Object.freeze({
    connect(hostId, socket, context) {
      return towl_room_id_from_host_id(hostId) === undefined
        ? hostedTests.connect(hostId, socket, context)
        : towl.connect(hostId, socket, context);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      hostedTests.dispose();
      towl.dispose();
    },
  });
}
