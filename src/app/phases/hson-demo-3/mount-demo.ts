// mount-demo.ts

import { CssManager, hson, type LiveTree } from "hson-live";
import { makeDivClass, makeDivId, makeDivIdTxt, makeSpanId } from "../../utils/makers";
import { data_sync, outcome, relay, relay_data, type Outcome, type OutcomeAsync, type OutcomeData } from "intrastructure";
import { $T$GHSONcss, DEMO_SCREEN_FXcss, DEMO_SCREENcss, DEMOcss, HEADLINEcss, MAIN_CONTAINERcss, MAIN_TEXTcss, MENU_BOXcss, PANEL_SAFETYcss, TITLE_BOXcss } from "./demo.css";
import { $ABOUT, $BUILD, $CONSOLE, $DS, $MOUSE, $OKLCH, $PARSE, $TEST, MENU_OPTIONS, shade_class } from "./demo.consts";
import { _clamp01, _clampN1P1, keys_of } from "../../utils/helpers";
import { LAYOUT_GRIDcss, TEST_BODY_OVERRIDEScss, UI_ROOTcss } from "./panels/demo-panels.css";
import {  mount_test_panels } from "./test/test-panel-factory";
import { run_test_suites } from "../../../tests/test-runner";
import { _test_full_loop } from "hson-live/diagnostics";
import type { CaseKey, TestEvent, TestSuite } from "../../../tests/tests.types";
import { $PANEL_HIDDEN } from "../../consts/ui-consts";
import { HSONlower, LETTER_LOWS } from "../../consts/config.consts";
import { $blu_, $cols_, LETTER_COLORbleach, LETTER_COLORcandy, LETTER_COLORfaded, LETTER_COLORmuted, LETTER_COLORstd, LETTER_COLORwashed } from "../../consts/colors.consts";
import { create_test_log } from "../../../tests/test-log";
import type { LoopReport } from "../../../../../hson-live/dist/diagnostics/loop-3.test";
import { build_suites_for_mode } from "../../../tests/suite-builder";
import { demo_get_current_view, demo_set_current_view, demo_subscribe } from "./demo-state";
import type { Panels } from "./panels/panels.types";
import { init_parsing_panels } from "./parse/init.pp";
import { mount_parsing_panels, pp_factory } from "./parse/pp-factory";
import { create_inspector } from "./inspect/test-inspector";
import { mount_panel_simple } from "../../ui/panel-simple";
import { bp_factory } from "./build/build";

export type MenuKey = typeof MENU_OPTIONS[number];

const _hide = (lt: LiveTree) => { lt.classlist.add($PANEL_HIDDEN) };
const _unhide = (lt: LiveTree) => { lt.classlist.remove($PANEL_HIDDEN) };

let _testsWired = false;

export async function mount_demo(stage: LiveTree): OutcomeAsync<void> {
  stage.empty();
  const gcss = CssManager.globals.invoke();

  const demo = makeDivId(stage, $DS.demo)
    .classlist.add($DS.demo)
    .css.setMany(DEMOcss);

  const screen = makeDivId(demo, $DS.screen)
    .classlist.add("demo screen")
    .css.setMany(DEMO_SCREENcss)

  const screenFx = makeDivId(screen, $DS.screenFx)
    .classlist.add("demo screen fx")
    .css.setMany(DEMO_SCREEN_FXcss);

  const mainContainer = makeDivId(screenFx, "main-container")
    .css.setMany(MAIN_CONTAINERcss)

  const titleBox = makeDivId(mainContainer, "title-box")
    .css.setMany(TITLE_BOXcss)

  const headline = makeDivId(titleBox, "hson-headline")
    .css.setMany(HEADLINEcss);

  const uiRoot = makeDivId(screenFx, "ui-root")
    .css.setMany(UI_ROOTcss);

  const layoutGrid = makeDivId(uiRoot, "layout-grid")
    .css.setMany(LAYOUT_GRIDcss);

  const menuBox = makeDivId(mainContainer, "menu-box")
    .css.setMany(MENU_BOXcss);

  const menu = {
    aboutBtn: makeDivIdTxt(menuBox, `${$ABOUT}-button`, $ABOUT),
    testBtn: makeDivIdTxt(menuBox, `${$TEST}-button`, $TEST),
    parseBtn: makeDivIdTxt(menuBox, `${$PARSE}-button`, $PARSE),
    buildBtn: makeDivIdTxt(menuBox, `${$BUILD}-button`, $BUILD),
    oklchBtn: makeDivIdTxt(menuBox, `${$OKLCH}-button`, `${$OKLCH}`),
    mouseBtn: makeDivIdTxt(menuBox, `${$MOUSE}-button`, `${$MOUSE}`),
    consoleBtn: makeDivIdTxt(menuBox, `${$CONSOLE}-button`, `${$CONSOLE}`),

  } as const;

  keys_of(menu).forEach((k) => {
    menu[k].css.setMany({
      ...MAIN_TEXTcss,
      color: $blu_.candy,
    });
  });
  LETTER_LOWS.forEach(l => {
    gcss.rule(`demo-${l}-shade`, `.${shade_class(l)}`).setMany({
      color: LETTER_COLORcandy[l]
    });
  });
  gcss.rule('hide-hidden', `.${$PANEL_HIDDEN}`).set.visibility('hidden');
  const [$h, $s, $o, $n] = LETTER_LOWS.map((k) => {
    const span = makeSpanId(headline, `${k}-letter`)
      .text.set(HSONlower[k])
      .classlist.add(shade_class(k))
      .css.setMany($T$GHSONcss)
    return span;
  });

  // CHANGED: layoutGrid now has two stable slots
  const viewSlot = makeDivId(layoutGrid, "view-slot").css.setMany({
    position: "relative",
    minHeight: "0",
    minWidth: "0",
    width: "100%",
    height: "100%",
    overflow: "hidden",
    pointerEvents: "auto",
  });

  // dock slot for “companions” (inspector, etc)
  const dockSlot = makeDivId(layoutGrid, "dock-slot").css.setMany({
    position: "relative",
    minHeight: "0",
    minWidth: "0",
    width: "100%",
    height: "100%",
    overflow: "hidden",
    pointerEvents: "auto",
  });

  // views stack in viewSlot
  const parse = mount_panel_simple(viewSlot, "parse");
  const test = mount_panel_simple(viewSlot, "test");
  test.surface.css.setMany(TEST_BODY_OVERRIDEScss);
  const testRig = relay_data(mount_test_panels(test.surface));
  const build = mount_panel_simple(viewSlot, "build");
  // const inspPanel = mount_panel_simple(dockSlot, "inspect");

  const pp = relay_data(mount_parsing_panels(parse.surface));
  
  const bp = bp_factory(build.surface);


  // inspector wiring stays the same, but stop expecting it to unhide panels
  const tlog = create_test_log();
  const captureMap = new Map<CaseKey, () => Promise<LoopReport>>();

  const applyView = (): void => {
    const view = demo_get_current_view();
    parse.panel.classlist.add($PANEL_HIDDEN);
    test.panel.classlist.add($PANEL_HIDDEN);
    // inspPanel.panel.classlist.add($PANEL_HIDDEN);
    build.panel.classlist.add($PANEL_HIDDEN);
    if (view === "parse") {
      parse.panel.classlist.remove($PANEL_HIDDEN);
    } else if (view === "test") {
      test.panel.classlist.remove($PANEL_HIDDEN);
      // inspPanel.panel.classlist.remove($PANEL_HIDDEN); // dock companion
    }
    else if (view === "build") {
      build.panel.classlist.remove($PANEL_HIDDEN);
    }
  };
  demo_subscribe(() => applyView());
  applyView();

  if (!_testsWired) {
    _testsWired = true;

  }

  menu.parseBtn.listen.onClick(() => {
    demo_set_current_view("parse");
  });

  menu.testBtn.listen.onClick(() => {
    demo_set_current_view("test");
  });

  menu.aboutBtn.listen.onClick(() => {
    demo_set_current_view("about");
  });

  menu.buildBtn.listen.onClick(() => {
    demo_set_current_view("build");
  });
  return relay.ok();
}