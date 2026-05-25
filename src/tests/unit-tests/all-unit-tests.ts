import { unit_test_css, unit_test_css_manager, unit_test_internals, unit_test_internals_2 } from "./unit-tests-1";


export const all_unit_tests = () => [
    unit_test_css(),
    unit_test_internals(),
    unit_test_internals_2(),
    unit_test_css_manager(),
    unit_test_more_css(),
    unit_test_parser_helpers(),
    

];


 export const cleanup_quid = (m: CssManager, quid: string): void => {
    m.clearQuid(quid);
    m.clearPseudoAllForQuid(quid);
 };
  

export function make_unit_case(
    suite: string,
    name: string,
    run: () => void | Promise<void>): TestCase {
    return {
        suite,
        name,
        run,
    };
}

/**
 * UNIT TEST TEMPLATE - copy & change: 
 **/


import type { TestCase, TestSuite } from "../../app/phases/phase-3-demo/demo-test/tests.types";
import type { CssManager } from "hson-live";
import { unit_test_more_css, unit_test_parser_helpers } from "./unit-tests-2";

export function UNIT_TEST_TEMPLATE(): TestSuite {
  const SUITE = "[INSERT NAME]";

  const cases: readonly TestCase[] = [
  /* suites */

  ]

  return { suite: SUITE, cases };
}


/* ************************************ */


