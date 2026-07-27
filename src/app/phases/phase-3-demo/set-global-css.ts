import  { CssManager } from "hson-live/livetree";
import { COLOR_VAR_SOURCES } from "../../core/consts/colors.consts";
import { $PANEL_HIDDEN, _fontSize } from "../../core/consts/ui-consts";
import { MENU_OPTIONS, MIN_DESKTOP_WIDTH } from "./demo.consts";
import { GLOB_HIDEcss, GLOB_SCROLLBARcss, GLOB_WEBKIT_SCROLLcss, SCROLL_HOVER_COLcss, GLOB_SCROLL_THUMBcss, WEBKIT_SCROLL_TRKcss, MENU_ACTIVE_VIEWcss, MENU_ACTIVE_WIDGETcss, DISP_SIZE_ALERTcss } from "./global.css";

const mobileMenuButtonSelector = MENU_OPTIONS
  .map((opt) => `#${opt}-button`)
  .join(", ");

const mobileHiddenSelector = [
  mobileMenuButtonSelector,
  "#ui-root",
  "#mouse-slot",
].join(", ");

export const set_global_css = (): void => {
  const gcss =CssManager.api();
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
  //// clunky and stringly
  mobile.rule("hide-mobile-buttons", mobileHiddenSelector)
  .set.display("none");

  mobile.rule("show-disp-size-warning", "#demo #demo-screen")
    .setMany(DISP_SIZE_ALERTcss("on"))
  mobile.rule("small-copyright-msg", "#copyright-footer")
    .set.fontSize(_fontSize.wee)

  /* fleurs button mobile styling (should match about) */
  mobile.rule("mobile-fleurs-btn", "#fleurs-button")
    .set.display("none");


}
export function seed_demo_theme_vars(): void {
  const gcss = CssManager.api();

  for (const source of COLOR_VAR_SOURCES) {
    gcss.var.set(source.varName, source.value);
  }
}
