// parse-panels.style.ts

import { PP_BYTES_CSS, PP_CHIP_CSS, PP_COPYBTN_CSS, PP_PANEL_CSS, PP_ROOT_CSS, PP_TEXTAREA_CSS } from "./pp.consts";
import type { Fmt, Panels } from "./pp.types";

export function style_parsing_panels(pp: Panels): void {
  pp.root.css.setMany(PP_ROOT_CSS);

  (Object.keys(pp.panels) as Fmt[]).forEach((fmt) => {
    const p = pp.panels[fmt];
    p.panel.css.setMany(PP_PANEL_CSS);
    p.textarea.css.setMany(PP_TEXTAREA_CSS);
    p.chip.css.setMany(PP_CHIP_CSS);
    p.bytes.css.setMany(PP_BYTES_CSS);
    p.copyBtn.css.setMany(PP_COPYBTN_CSS);
  });
}