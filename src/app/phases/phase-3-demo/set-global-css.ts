import { CssManager } from "hson-live";
import type { GlobalCss } from "../../../../../hson-live/dist/api/livetree/managers/global-css";
import { $PANEL_HIDDEN, $txt_ } from "../../consts/ui-consts";
import { $blu_, $cols_, $gry_, ACID_WASH_RGBA, set_alpha } from "../../consts/colors.consts";
import { MAIN_MENUcss, MENU_TEXT_COL } from "./demo.css";
import { OKLCH_FLEURS } from "./demo-fleurs/fleurs.consts";
import { MOBILE_DOCcss, MOBILE_TOCcss } from "./global.css";

export const set_global_css = (): void => {
  const gcss = CssManager.globals.invoke();
  gcss.rule("ua:form-fields:transparent", "textarea, input, select, button").setMany({
    background: "transparent",
    color: "inherit",
  });
/* define panel-hidden behavior */
  gcss.rule('hide-hidden', `.${$PANEL_HIDDEN}`).setMany({
    visibility: "hidden",
    height: "0",
    display: "none",
  });

  /* style scrollbars */
  gcss.rule("global-scrollbar", "*").setMany({
    scrollbarWidth: "thick",
    scrollbarColor: "rgba(160,220,255,0.45) rgba(0,0,0,0.35)"
  });
  gcss.rule("::-webkit-scrollbar", "::-webkit-scrollbar").setMany({
    width: "30px",
    height: "10px"
  });
  gcss.rule("scroll-thumb-hover", "::-webkit-scrollbar-thumb:hover").setMany({
    background: "rgba(180,230,255,0.65)"
  });
  gcss.rule("scroll-thumb", "::-webkit-scrollbar-thumb").setMany({
    background: "rgba(160,220,255,0.45)",
    borderRadius: "6px",
    border: "2px solid rgba(0,0,0,0.45)"
  });
  gcss.rule("::-webkit-scrollbar-track", "::-webkit-scrollbar-track",).setMany({
    background: "rgba(0,0,0,0.35)"
  });
  gcss.rule("about-toc-open-grid", ".about-toc").setMany({
    display: "grid",
  });
  gcss.rule("about-row-base", ".about-row").setMany({
    gridTemplateColumns: "21ch minmax(0, 1fr)",
  });

/* active button styling */
  gcss.rule("menu-active-view", '.view-button[data-active]').setMany({
    color: $cols_.bckdeep,
    background: MENU_TEXT_COL,
    fontWeight: "100",
    _hover: {
      background: $gry_.dimmer,
      fontWeight: "100",
      color: $cols_.bckdeep,
    },

  });

  gcss.rule("menu-active-widget", '.widget-button[data-active]').setMany({
    color: $cols_.bckdeep,
    background: ACID_WASH_RGBA.warmAsh, 
    fontWeight: "100",
    _hover: {
      background: $gry_.dim,
      fontWeight: "100",
      color: $cols_.bckdeep,
      textDecoration: "line-through",
    },

  });

    /* table of contents is grid on desktop */
  // gcss.rule("about-toc-desktop", ".about-toc").setMany({
  //   display: "grid",
  // });
  

  /* mobile styling */
  const mobile = gcss.media({ maxWidth: 960 })

  mobile.rule("hide-mobile-buttons", "#test-button, #parse-button, #build-button, #ui-root, #mouse-button, #about-button, #mouse-slot")
  .setMany({ display: "none" });
  
  mobile.rule("mobile-about-btn", "#about-button")
  .setMany({
    position: "fixed",
    bottom: "2rem",
    left: "2rem",
    fontWeight: "700",
    fontSize: $txt_.wordMobile,
  });
  
  /* fleurs button mobile styling (should match about) */
  mobile.rule("mobile-fleurs-btn", "#fleurs-button")
  .setMany({
    position: "fixed",
    bottom: "2rem",
    right: "2rem",
    fontSize: $txt_.wordMobile,
    fontWeight: "700",
  });
  

  /* hide table of contents on mobile */
  mobile.rule(
  "about-toc-mobile-closed",
  "#about-root .about-toc:not([data-toc-open='true'])"
).setMany({
  display: "none",
});

  
  /* one flexible column width on mobile */
  mobile.rule("about-row-mobile-column", ".about-row").setMany({
    gridTemplateColumns: "minmax(0, 1fr)",
    position: "fixed",
    top: "2rem",
    left: "2rem",
    width: "100%",
    height: "100%"
    
  });
  
  /* one flexible column width on mobile */
  // TODO -- make work
  
  gcss.rule("hide-toc-button-fulscreen", "#about-button #mobile-doc-button").setMany({
    display: "none"
  });
  mobile.rule("hide-toc-button-fulscreen", "#mobile-doc-button").setMany({
        ...MAIN_MENUcss,
        position: "absolute",
        bottom: "100%",
        left: "1rem",
        height: "40px",
        width: "100px",
        // background: "red",
        // color: "white"
      });

  /* explicit styling for doc view on mobile */
  mobile.rule("about-doc-mobile-full", ".about-doc").setMany(MOBILE_DOCcss);

  /* style "open" table of contents*/
  mobile.rule("about-toc-mobile-open", ".about-toc[data-toc-open='true']").setMany(MOBILE_TOCcss);
}

