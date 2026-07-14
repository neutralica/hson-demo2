import type { TestSuite } from "../app/demos/test/tests.types";
import { livemap_suites_core } from "../tests/livemap/core-suite";
import { livemap_suite_editor } from "../tests/livemap/editor-suite";
import { livemap_suite_feed } from "../tests/livemap/feed-suite";
import { livemap_suites_handle } from "../tests/livemap/handle-suite";
import { livemap_suites_link } from "../tests/livemap/link-suite";
import { livemap_suites_path } from "../tests/livemap/path-suite";
import { livemap_suites_guard } from "../tests/livemap/guard-suite";
import { livemap_suites_handle_2 } from "../tests/livemap/handle-suite-2";
import { livemap_suites_proxy } from "../tests/livemap/proxy-suite";
import { livemap_suites_schema } from "../tests/livemap/schema-suite";
import { livemap_suites_api } from "../tests/livemap/api-suite";
import { livemap_suites_store } from "../tests/livemap/store-suite";
import { livemap_suite_batch } from "../tests/livemap/batch-suite";
import {
  livemap_editor_contract,
  livemap_object_exact,
  livemap_schema_contract_suite,
} from "../tests/livemap/editor-contract-tests";
import { livemap_link_contract_suites } from "../tests/livemap/link-contract-suite";
import { livemap_suites_bridge } from "../tests/livemap/bridge-suite";
import { livemap_misc_suite } from "../tests/livemap/misc-suite";
import { livemap_suites_quid } from "../tests/livemap/quid-suite";
import { livemap_error_handling } from "../tests/livemap/error-handling-suite";
import { livemap_suite_rev } from "../tests/livemap/rev-suite";
import { livemap_suite_replay } from "../tests/livemap/replay-suite";
import { all_livehost_suites } from "../tests/livehost/all-livehost-suites";
import { all_unit_tests } from "../tests/unit/all-unit-tests";

/** Canonical, deterministic, non-overlapping list used by the node/all host runner. */
export function all_node_safe_hosted_test_suites(): readonly TestSuite[] {
  return [
    livemap_suite_editor(),
    livemap_suites_core(),
    livemap_suite_feed(),
    livemap_suites_path(),
    livemap_suites_link(),
    livemap_suites_handle(),
    livemap_suites_guard(),
    livemap_suites_handle_2(),
    livemap_suites_proxy(),
    livemap_suites_schema(),
    livemap_suites_api(),
    livemap_suites_store(),
    livemap_suite_batch(),
    livemap_editor_contract(),
    livemap_schema_contract_suite(),
    livemap_object_exact(),
    livemap_link_contract_suites(),
    livemap_suites_bridge(),
    livemap_misc_suite(),
    livemap_suites_quid(),
    livemap_error_handling(),
    livemap_suite_rev(),
    livemap_suite_replay(),
    ...all_livehost_suites(),
    ...all_unit_tests(),
  ] as const;
}
