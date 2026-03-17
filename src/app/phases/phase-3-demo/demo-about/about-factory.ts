

import type { LiveTree } from "hson-live";
import type { CssMap } from "hson-live/types";
import { relay, type Outcome } from "intrastructure";
import { $blu_, $cols_, set_alpha } from "../../../consts/colors.consts";
import { ABOUT_ROOTcss, ABOUT_BODY_ROWcss, ABOUT_DOCcss, ABOUT_TOCcss } from "./about.css";

export type AboutPanel = Readonly<{
  root: LiveTree;
  toc: LiveTree;
  doc: LiveTree;
}>;

const ABOUT_ROOT_ID = "about-root";

// const ABOUT_ROOTcss: CssMap = {
//   display: "grid",
//   gridTemplateRows: "auto 1fr",
//   gap: "10px",
//   minHeight: "0",
//   minWidth: "0",
//   height: "100%",
// };

// const ABOUT_TITLEcss: CssMap = {
//   fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
//   letterSpacing: "0.08em",
//   textTransform: "uppercase",
//   opacity: "1",
// };

// const ABOUT_BODY_ROWcss: CssMap = {
//   display: "grid",
//   gridTemplateColumns: "20ch 1fr",
//   gap: "10px",
//   minHeight: "0",
//   minWidth: "0",
// };

// const ABOUT_TOCcss: CssMap = {
//   minHeight: "0",
//   minWidth: "0",
//   overflow: "auto",
//   padding: "10px",
//   borderRadius: "12px",
//   background: "rgba(0,0,0,0.63)",
//   boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
// };

// const ABOUT_DOCcss: CssMap = {
//   minHeight: "0",
//   minWidth: "0",
//   overflow: "auto",
//   padding: "12px 14px",
//   borderRadius: "12px",
//   background: $cols_.bckdeep,
//   boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
//   fontSize: "16px",
//   // maxWidth: "90ch",
// };
export function about_factory(host: LiveTree): Outcome<AboutPanel> {
  const old = host.find.byId(ABOUT_ROOT_ID);
  if (old) old.removeSelf();

  const root = host.create.div()
    .id.set(ABOUT_ROOT_ID)
    .css.setMany(ABOUT_ROOTcss);

  const row = root.create.div()
    .classlist.add("about-row")
    .css.setMany(ABOUT_BODY_ROWcss);

  const toc = row.create.div()
    .classlist.add("about-toc")
    .css.setMany(ABOUT_TOCcss)
    .css.selector("#about-root[data-toc-open='true'] &").setMany({
      display: "grid",
      position: "fixed",
      left: "2rem",
      bottom: "6.5rem",
      width: "min(22rem, calc(100vw - 4rem))",
      maxHeight: "55vh",
      zIndex: "9998",
      background: "red",
    });

  const doc = row.create.div()
    .classlist.add("about-doc")
    .css.setMany(ABOUT_DOCcss);

  return relay.data({ root, toc, doc });
}