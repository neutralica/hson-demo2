// tests.consts.ts

import type { LiveTree } from "hson-live";

export const $CHIP_WIDTHnum = 7;
export const $CHIP_WIDTHstr = ` ${$CHIP_WIDTHnum}ch`;
export const $PANEL_NAME_WIDTHnum = 42;
export const $PANEL_NAME_WIDTHstr = `${$PANEL_NAME_WIDTHnum}ch`;

type Op = (tree: LiveTree) => void;

const ops: Op[] = [
  (t) => t.find.must.byId("btn").setAttrs("data-x", "1"),
  (t) => t.find.must.byId("btn").text.set("hi"),
  (t) => t.find.must.byId("btn").classlist.add("on"),
  (t) => t.find.must.byId("btn").setAttrs("data-x", null),
];