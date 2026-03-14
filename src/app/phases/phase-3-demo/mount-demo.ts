// mount-demo.ts

import { CssManager, hson, type LiveTree } from "hson-live";
import { make_div_class, make_div_id, make_div_id_text, make_span_id } from "../../utils/makers";
import { relay, relay_data, type OutcomeAsync } from "intrastructure";
import { $T$GHSONcss, DEMO_SCREEN_FXcss, DEMO_SCREENcss, DEMOcss, DEMO_MAIN_LOGOcss, LAYOUT_GRIDcss, MENU_CONTAINERcss, MAIN_MENUcss, MENU_LISTcss, PANEL_SAFETYcss, TITLE_BOXcss, VIEW_SLOTcss, MOUSE_SLOTcss, HSON_GRAFFITIcss, MENU_TEXT_COL } from "./demo.css";
import { $ABOUT, $BUILD, $FLEURS, $DS, $MOUSE, $OKLCH, $PARSE, $TEST, MENU_OPTIONS, shade_class, HSON_LIVE_GRAFFITIstr } from "./demo.consts";
import { _clamp01, _clampN1P1, keys_of } from "../../utils/helpers";
import { PANELcss, UI_ROOTcss } from "./panels/demo-panels.css";
import { mount_test_panels } from "./demo-test/test-panel-factory";
import { _test_full_loop } from "hson-live/diagnostics";
import type { CaseKey } from "../../../tests/tests.types";
import { $PANEL_HIDDEN } from "../../consts/ui-consts";
import { HSONlower, LETTER_LOWS } from "../../consts/config.consts";
import { $blu_, $cols_, $grn_, $pnk_, $ylw_, ACID_WASH_OKLCH, ACID_WASH_RGBA, LETTER_COLORcandy, LETTER_COLORoklch } from "../../consts/colors.consts";
import { create_test_log } from "../../../tests/test-log";
import type { LoopReport } from "../../../../../hson-live/dist/diagnostics/loop-3.test";
import { get_view, set_view, demo_subscribe, type DemoViews, toggle_view } from "./state";
import { mount_parsing_panels } from "./demo-parse/pp-factory";
import { mount_panel_simple } from "../../ui/panel-simple";
import { bp_factory } from "./demo-build/build";
import { mount_build_panels } from "./demo-build/mount-build-panel";
import { mount_about_panels } from "./demo-about/mount-about";
import { ABOUT_DOCS } from "./demo-about/about.consts";
import { mount_mouse_panel } from "./demo-mouse/mouse-factory";
import { mount_motes } from "./motes2/mount-motes2";
import { MOUSE_HOSTcss } from "./demo-mouse/mouse.css";
import { JSON_FIXTURES_DEV } from "../../../../data-old/data/json-fixtures";
import { FLOWER_FIELDcss, FLOWER_OVERLAYcss } from "./fleurs/fleurs.css";
import { spawn_flower } from "./fleurs/fleurs";
import { ALL_MOTEScss } from "./motes2/motes.css";
import { PP_TEXTWRAPcss } from "./demo-parse/pp.css";
// import { spawn_flower } from "./fleurs/fleurs";

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


  const fleurOverlay = make_div_id(screenFx, "fleurs-overlay")
    .css.setMany(FLOWER_OVERLAYcss);

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
  const graffiti = make_div_id(screenFx, "hson-graffiti").text.set(HSON_LIVE_GRAFFITIstr).css.setMany(HSON_GRAFFITIcss);
  const menuContainer = make_div_id(screenFx, "menu-container").css.setMany(MENU_CONTAINERcss);
  const motes = make_div_id(screenFx, "motes").classlist.add("demo motes").css.setMany(ALL_MOTEScss)
  mount_motes(motes);
  const titleBox = make_div_id(menuContainer, "title-box").css.setMany(TITLE_BOXcss)
  const headline = make_div_id(titleBox, "hson-headline").css.setMany(DEMO_MAIN_LOGOcss);
  const liveDemoSign = make_div_class(headline, "live-demo sign")
    .text.set("hson liveDemo")
    .css.setMany({
      ...PP_TEXTWRAPcss,
      fontFamily: "monaco",
      fontSize: "2rem",
      textWrap: "nowrap",
      lineHeight: "3rem",
      color: ACID_WASH_RGBA.neonGhost,
    });
  const pocSign = make_div_class(headline, "proof sign")
    .text.set("~proof of concept~")
    .css.setMany({
      ...PP_TEXTWRAPcss,
      textAlign: "left",
      fontFamily: "monaco",
      fontSize: "1rem",
      textWrap: "nowrap",
      marginBottom: "1.5rem",
      color: $blu_.muted
    });
  const uiRoot = make_div_id(screenFx, "ui-root").css.setMany(UI_ROOTcss);
  const layoutGrid = make_div_id(uiRoot, "layout-grid").css.setMany(LAYOUT_GRIDcss);
  const menuBox = make_div_id(menuContainer, "menu-box").css.setMany(MENU_LISTcss);

  const menu = {
    aboutBtn: make_div_id_text(menuBox, `${$ABOUT}-button`, `[${$ABOUT}]`),
    testBtn: make_div_id_text(menuBox, `${$TEST}-button`, `[${$TEST}]`),
    parseBtn: make_div_id_text(menuBox, `${$PARSE}-button`, `[${$PARSE}]`),
    buildBtn: make_div_id_text(menuBox, `${$BUILD}-button`, `[${$BUILD}]`),
    // oklchBtn: make_div_id_text(menuBox, `${$OKLCH}-button`, `${$OKLCH}`),
    mouseBtn: make_div_id_text(menuBox, `${$MOUSE}-button`, `[${$MOUSE}]`),
    fleurBtn: make_div_id_text(menuBox, `${$FLEURS}-button`, `[${$FLEURS}]`),

  } as const;

  keys_of(menu).forEach((k) => {
    menu[k]
      .classlist.set("view-button")
      .css.setMany({
        ...MAIN_MENUcss,
      });
  });

  LETTER_LOWS.forEach(l => {
    gcss.rule(`demo-${l}-shade`, `.${shade_class(l)}`).setMany({
      color: LETTER_COLORoklch[l]
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

  gcss.rule("global-scrollbar", "*").setMany({
    scrollbarWidth: "thick",
    scrollbarColor: "rgba(160,220,255,0.45) rgba(0,0,0,0.35)"
  });
  gcss.rule("::-webkit-scrollbar", "::-webkit-scrollbar").setMany({
    width: "30px",
    height: "10px"
  });

  gcss.rule("scroll-thumb-hover", "::-webkit-scrollbar-thumb:hover").setMany({
    background: "rgba(180,230,255,0.65)"
  });

  gcss.rule("scroll-thumb", "::-webkit-scrollbar-thumb").setMany({
    background: "rgba(160,220,255,0.45)",
    borderRadius: "6px",
    border: "2px solid rgba(0,0,0,0.45)"
  });

  gcss.rule("::-webkit-scrollbar-track", "::-webkit-scrollbar-track",).setMany({
    background: "rgba(0,0,0,0.35)"
  });

  gcss.rule("menu-active-view", '.view-button[data-active]',).setMany({
    color: $cols_.bckdeep,
    background: ACID_WASH_RGBA.strawSmoke,
    fontWeight: "100",
    _hover: {
      background: ACID_WASH_RGBA.strawSmoke,
      fontWeight: "100",
      color: $cols_.bckdeep,

    },

  });


  // const [$h, $s, $o, $n] = LETTER_LOWS.map((k) => {
  //   const span = make_span_id(headline, `${k}-letter`)
  //     .text.set(HSONlower[k])
  //     .classlist.add(shade_class(k))
  //     .css.setMany($T$GHSONcss)
  //   return span;
  // });

  // layoutGrid now has two stable slots
  const demoSlot = make_div_id(layoutGrid, "view-slot").css.setMany(VIEW_SLOTcss);
  const mouseSlot = make_div_id(menuContainer, "mouse-slot").css.setMany(MOUSE_SLOTcss);

  const toggleHide = (lt: LiveTree): void => { lt.classlist.toggle($PANEL_HIDDEN); };

  // views stack in viewSlot
  const parse = mount_panel_simple(demoSlot, "parse");
  const test = mount_panel_simple(demoSlot, "test");
  const build = mount_panel_simple(demoSlot, "build");
  const about = mount_panel_simple(demoSlot, "about");
  const mouseHost = make_div_id(mouseSlot, "mouse-host")
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

    _hide(parse);
    _hide(test);
    _hide(build);
    _hide(about);

    if (view === "parse") { _unhide(parse); }
    else if (view === "test") { _unhide(test); }
    else if (view === "build") { _unhide(build); }
    else if (view === "about") { _unhide(about); }

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

  function apply_menu_active(menu: any, view: DemoViews): void {
    menu.aboutBtn.data.set("active", view === "about" ? "true" : null);
    menu.testBtn.data.set("active", view === "test" ? "true" : null);
    menu.parseBtn.data.set("active", view === "parse" ? "true" : null);
    menu.buildBtn.data.set("active", view === "build" ? "true" : null);
    menu.fleurBtn.data.set("active", view === "fleurs" ? "true" : null);
  }

  if (!_testsWired) { _testsWired = true; }
  menu.parseBtn.listen.stopProp().onClick(() => { toggle_view("parse"); });
  menu.testBtn.listen.stopProp().onClick(() => { toggle_view("test"); });
  menu.aboutBtn.listen.stopProp().onClick(() => { toggle_view("about"); });
  menu.buildBtn.listen.stopProp().onClick(() => { toggle_view("build"); });
  menu.fleurBtn.listen.stopProp().onClick(() => {
    if (get_view() === "fleurs") { fleurLayer.empty() }
    toggle_view("fleurs")
  })
  menu.mouseBtn.listen.stopProp().onClick(() => { toggleHide(mouseHost); });
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
