// mount-demo.ts

import { CssManager, type LiveTree } from "hson-live";
import { makeDivClass, makeDivId, makeDivIdTxt, makeSpanId } from "../../utils/makers";
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
import { LAYOUT_GRIDcss, PANEL_FRAMEcss, PANEL_OUTERcss, TEST_BODY_OVERRIDEScss, UI_ROOTcss } from "./panels.css";
import { PARSE_PANEL, TEST_PANEL } from "./demo-panels";
import { build_panel } from "../../ui/make-panel";
import { test_panel_factory_offdom } from "./test-panel-factory";

export const $PARSE = "parse";
export const $TEST = "test";
export const $CONSOLE = "console";
export const $OKLCH = "oklch";
export const $MOUSE = "mouse";
export const $ABOUT = "about";

const MENU_OPTIONS = [
  $PARSE,
  $TEST,
  $OKLCH,
  $MOUSE,
  $ABOUT,
  $CONSOLE

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
  const uiRoot = makeDivId(screenFx.tree, "ui-root").css.setMany(UI_ROOTcss);
  const layoutGrid = makeDivId(uiRoot, "layout-grid").css.setMany({
    gridTemplateColumns: "1fr",
    gridTemplateRows: "1fr 1fr",   // force two visible rows


  });

  // PARSE panel ////(seeing two still)

  // test.body.tree.css.setMany(TEST_BODY_OVERRIDEScss);

  // test internals
  const tp = test_panel_factory_offdom();

  // temporary wiring (until you hook runner/reporter)
  tp.runBtn.listen.onClick(() => {
    tp.setStatus("running");
    tp.appendLine("running tests…");
  });

  tp.clearBtn.listen.onClick(() => {
    tp.clear();
    tp.setStatus("idle");
  });
  // needed for bud:
  // makeDivID/Class/etc
  // set CSS
  // [parent].set-keyframes
  // set anim
  // return animate()
  // (teardown??)


  const mainContainer = makeDivId(screenFx.tree, "main-container")
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
      position: "absolute",
      top: "6rem",
      left: "3rem",
    });

  const menu = {
    $ABOUTbtn: makeDivIdTxt(optionsBox, `${$ABOUT}-button`, $ABOUT),
    $TESTbtn: makeDivIdTxt(optionsBox, `${$TEST}-button`, $TEST),
    $PARSEbtn: makeDivIdTxt(optionsBox, `${$PARSE}-button`, $PARSE),
    $OKLCHbtn: makeDivIdTxt(optionsBox, `${$OKLCH}-button`, $OKLCH),
    $MOUSEbtn: makeDivIdTxt(optionsBox, `${$MOUSE}-button`, $MOUSE),
    $CONSOLEbtn: makeDivIdTxt(optionsBox, `${$CONSOLE}-button`, $CONSOLE),

  } as const;

  keys_of(menu).forEach((k) => {
    menu[k].css.setMany({
      ...MAIN_TEXTcss,
      color: $COL.greyLite,
    });
  });


  menu.$PARSEbtn.listen.onClick(ev => {
    const parse = build_panel(layoutGrid, PARSE_PANEL);
    /* awaiting parsing panel unfucking: */
    // const test = build_panel(layoutGrid, TEST_PANEL);

    const pp = pp_factory(parse.body.tree);
    init_parsing_panels(pp);
  })

  return relay.ok();


}