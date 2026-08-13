import type { TestSuite } from "../../harness/core/test-contracts";
import { towl_client_suite } from "./towl-client-suite";
import { towl_connection_suite } from "./towl-connection-suite";
import { towl_runtime_suite } from "./towl-runtime-suite";
import { towl_room_suite } from "./towl-room-suite";
import { towl_state_suite } from "./towl-state-suite";
import { towl_transition_suite } from "./towl-transition-suite";



export function all_towl_suites(): readonly TestSuite[] {
  return [
    towl_state_suite(),
    towl_transition_suite(),
    towl_runtime_suite(),
    towl_client_suite(),
    towl_connection_suite(),
    towl_room_suite(),

  ] as const;
}
