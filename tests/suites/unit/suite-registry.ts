import { unit_test_css, unit_test_css_manager, unit_test_internals, unit_test_internals_2 } from "./unit-tests-1";
import { unit_css_pseudo_unification, unit_media, unit_test_more_css, unit_test_parser_helpers } from "./unit-tests-2";
import { unit_test_harness } from "./test-harness-tests";
import { live_demo_shell_state_suite } from "./live-demo-shell-state";
import { live_demo_shell_lifecycle_suite } from "./live-demo-shell-lifecycle";
import { live_demo_small_state_suite } from "./live-demo-small-state";
import { cellsheet_evaluator_suite, cellsheet_relations_suite } from "./cellsheet-evaluator";
import { cellsheet_state_suite } from "./cellsheet-state";
import type { TestCase, TestSuite } from "../../harness/core/test-contracts";
import type { CssManager } from "hson-live/livetree";

export const all_unit_tests = () => [
    unit_test_css(),
    unit_test_internals(),
    unit_test_internals_2(),
    unit_test_css_manager(),
    unit_test_more_css(),
    unit_test_parser_helpers(),
    unit_css_pseudo_unification(),
    unit_media(),
    unit_test_harness(),
    live_demo_shell_state_suite(),
    live_demo_shell_lifecycle_suite(),
    live_demo_small_state_suite(),
    cellsheet_evaluator_suite(),
    cellsheet_relations_suite(),
    cellsheet_state_suite(),

];


export const cleanup_quid = (m: CssManager, quid: string): void => {
    m.clearQuid(quid);
};


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
