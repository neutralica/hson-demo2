// all-livehost-suites.ts

import type { TestSuite } from "../../app/demos/test/tests.types";
import { livehost_api_suite } from "./api-suite";
import { livehost_client_suite } from "./client-suite";
import { livehost_core_suite } from "./core-suite";
import { livehost_host_disposal_suite } from "./host-disposal-suite";
import { livehost_pair_suite } from "./pair-suite";
import { livehost_protocol_suite } from "./protocol-suite";
import { livehost_resume_suite } from "./resume-suite";
import { livehost_socket_suite } from "./socket-suite";
import { livehost_session_lifecycle_suite } from "./session-lifecycle-suite";
import { livehost_store_suite } from "./store-suite";
import { livehost_sync_suite } from "./sync-suite";

export function all_livehost_suites(): readonly TestSuite[] {
  return [
    livehost_protocol_suite(),
    livehost_core_suite(),
    livehost_socket_suite(),
    livehost_session_lifecycle_suite(),
    livehost_host_disposal_suite(),
    livehost_sync_suite(),
    livehost_client_suite(),
    livehost_pair_suite(),
    livehost_resume_suite(),
    livehost_store_suite(),
    livehost_api_suite(),    

    
  ] as const;
}
