import { CssManager } from "hson-live";
import type { GlobalCss } from "../../../../../hson-live/dist/api/livetree/managers/global-css";
import { $PANEL_HIDDEN, $txt_ } from "../../consts/ui-consts";
import { $blu_, $cols_, ACID_WASH_RGBA, set_alpha } from "../../consts/colors.consts";

export const set_global_css = (): void => {
  const gcss = CssManager.globals.invoke();
  gcss.rule("ua:form-fields:transparent", "textarea, input, select, button").setMany({
    background: "transparent",
    color: "inherit",
  });

  // gcss.rule("about-toc-base", ".about-toc").setMany({
  //   minWidth: "0",
  //   minHeight: "0",
  //   display: "grid",
  //   gridAutoRows: "min-content",
  //   alignContent: "start",
  //   gap: "8px",
  //   padding: "8px 8px 12px 8px",
  //   boxSizing: "border-box",
  //   background: set_alpha($cols_.bckdeep, 0.72),
  //   borderRadius: "18px",
  //   border: `1px solid ${set_alpha($blu_.faded, 0.12)}`,
  //   overflowY: "auto",
  //   overflowX: "hidden",
  // });
  gcss.rule('hide-hidden', `.${$PANEL_HIDDEN}`).setMany({
    visibility: "hidden",
    height: "0",
    display: "none",
  });

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
  gcss.rule("about-toc-base", ".about-toc").setMany({
    display: "grid",
  });





  gcss.rule("menu-active-view", '.view-button[data-active]').setMany({
    color: $cols_.bckdeep,
    background: ACID_WASH_RGBA.strawSmoke,
    fontWeight: "100",
    _hover: {
      background: ACID_WASH_RGBA.strawSmoke,
      fontWeight: "100",
      color: $cols_.bckdeep,
    },

  });

  gcss.rule("menu-active-widget", '.widget-button[data-active]').setMany({
    color: $cols_.bckdeep,
    background: ACID_WASH_RGBA.brickDust,
    fontWeight: "100",
    _hover: {
      background: ACID_WASH_RGBA.brickDust,
      boxSizing: "border-box",
      fontWeight: "100",
      color: $cols_.bckdeep,
    },

  });

  const mobile = gcss.media({ maxWidth: 960 })
  mobile.rule("about-mobile-toc-hidden", ".about-toc")
    .setMany({
      display: "none",
    });

  mobile.rule("hide-mobile-buttons", "#test-button, #parse-button, #build-button, #mouse-button, #mouse-slot")
    .setMany({ display: "none" });

  mobile.rule("mobile-about-btn", "#about-button")
    .setMany({
      position: "fixed",
      bottom: "2rem",
      left: "2rem",
      fontWeight: "700",
      fontSize: $txt_.heading,
    });

  /* fleurs button mobile styling (should match about) */
  mobile.rule("mobile-fleurs-btn", "#fleurs-button")
    .setMany({
      position: "fixed",
      bottom: "2rem",
      right: "2rem",
      fontSize: $txt_.heading,
      fontWeight: "700",
    });

  /* table of contents is grid on desktop */
  gcss.rule("about-toc-desktop", ".about-toc").setMany({
    display: "grid",
  });

  /* hide table of contents on mobile */
  mobile.rule("about-toc-mobile-hidden", ".about-toc").setMany({
    display: "none",
  });

  /* one flexible column width on mobile */
  mobile.rule("about-row-mobile-collapse", ".about-row").setMany({
    gridTemplateColumns: "minmax(0, 1fr)",
    width: "100%",
    minWidth: "0",
  });

  /* explicit styling for doc view on mobile */
  mobile.rule("about-doc-mobile-full", ".about-doc").setMany({
  gridColumn: "1",
  minWidth: "0",
  width: "100%",
});

  /* style "open" table of contents*/
  mobile.rule("about-toc-mobile-open", ".about-toc[data-toc-open='true']").setMany({
    display: "grid",
    position: "fixed",
    left: "2rem",
    bottom: "11.5rem",
    width: "min(20rem, calc(100vw - 4rem))",
    maxHeight: "45vh",
    zIndex: "9998",
  });
}

