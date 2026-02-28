// mount-demo.ts

import { CssManager, hson, type LiveTree } from "hson-live";
import { makeDivId, makeDivIdTxt, makeSpanId } from "../../utils/makers";
import { relay, relay_data, type OutcomeAsync } from "intrastructure";
import { $T$GHSONcss, DEMO_SCREEN_FXcss, DEMO_SCREENcss, DEMOcss, DOCK_SLOTcss, DEMO_MAIN_LOGOcss, LAYOUT_GRIDcss, MENU_CONTAINERcss, MAIN_MENUcss, MENU_LISTcss, PANEL_SAFETYcss, TITLE_BOXcss, VIEW_SLOTcss } from "./demo.css";
import { $ABOUT, $BUILD, $FLEURS, $DS, $MOUSE, $OKLCH, $PARSE, $TEST, MENU_OPTIONS, shade_class } from "./demo.consts";
import { _clamp01, _clampN1P1, keys_of } from "../../utils/helpers";
import { UI_ROOTcss } from "./panels/demo-panels.css";
import { mount_test_panels } from "./demo-test/test-panel-factory";
import { _test_full_loop } from "hson-live/diagnostics";
import type { CaseKey } from "../../../tests/tests.types";
import { $PANEL_HIDDEN } from "../../consts/ui-consts";
import { HSONlower, LETTER_LOWS } from "../../consts/config.consts";
import { $blu_, LETTER_COLORcandy } from "../../consts/colors.consts";
import { create_test_log } from "../../../tests/test-log";
import type { LoopReport } from "../../../../../hson-live/dist/diagnostics/loop-3.test";
import { get_view, set_view, demo_subscribe } from "./demo-state";
import { mount_parsing_panels } from "./demo-parse/pp-factory";
import { mount_panel_simple } from "../../ui/panel-simple";
import { bp_factory } from "./demo-build/build";
import { mount_build_panels } from "./demo-build/mount-build-panel";
import { mount_about_panels } from "./demo-about/mount-about";
import { ABOUT_DOCS } from "./demo-about/about.consts";
import { mount_mouse_panel } from "./mouse/mouse-factory";
import { mount_motes2 } from "./motes2/mount-motes2";

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


  const menuContainer = makeDivId(screenFx, "menu-container")
    .css.setMany(MENU_CONTAINERcss)


  const motes = makeDivId(screenFx, "motes")
    .classlist.add("demo motes")
    .css.setMany({
      position: "fixed",
      left: "0",
      top: "0",
      height: "100%",
      width: "100%",
      pointerEvents: "none",
    })
  mount_motes2(motes);

  const titleBox = makeDivId(menuContainer, "title-box")
    .css.setMany(TITLE_BOXcss)

  const headline = makeDivId(titleBox, "hson-headline")
    .css.setMany(DEMO_MAIN_LOGOcss);

  const uiRoot = makeDivId(screenFx, "ui-root")
    .css.setMany(UI_ROOTcss);

  const layoutGrid = makeDivId(uiRoot, "layout-grid")
    .css.setMany(LAYOUT_GRIDcss);

  const menuBox = makeDivId(menuContainer, "menu-box")
    .css.setMany(MENU_LISTcss);

  const menu = {
    aboutBtn: makeDivIdTxt(menuBox, `${$ABOUT}-button`, $ABOUT),
    testBtn: makeDivIdTxt(menuBox, `${$TEST}-button`, $TEST),
    parseBtn: makeDivIdTxt(menuBox, `${$PARSE}-button`, $PARSE),
    buildBtn: makeDivIdTxt(menuBox, `${$BUILD}-button`, $BUILD),
    oklchBtn: makeDivIdTxt(menuBox, `${$OKLCH}-button`, `${$OKLCH}`),
    mouseBtn: makeDivIdTxt(menuBox, `${$MOUSE}-button`, `${$MOUSE}`),
    consoleBtn: makeDivIdTxt(menuBox, `${$FLEURS}-button`, `${$FLEURS}`),

  } as const;

  keys_of(menu).forEach((k) => {
    menu[k].css.setMany({
      ...MAIN_MENUcss,
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
  const demoSlot = makeDivId(layoutGrid, "view-slot").css.setMany(VIEW_SLOTcss);
  const widgetSlot = makeDivId(layoutGrid, "dock-slot").css.setMany(DOCK_SLOTcss);

  const toggleHide = (lt: LiveTree): void => {
    lt.classlist.toggle($PANEL_HIDDEN);
  };

  // views stack in viewSlot
  const parse = mount_panel_simple(demoSlot, "parse");
  const test = mount_panel_simple(demoSlot, "test");
  const build = mount_panel_simple(demoSlot, "build");
  const about = mount_panel_simple(demoSlot, "about");
  const mouse = mount_panel_simple(widgetSlot, "mouse");

  const ap = relay_data(mount_about_panels(about.surface, ABOUT_DOCS));
  const tp = relay_data(mount_test_panels(test.surface));
  const pp = relay_data(mount_parsing_panels(parse.surface));
  const bp = relay_data(mount_build_panels(build.surface));
  const mr = relay_data(mount_mouse_panel(mouse.surface));
  const applyView = (): void => {
    const view = get_view();
    // main views
    _hide(parse.panel);
    _hide(test.panel);
    _hide(build.panel);
    _hide(about.panel);

    if (view === "parse") _unhide(parse.panel);
    else if (view === "test") _unhide(test.panel);
    else if (view === "build") _unhide(build.panel);
    else if (view === "about") _unhide(about.panel);
  };

  demo_subscribe(() => applyView());
  applyView();

  if (!_testsWired) {
    _testsWired = true;

  }

  menu.parseBtn.listen.onClick(() => {
    set_view("parse");
  });

  menu.testBtn.listen.onClick(() => {
    set_view("test");
  });

  menu.aboutBtn.listen.onClick(() => {
    set_view("about");
  });

  menu.buildBtn.listen.onClick(() => {
    set_view("build");
  });
  menu.mouseBtn.listen.onClick(() => {
    toggleHide(mouse.panel);
  });

  return relay.ok();
}