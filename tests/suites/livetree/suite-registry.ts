
import { livetree_svg_basic } from "./livetree-09-svg";
import { livetree_svg_ingermediate } from "./livetree-10-svg-2";
import { livetree_gnarly_svg } from "./livetree-11-svg-3";
import { livetree_more_listeners } from "./livetree-07";
import { livetree_svg_lvl2 } from "./livetree-12-svg-new";
import { livetree_new_form_api } from "./livetree-13-form";
import { livetree_canvas, livetree_canvas_stress } from "./livetree-14-canvas";
import { livetree_canvas_pointer, livetree_document_ownership } from "./livetree-16-canvas-3";
import { livetree_css_var_facade_surfaces, livetree_get_many_surface } from "./livetree-20-vars-set-get";
import { livetree_listener_builder_corners, livetree_text_content_surface } from "./livetree-23-coverage-gaps";
import { livetree_dom_helper_surface, livetree_graph_dom_markup_surface } from "./livetree-24-dom-corners";
import type { TestSuite } from "../../harness/core/test-contracts";
import { livetree_regression_2 } from "./livetree-25-regression-2";
import { livetree_allocation } from "./livetree-29-allocation";


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
    livetree_svg_basic(),
    livetree_svg_ingermediate(),
    livetree_gnarly_svg(),
    livetree_more_listeners(),
    livetree_svg_lvl2(),
    livetree_new_form_api(),
    livetree_canvas(),
    livetree_canvas_stress(),
    livetree_canvas_pointer(),
    livetree_document_ownership(),
    livetree_css_var_facade_surfaces(),
    livetree_get_many_surface(),
    livetree_text_content_surface(),
    livetree_listener_builder_corners(),
    livetree_dom_helper_surface(),
    livetree_graph_dom_markup_surface(),
    livetree_regression_2(),
    livetree_allocation(),

  ] as const;
}
