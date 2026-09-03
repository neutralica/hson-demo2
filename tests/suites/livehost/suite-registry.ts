// all-livehost-suites.ts

import type { TestDescriptorMetadata } from "../../../src/shared/testing/test-contracts";
import type { TestSuite } from "../../harness/core/test-contracts";
import { locus_api_suite } from "./api-suite";
import { locus_client_suite } from "./client-suite";
import { locus_core_suite } from "./core-suite";
import { locus_host_disposal_suite } from "./host-disposal-suite";
import { locus_pair_suite } from "./pair-suite";
import { locus_protocol_suite } from "./protocol-suite";
import { locus_socket_suite } from "./socket-suite";
import { locus_session_lifecycle_suite } from "./session-lifecycle-suite";
import { locus_store_suite } from "./store-suite";
import { locus_sync_suite } from "./sync-suite";

export function all_locus_suites(): readonly TestSuite[] {
  const metadata: TestDescriptorMetadata = Object.freeze({
    subject: "livehost",
    requirements: Object.freeze(["javascript"] as const),
  });
  return [
    locus_protocol_suite(),
    locus_core_suite(),
    locus_socket_suite(),
    locus_session_lifecycle_suite(),
    locus_host_disposal_suite(),
    locus_sync_suite(),
    locus_client_suite(),
    locus_pair_suite(),
    locus_store_suite(),
    locus_api_suite(),
  ].map((suite) => Object.freeze({ ...suite, descriptor: metadata }));
}
