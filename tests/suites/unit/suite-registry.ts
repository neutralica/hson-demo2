import { unit_test_harness } from "./test-harness-tests";
import { live_demo_shell_state_suite } from "./live-demo-shell-state";
import { live_demo_shell_lifecycle_suite } from "./live-demo-shell-lifecycle";
import { live_demo_small_state_suite } from "./live-demo-small-state";
import { cellsheet_evaluator_suite, cellsheet_relations_suite } from "./cellsheet-evaluator";
import { cellsheet_state_suite } from "./cellsheet-state";
import { frozen_test_evidence_client_suite } from "./frozen-test-evidence-client";
import type { TestCase, TestSuite } from "../../harness/core/test-contracts";

export const all_unit_tests = () => [
    unit_test_harness(),
    live_demo_shell_state_suite(),
    live_demo_shell_lifecycle_suite(),
    live_demo_small_state_suite(),
    cellsheet_evaluator_suite(),
    cellsheet_relations_suite(),
    cellsheet_state_suite(),
    frozen_test_evidence_client_suite(),

];



export function make_unit_case(
    suite: string,
    caseId: string,
    name: string,
    run: () => void | Promise<void>): TestCase {
    return {
        suite,
        caseId,
        name,
        run,
    };
}

/**
 * UNIT TEST TEMPLATE - copy & change: 
 **/



// import type { TestCase, TestSuite } from "../../app/phases/phase-3-demo/demo-test/tests.types";
// import type { CssManager } from "hson-live";


// export function UNIT_TEST_TEMPLATE(): TestSuite {
//     const SUITE = "[INSERT NAME]";

//     const cases: readonly TestCase[] = [
//         /* suites */

//     ]

//     return { suite: SUITE, cases };
// }


/* ************************************ */
