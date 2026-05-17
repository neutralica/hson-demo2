
import { suite_find, suite_attrs_and_flags, suite_append_and_create, mixedRegression, extraCases, suite_css_and_content, suite_recent_regressions } from "./livetree-fixtures-1";
import { legacy_suites_3 } from "./livetree-fixtures-2";
import { suite_schedules_events, css_manager_lifecycle, node_lifecycle } from "./livetree-fixtures-3";
import { document_question, error_handling, listeners_teardown, root_multi_isolation } from "./livetree-fixtures-4";
import { livetree_completionist, livetree_sync_perf, roundtrip_projection_stability } from "./livetree-fixtures-5";
import { livetree_svg_basic } from "./livetree-fixtures-svg-1";
import { livetree_svg_ingermediate } from "./livetree-fixtures-svg-2";
import { livetree_gnarly_svg } from "./livetree-fixtures-svg-3";
import { livetree_create_size, livetree_css_pseudo, livetree_recent_api } from "./livetree-fixtures-6";
import { livetree_new_dom_doc } from "./livetree-fixtures-dom";
import type { TestSuite } from "../tests.types";
import { livetree_more_listeners } from "./livetree-fixtures-7";
import { livetree_svg_lvl2 } from "./livetree-new-svg";
import { livetree_new_form_api } from "./livetree-new-form";


/******************************************************
 **  TEMPLATE FOR NEW FIXTURE OBJECTS - DO NOT EDIT  **
 ******************************************************/

//  import type { LiveTreeCaseSpec, TestSuite } from "../tests.types";

// export function TEMPLATE_SUITE_OBJECT_RETURN(): TestSuite {
//   const SUITE = "[CHANGE THIS FIELD AND CHANGE FUNCTION NAME]";
//   const cases: readonly LiveTreeCaseSpec[] =
//     [
//             /* [fixtures] */
//     ];

//   return make_livetree_suite(SUITE, cases);
// }



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
    livetree_css_pseudo(),
    livetree_new_dom_doc(),
    livetree_recent_api(),
    livetree_create_size(),
    livetree_more_listeners(),
    livetree_svg_lvl2(),
livetree_new_form_api(),



  ] as const;
}
