import type { LiveHostSocketLike, LiveHostStore } from "hson-live/types";
import { towl_room_id_from_host_id } from "../app/demos/towl";
import type { HostedTestApplication } from "./hosted-test-application";
import type { TowlAuthorityApplication } from "./towl-authority-application";

export type LiveHostAuthorityConnector = Readonly<{
  connect(hostId: string, socket: LiveHostSocketLike): ReturnType<LiveHostStore["connect"]>;
  dispose(): void;
}>;

export function compose_worker_authority_application(
  hostedTests: HostedTestApplication,
  towl: TowlAuthorityApplication,
): LiveHostAuthorityConnector {
  let disposed = false;
  return Object.freeze({
    connect(hostId, socket) {
      return towl_room_id_from_host_id(hostId) === undefined
        ? hostedTests.connect(hostId, socket)
        : towl.connect(hostId, socket);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      hostedTests.dispose();
      towl.dispose();
    },
  });
}
