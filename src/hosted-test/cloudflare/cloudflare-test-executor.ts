import type { TestExecutorDescriptor, TestExecutorRegistry } from "../../test-system/test-executor";
import { make_test_executor_registry } from "../../test-system/test-executor";
import { all_canonical_portable_test_suites } from "../canonical-portable-test-suites";

export const CLOUDFLARE_LIVEHOST_EXECUTOR = Object.freeze({
  id: "cloudflare-livehost",
  kind: "cloudflare-worker",
  label: "Cloudflare LiveHost",
  location: "hosted",
  capabilities: Object.freeze({
    provides: Object.freeze(["javascript"] as const),
  }),
  supportsStreaming: true,
  supportsCancellation: false,
}) satisfies TestExecutorDescriptor;

export function make_cloudflare_livehost_executor_registry(): TestExecutorRegistry {
  return make_test_executor_registry(CLOUDFLARE_LIVEHOST_EXECUTOR, all_canonical_portable_test_suites());
}
