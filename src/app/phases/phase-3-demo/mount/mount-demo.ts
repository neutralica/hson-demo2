// mount-demo.ts

import { CssManager, hson, type LiveTree } from "hson-live";
import { mk_div, mk_div_cls, mk_div_id, mk_div_id_cls, mk_div_id_txt, mk_span_id } from "../../../utils/makers";
import { relay, relay_data, relay_void, type OutcomeAsync } from "intrastructure";
import { HSON_WORDcss, DEMO_SCREENcss, DEMOcss, DEMO_HEADLINEcss, MENU_CONTAINERcss, MAIN_MENUcss, MENU_BOXcss, HSON_GRAFFITIcss, HSON_SUBcss, COPYRITEcss, FX_LAYERcss } from "./demo.css";
import { $ABOUT, $BUILD, $FLEURS, $POINT, $OKLCH, $PARSE, $TEST, MENU_OPTIONS, shade_class, HSON_LIVE_GRAFFITIstr, MIN_DESKTOP_WIDTH, COPY_TEXTstr, $MOTES } from "./demo.consts";
import { _clamp01, _clampN1P1, keys_of } from "../../../utils/helpers";
import { _test_full_loop } from "hson-live/diagnostics";
import { $MENU_SHADOW, $PANEL_HIDDEN, MAIN_OKLCHname, MENU_OKLCH, MENU_OKLCHname, GRAF_OKLCHname, MOTE_OKLCHname, TXTcol_CODE, TXTcol_MENU, TXTcol_ACTIVE, øfontSize, GRAFFITIcol, TXTcol_MAIN, WIDGETcol } from "../../../core/consts/ui-consts";
import { HSONlower, LETTER_LOWS } from "../../../core/consts/config.consts";
import { øCOLS } from "../../../core/consts/ui-consts";
import { øHSON_COL } from "../../../core/consts/ui-consts";
import { mount_parsing_panels } from "../demo-parse/pp-factory";
import { mount_build_panels } from "../demo-build/build-mount-init";
import { mount_about_panels } from "../demo-about/mount-about";
import { ABOUT_DOCS } from "../demo-about/about.consts";
import { mount_point_panel } from "../demo-pointer/point-factory";
import { spawn_flower } from "../demo-fleurs/fleurs";
import type { DemoView } from "../../../state/state.types";
import { set_global_css } from "./set-global-css";
import { fmtNum } from "../demo-fleurs/fleurs-cols";
import { mount_test_panels } from "../demo-test/mount-tp";
import { mount_panel_simple } from "../../../ui/panels/panel-simple";
import { debug_state_smoke_test } from "../../../state/smoke-tests/state-smoke-test";
import { get_view, get_widgets, demo_subscribe, set_view, toggle_view, toggle_widget, activate_widget, has_widget } from "../../../state/store2";
import { UI_ROOTcss } from "./demo.css";
import { OKLCH_NEUTRALS, OKLCH_VIBRANT } from "../../../core/consts/oklch.consts";
import { set_alpha } from "../../../core/helpers/color-helpers";
import { FLOWER_FIELDcss, FLOWER_LAYERcss } from "../demo-fleurs/fleurs.css";
import { POINT_SLOTcss, POINT_HOSTcss } from "../demo-pointer/point.css";
import { ALL_MOTEScss } from "../demo-motes/motes.css";
import { mount_oklch } from "../demo-oklch/mount-oklch";
import { mount_panel_spawner } from "../../../widgets/panel-spawner/panel-spawner";
import { mount_motes } from "../demo-motes/mount-motes";

export type MenuKey = typeof MENU_OPTIONS[number];

const _hide = (lt: LiveTree) => { lt.classlist.add($PANEL_HIDDEN) };
const _unhide = (lt: LiveTree) => { lt.classlist.remove($PANEL_HIDDEN) };
const gcss = CssManager.api();

let _testsWired = false;

function after_paint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

export async function mount_demo(stage: LiveTree): OutcomeAsync<void> {
  stage.empty();

  // CHANGED: seed editable page theme vars from concrete defaults before any
  // CSS maps that reference var(--...) are mounted.
  gcss.var.set(MAIN_OKLCHname, TXTcol_MAIN);
  gcss.var.set(MENU_OKLCHname, TXTcol_MENU);
  gcss.var.set(GRAF_OKLCHname, GRAFFITIcol);
  gcss.var.set(MOTE_OKLCHname, set_alpha(OKLCH_VIBRANT.yellowSodium, 0.4));

  const demoLayer = mk_div_id_cls(stage, "demo-layer", "demo").css.setMany(DEMOcss);

  const screen = mk_div_id(demoLayer, "screen")
    .classlist.add("demo screen")
    .css.setMany(DEMO_SCREENcss);
  const fxLayer = mk_div_id(screen, "fx-layer").css.setMany(FX_LAYERcss)

  const fleurLayer = mk_div_id(screen, "fleurs-layer")
    .css.setMany(FLOWER_LAYERcss);
  const graffiti = mk_div_id(screen, "graffiti-layer")
    .text.set(HSON_LIVE_GRAFFITIstr)
    .css.setMany(HSON_GRAFFITIcss);
  const uiRoot = mk_div_id(screen, "ui-root")
    .css.setMany(UI_ROOTcss);
  const menuContainer = mk_div_id(screen, "menu-container")
    .css.setMany(MENU_CONTAINERcss);
  const motesLayer = mk_div_id(screen, "motes")
    .classlist.add("demo motes")
    .css.setMany(ALL_MOTEScss);
  // screen.css.setMany(SIZE_WARNINGcss)
  const copyright = screen.create.footer()
    .id.set("copyright-footer")
    .text.set(COPY_TEXTstr)
    .css.setMany(COPYRITEcss);

  const fleurField = fleurLayer.create.svg()
    .id.set("fleurs-field")
    .attr.setMany({
      xmlns: "http://www.w3.org/2000/svg",
      width: "100%",
      height: "100%",
      preserveAspectRatio: "xMidYMid meet",
    })
    .css.setMany(FLOWER_FIELDcss);
  const rect = fleurLayer.dom.rect();
  if (rect) {
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);

    fleurField.attr.setMany({
      width: fmtNum(w, 0),
      height: fmtNum(h, 0),
      viewBox: `0 0 ${w} ${h}`,
      preserveAspectRatio: "xMidYMid meet",
    });
  }

  function initFleurViewbox(): void {
    const rect = fleurLayer.dom.rect();
    if (!rect) return;

    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);

    fleurField.attr.setMany({
      width: fmtNum(w, 0),
      height: fmtNum(h, 0),
      viewBox: `0 0 ${w} ${h}`,
      preserveAspectRatio: "xMidYMid meet",
    });
  }

  /* main menu & logo heading */
  const headline = mk_div_id(menuContainer, "hson-headline")
    .css.setMany(DEMO_HEADLINEcss);
  const [hLetter, sLetter, oLetter, nLetter] = LETTER_LOWS.map((k) => {
    const span = mk_span_id(headline, `${k}-letter`)
      .text.set(HSONlower[k])
      .classlist.add(shade_class(k))
      .classlist.add('demo-wordmark')
      .css.setMany({
        ...HSON_WORDcss,
        textShadow: $MENU_SHADOW + set_alpha(øHSON_COL[k], 0.4)
          + ", 0 0 58px " + set_alpha(OKLCH_NEUTRALS.pearlIvory, 0.1),
      })
    return span;
  });

  LETTER_LOWS.forEach(l => {
    gcss.rule(`demo-${l}-shade`, `.${shade_class(l)}`).setMany({
      color: øHSON_COL[l],
    });
  });
  mk_div_id_txt(menuContainer, "livedemo-subhead", `liveDemo`)
    .css.setMany(HSON_SUBcss);

  const menuBox = mk_div_id(menuContainer, "menu-box").css.setMany(MENU_BOXcss);
  const mk_btn_txt = (txt: string) => `${txt}`
  const menu = {
    aboutBtn: mk_div_id_txt(menuBox, `${$ABOUT}-button`, mk_btn_txt($ABOUT)),
    testBtn: mk_div_id_txt(menuBox, `${$TEST}-button`, mk_btn_txt($TEST)),
    parseBtn: mk_div_id_txt(menuBox, `${$PARSE}-button`, mk_btn_txt($PARSE)),
    buildBtn: mk_div_id_txt(menuBox, `${$BUILD}-button`, mk_btn_txt($BUILD)),
    fleurBtn: mk_div_id_txt(menuBox, `${$FLEURS}-button`, mk_btn_txt($FLEURS)),
    mouseBtn: mk_div_id_txt(menuBox, `${$POINT}-button`, mk_btn_txt($POINT)),
    oklchBtn: mk_div_id_txt(menuBox, `${$OKLCH}-button`, mk_btn_txt($OKLCH)),
    motesBtn: mk_div_id_txt(menuBox, `${$MOTES}-button`, mk_btn_txt($MOTES)),

  } as const;

  const widgetKeys = ["mouseBtn", "oklchBtn", "motesBtn"]
  keys_of(menu).forEach((k) => {
    const isWidget = widgetKeys.includes(k);
    menu[k]
      .classlist.set(isWidget ? "widget-button" : "view-button")
      .css.setMany({
        ...MAIN_MENUcss,
        color: isWidget ? WIDGETcol : MENU_OKLCH
      });
  });


  /**
   * GLOBAL CSS
  **/

  set_global_css();


  /*************************
   * BUILD DEMOS 
  ************************/
  // const demoSlot = mk_div_id(uiRoot, "demo-slot").css.setMany(DEMO_SLOTcss);
  const pointSlot = mk_div_id(menuContainer, "mouse-slot").css.setMany(POINT_SLOTcss);
  const pointHost = mk_div_id_cls(pointSlot, "mouse-host", $PANEL_HIDDEN).css.setMany(POINT_HOSTcss);


  // views stack in viewSlot
  const parse = mount_panel_simple(uiRoot, "parse");
  const testHost = mount_panel_simple(uiRoot, "test");
  const buildHost = mount_panel_simple(uiRoot, "build");
  const aboutHost = mount_panel_simple(uiRoot, "about");
  const oklchHost = mk_div_id_cls(uiRoot, "oklch", $PANEL_HIDDEN);
  relay_data(mount_about_panels(aboutHost, ABOUT_DOCS));
  relay_data(mount_test_panels(testHost));
  relay_data(mount_parsing_panels(parse));
  relay_data(mount_build_panels(buildHost));
  relay_void(mount_point_panel(pointHost));
  mount_oklch(oklchHost);
  mount_motes(motesLayer);
  activate_widget("motes")
  initFleurViewbox();

  function isMobileDemoWidth(): boolean {
    const rect = stage.dom.rect();
    if (!rect) return false;
    return rect.width <= MIN_DESKTOP_WIDTH;
  }

  const applyView = (): void => {
    const view = get_view();
    const widgets = get_widgets() ?? [];

    _hide(parse);
    _hide(testHost);
    _hide(buildHost);
    _hide(aboutHost);

    if (view === "parse") { _unhide(parse); }
    else if (view === "test") { _unhide(testHost); }
    else if (view === "build") { _unhide(buildHost); }
    else if (view === "about") { _unhide(aboutHost); }

    if (widgets.includes("point")) { _unhide(pointHost); }
    else { _hide(pointHost); }
    if (widgets.includes("oklch")) { _unhide(oklchHost); }
    else { _hide(oklchHost); }
    if (widgets.includes("motes")) { _unhide(motesLayer); }
    else { _hide(motesLayer); }

    apply_menu_active(menu, view);

  };

  demo_subscribe(() => applyView());
  applyView();
  // wait until layout exists before syncing SVG coordinate space
  await after_paint();
  if (isMobileDemoWidth()) {
    set_view("fleurs");
  }
  initFleurViewbox();

  function apply_menu_active(menu: any, view: DemoView): void {
    menu.aboutBtn.data.set("active", view === "about" ? "true" : null);
    menu.testBtn.data.set("active", view === "test" ? "true" : null);
    menu.parseBtn.data.set("active", view === "parse" ? "true" : null);
    menu.buildBtn.data.set("active", view === "build" ? "true" : null);
    menu.fleurBtn.data.set("active", view === "fleurs" ? "true" : null);
    menu.mouseBtn.data.set("active", has_widget("point") ? "true" : null);
    menu.oklchBtn.data.set("active", has_widget("oklch") ? "true" : null);
    menu.motesBtn.data.set("active", has_widget("motes") ? "true" : null);

  }

  screen.css.setMany({
    /* this overwrites the opacity setting above, starting a 15s fade out transition.
     We need to let the first opacity render, otherwise this overwrites first value
     immediately and the warning never displays */
    __after: {
      opacity: "0 !IMPORTANT"
    }
  })


  if (!_testsWired) { _testsWired = true; }
  menu.parseBtn.listen.stopProp().onClick(() => { toggle_view("parse"); });
  menu.testBtn.listen.stopProp().onClick(() => { toggle_view("test"); });
  menu.aboutBtn.listen.stopProp().onClick(() => { toggle_view("about") });
  menu.buildBtn.listen.stopProp().onClick(() => { toggle_view("build"); });
  menu.mouseBtn.listen.stopProp().onClick(() => { toggle_widget("point"); });
  menu.oklchBtn.listen.stopProp().onClick(() => { toggle_widget("oklch"); });
  menu.motesBtn.listen.stopProp().onClick(() => { toggle_widget("motes"); });
  menu.fleurBtn.listen.stopProp().onClick(() => {
    if (get_view() === "fleurs") { fleurField.empty() }
    toggle_view("fleurs")
  })

  demoLayer.listen.document.onKeyDown((ke) => {
    if (ke.key === "ƒ") {
      /* quick keys
      nill for now */
    }
  });

  screen.listen.onClick((ev: MouseEvent) => {
    if (get_view() !== "fleurs") return;

    const rect = fleurLayer.dom.rect();
    if (!rect) return;

    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;

    void spawn_flower(fleurField, x, y);

  });
  // panel style tester
  // mount_panel_spawner(stage);
  debug_state_smoke_test();
  return relay.ok();
}
