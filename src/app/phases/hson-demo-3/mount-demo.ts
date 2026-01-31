// mount-demo.ts

import { CssManager, type LiveTree } from "hson-live";
import { makeDivId, makeDivIdTxt, makeSpanId } from "../../utils/makers";
import { relay, type OutcomeAsync } from "intrastructure";
import { $T$GHSONcss, HEADLINE_CSS, MAIN_CONTAINERcss, MAIN_TEXTcss, MENU_BOXcss, TITLE_BOX_CSS } from "./demo.css";
import { init_parsing_panels } from "../../widgets/parse-panel/init.pp";
import { pp_factory } from "../../widgets/parse-panel/pp-factory";
import { style_parsing_panels } from "../../widgets/parse-panel/style-pp";
import { make_bud_node } from "../../config/bud-config";
import { DEMO_BUDS } from "./demo.buds";
import { shade_class } from "./demo.consts";
import { LETTER_LOWS, HSONlower } from "../../consts/config.consts";
import { $COL, LETTER_COLORcandy, LETTER_COLORfaded, LETTER_COLORwashed } from "../../consts/colors.consts";
import { _clamp01, _clampN1P1, keys_of } from "../../utils/helpers";

export const $PARSE = "parse";
export const $TEST = "test";
export const $OKLCH = "oklch";
export const $MOUSE = "mouse";

const MENU_OPTIONS = [
  $PARSE,
  $TEST,
  $OKLCH,
  $MOUSE,
] as const;
export type MenuKey = typeof MENU_OPTIONS[number];


export async function mount_demo(stage: LiveTree): OutcomeAsync<void> {
  stage.empty();
  const testCol = "oklch(52.3% 0.075 220.8 / 1)";
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

  const b = make_bud_node(stage);
  const demo = b.bud(DEMO_BUDS.demo);
  const wall = demo.bud(DEMO_BUDS.wall);
  const wallFx = wall.bud(DEMO_BUDS.wallFx);
  const inset = wall.bud(DEMO_BUDS.screenInset);
  const screen = inset.bud(DEMO_BUDS.screen);
  const screenFx = screen.bud(DEMO_BUDS.screenFx);

  // needed for bud:
  // makeDivID/Class/etc
  // set CSS
  // [parent].set-keyframes
  // set anim
  // return animate()
  // (teardown??)


  const mainContainer = makeDivId(screenFx.tree, "main-ontainer")
    .css.setMany(MAIN_CONTAINERcss)
  const titleBox = makeDivId(mainContainer, "title-box");
  titleBox.css.setMany(TITLE_BOX_CSS)
  const headline = makeDivId(titleBox, "hson-headline");
  headline.css.setMany(HEADLINE_CSS);

  const gcss = CssManager.globals.invoke();
  LETTER_LOWS.forEach(l => {
    gcss.rule(`demo-${l}-shade`, `.${shade_class(l)}`).setMany({
      color: LETTER_COLORfaded[l]
    });
  });

  const [$h, $s, $o, $n] = LETTER_LOWS.map((k) => {
    const span = makeSpanId(headline, `${k}-letter`)
      // set CSS - use --shade as color?? can --shade be set for individual selectors?
      .setText(HSONlower[k])
      .classlist.add(shade_class(k))
      .css.setMany($T$GHSONcss)
    return span;
  });

  const optionsBox = makeDivId(mainContainer, "options-box")
    .css.setMany({
      position:"absolute",
      top: "6rem",
      left: "3rem",
    });
  const menuOptions = {
    $TEST: makeDivIdTxt(optionsBox, `${$TEST}-button`, $TEST),
    $PARSE: makeDivIdTxt(optionsBox, `${$PARSE}-button`, $PARSE),
    $OKLCH: makeDivIdTxt(optionsBox, `${$OKLCH}-button`, $OKLCH),
    $MOUSE: makeDivIdTxt(optionsBox, `${$MOUSE}-button`, $MOUSE)

  } as const;

  keys_of(menuOptions).forEach((k) => {
    menuOptions[k].css.setMany({
      ...MAIN_TEXTcss,
      color: $COL.greyLite,
    });
  });

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