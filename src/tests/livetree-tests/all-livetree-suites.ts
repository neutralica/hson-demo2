
import { suite_find, suite_attrs_and_flags, suite_append_and_create, mixedRegression, extraCases, suite_css_and_content, suite_recent_regressions } from "./livetree-01";
import { legacy_suites_3 } from "./livetree-02";
import { suite_schedules_events, css_manager_lifecycle, node_lifecycle } from "./livetree-03";
import { document_question, error_handling, listeners_teardown, root_multi_isolation } from "./livetree-04";
import { livetree_completionist, livetree_sync_perf, roundtrip_projection_stability } from "./livetree-05";
import { livetree_svg_basic } from "./livetree-09-svg";
import { livetree_svg_ingermediate } from "./livetree-10-svg-2";
import { livetree_gnarly_svg } from "./livetree-11-svg-3";
import { livetree_create_size, livetree_css_pseudo, livetree_recent_api } from "./livetree-06";
import { livetree_new_dom_doc } from "./livetree-08-dom";
import { livetree_more_listeners } from "./livetree-07";
import { livetree_svg_lvl2 } from "./livetree-12-svg-new";
import { livetree_new_form_api } from "./livetree-13-form";
import { livetree_canvas, livetree_canvas_stress } from "./livetree-14-canvas";
import { livetree_canvas_clear, livetree_canvas_display, livetree_canvas_plot } from "./livetree-15-canvas-size";
import { livetree_canvas_pointer, livetree_document_ownership } from "./livetree-16-canvas-3";
import { livetree_css_surfaces_new } from "./livetree-17-new-vars";
import { livetree_css_new_getters, livetree_css_refinements, livetree_find_more } from "./livetree-18-css-refinements";
import { livetree_css_pseudo_selector_unification, livetree_tree_selector_surface } from "./livetree-19-tree-selector";
import { livetree_css_var_facade_surfaces, livetree_get_many_surface } from "./livetree-20-vars-set-get";
import { livetree_anim_key_preservation, livetree_dom_contains_surface, livetree_listener_api_surface } from "./livetree-21-anim-kf";
import { livetree_construction_parity, livetree_find_query_surface, livetree_quid_media } from "./livetree-22-quid-media";
import { livetree_listener_builder_corners, livetree_text_content_surface } from "./livetree-23-coverage-gaps";
import { livetree_dom_helper_surface } from "./livetree-24-dom-corners";
import type { TestSuite } from "../../app/demos/test/tests.types";


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
    livetree_canvas_clear(),
    livetree_canvas_plot(),
    livetree_canvas_pointer(),
    livetree_document_ownership(),
    livetree_css_surfaces_new(),
    livetree_css_refinements(),
    livetree_css_new_getters(),
    livetree_find_more(),
    livetree_tree_selector_surface(),
    livetree_css_pseudo_selector_unification(),
    livetree_css_var_facade_surfaces(),
    livetree_get_many_surface(),
    livetree_anim_key_preservation(),
    livetree_dom_contains_surface(),
    livetree_listener_api_surface(),
    livetree_quid_media(),
    livetree_construction_parity(),
    livetree_find_query_surface(),
    livetree_text_content_surface(),
livetree_listener_builder_corners(),
    livetree_dom_helper_surface(),
  ] as const;
}
