// all-livehost-suites.ts

import type { TestSuite } from "../../app/demos/test/tests.types";
import { livehost_core_suite } from "./core-suite";
import { livehost_protocol_suite } from "./protocol-suite";
import { livehost_socket_suite } from "./socket-suite";

export function all_livehost_suites(): readonly TestSuite[] {
    return [
      livehost_protocol_suite(),
      livehost_core_suite(),
livehost_socket_suite(),

  ] as const;
}