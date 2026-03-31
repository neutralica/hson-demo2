

import type { LiveTree } from "hson-live";
import type { CssMap } from "hson-live/types";
import { relay, type Outcome } from "intrastructure";
import { $blu_, $cols_ } from "../../../core/consts/colors.consts";
import { set_alpha } from "../../../core/helpers/color-helpers";
import { ABOUT_ROOTcss, ABOUT_BODY_ROWcss, ABOUT_DOCcss, ABOUT_TOCcss, DATA_TOC_OPENcss } from "./about.css";
import { ABOUT_ROOT_ID } from "../../../core/consts/ui-consts";

export type AboutPanel = Readonly<{
  root: LiveTree;
  toc: LiveTree;
  doc: LiveTree;
}>;

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
    .css.selector("#about-root[data-toc-open='true'] &").setMany(DATA_TOC_OPENcss);

  const doc = row.create.div()
    .classlist.add("about-doc")
    .css.setMany(ABOUT_DOCcss);
  return relay.data({ root, toc, doc });
}