import { CssManager } from "hson-live";
import type { GlobalCss } from "../../../../../hson-live/dist/api/livetree/managers/global-css";
import { $PANEL_HIDDEN, $txt_ } from "../../core/consts/ui-consts";
import { $blu_, $cols_, $gry_, ACID_WASH_RGBA } from "../../core/consts/colors.consts";
import { adjustOklch, set_alpha } from "../../core/helpers/color-helpers";
import { MAIN_MENUcss } from "./demo.css";
import { MENU_TEXT_COL } from "../../core/consts/ui-consts";
import { OKLCH_FLEURS } from "./demo-fleurs/fleurs.consts";
import {  DISP_SIZE_ALERTcss } from "./global.css";
import { MIN_DESKTOP_WIDTH } from "./demo.consts";

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
gcss.rule("mobile-fleurs-btn", "#fleurs-button")
    .setMany({
      display: "block"
    });
  /* active button styling */
  gcss.rule("menu-active-view", '.view-button[data-active]').setMany({
    color: $cols_.bckdeep,
    background: set_alpha(MENU_TEXT_COL,  0.6),
    fontWeight: "100",
    _hover: {
      background: $gry_.dark,
      fontWeight: "100",
      color: $cols_.bckdeep,
    },

  });

  gcss.rule("menu-active-widget", '.widget-button[data-active]').setMany({
    color: $cols_.bckdeep,
    background: set_alpha(ACID_WASH_RGBA.warmAsh,  0.6),
    fontWeight: "100",
    _hover: {
      background: $gry_.dark,
      fontWeight: "100",
      color: $cols_.bckdeep,
    },

  });

  /* mobile styling */
  const mobile = gcss.media({
    maxWidth: MIN_DESKTOP_WIDTH,
    // hover: "none",
    // pointer: "coarse"
  }  )

  mobile.rule("hide-mobile-buttons", "#test-button, #parse-button, #build-button, #ui-root, #mouse-button, #about-button, #mouse-slot")
    .setMany({ display: "none" });

  mobile.rule("show-disp-size-warning", "#demo #demo-screen").setMany(DISP_SIZE_ALERTcss("on"))
  mobile.rule("small-copyright-msg", "#copyright-footer").set.fontSize($txt_.smol)

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
      display: "none"
    });


}
