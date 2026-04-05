import type { TestCase } from "../tests.types";
import { unit_test_css, unit_test_pseudo_els } from "./livetree-unit-tests-1";

export const all_unit_tests = () => [unit_test_css(), unit_test_pseudo_els()];

export function make_case(
    suite: string,
    name: string,
    run: () => void | Promise<void>): TestCase {
    return {
        suite,
        name,
        run,
    };
}
