import type { TestSuite } from "../tests.types";
import { suite_find, suite_attrs_and_flags, suite_append_and_create, mixedRegression, extraCases, suite_css_and_content, suite_recent_regressions } from "./livetree-fixtures-1";
import { legacy_suites_3 } from "./livetree-fixtures-2";
import { suite_schedules_events, css_manager_lifecycle, node_lifecycle } from "./livetree-fixtures-3";
import { document_question, error_handling, listeners_teardown, root_multi_isolation } from "./livetree-fixtures-4";


export function all_livetree_suites(): readonly TestSuite[] {
  return [
    suite_find(),
    suite_attrs_and_flags(),
    suite_append_and_create(),
    mixedRegression(),
    ...extraCases(),
    suite_css_and_content(),
    ...suite_recent_regressions(),
    ...legacy_suites_3(),
    suite_schedules_events(),
    css_manager_lifecycle(),
    node_lifecycle(),
    listeners_teardown(),
    root_multi_isolation(),
    document_question(),
    error_handling(),
    
  ] as const;
}
