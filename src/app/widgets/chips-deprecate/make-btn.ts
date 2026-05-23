import type { LiveTree } from "hson-live";
import { mk_div_id } from "../../utils/makers";
import { UI_BTN_STDcss, UI_BUTTON_BORDERcss, UI_BTN_HOVERcss } from "../../ui/panels/panels.css";
import type { CssMap } from "hson-live/types";
import { øCOLS, øfontSize } from "../../core/consts/ui-consts";

export type ToggleBtn = Readonly<{
  tree: LiveTree;
  // setActive: (on: boolean) => void;
  setText: (t: string) => void;
}>;


export function mk_btn(parent: LiveTree, id: string, label: string): ToggleBtn {
  const node = mk_div_id(parent, id);
  node.text.set(label);

  const base: CssMap = {
    ...UI_BTN_STDcss,
    background: øCOLS.backhi,
    // padding: "6px 8px",
    // userSelect: "none",
    // cursor: "pointer",
    fontSize: øfontSize.main,
    // letterSpacing: "0.02em",
    // textAlign: "center",
    // whiteSpace: "nowrap",
    // boxSizing: "border-box",
  };


  node.css.setMany(base);

  // const setActive = (on: boolean): void => {
  //   node.css.setMany(base);
  // };

  return {
    tree: node,
    // setActive,
    setText: (t) => node.text.set(t),
  };
}