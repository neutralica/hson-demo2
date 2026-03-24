// mount-demo.ts

import { CssManager, hson, type LiveTree } from "hson-live";
import { mk_div_cls, mk_div_id, mk_div_id_txt, mk_span_id } from "../../utils/makers";
import { relay, relay_data, type OutcomeAsync } from "intrastructure";
import { HSON_WORDcss, DEMO_SCREEN_FXcss, DEMO_SCREENcss, DEMOcss, DEMO_MAIN_LOGOcss, LAYOUT_GRIDcss, MENU_CONTAINERcss, MAIN_MENUcss, MENU_BOXcss, PANEL_SAFETYcss, TITLE_BOXcss, VIEW_SLOTcss,  HSON_GRAFFITIcss, MENU_TEXT_COL, MENU_FONT, HSON_SUBcss, COPYRITEcss } from "./demo.css";
import { $ABOUT, $BUILD, $FLEURS, $DS, $MOUSE, $OKLCH, $PARSE, $TEST, MENU_OPTIONS, shade_class, HSON_LIVE_GRAFFITIstr } from "./demo.consts";
import { _clamp01, _clampN1P1, keys_of } from "../../utils/helpers";
import { PANELcss, UI_ROOTcss } from "./panels/demo-panels.css";
import { mount_test_panels } from "./demo-test/tp-factory";
import { _test_full_loop } from "hson-live/diagnostics";
import type { CaseKey } from "../../../tests/tests.types";
import { $PANEL_HIDDEN, $txt_ } from "../../core/consts/ui-consts";
import { HSONlower, LETTER_LOWS } from "../../core/consts/config.consts";
import { $blu_, $cols_, $grn_, $pnk_, $ylw_, ACID_WASH_OKLCH, ACID_WASH_RGBA,  LETTER_COLORoklch } from "../../core/consts/colors.consts";
import { get_view, set_view, demo_subscribe, toggle_view, get_widgets, toggle_widget, set_about_toc_open, get_about_toc_open } from "./state";
import { mount_parsing_panels } from "./demo-parse/pp-factory";
import { mount_panel_simple } from "../../ui/panel-simple";
import { bp_factory } from "./demo-build/build";
import { mount_build_panels } from "./demo-build/mount-build-panel";
import { mount_about_panels } from "./demo-about/mount-about";
import { ABOUT_DOCS } from "./demo-about/about.consts";
import { mount_mouse_panel } from "./demo-mouse/mouse-factory";
import { mount_motes } from "./motes/mount-motes";
import { MOUSE_HOSTcss, MOUSE_SLOTcss } from "./demo-mouse/mouse.css";
import { JSON_FIXTURES_DEV } from "../../../../data-old/data/json-fixtures";
import { FLOWER_FIELDcss, FLOWER_OVERLAYcss } from "./demo-fleurs/fleurs.css";
import { spawn_flower } from "./demo-fleurs/fleurs";
import { ALL_MOTEScss } from "./motes/motes.css";
import { PP_TEXTWRAPcss } from "./demo-parse/pp.css";
import type { DemoView } from "./state/state.types";
import { set_global_css } from "./set-global-css";
import { WARNINGcss } from "./demo-about/about.css";
import { DISP_SIZE_ALERTcss } from "./global.css";
// import { spawn_flower } from "./fleurs/fleurs";

export type MenuKey = typeof MENU_OPTIONS[number];

const _hide = (lt: LiveTree) => { lt.classlist.add($PANEL_HIDDEN) };
const _unhide = (lt: LiveTree) => { lt.classlist.remove($PANEL_HIDDEN) };

let _testsWired = false;

const DEBUG_TEST_SVG ="<svg>...</svg>"

export async function mount_demo(stage: LiveTree): OutcomeAsync<void> {
  stage.empty();

  const svg = stage.create.svg()
  const svg2 = stage.create.svg(DEBUG_TEST_SVG)
  const gcss = CssManager.globals.invoke();

  const demo = mk_div_id(stage, $DS.demo)
    .classlist.add($DS.demo)
    .css.setMany(DEMOcss);

  const screen = mk_div_id(demo, $DS.screen)
    .classlist.add("demo screen")
    .css.setMany(DEMO_SCREENcss)

  const screenFx = mk_div_id(screen, $DS.screenFx)
    .classlist.add("demo screen fx")
    .css.setMany(DEMO_SCREEN_FXcss);

  const fleurOverlay = mk_div_id(screenFx, "fleurs-overlay").css.setMany(FLOWER_OVERLAYcss);
  const graffiti = mk_div_id(screenFx, "hson-graffiti").text.set(HSON_LIVE_GRAFFITIstr).css.setMany(HSON_GRAFFITIcss);
  const uiRoot = mk_div_id(screenFx, "ui-root").css.setMany(UI_ROOTcss);
  const menuContainer = mk_div_id(screenFx, "menu-container").css.setMany(MENU_CONTAINERcss);
  const motes = mk_div_id(screenFx, "motes").classlist.add("demo motes").css.setMany(ALL_MOTEScss)
  // screen.css.setMany(SIZE_WARNINGcss)
  const copyright = screenFx.create.footer().text.set("© 2026 terminal_gothic — hson-live (Public Parity License 7.0)").css.setMany(COPYRITEcss);

  const fleurSvg = fleurOverlay.create.tags(["svg"]).first()!;
  fleurSvg
    .id.set("fleurs-field")
    .css.setMany(FLOWER_FIELDcss)
    .attr.setMany({
      xmlns: "http://www.w3.org/2000/svg",
      width: "100%",
      height: "100%",
      preserveAspectRatio: "xMidYMid meet",
    });

  // create.tags(["g" | "circle" | ...]) currently does not produce rendering
  // HTML nodes when appended after mount: append SVG-rooted flower branches instead
  const fleurLayer = fleurSvg;

  function syncFleurViewbox(): void {
    const rect = fleurOverlay.dom.rect();
    if (!rect) {
      console.log("[fleurs] no overlay rect");
      return;
    }

    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    fleurSvg.attr.set("viewbox", `0 0 ${w} ${h}`);
  }
  mount_motes(motes);



  /* main menu & logo heading */
  const titleBox = mk_div_id(menuContainer, "title-box").css.setMany(TITLE_BOXcss)
  const headline = mk_div_id(titleBox, "hson-headline").css.setMany(DEMO_MAIN_LOGOcss);

  const hsonBox = mk_div_id(headline, "hson-box").css.setMany({
    minHeight: "0",
    display: "flex",
    flexDirection: "column",
  })
  const letterbox = mk_div_id(hsonBox, "letterbox")
  const [$h, $s, $o, $n] = LETTER_LOWS.map((k) => {
    const span = mk_span_id(letterbox, `${k}-letter`)
      .text.set(HSONlower[k])
      .classlist.add(shade_class(k))
      .classlist.add('demo-wordmark')
      .css.setMany(HSON_WORDcss)
    return span;
  });
  mk_div_id(hsonBox, "livedemo-subhead")
    .text.set(`::liveDemo`)
    .css.setMany(HSON_SUBcss);

  const layoutGrid = mk_div_id(uiRoot, "layout-grid").css.setMany(LAYOUT_GRIDcss);
  const menuBox = mk_div_id(menuContainer, "menu-box").css.setMany(MENU_BOXcss);

  const menu = {
    aboutBtn: mk_div_id_txt(menuBox, `${$ABOUT}-button`, `[${$ABOUT}]`),
    testBtn: mk_div_id_txt(menuBox, `${$TEST}-button`, `[${$TEST}]`),
    parseBtn: mk_div_id_txt(menuBox, `${$PARSE}-button`, `[${$PARSE}]`),
    buildBtn: mk_div_id_txt(menuBox, `${$BUILD}-button`, `[${$BUILD}]`),
    fleurBtn: mk_div_id_txt(menuBox, `${$FLEURS}-button`, `[${$FLEURS}]`),
    mouseBtn: mk_div_id_txt(menuBox, `${$MOUSE}-button`, `[${$MOUSE}]`),
    // oklchBtn: make_div_id_text(menuBox, `${$OKLCH}-button`, `${$OKLCH}`),

  } as const;

  const widgetKeys = ["mouseBtn"]
  keys_of(menu).forEach((k) => {
    menu[k]
      .classlist.set(widgetKeys.includes(k) ? "widget-button" : "view-button")
      .css.setMany({
        ...MAIN_MENUcss,
        color: widgetKeys.includes(k) ? ACID_WASH_RGBA.warmAsh : MENU_TEXT_COL,
      });
  });
  const mobileDocBtn = mk_div_id(menu.aboutBtn, "mobile-doc-button")
    .classlist.add($PANEL_HIDDEN);


  LETTER_LOWS.forEach(l => {
    gcss.rule(`demo-${l}-shade`, `.${shade_class(l)}`).setMany({
      color: LETTER_COLORoklch[l]
    });
  });

  /**
   * GLOBAL CSS
  **/

  set_global_css();

  // layoutGrid now has two stable slots
  const demoSlot = mk_div_id(layoutGrid, "view-slot").css.setMany(VIEW_SLOTcss);
  const mouseSlot = mk_div_id(menuContainer, "mouse-slot").css.setMany(MOUSE_SLOTcss);

  // views stack in viewSlot
  const parse = mount_panel_simple(demoSlot, "parse");
  const test = mount_panel_simple(demoSlot, "test");
  const build = mount_panel_simple(demoSlot, "build");
  const about = mount_panel_simple(demoSlot, "about");
  const mouseHost = mk_div_id(mouseSlot, "mouse-host")
    .classlist.add($PANEL_HIDDEN)
    .css.setMany(MOUSE_HOSTcss);
  const mr = relay_data(mount_mouse_panel(mouseHost));
  const ap = relay_data(mount_about_panels(about, ABOUT_DOCS));
  const tp = relay_data(mount_test_panels(test));
  const pp = relay_data(mount_parsing_panels(parse));
  const bp = relay_data(mount_build_panels(build));

  syncFleurViewbox();

  const applyView = (): void => {
    const view = get_view();
    const widgets = get_widgets() ?? [];

    _hide(parse);
    _hide(test);
    _hide(build);
    _hide(about);

    if (view === "parse") { _unhide(parse); }
    else if (view === "test") { _unhide(test); }
    else if (view === "build") { _unhide(build); }
    else if (view === "about") { _unhide(about); }

    if (widgets.includes("mouse")) { _unhide(mouseHost); }
    else { _hide(mouseHost); }

    apply_menu_active(menu, view);

  };
  function after_paint(): Promise<void> {
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });
  }

  demo_subscribe(() => applyView());
  applyView();
  // wait until layout exists before syncing SVG coordinate space
  await after_paint();
  syncFleurViewbox();

  function apply_menu_active(menu: any, view: DemoView): void {
    menu.aboutBtn.data.set("active", view === "about" ? "true" : null);
    menu.testBtn.data.set("active", view === "test" ? "true" : null);
    menu.parseBtn.data.set("active", view === "parse" ? "true" : null);
    menu.buildBtn.data.set("active", view === "build" ? "true" : null);
    menu.fleurBtn.data.set("active", view === "fleurs" ? "true" : null);
    menu.mouseBtn.data.set("active", get_widgets()?.includes("mouse") ? "true" : null);

  }

  screenFx.css.setMany({
    /* this overwrites the opacity setting above, starting a 15s fade out transition.
     We need to let the first opacity render, otherwise this overwrites first value
     immediately and the warning never displays */
    __after: {
    opacity: "0 !IMPORTANT"
  }})

  /* listeners */
  mobileDocBtn.listen.stopProp().onClick(() => {
    if (get_about_toc_open()) {
      set_about_toc_open(false)
    } else {
      set_about_toc_open(true);
    }
  })
  if (!_testsWired) { _testsWired = true; }
  menu.parseBtn.listen.stopProp().onClick(() => { toggle_view("parse"); });
  menu.testBtn.listen.stopProp().onClick(() => { toggle_view("test"); });
  menu.aboutBtn.listen.stopProp().onClick(() => {
    const next = get_view() === "about" ? null : "about";

    set_view(next);
    set_about_toc_open(next === "about");
  });
  menu.buildBtn.listen.stopProp().onClick(() => { toggle_view("build"); });
  menu.fleurBtn.listen.stopProp().onClick(() => {
    if (get_view() === "fleurs") { fleurLayer.empty() }
    toggle_view("fleurs")
  })
  menu.mouseBtn.listen.stopProp().onClick(() => { toggle_widget("mouse"); });
  screenFx.listen.onClick((ev: MouseEvent) => {
    if (get_view() !== "fleurs") return;

    const rect = fleurOverlay.dom.rect();
    if (!rect) return;

    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;

    spawn_flower(fleurLayer, x, y);
  });
  return relay.ok();
}