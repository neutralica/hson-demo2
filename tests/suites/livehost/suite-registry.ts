// all-livehost-suites.ts

import type { TestDescriptorMetadata } from "../../../src/shared/testing/test-contracts";
import type { TestSuite } from "../../harness/core/test-contracts";
import { livehost_api_suite } from "./api-suite";
import { livehost_client_suite } from "./client-suite";
import { livehost_core_suite } from "./core-suite";
import { livehost_host_disposal_suite } from "./host-disposal-suite";
import { livehost_pair_suite } from "./pair-suite";
import { livehost_protocol_suite } from "./protocol-suite";
import { livehost_socket_suite } from "./socket-suite";
import { livehost_session_lifecycle_suite } from "./session-lifecycle-suite";
import { livehost_store_suite } from "./store-suite";
import { livehost_sync_suite } from "./sync-suite";
import { all_phase3b_cancellation_suites } from "./phase3b-cancellation-suite";

export function all_livehost_suites(): readonly TestSuite[] {
  const metadata: TestDescriptorMetadata = Object.freeze({
    subject: "livehost",
    requirements: Object.freeze(["javascript"] as const),
  });
  return [
    livehost_protocol_suite(),
    livehost_core_suite(),
    livehost_socket_suite(),
    livehost_session_lifecycle_suite(),
    livehost_host_disposal_suite(),
    livehost_sync_suite(),
    livehost_client_suite(),
    livehost_pair_suite(),
    livehost_store_suite(),
    livehost_api_suite(),    
    ...all_phase3b_cancellation_suites(),

    
  ].map((suite) => Object.freeze({ ...suite, descriptor: metadata }));
}
