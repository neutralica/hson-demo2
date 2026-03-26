
import { suite_find, suite_attrs_and_flags, suite_append_and_create, mixedRegression, extraCases, suite_css_and_content, suite_recent_regressions } from "./livetree-fixtures-1";
import { legacy_suites_3 } from "./livetree-fixtures-2";
import { suite_schedules_events, css_manager_lifecycle, node_lifecycle } from "./livetree-fixtures-3";
import { document_question, error_handling, listeners_teardown, root_multi_isolation } from "./livetree-fixtures-4";
import { livetree_completionist, livetree_sync_perf, roundtrip_projection_stability } from "./livetree-fixtures-5";
import { livetree_svg_basic } from "./livetree-fixtures-svg-1";
import { livetree_svg_ingermediate } from "./livetree-fixtures-svg-2";





/******************************************************
 **  TEMPLATE FOR NEW FIXTURE OBJECTS - DO NOT EDIT  **
 ******************************************************/

 import type { LiveTreeCaseSpec, TestSuite } from "../tests.types";
import { make_livetree_suite } from "./livetree-testkit";
import { livetree_gnarly_svg } from "./livetree-fixtures-svg-3";

export function TEMPLATE_SUITE_OBJECT_RETURN(): TestSuite {
  const SUITE = "[CHANGE THIS FIELD AND CHANGE FUNCTION NAME]";
  const cases: readonly LiveTreeCaseSpec[] =
    [
            /* [fixtures] */
    ];

  return make_livetree_suite(SUITE, cases);
}



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
    roundtrip_projection_stability(),
    livetree_sync_perf(),
    livetree_completionist(),
    livetree_svg_basic(),
    livetree_svg_ingermediate(),
    livetree_gnarly_svg(),

  ] as const;
}
