// mount-demo.ts

import { LiveTree, CssManager } from "hson-live";
import type { SvgLiveTree } from "hson-live/types";
import { relay_data, relay_void, type OutcomeAsync, relay } from "intrastructure";
import  { _cols } from "../../core/consts/colors.consts";
import { LETTER_LOWS, HSONlower } from "../../core/consts/config.consts";
import { OKLCH_NEUTRALS } from "../../core/consts/oklch.consts";
import { $PANEL_HIDDEN, $MENU_SHADOW, MENU_OKLCH } from "../../core/consts/ui-consts";
import { set_alpha } from "../../core/helpers/color-helpers";
import type { Fmt } from "../../core/types/core.types";
import { ABOUT_DOCS } from "../../demos/demo-about/about.consts";
import { mount_about_panels } from "../../demos/demo-about/mount-about";
import mount_bar_bar from "../../demos/demo-bar-bar.ts/mount-bar-bar";
import { mount_build_panels } from "../../demos/demo-build/mount-bp";
import { spawn_flower } from "../../demos/demo-fleurs/fleurs";
import  { fmtNum } from "../../demos/demo-fleurs/fleurs-cols";
import { FLOWER_LAYERcss, FLOWER_FIELDcss } from "../../demos/demo-fleurs/fleurs.css";
import { MOTES_LAYERcss } from "../../demos/demo-motes/motes.css";
import { mount_motes } from "../../demos/demo-motes/mount-motes";
import { mount_oklch } from "../../demos/demo-oklch/mount-oklch";
import { mount_parsing_panels } from "../../demos/demo-parse/pp-factory";
import { mount_point_panel } from "../../demos/demo-pointer/point-factory";
import { mount_json_render_demo } from "../../demos/demo-render/render-json";
import { POINT_SLOTcss, POINT_HOSTcss } from "../../demos/demo-pointer/point.css";
import { mount_test_panels } from "../../demos/demo-test/tp-factory";
import type { TestPanels } from "../../demos/demo-test/tp.types";
import { mount_state_monitor } from "../../state/mount-state";
import type { DemoView, DemoWidget } from "../../state/state.types";
import { has_widget, toggle_widget, get_view, toggle_view, activate_widget, get_widgets, demo_subscribe, set_view, deactivate_widget } from "../../state/store";
import { mount_panel_simple } from "../../ui/panels/panel-simple";
import type { Panels } from "../../ui/panels/panels.types";
import { mk_div_id_cls, mk_div_id, mk_span_id, mk_div_id_txt } from "../../utils/makers";
import { MENU_OPTIONS, WIDGET_MENU_KEYS, HSON_LIVE_GRAFFITIstr, COPY_TEXTstr, shade_class, $PARSE, $TEST, $BUILD, $ABOUT, $BARBAR, $POINT, $OKLCH, $MOTES, $MONITOR, MIN_DESKTOP_WIDTH, $FLEURS, $RENDER } from "./demo.consts";
import { DEMOcss, DEMO_SCREENcss, FX_LAYERcss, HSON_GRAFFITIcss, UI_ROOTcss, MENU_CONTAINERcss, COPYRITEcss, DEMO_HEADLINEcss, HSON_WORDcss, HSON_SUBcss, MAIN_MENUcss, OKLCH_HOSTcss, MENU_BOXcss } from "./demo.css";
import { seed_demo_theme_vars, set_global_css } from "./set-global-css";


export type MenuKey = typeof MENU_OPTIONS[number];
type DemoMenuView = Exclude<DemoView, null>;
type MenuButtons = Record<MenuKey, LiveTree>;
type ViewHosts = Partial<Record<DemoMenuView, LiveTree>>;
type WidgetHosts = Partial<Record<DemoWidget, LiveTree>>;

type DemoShell = {
  demoLayer: LiveTree;
  screen: LiveTree;
  fleurLayer: LiveTree;
  fleurField: SvgLiveTree;
  uiRoot: LiveTree;
  menuContainer: LiveTree;
  motesLayer: LiveTree;
};

type DemoHosts = {
  pointHost: LiveTree;
  parseHost: LiveTree;
  testHost: LiveTree;
  buildHost: LiveTree;
  aboutHost: LiveTree;
  barbarHost: LiveTree;
  renderHost: LiveTree;
  oklchHost: LiveTree;
  monitorHost: LiveTree;
  viewHosts: ViewHosts;
  widgetHosts: WidgetHosts;
};

type DemoContent = {
  parse: Panels;
  test: TestPanels;
};

type ParseCandidate = {
  fmt: Fmt;
  text: string;
};

export const gcss = CssManager.api();

const _hide = (lt: LiveTree): void => { lt.classlist.add($PANEL_HIDDEN); };
const _unhide = (lt: LiveTree): void => { lt.classlist.remove($PANEL_HIDDEN); };

function is_widget_menu_key(key: MenuKey): key is DemoWidget {
  return (WIDGET_MENU_KEYS as readonly string[]).includes(key);
}

function is_demo_menu_key(key: MenuKey): key is DemoMenuView {
  return !is_widget_menu_key(key);
}

function after_paint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

function sync_fleur_viewbox(fleurLayer: LiveTree, fleurField: SvgLiveTree): void {
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

function create_demo_shell(stage: LiveTree): DemoShell {
  const demoLayer = mk_div_id_cls(stage, "demo-layer", "demo").css.setMany(DEMOcss);
  const screen = mk_div_id(demoLayer, "screen")
    .classlist.add("demo screen")
    .css.setMany(DEMO_SCREENcss);

  mk_div_id(screen, "fx-layer").css.setMany(FX_LAYERcss);

  const fleurLayer = mk_div_id(screen, "fleurs-layer")
    .css.setMany(FLOWER_LAYERcss);

  mk_div_id(screen, "graffiti-layer")
    .text.set(HSON_LIVE_GRAFFITIstr)
    .css.setMany(HSON_GRAFFITIcss);

  const uiRoot = mk_div_id(screen, "ui-root")
    .css.setMany(UI_ROOTcss);

  const menuContainer = mk_div_id(screen, "menu-container")
    .css.setMany(MENU_CONTAINERcss);

  const motesLayer = mk_div_id(screen, "motes")
    .classlist.add("demo motes")
    .css.setMany(MOTES_LAYERcss);

  screen.create.footer()
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

  sync_fleur_viewbox(fleurLayer, fleurField);

  return { demoLayer, screen, fleurLayer, fleurField, uiRoot, menuContainer, motesLayer };
}

function create_demo_wordmark(menuContainer: LiveTree): void {
  const headline = mk_div_id(menuContainer, "hson-headline")
    .css.setMany(DEMO_HEADLINEcss);

  LETTER_LOWS.forEach((k) => {
    mk_span_id(headline, `${k}-letter`)
      .text.set(HSONlower[k])
      .classlist.add(shade_class(k))
      .classlist.add("demo-wordmark")
      .css.setMany({
        ...HSON_WORDcss,
        textShadow: $MENU_SHADOW + set_alpha(_cols.hson[k], 0.1)
          + ", 0 0 58px " + set_alpha(OKLCH_NEUTRALS.pearlIvory, 0.1),
      });
  });

  LETTER_LOWS.forEach(l => {
    gcss.rule(`demo-${l}-shade`, `.${shade_class(l)}`).setMany({
      color: _cols.hson[l],
    });
  });

  mk_div_id_txt(menuContainer, "livedemo-subhead", `liveDemo`)
    .css.setMany(HSON_SUBcss);
}

function create_demo_menu(menuBox: LiveTree): MenuButtons {
  const menu = {} as MenuButtons;

  MENU_OPTIONS.forEach((key) => {
    const isWidget = is_widget_menu_key(key);
    menu[key] = mk_div_id_txt(menuBox, `${key}-button`, key)
      .classlist.set(isWidget ? "widget-button" : "view-button")
      .css.setMany({
        ...MAIN_MENUcss,
        color: isWidget ? _cols.txt.widget : MENU_OKLCH
      });
  });

  return menu;
}

function create_demo_hosts(uiRoot: LiveTree, menuContainer: LiveTree, motesLayer: LiveTree): DemoHosts {
  const pointSlot = mk_div_id(menuContainer, "mouse-slot").css.setMany(POINT_SLOTcss);
  const pointHost = mk_div_id_cls(pointSlot, "mouse-host", $PANEL_HIDDEN).css.setMany(POINT_HOSTcss);
  const parseHost = mount_panel_simple(uiRoot, $PARSE);
  const testHost = mount_panel_simple(uiRoot, $TEST);
  const buildHost = mount_panel_simple(uiRoot, $BUILD);
  const aboutHost = mount_panel_simple(uiRoot, $ABOUT);
  const barbarHost = mount_panel_simple(uiRoot, $BARBAR);
  const renderHost = mount_panel_simple(uiRoot, $RENDER);
  const oklchHost = mk_div_id_cls(uiRoot, "oklch", $PANEL_HIDDEN).css.setMany({
    ...OKLCH_HOSTcss,
    top: "calc(50% + 0.5rem)",
    right: "1rem",
    bottom: "1rem",
    left: "auto",
    width: "min(36rem, calc(100% - 2rem))",
    maxHeight: "calc(50% - 1.5rem)",
    boxSizing: "border-box",
    overflow: "auto",
  });
  const monitorHost = mk_div_id_cls(uiRoot, "monitor", $PANEL_HIDDEN).css.setMany({
    position: "absolute",
    top: "1rem",
    right: "1rem",
    bottom: "calc(50% + 0.5rem)",
    width: "min(36rem, calc(100% - 2rem))",
    zIndex: "40",
    overflow: "hidden",
    border: "1px solid color-mix(in oklch, currentColor 18%, transparent)",
    background: "color-mix(in oklch, black 72%, transparent)",
    backdropFilter: "blur(10px)",
  });

  const viewHosts: ViewHosts = {
    [$PARSE]: parseHost,
    [$TEST]: testHost,
    [$BUILD]: buildHost,
    [$ABOUT]: aboutHost,
    [$BARBAR]: barbarHost,
    [$RENDER]: renderHost,
  };

  const widgetHosts: WidgetHosts = {
    [$POINT]: pointHost,
    [$OKLCH]: oklchHost,
    [$MOTES]: motesLayer,
    [$MONITOR]: monitorHost,
  };

  return {
    pointHost,
    parseHost,
    testHost,
    buildHost,
    aboutHost,
    barbarHost,
    renderHost,
    oklchHost,
    monitorHost,
    viewHosts,
    widgetHosts,
  };
}


function mount_demo_content(hosts: DemoHosts): DemoContent {
  relay_data(mount_about_panels(hosts.aboutHost, ABOUT_DOCS));
  const test = relay_data(mount_test_panels(hosts.testHost));
  const parse = relay_data(mount_parsing_panels(hosts.parseHost));
  relay_data(mount_build_panels(hosts.buildHost));
  mount_state_monitor(hosts.monitorHost);
  relay_void(mount_bar_bar(hosts.barbarHost));
  mount_json_render_demo(hosts.renderHost);
  relay_void(mount_point_panel(hosts.pointHost));
  mount_oklch(hosts.oklchHost);

  return { parse, test };
}

function get_parse_candidate(parse: Panels, preferredFmt?: Fmt): ParseCandidate | undefined {
  const fallback: readonly Fmt[] = ["json", "hson", "html"];
  const fmts: readonly Fmt[] = preferredFmt
    ? [preferredFmt, ...fallback.filter((fmt) => fmt !== preferredFmt)]
    : fallback;

  for (const fmt of fmts) {
    const panel = parse.panels[fmt];
    if (!panel) continue;

    const raw = panel.textarea.form.getValue();
    const text = typeof raw === "string" ? raw : String(raw ?? "");
    if (text.trim().length > 0) return { fmt, text };
  }

  return undefined;
}

function wire_parse_test_bridge(parse: Panels, test: TestPanels): void {
  const testPanel = (test.tp ?? test) as any;
  if (typeof testPanel.setExternalAction !== "function") return;

  let activeFmt: Fmt | undefined;

  const sync = (): void => {
    testPanel.setExternalAction({
      label: "test parse",
      isEnabled: () => Boolean(get_parse_candidate(parse, activeFmt)),
      run: () => {
        const candidate = get_parse_candidate(parse, activeFmt);
        if (!candidate) return;

        if (typeof testPanel.runAdHocTransform === "function") {
          return testPanel.runAdHocTransform(candidate.fmt, candidate.text);
        }

        testPanel.clearLogs?.();
        testPanel.setLog?.(`[parse] ${candidate.fmt} ${candidate.text.length} bytes`);
        testPanel.setLog?.(candidate.text.slice(0, 600));
        if (candidate.text.length > 600) testPanel.setLog?.("…");
      },
    });
  };

  Object.values(parse.panels).forEach((panel) => {
    const markActiveAndSync = (): void => {
      activeFmt = panel.fmt;
      sync();
    };

    panel.textarea.listen.on("input", markActiveAndSync);
    panel.textarea.listen.on("change", markActiveAndSync);
  });

  sync();
}

function is_mobile_demo_width(stage: LiveTree): boolean {
  const rect = stage.dom.rect();
  if (!rect) return false;
  return rect.width <= MIN_DESKTOP_WIDTH;
}

function sync_demo_visibility(viewHosts: ViewHosts, widgetHosts: WidgetHosts, view: DemoView, widgets: DemoWidget[]): void {
  Object.values(viewHosts).forEach((host) => host && _hide(host));
  const activeHost = view ? viewHosts[view] : undefined;
  if (activeHost) _unhide(activeHost);

  WIDGET_MENU_KEYS.forEach((key) => {
    const host = widgetHosts[key];
    if (!host) return;
    if (widgets.includes(key)) _unhide(host);
    else _hide(host);
  });
}

function apply_menu_active(menu: MenuButtons, view: DemoView): void {
  MENU_OPTIONS.forEach((key) => {
    const active = is_widget_menu_key(key)
      ? has_widget(key)
      : view === key;
    menu[key].data.set("active", active ? "true" : null);
  });
}

function wire_demo_menu(menu: MenuButtons, fleurField: SvgLiveTree): void {
  MENU_OPTIONS.forEach((key) => {
    menu[key].listen.stopProp().onClick(() => {
      if (is_widget_menu_key(key)) {
        toggle_widget(key);
        return;
      }

      if (!is_demo_menu_key(key)) return;
      if (key === $FLEURS && get_view() === $FLEURS) fleurField.empty();
      toggle_view(key);
    });
  });
}

export async function mount_demo(stage: LiveTree): OutcomeAsync<void> {
  stage.empty();

  seed_demo_theme_vars();

  const shell = create_demo_shell(stage);
  const { demoLayer, screen, fleurLayer, fleurField, uiRoot, menuContainer, motesLayer } = shell;

  create_demo_wordmark(menuContainer);

  const menuBox = mk_div_id(menuContainer, "menu-box").css.setMany(MENU_BOXcss);
  const menu = create_demo_menu(menuBox);

  set_global_css();

  const hosts = create_demo_hosts(uiRoot, menuContainer, motesLayer);
  const { viewHosts, widgetHosts } = hosts;

  const content = mount_demo_content(hosts);
  wire_parse_test_bridge(content.parse, content.test);
  mount_motes(motesLayer);
  activate_widget($MOTES);
  sync_fleur_viewbox(fleurLayer, fleurField);

  const applyView = (): void => {
    const view = get_view();
    const widgets = get_widgets() ?? [];

    sync_demo_visibility(viewHosts, widgetHosts, view, widgets);
    apply_menu_active(menu, view);
  };

  demo_subscribe(() => applyView());
  applyView();

  await after_paint();
  if (is_mobile_demo_width(stage)) set_view("fleurs");
  sync_fleur_viewbox(fleurLayer, fleurField);

  screen.css.setMany({
    __after: {
      opacity: "0 !IMPORTANT"
    }
  });

  wire_demo_menu(menu, fleurField);

  demoLayer.listen.document.onKeyDown((ke) => {
    if (ke.key === "Escape") {
      deactivate_widget($OKLCH);
      deactivate_widget($POINT);
      deactivate_widget($MONITOR);
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

  return relay.ok();
}
