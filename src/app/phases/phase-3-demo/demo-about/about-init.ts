import type { LiveTree } from "hson-live";
import { get_about_toc_open, set_about_toc_open, demo_subscribe } from "../../../state/store2";
import { TOC_BTNcss, TOC_BTN_ACTIVEcss, TOC_BTN_IDLEcss } from "./about.css";
import type { AboutDocKey } from "./about.types";
import { type AboutInitTargets, type AboutInitDeps, find_doc } from "./about-helpers";
import { render_md_doc } from "./render-md-doc";



export function about_init(t: AboutInitTargets, deps: AboutInitDeps): void {
  const { docs } = deps;
  const initialKey: AboutDocKey = (deps.initialDocKey ?? docs[0]?.key ?? "readme") as AboutDocKey;

  let activeKey: AboutDocKey = initialKey;

  const tocButtons: Array<{ key: AboutDocKey; btn: LiveTree; }> = [];

  t.toc.empty();

  for (const d of docs) {
    const btn = t.toc.create.div()
      .classlist.add("about-doc-btn")
      .data.set("doc-key", d.key)
      .css.setMany(TOC_BTNcss);

    btn.text.set(d.title);
    btn.listen.onClick(() => setActive(d.key));

    tocButtons.push({ key: d.key, btn });
  }

  const setActive = (key: AboutDocKey): void => {
    const docSpec = find_doc(docs, key);
    if (!docSpec) return;

    activeKey = key;

    render_md_doc(t.doc, docSpec.body);

    for (const x of tocButtons) {
      x.btn.css.setMany(x.key === activeKey ? TOC_BTN_ACTIVEcss : TOC_BTN_IDLEcss);
    }
  };


  setActive(activeKey);
}
