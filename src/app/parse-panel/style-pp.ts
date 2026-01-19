// parse-panels.style.ts
import type { LiveTree } from "hson-live";
import { PP_ROOT_CSS, PP_PANEL_CSS, PP_TEXTAREA_CSS, PP_CHIP_CSS, PP_BYTES_CSS, PP_COPYBTN_CSS, PP_CHIP_VALID_TRUE_CSS, PP_CHIP_VALID_FALSE_CSS } from "./pp.css";


type Fmt = "json" | "hson" | "html";

export function style_parsing_panels(root: LiveTree): void {
  root.css.setMany(PP_ROOT_CSS);

  const fmts: Fmt[] = ["json", "hson", "html"];

  for (const fmt of fmts) {
    const panel = root.find.must({ attrs: { "data-role": `panel-${fmt}` } });
    panel.css.setMany(PP_PANEL_CSS);

    const ta = panel.find.must({ tag: "textarea", attrs: { "data-input": fmt } });
    ta.css.setMany(PP_TEXTAREA_CSS);

    const chip = panel.find.must({ tag: "span", attrs: { class: "chip validity" } });
    chip.css.setMany(PP_CHIP_CSS);

    const bytes = panel.find.must({ attrs: { "data-field": `${fmt}-bytes` } });
    bytes.css.setMany(PP_BYTES_CSS);

    const btn = panel.find({ tag: "button", attrs: { "data-action": `copy-${fmt}` } });
    if (btn) btn.css.setMany(PP_COPYBTN_CSS);
  }

  // state styling hook: whenever you update chip data-valid, also set css
  // (optional, but makes it immediate and explicit)
}

export function set_chip_state(chip: LiveTree, valid: boolean): void {
  chip.css.setMany(valid ? PP_CHIP_VALID_TRUE_CSS : PP_CHIP_VALID_FALSE_CSS);
}