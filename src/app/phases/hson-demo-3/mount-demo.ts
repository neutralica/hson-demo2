// mount-demo.ts

import { CssManager, hson, type LiveTree } from "hson-live";
import { makeDivClass, makeDivId, makeDivIdTxt, makeSpanId } from "../../utils/makers";
import { relay, type OutcomeAsync } from "intrastructure";
import { $T$GHSONcss, BELT_HOLDERcss, HEADLINEcss, MAIN_CONTAINERcss, MAIN_TEXTcss,  MENU_BOXcss,  TITLE_BOXcss } from "./demo.css";
import { init_parsing_panels } from "../../widgets/parse-panel/init.pp";
import { pp_factory } from "../../widgets/parse-panel/pp-factory";
import { style_parsing_panels } from "../../widgets/parse-panel/style-pp";
import { fill_create as bud_node } from "../../config/bud-config";
import { DEMO_BUDS } from "./demo.buds";
import { shade_class } from "./demo.consts";
import { _clamp01, _clampN1P1, keys_of } from "../../utils/helpers";
import { LAYOUT_GRIDcss, PANEL_FRAMEcss, PANEL_OUTERcss, TEST_BODY_OVERRIDEScss, UI_ROOTcss } from "./demo-panels.css";
import { PARSE_PANEL, TEST_PANEL } from "./demo-panels";
import { mount_panel } from "../../ui/make-panel";
import { test_panel_factory_offdom } from "./test-panel-factory";
import { create_console } from "../../console/console";
import { build_suites_for_mode, make_full_loop_suite, make_generated_fixtures_suite } from "../../../tests/suite-builder";
import { run_suites } from "../../../tests/test-runner";
import { _test_full_loop } from "hson-live/diagnostics";
import { FIXTURES_GENERATED } from "../../../fixtures/fixture-gen";
import type { TestSuite } from "../../../tests/tests.types";
import { $PANEL_HIDDEN } from "../../consts/ui-consts";
import { HSONlower, LETTER_LOWS } from "../../consts/config.consts";
import { $cols, LETTER_COLORfaded } from "../../consts/colors.consts";

export const $PARSE = "parse";
export const $TEST = "test";
export const $BUILD = "build";
export const $CONSOLE = "console";
export const $OKLCH = "oklch";
export const $MOUSE = "mouse";
export const $ABOUT = "about";

const MENU_OPTIONS = [
  $PARSE,
  $TEST,
  $BUILD,
  $OKLCH,
  $MOUSE,
  $ABOUT,
  $CONSOLE

] as const;
export type MenuKey = typeof MENU_OPTIONS[number];


export async function mount_demo(stage: LiveTree): OutcomeAsync<void> {
  stage.empty();

  // needed/optional for bud:
  // makeDivID/Class/etc
  // set CSS
  // [parent].set-keyframes
  // set anim
  // return animate()
  // (teardown??)

  const b = bud_node(stage);
  const demo = b.bud(DEMO_BUDS.demo);
  const screen = demo.bud(DEMO_BUDS.screen);
  const screenFx = screen.bud(DEMO_BUDS.screenFx);
  const mainContainer = makeDivId(screenFx.tree, "main-container")
    .css.setMany(MAIN_CONTAINERcss)
  const titleBox = makeDivId(mainContainer, "title-box");
  titleBox.css.setMany(TITLE_BOXcss)
  const headline = makeDivId(titleBox, "hson-headline");
  headline.css.setMany(HEADLINEcss);
  const uiRoot = makeDivId(screenFx.tree, "ui-root").css.setMany(UI_ROOTcss);
  const layoutGrid = makeDivId(uiRoot, "layout-grid").css.setMany(LAYOUT_GRIDcss);

  const parse = mount_panel(layoutGrid, PARSE_PANEL);
  parse.tree.classlist.add($PANEL_HIDDEN);
  const pp = pp_factory(parse.body.tree);
  init_parsing_panels(pp);

  const test = mount_panel(layoutGrid, TEST_PANEL); // returns { body, ... }
  test.tree.classlist.add($PANEL_HIDDEN);
  test.body.tree.css.setMany(TEST_BODY_OVERRIDEScss);
  const tp = test_panel_factory_offdom();
  tp.mount(test.body.tree); // IMPORTANT: mount first so setText/listeners are safe

  tp.runBtn.listen.onClick(async () => {
    cons.clear();
    cons.setLevel(tp.getLevel());

    tp.setStatus("running");

    const suites = build_suites_for_mode(tp.getMode(), { _test_full_loop });

    const res = await run_suites(suites, cons.onEvent, { bail: false });

    cons.onSummary(res.summary);
    tp.setStatus(res.ok ? "green" : `${res.summary.fail} failing`);
  });

  const cons = create_console(tp.branch);

  tp.runBtn.listen.onClick(async () => {
    cons.clear();
    cons.setLevel("normal");

    const suites: readonly TestSuite[] = [
      make_generated_fixtures_suite({ _test_full_loop }, FIXTURES_GENERATED),
      // add other suites here
    ];
    cons.onEvent({ t: "suite_begin", suite: "debug", totalPlanned: 0 });
    for (const s of suites) {
      tp.appendLine(`${s.suite}: ${s.cases.length} cases`);
    }

    const res = await run_suites(suites, cons.onEvent, { bail: false });
    cons.onSummary(res.summary);
  });

  const gcss = CssManager.globals.invoke();
  LETTER_LOWS.forEach(l => {
    gcss.rule(`demo-${l}-shade`, `.${shade_class(l)}`).setMany({
      color: LETTER_COLORfaded[l]
    });
  });
  gcss.rule('hide-hidden', `.${$PANEL_HIDDEN}`).set.visibility('hidden');
  const [$h, $s, $o, $n] = LETTER_LOWS.map((k) => {
    const span = makeSpanId(headline, `${k}-letter`)
      .setText(HSONlower[k])
      .classlist.add(shade_class(k))
      .css.setMany($T$GHSONcss)
    return span;
  });

  const menuBox = makeDivId(mainContainer, "menu-box")
    .css.setMany(MENU_BOXcss);

  const menu = {
    aboutBtn: makeDivIdTxt(menuBox, `${$ABOUT}-button`, $ABOUT),
    testBtn: makeDivIdTxt(menuBox, `${$TEST}-button`, $TEST),
    parseBtn: makeDivIdTxt(menuBox, `${$PARSE}-button`, $PARSE),
    oklchBtn: makeDivIdTxt(menuBox, `${$OKLCH}-button`, $OKLCH),
    mouseBtn: makeDivIdTxt(menuBox, `${$MOUSE}-button`, $MOUSE),
    consoleBtn: makeDivIdTxt(menuBox, `${$CONSOLE}-button`, $CONSOLE),

  } as const;

  keys_of(menu).forEach((k) => {
    menu[k].css.setMany({
      ...MAIN_TEXTcss,
      color: $cols.blu.sky,
    });
  });


  menu.parseBtn.listen.onClick(ev => {
    parse.tree.classlist.remove($PANEL_HIDDEN)
  });
  menu.testBtn.listen.onClick(ev => {
    test.tree.classlist.remove($PANEL_HIDDEN)

  })

  return relay.ok();
}