
import { suite_find, suite_attrs_and_flags, suite_append_and_create, mixedRegression, extraCases, suite_css_and_content, suite_recent_regressions } from "./livetree-fixtures-01";
import { legacy_suites_3 } from "./livetree-fixtures-02";
import { suite_schedules_events, css_manager_lifecycle, node_lifecycle } from "./livetree-fixtures-03";
import { document_question, error_handling, listeners_teardown, root_multi_isolation } from "./livetree-fixtures-04";
import { livetree_completionist, livetree_sync_perf, roundtrip_projection_stability } from "./livetree-fixtures-05";
import { livetree_svg_basic } from "./livetree-fixtures-09-svg";
import { livetree_svg_ingermediate } from "./livetree-fixtures-10-svg-2";
import { livetree_gnarly_svg } from "./livetree-fixtures-11-svg-3";
import { livetree_create_size, livetree_css_pseudo, livetree_recent_api } from "./livetree-fixtures-06";
import { livetree_new_dom_doc } from "./livetree-fixtures-08-dom";
import type { TestSuite } from "../tests.types";
import { livetree_more_listeners } from "./livetree-fixtures-07";
import { livetree_svg_lvl2 } from "./livetree-fixtures-12-svg-new";
import { livetree_new_form_api } from "./livetree-fixtures-13-form";
import { livetree_canvas, livetree_canvas_stress } from "./livetree-fixtures-14-canvas";
import { livetree_canvas_display } from "./livetree-fixtures-15-canvas-size";


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
    livetree_canvas(),
    livetree_canvas_stress(),
livetree_canvas_display(),


  ] as const;
}
