// mount-demo.ts

import { CssManager, hson, type LiveTree } from "hson-live";
import { make_div_id, make_div_id_text, make_span_id } from "../../utils/makers";
import { relay, relay_data, type OutcomeAsync } from "intrastructure";
import { $T$GHSONcss, DEMO_SCREEN_FXcss, DEMO_SCREENcss, DEMOcss, DEMO_MAIN_LOGOcss, LAYOUT_GRIDcss, MENU_CONTAINERcss, MAIN_MENUcss, MENU_LISTcss, PANEL_SAFETYcss, TITLE_BOXcss, VIEW_SLOTcss, MOUSE_SLOTcss } from "./demo.css";
import { $ABOUT, $BUILD, $FLEURS, $DS, $MOUSE, $OKLCH, $PARSE, $TEST, MENU_OPTIONS, shade_class, HSON_LIVE_GRAFFITI } from "./demo.consts";
import { _clamp01, _clampN1P1, keys_of } from "../../utils/helpers";
import { PANELcss, UI_ROOTcss } from "./panels/demo-panels.css";
import { mount_test_panels } from "./demo-test/test-panel-factory";
import { _test_full_loop } from "hson-live/diagnostics";
import type { CaseKey } from "../../../tests/tests.types";
import { $PANEL_HIDDEN } from "../../consts/ui-consts";
import { HSONlower, LETTER_LOWS } from "../../consts/config.consts";
import { $blu_, $ylw_, ACID_WASH_OKLCH, LETTER_COLORcandy } from "../../consts/colors.consts";
import { create_test_log } from "../../../tests/test-log";
import type { LoopReport } from "../../../../../hson-live/dist/diagnostics/loop-3.test";
import { get_view, set_view, demo_subscribe } from "./state";
import { mount_parsing_panels } from "./demo-parse/pp-factory";
import { mount_panel_simple } from "../../ui/panel-simple";
import { bp_factory } from "./demo-build/build";
import { mount_build_panels } from "./demo-build/mount-build-panel";
import { mount_about_panels } from "./demo-about/mount-about";
import { ABOUT_DOCS } from "./demo-about/about.consts";
import { mount_mouse_panel } from "./demo-mouse/mouse-factory";
import { mount_motes2 } from "./motes2/mount-motes2";
import { MOUSE_HOSTcss } from "./demo-mouse/mouse.css";
import { JSON_FIXTURES_DEV } from "../../../../data-old/data/json-fixtures";

export type MenuKey = typeof MENU_OPTIONS[number];

const _hide = (lt: LiveTree) => { lt.classlist.add($PANEL_HIDDEN) };
const _unhide = (lt: LiveTree) => { lt.classlist.remove($PANEL_HIDDEN) };

let _testsWired = false;

export async function mount_demo(stage: LiveTree): OutcomeAsync<void> {
  stage.empty();
  const gcss = CssManager.globals.invoke();

  const demo = make_div_id(stage, $DS.demo)
    .classlist.add($DS.demo)
    .css.setMany(DEMOcss);

  const screen = make_div_id(demo, $DS.screen)
    .classlist.add("demo screen")
    .css.setMany(DEMO_SCREENcss)

  const screenFx = make_div_id(screen, $DS.screenFx)
    .classlist.add("demo screen fx")
    .css.setMany(DEMO_SCREEN_FXcss);

  const graffiti = make_div_id(screenFx, "hson-graffiti")
    .text.set(HSON_LIVE_GRAFFITI)
    .css.setMany({
      position: "fixed",
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -50%)",
      whiteSpace: "pre",
      fontFamily: "monospace",
      height: "50%",
      width: "50%",
      color: ACID_WASH_OKLCH.bruisedPlum,

    })

  const menuContainer = make_div_id(screenFx, "menu-container")
    .css.setMany(MENU_CONTAINERcss);

  const motes = make_div_id(screenFx, "motes")
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

  const titleBox = make_div_id(menuContainer, "title-box")
    .css.setMany(TITLE_BOXcss)

  const headline = make_div_id(titleBox, "hson-headline")
    .css.setMany(DEMO_MAIN_LOGOcss);

  const uiRoot = make_div_id(screenFx, "ui-root")
    .css.setMany(UI_ROOTcss);

  const layoutGrid = make_div_id(uiRoot, "layout-grid")
    .css.setMany(LAYOUT_GRIDcss);

  const menuBox = make_div_id(menuContainer, "menu-box")
    .css.setMany(MENU_LISTcss);

  const menu = {
    aboutBtn: make_div_id_text(menuBox, `${$ABOUT}-button`, $ABOUT),
    testBtn: make_div_id_text(menuBox, `${$TEST}-button`, $TEST),
    parseBtn: make_div_id_text(menuBox, `${$PARSE}-button`, $PARSE),
    buildBtn: make_div_id_text(menuBox, `${$BUILD}-button`, $BUILD),
    // oklchBtn: make_div_id_text(menuBox, `${$OKLCH}-button`, `${$OKLCH}`),
    mouseBtn: make_div_id_text(menuBox, `${$MOUSE}-button`, `${$MOUSE}`),
    // consoleBtn: make_div_id_text(menuBox, `${$FLEURS}-button`, `${$FLEURS}`),

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
  gcss.rule("ua:form-fields:transparent", "textarea, input, select, button").setMany({
    background: "transparent",
    color: "inherit",
  });

  gcss.rule('hide-hidden', `.${$PANEL_HIDDEN}`).setMany({
    visibility: "hidden",
    height: "0",
    display: "none",
  });

  LETTER_LOWS.forEach(l => {
    gcss.rule(`demo-${l}-shade`, `.${shade_class(l)}`).setMany({
      color: LETTER_COLORcandy[l]
    });
  });

  gcss.rule('hide-hidden', `.${$PANEL_HIDDEN}`).setMany({
    visibility: "hidden",
    height: "0",
    display: "none",
  });

  const [$h, $s, $o, $n] = LETTER_LOWS.map((k) => {
    const span = make_span_id(headline, `${k}-letter`)
      .text.set(HSONlower[k])
      .classlist.add(shade_class(k))
      .css.setMany($T$GHSONcss)
    return span;
  });

  // layoutGrid now has two stable slots
  const demoSlot = make_div_id(layoutGrid, "view-slot").css.setMany(VIEW_SLOTcss);
  const mouseSlot = make_div_id(menuContainer, "mouse-slot").css.setMany(MOUSE_SLOTcss);

  const toggleHide = (lt: LiveTree): void => {
    lt.classlist.toggle($PANEL_HIDDEN);
  };

  // views stack in viewSlot
  const parse = mount_panel_simple(demoSlot, "parse");
  const test = mount_panel_simple(demoSlot, "test");
  const build = mount_panel_simple(demoSlot, "build");
  const about = mount_panel_simple(demoSlot, "about");
  const mouseHost = make_div_id(mouseSlot, "mouse-host")
    .classlist.add($PANEL_HIDDEN)
    .css.setMany(MOUSE_HOSTcss);
  const mr = relay_data(mount_mouse_panel(mouseHost));
  const ap = relay_data(mount_about_panels(about.surface, ABOUT_DOCS));
  const tp = relay_data(mount_test_panels(test.surface));
  const pp = relay_data(mount_parsing_panels(parse.surface));
  const bp = relay_data(mount_build_panels(build.surface));


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
    toggleHide(mouseHost);
  });

  return relay.ok();
}