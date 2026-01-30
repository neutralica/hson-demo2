// mount-demo.ts

import { CssManager, type LiveTree } from "hson-live";
import { makeDivId, makeSpanClass, makeSpanId } from "../../../utils/makers";
import { relay, type OutcomeAsync } from "intrastructure";
import { DEMO_CSS, DEMO_SCREENcss, DEMO_SCREEN_FXcss, DEMO_SCREEN_INSET_CSS, DEMO_WALLcss, DEMO_WALL_FXcss, MENU_BOXcss } from "./demo.css";
import { init_parsing_panels } from "../../widgets/parse-panel/init.pp";
import { pp_factory } from "../../widgets/parse-panel/pp-factory";
import { style_parsing_panels } from "../../widgets/parse-panel/style-pp";
import { make_palette } from "../../widgets/palette/calc-palette";
import { render_palette_board } from "../../widgets/palette/palette-board";
import { PALETTE_TAB_CSS } from "../../widgets/palette/palette.css";
import type { PropertyRegistration } from "../../../../../hson-live/dist/types/at-property.types";
import type { AnimSpec, CssMap, KeyframesInput } from "hson-live/types";
import { make_budder, make_div, type BudList, type BudSpec } from "../../config/bud-config";

const LETTER_KEYS = ["h", "s", "o", "n"] as const;
const HSON_CAPS = {
  h: "H",
  s: "S",
  o: "O",
  n: "N",
} as const;

const testCol = "oklch(52.3% 0.075 220.8 / 1)"
const hsonFadedCols = {
  h: "oklch(200, 1, 1)"

}

export const PAL_SEED = "3577";
export const PAL_CONFIG = { volatility: 1, grayWarmth: 0.35 }
// Your existing strings
const DEMO_STRINGS = {
  stage: "stage",
  demo: "demo",
  wall: "wall",
  wallFx: "wall-fx",
  inset: "screen-inset",
  screen: "demo-screen",
  screenFx: "screen-fx",
  menuBox: "menu-box",
} as const;

const $DS = DEMO_STRINGS;

// CHANGED: DEMO_CONFIG -> DEMO_BUDS (BudSpec shape)
export const DEMO_BUDS = {
  demo: {
    name: $DS.demo,
    make: make_div,
    id: $DS.demo,
    cls: $DS.demo,
    css: DEMO_CSS,
  },

  wall: {
    name: $DS.wall,
    make: make_div,
    id: $DS.wall,
    cls: "demo wall",
    css: DEMO_WALLcss,
  },

  wallFx: {
    name: $DS.wallFx,
    make: make_div,
    id: $DS.wallFx,
    cls: "demo wall fx",
    css: DEMO_WALL_FXcss,
  },

  screenInset: {
    name: $DS.inset,
    make: make_div,
    id: $DS.inset,
    cls: "demo screen inset",
    css: DEMO_SCREEN_INSET_CSS,
  },

  screen: {
    name: $DS.screen,
    make: make_div,
    id: $DS.screen,
    cls: "demo screen",
    css: DEMO_SCREENcss,
  },

  screenFx: {
    name: $DS.screenFx,
    make: make_div,
    id: $DS.screenFx,
    cls: "demo screen fx",
    css: DEMO_SCREEN_FXcss,
  },
  menuBox: {
    name: $DS.menuBox,
    make: make_div,
    id: $DS.menuBox,
    cls: "ui menu box",
    css: MENU_BOXcss,

  }
} as const;


export async function mount_demo(stage: LiveTree): OutcomeAsync<void> {
  stage.empty();
  const _testColPanel = stage.create.div()
    .css.setMany({
      position: "fixed",
      bottom: "5vh",
      left: "5vw",
      backgroundColor: testCol,
      width: "20vw",
      height: "20vh",
      zIndex: "100",
    })

  _testColPanel
    .listen
    .onClick(() => { _testColPanel.removeSelf() })
  const b = make_budder(stage);
  const demo = b.bud(DEMO_BUDS.demo);
  const wall = demo.bud(DEMO_BUDS.wall);
  const wallFx = wall.bud(DEMO_BUDS.wallFx);
  const inset = wall.bud(DEMO_BUDS.screenInset);
  const screen = inset.bud(DEMO_BUDS.screen);
  const screenFx = screen.bud(DEMO_BUDS.screenFx);

  // makeDivID/Class/etc
  // set CSS
  // [parent].set-keyframes
  // set anim
  // return animate()
  // (teardown??)

  const HEADLINE_CSS: CssMap = {
    position: "fixed",
    top: "5vh",
    left: "5vw",
    width: "30%",
    display: "flex",
    alignContent: "baseline",
    justifyContent: "center",
    padding: "1rem",
  }
  const DEMO_LETTER_CSS: CssMap = {

  }
  const shadeClass = (l: string) => {
    let shadeClass: string;
    switch (l) {
      case "H":
        return "blue-shade";
      case "S":
        return "yellow-shade";
      case "O":
        return "green-shade";
      case "N":
        return "pink-shade";
    }
    console.warn("shadeClass function failed");
    return "shadeClass function failed"
  }

  const headline = makeDivId(screenFx.tree, "hson-headline");
  headline.css.setMany(HEADLINE_CSS)

  const gcss = CssManager.globals.invoke();

  const [$h, $s, $o, $n] = LETTER_KEYS.map((k) => {
    const span = makeSpanId(headline, `${k}-letter`)
      // set CSS - use --shade as color?? can --shade be set for individual selectors?
      .setText(HSON_CAPS[k])
      .classlist.add(shadeClass(k));
    return span;
  });

  // Put board somewhere in your UI host tree:
  const paletteTab = makeDivId(screenFx.tree, "palette-tab").css.setMany(PALETTE_TAB_CSS);
  /* GOOD SEEDS: 1129, 3577 */
  const pal = make_palette(PAL_SEED, PAL_CONFIG);
  render_palette_board(paletteTab, pal);
  const menuBox = makeDivId(screen.tree, 'menu-box').classlist.add('ui menu box')
    .css.setMany(MENU_BOXcss)
    .setText("parsing panels")

  menuBox.listen.onClick(ev => {
    const pp = pp_factory(screen.tree);
    init_parsing_panels(pp);
    style_parsing_panels(pp);
  })

  return relay.ok();


}