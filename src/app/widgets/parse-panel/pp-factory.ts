// pp_factory.ts
import { hson, type LiveTree } from "hson-live";
import type { Fmt, Panels, PanelParts } from "./pp.types";

type PpFactoryOpts = {
  fmts?: readonly Fmt[];
  // includeNodeOutput?: boolean;
};

export function pp_factory(host: LiveTree, opts: PpFactoryOpts = {}): Panels {
  const fmts = opts.fmts ?? (["json", "hson", "html"] as const);

  const root = hson
    .fromTrustedHtml("<div id='parsing-panels-root'></div>")
    .liveTree()
    .asBranch();

  host.append(root); // keep your “append before setText” rule

  const panels = {} as Record<Fmt, PanelParts>;

  for (const fmt of fmts) {
    const panel = root.create.section();

    // CHANGED: keep *structural* hook as role
    panel.data.set("role", `panel-${fmt}`);

    const textarea = panel.create.textarea();
    textarea.data.set("input", fmt);

    const chip = panel.create.span();
    chip.classlist.add("chip");
    chip.classlist.add("validity");
    chip.setText("stale");

    const bytes = panel.create.span();
    bytes.data.set("field", `${fmt}-bytes`);
    bytes.setText("0 bytes");

    const copyBtn = panel.create.button();
    copyBtn.data.set("action", `copy-${fmt}`);
    copyBtn.setText("copy");

    panels[fmt] = { fmt, panel, textarea, chip, bytes, copyBtn };
  }

  return { root, panels };
}