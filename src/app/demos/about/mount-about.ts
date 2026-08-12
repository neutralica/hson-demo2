import { hson } from "hson-live";
import { LiveTree } from "hson-live/livetree";
import { ABOUT_ROOT_ID } from "../../core/consts/ui-consts";
import { find_doc } from "./about-helpers";
import { ABOUT_ROOTcss, ABOUT_BODY_ROWcss, ABOUT_TOCcss, ABOUT_DOCcss, DOC_CONTAINER, TOC_BTNcss, TOC_BTN_ACTIVEcss, TOC_BTN_IDLEcss } from "./about.css";
import type { AboutDocKey, AboutPanel, AboutInitTargets, AboutInitDeps, AboutDocs } from "./about.types";
import { render_md_doc } from "./markdown-parser";

type AboutControlState = Readonly<{
  activeKey: string;
}>;

const ABOUT_CONTROL_SCHEMA = hson.liveMap.schema.define((scm) => scm.object({
  activeKey: scm.string,
}));

function makeInitialAboutControlState(activeKey: AboutDocKey): AboutControlState {
  return { activeKey };
}

export function about_factory(host: LiveTree): AboutPanel {
  const old = host.find.byId(ABOUT_ROOT_ID);
  if (old) old.remove();

  const root = host.create.div()
    .id.set(ABOUT_ROOT_ID)
    .css.setMany(ABOUT_ROOTcss);

  const row = root.create.div()
    .classlist.add("about-row")
    .css.setMany(ABOUT_BODY_ROWcss);

  const toc = row.create.div()
    .classlist.add("about-toc")
    .css.setMany(ABOUT_TOCcss);

  const doc = row.create.div()
    .classlist.add("about-doc")
    .css.setMany(ABOUT_DOCcss);

  const docContainer = doc.create.div()
    .classlist.add("doc-container")
    .css.setMany(DOC_CONTAINER);

  return { root, toc, doc: docContainer };
}
export function about_init(t: AboutInitTargets, deps: AboutInitDeps): void {
  const { docs } = deps;
  const requestedKey: AboutDocKey = (deps.initialDocKey ?? docs[0]?.key ?? "readme") as AboutDocKey;
  const initialKey: AboutDocKey = (find_doc(docs, requestedKey)?.key ?? docs[0]?.key ?? "readme") as AboutDocKey;
  const aboutState = hson.liveMap
    .fromJson(makeInitialAboutControlState(initialKey))
    .schema.use(ABOUT_CONTROL_SCHEMA);

  const getActiveKey = (): AboutDocKey => aboutState.at(["activeKey"]).snap() as AboutDocKey;
  const setActiveKey = (next: AboutDocKey): void => {
    aboutState.at(["activeKey"]).set(next);
  };

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

  const syncTocButtons = (): void => {
    const activeKey = getActiveKey();

    for (const x of tocButtons) {
      x.btn.css.setMany(x.key === activeKey ? TOC_BTN_ACTIVEcss : TOC_BTN_IDLEcss);
    }
  };

  const setActive = (key: AboutDocKey): void => {
    const docSpec = find_doc(docs, key);
    if (!docSpec) return;

    setActiveKey(key);
    render_md_doc(t.doc, docSpec.body);
    syncTocButtons();
  };


  setActive(getActiveKey());
}

export function mount_about_panels(host: LiveTree, docs: AboutDocs): AboutPanel {
  const ap = about_factory(host);
  about_init(
    { toc: ap.toc, doc: ap.doc },
    { docs },
  );
  return ap;
}
