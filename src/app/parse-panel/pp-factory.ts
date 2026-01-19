// pp_factory.ts

import { hson, LiveTree } from "hson-live";

type PanelFmt = "json" | "hson" | "html" | "node"; // extend as needed

type PpFactoryOpts = {
  // CHANGED: pass formats so adding a 4th panel is a 1-line change
  fmts?: readonly PanelFmt[];
  // CHANGED: hide node-output unless explicitly enabled
  includeNodeOutput?: boolean;
};

export function pp_factory(host: LiveTree, opts: PpFactoryOpts = {}): LiveTree {
  // CHANGED: configurable formats
  const fmts = opts.fmts ?? (["json", "hson", "html"] as const);

  // root container
  const pp = hson
    .fromTrustedHtml("<div id='parsing-panels-root'></div>")
    .liveTree()
    .asBranch();
  host.append(pp);
  // need to append first otherwise the checks don't work
  for (const fmt of fmts) {
    const s = pp.create.section()
      .data.set("role", `panel-${fmt}`);

    // textarea
    s.create.textarea().data.set("input", fmt);

    // validity chip (two classes)
    const chip = s.create.span();
    chip.classlist.add("chip");       
    chip.classlist.add("validity");   
    // bytes field
    s.create.span()
      .data.set("field", `${fmt}-bytes`)
      .setText("0 bytes");

    // copy button (optional in init, but handy)
    s.create.button()
      .data.set("action", `copy-${fmt}`)
      .setText("copy");
    chip.setText(`[enter valid ${fmt}]`);
  }

  // optional debug output
  if (opts.includeNodeOutput) {
    pp.create.pre().id.set("node-output");
  }
  const pphtml = pp.asDomElement();

  return pp;
}