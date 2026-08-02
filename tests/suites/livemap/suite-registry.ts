// all-livemap-suites.ts

import type { HsonNode, JsonValue, LivePath } from "hson-live/types";
import type { Asserter, TestSuite } from "../../harness/core/test-contracts";
import { livemap_suites_core } from "./core-suite";
import { livemap_suite_editor } from "./editor-suite";
import { livemap_suite_feed } from "./feed-suite";
import { livemap_suites_handle } from "./handle-suite";
import { livemap_suites_link } from "./link-suite";
import { livemap_suites_node } from "./node-suite";
import { livemap_suites_path } from "./path-suite";
import { livemap_suites_guard } from "./guard-suite";
import { livemap_suites_handle_2 } from "./handle-suite-2";
import { livemap_suites_proxy } from "./proxy-suite";
import { livemap_suites_schema } from "./schema-suite";
import { livemap_suites_api } from "./api-suite";
import { livemap_suites_store } from "./store-suite";
import { livemap_suite_batch } from "./batch-suite";
import { livemap_editor_contract, livemap_object_exact } from "./editor-contract-tests";
import { livemap_schema_contract_suite } from "./editor-contract-tests";
import { livemap_link_contract_suites } from "./link-contract-suite";
import { snap_live_path } from "hson-live/livemap";
import { livemap_suite_html_proof } from "./html-livemap-suite";
import { livemap_suites_bridge } from "./bridge-suite";
import { livemap_suites_bridge_livetree } from "./bridge-livetree-suite";
import { livemap_suites_bridge_livetree_controls } from "./bridge-livetree-2";
import { livemap_suites_schema_controls } from "./generated-control-suite";
import { livemap_suites_schema_validation_controls } from "./schema-control-suite-2";
import { livemap_misc_suite } from "./misc-suite";
import { livemap_path_handle_suite } from "./path-handle-suite";
import { livemap_bind_suite } from "./bind-suite";
import { livemap_error_handling } from "./error-handling-suite";
import { livemap_suite_rev } from "./rev-suite";
import { livemap_suite_replay } from "./replay-suite";
import { livemap_document_foundation_suite } from "./document-foundation-suite";
import {
  livemap_projected_ingress_rejection_suite,
  livemap_projected_ingress_suite,
} from "./projected-ingress-suite";
import { livemap_projected_equality_suite } from "./projected-equality-suite";
import { livemap_carrier_mutation_planning_suite } from "./carrier-mutation-planning-suite";
import { livemap_exact_transport_suite } from "./exact-transport-suite";
import { livemap_exact_transport_rejection_suite } from "./exact-transport-rejection-suite";
import { livemap_exact_propagation_suite } from "./exact-propagation-suite";
import { livemap_schema_value_boundary_suite } from "./schema-value-boundary-suite";
import { livemap_ordered_object_array_helpers_suite } from "./ordered-object-array-helpers-suite";


export type LiveMapCaseContext = Readonly<{
  input: JsonValue;
  root: HsonNode;
  snap: (path: LivePath) => JsonValue | undefined;
}>;

export type LiveMapCaseExpected = "ok" | "fail";

export type LiveMapExpectedError = Readonly<{
  message?: string;
  includes?: string;
}>;

export type LiveMapCaseSpec = Readonly<{
  suite: string;
  name: string;

  input: JsonValue;

  expected?: LiveMapCaseExpected;
  expectedError?: LiveMapExpectedError;

  fixture?: string;
  sub?: string;

  act?: (ctx: LiveMapCaseContext) => void | Promise<void>;
  assert: (ctx: LiveMapCaseContext, t: Asserter) => void | Promise<void>;

  preview?: (ctx: LiveMapCaseContext) => string;
}>;

export { json_root_node } from "./json-root-node";

export function make_livemap_case_context(input: JsonValue, root: HsonNode): LiveMapCaseContext {
  return {
    input,
    root,
    snap: (path) => snap_live_path(root, path),
  };
}

export function preview_livemap_case(ctx: LiveMapCaseContext): string {
  return JSON.stringify(ctx.snap([]), null, 2);
}
export function all_livemap_suites(): readonly TestSuite[] {
  return [
    livemap_suite_editor(),
    livemap_suites_core(),
    livemap_suite_feed(),
    livemap_suites_path(),
    livemap_suites_link(),
    livemap_suites_handle(),
    livemap_suites_node(),
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
    livemap_suites_bridge_livetree(),
    livemap_suites_bridge_livetree_controls(),
    livemap_suites_schema_controls(),
    livemap_suites_schema_validation_controls(),
    livemap_misc_suite(),
    livemap_path_handle_suite(),
    livemap_bind_suite(),
    livemap_error_handling(),
    livemap_suite_rev(),
    livemap_suite_replay(),
    livemap_document_foundation_suite(),
    livemap_projected_ingress_suite(),
    livemap_projected_ingress_rejection_suite(),
    livemap_projected_equality_suite(),
    livemap_carrier_mutation_planning_suite(),
    livemap_exact_transport_suite(),
    livemap_exact_transport_rejection_suite(),
    livemap_exact_propagation_suite(),
    livemap_schema_value_boundary_suite(),
    livemap_ordered_object_array_helpers_suite(),

    
    // livemap_suite_html_proof(), // non-supported currently

  ] as const;
}
