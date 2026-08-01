import type { TestSuite } from "../app/demos/test/tests.types";
import { all_canonical_portable_test_suites } from "./canonical-portable-test-suites";

/** Canonical, deterministic, non-overlapping list used by the node/all host runner. */
export function all_node_safe_hosted_test_suites(): readonly TestSuite[] {
  return all_canonical_portable_test_suites();
}
