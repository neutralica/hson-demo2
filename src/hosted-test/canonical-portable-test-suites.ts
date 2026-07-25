import type {
  TestCollection,
  TestDescriptorMetadata,
  TestSubject,
  TestSuite,
} from "../app/demos/test/tests.types";
import { all_livehost_suites } from "../tests/livehost-tests/all-livehost-suites";
import { livemap_suites_core } from "../tests/livemap-tests/core-suite";
import { livemap_suite_editor } from "../tests/livemap-tests/editor-suite";
import { livemap_suite_feed } from "../tests/livemap-tests/feed-suite";
import { livemap_suites_handle } from "../tests/livemap-tests/handle-suite";
import { livemap_suites_link } from "../tests/livemap-tests/link-suite";
import { livemap_suites_path } from "../tests/livemap-tests/path-suite";
import { livemap_suites_guard } from "../tests/livemap-tests/guard-suite";
import { livemap_suites_handle_2 } from "../tests/livemap-tests/handle-suite-2";
import { livemap_suites_proxy } from "../tests/livemap-tests/proxy-suite";
import { livemap_suites_schema } from "../tests/livemap-tests/schema-suite";
import { livemap_suites_api } from "../tests/livemap-tests/api-suite";
import { livemap_suites_store } from "../tests/livemap-tests/store-suite";
import { livemap_suite_batch } from "../tests/livemap-tests/batch-suite";
import {
  livemap_editor_contract,
  livemap_object_exact,
  livemap_schema_contract_suite,
} from "../tests/livemap-tests/editor-contract-tests";
import { livemap_link_contract_suites } from "../tests/livemap-tests/link-contract-suite";
import { livemap_suites_bridge } from "../tests/livemap-tests/bridge-suite";
import { livemap_misc_suite } from "../tests/livemap-tests/misc-suite";
import { livemap_suites_quid } from "../tests/livemap-tests/quid-suite";
import { livemap_error_handling } from "../tests/livemap-tests/error-handling-suite";
import { livemap_suite_rev } from "../tests/livemap-tests/rev-suite";
import { livemap_suite_replay } from "../tests/livemap-tests/replay-suite";
import { all_unit_tests } from "../tests/unit/all-unit-tests";

const DEV_SUITES = new Set(["livemap/rev"]);

function metadata(
  subject: TestSubject,
  collections: readonly TestCollection[] = Object.freeze([]),
): TestDescriptorMetadata {
  return Object.freeze({
    subject,
    requirements: Object.freeze(["javascript"] as const),
    collections: Object.freeze([...collections]),
  });
}

function annotate(suite: TestSuite): TestSuite {
  if (suite.suite.startsWith("livehost/")) {
    return Object.freeze({ ...suite, descriptor: metadata("livehost") });
  }
  if (suite.suite.startsWith("livemap/")) {
    return Object.freeze({
      ...suite,
      descriptor: metadata("livemap", DEV_SUITES.has(suite.suite) ? Object.freeze(["dev"] as const) : undefined),
    });
  }
  if (suite.suite.startsWith("unit/")) {
    return Object.freeze({ ...suite, descriptor: metadata("livetree", Object.freeze(["unit"] as const)) });
  }
  throw new Error(`Missing canonical portable-suite metadata mapping: ${suite.suite}`);
}

/**
 * Suites already proven deterministic without DOM, filesystem, WebSocket-server,
 * or other runtime-specific globals. Original TestCase objects remain intact.
 */
export function all_canonical_portable_test_suites(): readonly TestSuite[] {
  const suites = [
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
  ];
  return Object.freeze(suites.map(annotate));
}
