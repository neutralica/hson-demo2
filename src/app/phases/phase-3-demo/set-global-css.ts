import { CssManager } from "hson-live";
import type { GlobalCss } from "../../../../../hson-live/dist/api/livetree/managers/global-css";
import { $PANEL_HIDDEN, $txt_ } from "../../consts/ui-consts";
import { $cols_, ACID_WASH_RGBA } from "../../consts/colors.consts";

export const set_global_css = (): void => {
  const gcss = CssManager.globals.invoke();

     gcss.rule("ua:form-fields:transparent", "textarea, input, select, button").setMany({
    background: "transparent",
    color: "inherit",
  });

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
  const mobile = gcss
    .media({ maxWidth: 960 })

  mobile.rule("hide-mobile-buttons", "#test-button, #parse-button, #build-button, #mouse-button, #mouse-slot")
    .setMany({ display: "none" });

  mobile.rule("mobile-about-btn", "#about-button")
    .setMany({
      position: "fixed",
      bottom: "2rem",
      left: "2rem",
      fontWeight: "700"
      // fontSize: $txt_.heading
    });
  mobile.rule("mobile-fleurs-btn", "#fleurs-button")
    .setMany({
      position: "fixed",
      bottom: "2rem",
      right: "2rem",
      fontSize: $txt_.heading,
      fontWeight: "700",
    });

  mobile.rule("hson-smaller", "span.demo-wordmark").setMany({
    fontSize: $txt_.hsonWordMobile
  });
  mobile.rule("/livedemo-subhead", '#livedemo-subhead').setMany({
    display: "block",
    lineHeight: "1rem",
    fontSize: $txt_.main,
  })

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
}