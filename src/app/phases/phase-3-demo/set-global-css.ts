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

const towlFocusScreen = '#screen[data-shell-current-main="towl"]';
const directTowlScreen = '#screen[data-shell-entry="direct-towl"][data-shell-current-main="towl"]';

function install_towl_focus_rules(): void {
  const gcss = CssManager.api();
  const hiddenChrome = [
    "#menu-container",
    "#fx-layer",
    "#graffiti-layer",
    "#motes",
    "#copyright-footer",
    "#live-demo-deck",
    "#oklch",
  ].map((selector) => `${directTowlScreen} ${selector}`).join(", ");

  gcss.rule("direct-towl-screen", directTowlScreen).setMany({
    gridTemplateColumns: "minmax(0, 1fr)",
    gridTemplateRows: "minmax(0, 1fr)",
    gap: "0",
    height: "100dvh",
  });
  gcss.rule("direct-towl-ui", `${directTowlScreen} #ui-root`).setMany({
    display: "block",
    gridColumn: "1 / 2",
    width: "100%",
    height: "100dvh",
  });
  gcss.rule("direct-towl-hidden-chrome", hiddenChrome).set.display("none !important");
  gcss.rule(
    "direct-towl-deck",
    `#stage:has(${directTowlScreen}) > #live-demo-deck`,
  ).set.display("none !important");

  const mobile = gcss.media({ maxWidth: MIN_DESKTOP_WIDTH });
  const mobileHiddenChrome = [
    "#menu-container",
    "#fx-layer",
    "#graffiti-layer",
    "#motes",
    "#copyright-footer",
    "#live-demo-deck",
    "#oklch",
  ].map((selector) => `${towlFocusScreen} ${selector}`).join(", ");

  mobile.rule("mobile-towl-screen", towlFocusScreen).setMany({
    gridTemplateColumns: "minmax(0, 1fr)",
    gridTemplateRows: "minmax(0, 1fr)",
    gap: "0",
    height: "100dvh",
  });
  mobile.rule("mobile-towl-ui", `${towlFocusScreen} #ui-root`).setMany({
    display: "block",
    gridColumn: "1 / 2",
    width: "100%",
    height: "100dvh",
  });
  mobile.rule("mobile-towl-hidden-chrome", mobileHiddenChrome).set.display("none !important");
  mobile.rule(
    "mobile-towl-deck",
    `#stage:has(${towlFocusScreen}) > #live-demo-deck`,
  ).set.display("none !important");
  mobile.rule("mobile-towl-no-warning", `${towlFocusScreen}::after`).set.display("none");
  mobile.rule("mobile-towl-root", "#towl-root").setMany({
    width: "100%",
    height: "100dvh",
    minHeight: "100dvh",
    maxWidth: "100vw",
    alignContent: "start",
    justifyItems: "stretch",
    overflowX: "hidden",
    overflowY: "auto",
    padding: "max(0.65rem, env(safe-area-inset-top)) max(0.65rem, env(safe-area-inset-right)) max(0.65rem, env(safe-area-inset-bottom)) max(0.65rem, env(safe-area-inset-left))",
  });
  mobile.rule("mobile-towl-card", "#towl-card").setMany({
    width: "100%",
    maxWidth: "52rem",
    justifySelf: "center",
    gap: "clamp(0.55rem, 2vw, 0.9rem)",
    padding: "clamp(0.7rem, 3vw, 1.2rem)",
  });
  mobile.rule("mobile-towl-title", "#towl-title").setMany({
    fontSize: "clamp(1.25rem, 7vw, 2rem)",
    letterSpacing: "0.1em",
  });
  mobile.rule("mobile-towl-meta", "#towl-meta").setMany({
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "0.35rem 0.65rem",
  });
  mobile.rule("mobile-towl-seats", "#towl-seats").set.gap("0.55rem");
  mobile.rule("mobile-towl-seat", "#towl-seats > div").set.padding("0.65rem");
  mobile.rule("mobile-towl-actions", "#towl-actions").setMany({
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "0.55rem",
  });
  mobile.rule("mobile-towl-action-buttons", "#towl-actions > button").setMany({
    width: "100%",
    minWidth: "0",
    minHeight: "2.75rem",
  });
  mobile.rule("mobile-towl-pull", "#towl-pull").set.gridColumn("1 / -1");

  const landscape = gcss.media({ maxHeight: 520, orientation: "landscape" });
  landscape.rule("landscape-towl-root", "#towl-root").setMany({
    alignContent: "start",
    padding: "max(0.4rem, env(safe-area-inset-top)) max(0.6rem, env(safe-area-inset-right)) max(0.4rem, env(safe-area-inset-bottom)) max(0.6rem, env(safe-area-inset-left))",
  });
  landscape.rule("landscape-towl-card", '#towl-root[data-towl-invite="valid"] #towl-card').setMany({
    gridTemplateColumns: "minmax(0, 1fr) minmax(18rem, 1fr)",
    gridTemplateAreas: '"header room" "meta seats" "rope seats" "result actions" "error actions"',
    alignItems: "start",
    gap: "0.4rem 0.8rem",
    padding: "0.6rem 0.8rem",
  });
  landscape.rule("landscape-towl-header", "#towl-header").set.gap("0.5rem");
  landscape.rule("landscape-towl-header-area", '#towl-root[data-towl-invite="valid"] #towl-header').set.gridArea("header");
  landscape.rule("landscape-towl-room-area", '#towl-root[data-towl-invite="valid"] #towl-room-row').set.gridArea("room");
  landscape.rule("landscape-towl-meta-area", '#towl-root[data-towl-invite="valid"] #towl-meta').set.gridArea("meta");
  landscape.rule("landscape-towl-seats-area", '#towl-root[data-towl-invite="valid"] #towl-seats').set.gridArea("seats");
  landscape.rule("landscape-towl-rope-area", '#towl-root[data-towl-invite="valid"] #towl-card > div:nth-of-type(4)').set.gridArea("rope");
  landscape.rule("landscape-towl-result-area", '#towl-root[data-towl-invite="valid"] #towl-card > div:nth-of-type(5)').set.gridArea("result");
  landscape.rule("landscape-towl-actions-area", '#towl-root[data-towl-invite="valid"] #towl-actions').set.gridArea("actions");
  landscape.rule("landscape-towl-error-area", '#towl-root[data-towl-invite="valid"] #towl-card > div[role="alert"]').set.gridArea("error");
  landscape.rule("landscape-towl-title", "#towl-title").set.fontSize("1.25rem");
  landscape.rule("landscape-towl-room", "#towl-room-row").set.gap("0.35rem");
  landscape.rule("landscape-towl-meta", "#towl-meta").setMany({
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    fontSize: "0.72rem",
  });
  landscape.rule("landscape-towl-seats", "#towl-seats").set.gap("0.4rem");
  landscape.rule("landscape-towl-seat", "#towl-seats > div").setMany({ padding: "0.45rem", fontSize: "0.72rem" });
  landscape.rule("landscape-towl-actions", "#towl-actions").set.gap("0.4rem");
  landscape.rule("landscape-towl-action-buttons", "#towl-actions > button").setMany({
    minHeight: "2.75rem",
    padding: "0.45rem 0.65rem",
  });
}

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

  install_towl_focus_rules();


}
export function seed_demo_theme_vars(): void {
  const gcss = CssManager.api();

  for (const source of COLOR_VAR_SOURCES) {
    gcss.var.set(source.varName, source.value);
  }
}
