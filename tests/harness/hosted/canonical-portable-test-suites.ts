import type { TestCollection, TestDescriptorMetadata, TestSubject } from "../../../src/shared/testing/test-contracts";
import type { TestSuite } from "../core/test-contracts";
import { all_locus_suites } from "../../suites/livehost/suite-registry";
import { livemap_suites_core } from "../../suites/livemap/core-suite";
import { livemap_suite_editor } from "../../suites/livemap/editor-suite";
import { livemap_suite_feed } from "../../suites/livemap/feed-suite";
import { livemap_suites_handle } from "../../suites/livemap/handle-suite";
import { livemap_suites_link } from "../../suites/livemap/link-suite";
import { livemap_suites_path } from "../../suites/livemap/path-suite";
import { livemap_suites_guard } from "../../suites/livemap/guard-suite";
import { livemap_suites_handle_2 } from "../../suites/livemap/handle-suite-2";
import { livemap_suites_proxy } from "../../suites/livemap/proxy-suite";
import { livemap_suites_api } from "../../suites/livemap/api-suite";
import { livemap_suites_store } from "../../suites/livemap/store-suite";
import { livemap_suite_batch } from "../../suites/livemap/batch-suite";
import {
  livemap_editor_contract,
} from "../../suites/livemap/editor-contract-tests";
import { livemap_link_contract_suites } from "../../suites/livemap/link-contract-suite";
import { livemap_suites_bridge } from "../../suites/livemap/bridge-suite";
import { livemap_misc_suite } from "../../suites/livemap/misc-suite";
import { livemap_error_handling } from "../../suites/livemap/error-handling-suite";
import { livemap_suite_rev } from "../../suites/livemap/rev-suite";
import { livemap_suite_replay } from "../../suites/livemap/replay-suite";
import { all_unit_tests } from "../../suites/unit/suite-registry";
import { all_towl_suites } from "../../suites/towl/suite-registry";
import {
  livemap_projected_ingress_rejection_suite,
  livemap_projected_ingress_suite,
} from "../../suites/livemap/projected-ingress-suite";
import { livemap_projected_equality_suite } from "../../suites/livemap/projected-equality-suite";
import { livemap_ordered_object_array_helpers_suite } from "../../suites/livemap/ordered-object-array-helpers-suite";
import { livemap_equivalence_mutation_matrix_suite } from "../../suites/livemap/equivalence-mutation-matrix-suite";
import { livemap_equivalence_transport_propagation_suite } from "../../suites/livemap/equivalence-transport-propagation-suite";
import { livemap_equivalence_rejection_isolation_suite } from "../../suites/livemap/equivalence-rejection-isolation-suite";
import { parsing_verification_coordinator_suite } from "../../suites/transform/parsing-verification-coordinator-suite";

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
  if (suite.suite.startsWith("unit/livedemo-shell-") || suite.suite.startsWith("unit/towl-")) {
    return Object.freeze({
      ...suite,
      descriptor: metadata("livedemo", Object.freeze(["unit"] as const)),
    });
  }
  if (suite.suite.startsWith("unit/")) {
    return Object.freeze({ ...suite, descriptor: metadata("livetree", Object.freeze(["unit"] as const)) });
  }
  if (suite.suite.startsWith("transform/")) {
    return Object.freeze({ ...suite, descriptor: metadata("transform") });
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
    livemap_suites_api(),
    livemap_suites_store(),
    livemap_suite_batch(),
    livemap_editor_contract(),
    livemap_link_contract_suites(),
    livemap_suites_bridge(),
    livemap_misc_suite(),
    livemap_error_handling(),
    livemap_suite_rev(),
    livemap_suite_replay(),
    livemap_projected_ingress_suite(),
    livemap_projected_ingress_rejection_suite(),
    livemap_projected_equality_suite(),
    livemap_ordered_object_array_helpers_suite(),
    livemap_equivalence_mutation_matrix_suite(),
    livemap_equivalence_transport_propagation_suite(),
    livemap_equivalence_rejection_isolation_suite(),
    parsing_verification_coordinator_suite(),
    ...all_locus_suites(),
    ...all_towl_suites(),
    ...all_unit_tests(),
  ];
  return Object.freeze(suites.map(annotate));
}
