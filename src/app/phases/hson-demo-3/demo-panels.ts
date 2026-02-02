import { make_panel_specs } from "../../ui/make-panel";
import { PANEL_FRAMEcss, PANEL_SURFACEcss } from "./panels.css";

export const PARSE_PANEL = make_panel_specs({
  key: "parse",
  panelId: "parse-panel",
  frameCss: PANEL_FRAMEcss,
  bodyCss: PANEL_SURFACEcss,
});

export const TEST_PANEL = make_panel_specs({
  key: "test",
  panelId: "test-panel",
  frameCss: PANEL_FRAMEcss,
  bodyCss: PANEL_SURFACEcss,
});

export const TEST_SELECTcss = {
  minWidth: "12ch",
  padding: "10px 8px",
  borderRadius: "12px",
  boxSizing: "border-box",

  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  fontSize: "12px",
  letterSpacing: "0.06em",

  background: "rgba(255,255,255,0.03)",
  color: "rgba(255,255,255,0.88)",
  border: "1px solid rgba(255,255,255,0.10)",
  outline: "none",
} as const;