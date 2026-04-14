import { CssManager } from "hson-live";
import type { GlobalCss } from "../../../../../hson-live/dist/api/livetree/managers/global-css";
import { $PANEL_HIDDEN, _TXT } from "../../core/consts/ui-consts";
import { $blu_, $gry_, ACID_WASH_RGBA } from "../../core/consts/colors.consts";
import { _COLS } from "../../core/consts/ui-consts";
import { adjustOklch, set_alpha } from "../../core/helpers/color-helpers";
import { MAIN_MENUcss } from "./demo.css";
import { TXTcol_MENU } from "../../core/consts/ui-consts";
import { OKLCH_FLEURS } from "./demo-fleurs/fleurs.consts";
import { ABOUT_BTN_MOBcss, DISP_SIZE_ALERTcss, GLOB_HIDEcss, GLOB_SCROLL_THUMBcss, GLOB_SCROLLBARcss, GLOB_WEBKIT_SCROLLcss, MENU_ACTIVE_VIEWcss, MENU_ACTIVE_WIDGETcss, SCROLL_HOVER_COLcss, WEBKIT_SCROLL_TRKcss } from "./global.css";
import { MIN_DESKTOP_WIDTH } from "./demo.consts";

export const set_global_css = (): void => {
  const gcss = CssManager.globals.invoke();
  gcss.rule("ua:form-fields:transparent", "textarea, input, select, button").setMany({
    background: "transparent",
    color: "inherit",
  });

  /* define `.panel-hidden` behavior */
  gcss.rule('hide-hidden', `.${$PANEL_HIDDEN}`).setMany(GLOB_HIDEcss);

  /* style scrollbars */
  gcss.rule("global-scrollbar", "*")
    .setMany(GLOB_SCROLLBARcss);
  gcss.rule("::-webkit-scrollbar", "::-webkit-scrollbar")
    .setMany(GLOB_WEBKIT_SCROLLcss);
  gcss.rule("scroll-thumb-hover", "::-webkit-scrollbar-thumb:hover")
    .setMany(SCROLL_HOVER_COLcss);
  gcss.rule("scroll-thumb", "::-webkit-scrollbar-thumb")
    .setMany(GLOB_SCROLL_THUMBcss);
  gcss.rule("::-webkit-scrollbar-track", "::-webkit-scrollbar-track",)
    .setMany(WEBKIT_SCROLL_TRKcss);
  
    /* for now, hide fleurs button too 
        (when about is available on mobile both will be shown) */
  gcss.rule("mobile-fleurs-btn", "#fleurs-button")
    .set.display("block");
  
  /* (about panel -- currently unavailable on mobile) */
  gcss.rule("about-toc-open-grid", ".about-toc")
    .set.display("grid");
  gcss.rule("about-row-base", ".about-row")
    .set.gridTemplateColumns("21ch minmax(0, 1fr)");
  
  /* active button styling for view and widgets */
  gcss.rule("menu-active-view", '.view-button[data-active]')
    .setMany(MENU_ACTIVE_VIEWcss);

  gcss.rule("menu-active-widget", '.widget-button[data-active]')
    .setMany(MENU_ACTIVE_WIDGETcss);

  /* mobile styling */
  const mobile = gcss.media({
    maxWidth: MIN_DESKTOP_WIDTH,
    // hover: "none",
    // pointer: "coarse"
  })

  /* hide all menu buttons on mobile */
  mobile.rule("hide-mobile-buttons", "#test-button, #parse-button, #build-button, #ui-root, #mouse-button, #about-button, #mouse-slot")
    .set.display("none");

  mobile.rule("show-disp-size-warning", "#demo #demo-screen")
    .setMany(DISP_SIZE_ALERTcss("on"))
  mobile.rule("small-copyright-msg", "#copyright-footer")
    .set.fontSize(_TXT.wee)

  mobile.rule("mobile-about-btn", "#about-button")
    .setMany(ABOUT_BTN_MOBcss);

  /* fleurs button mobile styling (should match about) */
  mobile.rule("mobile-fleurs-btn", "#fleurs-button")
    .set.display("none");


}
