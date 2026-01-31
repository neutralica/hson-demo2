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