// mount-demo.ts

import { LiveTree } from "hson-live/livetree";
import type { SvgLiveTree } from "hson-live/types";
import { _colors } from "../../core/consts/colors.consts";
import { LETTER_LOWS, HSONlower } from "../../core/consts/config.consts";
import { OKLCH_NEUTRALS } from "../../core/consts/oklch.consts";
import { $PANEL_HIDDEN, $MENU_SHADOW } from "../../core/consts/ui-consts";
import { set_alpha } from "../../core/helpers/color-helpers";
import { ABOUT_DOCS } from "../../demos/about/about.consts";
import { mount_about_panels } from "../../demos/about/mount-about";
import mount_bar_bar from "../../demos/bar-bar.ts/mount-bar-bar";
import { mount_build_panels } from "../../demos/build/mount-bp";
import { create_cellsheet_panel } from "../../demos/cellsheet/cellsheet";
import { mount_deck } from "../../demos/deck/mount-deck";
import { spawn_flower } from "../../demos/fleurs/fleurs";
import { fmtNum } from "../../demos/fleurs/fleurs-cols";
import { FLOWER_LAYERcss, FLOWER_FIELDcss } from "../../demos/fleurs/fleurs.css";
import { MOTES_LAYERcss } from "../../demos/motes/motes.css";
import { mount_motes } from "../../demos/motes/mount-motes";
import { mount_oklch } from "../../demos/oklch/mount-oklch";
import { mount_parsing_panels } from "../../demos/parse/pp-factory";
import { mount_point_panel } from "../../demos/pointer/point-factory";
import { mount_json_render_demo } from "../../demos/render/render-json";
import { POINT_SLOTcss, POINT_HOSTcss } from "../../demos/pointer/point.css";
import { mount_test_panels } from "../../demos/test/mount-tp";
import type { TestPanels } from "../../demos/test/tp.types";
import { mount_towl_panel, type TowlPanel } from "../../demos/towl/mount-towl";
import type { DemoView, DemoWidget } from "../../state/state.types";
import { toggle_widget, get_view, toggle_view, activate_widget, get_widgets, demo_subscribe_view_state, set_view, deactivate_widget } from "../../state/store";
import { mount_panel_simple } from "../../ui/panels/panel-simple";
import { mk_div_id_cls, mk_div_id, mk_span_id, mk_div_id_txt } from "../../utils/makers";
import { MENU_OPTIONS, WIDGET_MENU_KEYS, COPY_TEXTstr, shade_class, $PARSE, $TEST, $BUILD, $ABOUT, $BARBAR, $POINT, $OKLCH, $BLING, MIN_DESKTOP_WIDTH, $FLEURS, $CELLS, $TOWL } from "./demo.consts";
import { HSON_LIVE_GRAFFITIstr } from "../../core/consts/ui-consts";
import { DEMOcss, DEMO_SCREENcss, FX_LAYERcss, HSON_GRAFFITIcss, UI_ROOTcss, MENU_CONTAINERcss, COPYRITEcss, DEMO_HEADLINEcss, HSON_WORDcss, HSON_SUBcss, MAIN_MENUcss, OKLCH_HOSTcss, MENU_BOXcss } from "./demo.css";
import { seed_demo_theme_vars, set_global_css } from "./set-global-css";
import { mount_firework } from "../../widgets/wasm-fireworks/wasm-fireworks";
import { make_amoebi } from "../../demos/amoeba/make-amoebi";
import { type AmoebiMenuItem } from "../../demos/amoeba/amoebi.types";


export type MenuKey = typeof MENU_OPTIONS[number];
type DemoMenuView = Exclude<DemoView, null>;
type MenuButtons = Record<MenuKey, LiveTree>;
type ViewHosts = Partial<Record<DemoMenuView, LiveTree>>;
type WidgetHostGroup = readonly LiveTree[];
type WidgetHosts = Partial<Record<DemoWidget, WidgetHostGroup>>;


type DemoStateController = Readonly<{
  // The schema-bound store LiveMap is the single interaction state authority.
  getView: () => DemoView;
  setView: (view: DemoMenuView) => void;
  toggleView: (view: DemoMenuView) => void;
  toggleWidget: (widget: DemoWidget) => void;
  deactivateWidget: (widget: DemoWidget) => void;
}>;

type DemoShell = {
  demoLayer: LiveTree;
  screen: LiveTree;
  fleurLayer: LiveTree;
  fleurField: SvgLiveTree;
  uiRoot: LiveTree;
  graffitiLayer: LiveTree;
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
  cellsHost: LiveTree;
  towlHost: LiveTree;
  oklchHost: LiveTree;
  viewHosts: ViewHosts;
  widgetHosts: WidgetHosts;
};

type DemoContent = {
  test: TestPanels;
  towl: TowlPanel;
};

let stopDemoMount: (() => void) | undefined;

const _hide = (lt: LiveTree): void => { lt.classlist.add($PANEL_HIDDEN); };
const _unhide = (lt: LiveTree): void => { lt.classlist.remove($PANEL_HIDDEN); };

function is_widget_menu_key(key: MenuKey): key is DemoWidget {
  return (WIDGET_MENU_KEYS as readonly string[]).includes(key);
}

function is_demo_menu_key(key: MenuKey): key is DemoMenuView {
  return !is_widget_menu_key(key);
}

function menu_key_from_id(id: string): MenuKey | undefined {
  return (MENU_OPTIONS as readonly string[]).includes(id) ? id as MenuKey : undefined;
}

function active_menu_ids(
  view: DemoView,
  widgets: readonly DemoWidget[],
): readonly string[] {
  return [
    ...(view ? [view] : []),
    ...widgets,
  ];
}
const ISOLATED_WIDGET_IDS:
  readonly DemoWidget[] = [
    "oklch",
    "point",
    "bling",
  ];

function amoebi_menu_items(): readonly AmoebiMenuItem[] {
  return MENU_OPTIONS.map((key) => ({
    id: key,
    label: key,
    tone: is_widget_menu_key(key) ? _colors.txt.widget : _colors.txt.menu,
  }));
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

  fleurField.attrs.setMany({
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

  const graffitiLayer = mk_div_id(screen, "graffiti-layer")
    .text.set(HSON_LIVE_GRAFFITIstr)
    .css.setMany(HSON_GRAFFITIcss);

  const fleurLayer = mk_div_id(screen, "fleurs-layer")
    .css.setMany(FLOWER_LAYERcss);

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
    .attrs.setMany({
      xmlns: "http://www.w3.org/2000/svg",
      width: "100%",
      height: "100%",
      preserveAspectRatio: "xMidYMid meet",
    })
    .css.setMany(FLOWER_FIELDcss);

  sync_fleur_viewbox(fleurLayer, fleurField);

  return { demoLayer, screen, fleurLayer, fleurField, uiRoot, menuContainer, motesLayer, graffitiLayer };
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
        textShadow: $MENU_SHADOW + set_alpha(_colors.hson[k], 0.1)
          + ", 0 0 18px " + set_alpha(OKLCH_NEUTRALS.pearlIvory, 0.1),
      })
      .css.selector(`.${shade_class(k)}`).setMany({
        color: _colors.hson[k],
      });
  });

  mk_div_id_txt(menuContainer, "livedemo-subhead", `liveDemo`)
    .css.setMany(HSON_SUBcss);
}


function create_demo_hosts(uiRoot: LiveTree, menuContainer: LiveTree, motesLayer: LiveTree, graf: LiveTree): DemoHosts {
  const pointSlot = mk_div_id(menuContainer, "mouse-slot").css.setMany(POINT_SLOTcss);
  const pointHost = mk_div_id_cls(pointSlot, "mouse-host", $PANEL_HIDDEN).css.setMany(POINT_HOSTcss);
  const parseHost = mount_panel_simple(uiRoot, $PARSE);
  const testHost = mount_panel_simple(uiRoot, $TEST);
  const buildHost = mount_panel_simple(uiRoot, $BUILD);
  const aboutHost = mount_panel_simple(uiRoot, $ABOUT);
  const barbarHost = mount_panel_simple(uiRoot, $BARBAR);
  const cellsHost = mount_panel_simple(uiRoot, $CELLS);
  const towlHost = mount_panel_simple(uiRoot, $TOWL);
  const oklchHost = mk_div_id_cls(uiRoot, "oklch", $PANEL_HIDDEN).css.setMany({
    ...OKLCH_HOSTcss,

  });

  const viewHosts: ViewHosts = {
    [$PARSE]: parseHost,
    [$TEST]: testHost,
    [$BUILD]: buildHost,
    [$ABOUT]: aboutHost,
    [$BARBAR]: barbarHost,
    [$CELLS]: cellsHost,
    [$TOWL]: towlHost,
  };

  const widgetHosts: WidgetHosts = {
    [$POINT]: [pointHost],
    [$OKLCH]: [oklchHost],
    [$BLING]: [motesLayer, graf],
  };

  return {
    pointHost,
    parseHost,
    testHost,
    buildHost,
    aboutHost,
    barbarHost,
    cellsHost,
    towlHost,
    oklchHost,
    viewHosts,
    widgetHosts,
  };
}


function mount_demo_content(hosts: DemoHosts): DemoContent {
  mount_about_panels(hosts.aboutHost, ABOUT_DOCS);
  const test = mount_test_panels(hosts.testHost);
  const towl = mount_towl_panel(hosts.towlHost);
  mount_parsing_panels(hosts.parseHost);
  mount_build_panels(hosts.buildHost);
  mount_bar_bar(hosts.barbarHost);
  create_cellsheet_panel(hosts.cellsHost);
  mount_point_panel(hosts.pointHost);
  mount_oklch(hosts.oklchHost);

  return { test, towl };
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
    const hosts = widgetHosts[key];
    if (!hosts) return;
    hosts.forEach((host) => {
      if (widgets.includes(key)) _unhide(host);
      else _hide(host);
    });
  });
}


export async function mount_demo(stage: LiveTree): Promise<void> {
  // CHANGED: release remount-persistent bindings before rebuilding the demo tree.
  stopDemoMount?.();
  stopDemoMount = undefined;

  stage.empty();

  seed_demo_theme_vars();

  const shell = create_demo_shell(stage);
  const { demoLayer, screen, fleurLayer, fleurField, uiRoot, menuContainer, motesLayer, graffitiLayer } = shell;

  create_demo_wordmark(menuContainer);

  const menuBox = mk_div_id(menuContainer, "menu-box").css.setMany(MENU_BOXcss);

  set_global_css();

  const hosts = create_demo_hosts(uiRoot, menuContainer, motesLayer, graffitiLayer);
  const { viewHosts, widgetHosts } = hosts;

  const content = mount_demo_content(hosts);
  mount_motes(motesLayer);
  mount_deck(stage);
  activate_widget($BLING);
  sync_fleur_viewbox(fleurLayer, fleurField);
  const demoController: DemoStateController = {
    getView: get_view,
    setView: set_view,
    toggleView: toggle_view,
    toggleWidget: toggle_widget,
    deactivateWidget: deactivate_widget,
  };
  const amoebiMenu = make_amoebi(
    menuBox,
    {
      activeIds: active_menu_ids(
        get_view(),
        get_widgets() ?? [],
      ),
      isolatedIds: ISOLATED_WIDGET_IDS,
      items: amoebi_menu_items(),
      showTitle: false,
      ariaLabel: "Demo navigation",
      onToggle: (id) => {
        const key = menu_key_from_id(id);
        if (!key) return;

        if (is_widget_menu_key(key)) {
          demoController.toggleWidget(key);
          return;
        }

        if (!is_demo_menu_key(key)) return;
        if (key === $FLEURS && demoController.getView() === $FLEURS) fleurField.empty();
        demoController.toggleView(key);
      },
    });
  const applyView = (): void => {
    const view = get_view();
    const widgets = get_widgets() ?? [];

    sync_demo_visibility(viewHosts, widgetHosts, view, widgets);
    amoebiMenu.setActiveIds(
      active_menu_ids(
        view,
        widgets,
      ),
    );
  };

  // CHANGED: render directly from the store's schema-bound LiveMap.
  const stopStoreBindings = demo_subscribe_view_state(applyView);
  stopDemoMount = stopStoreBindings;
  applyView();

  await after_paint();
  if (is_mobile_demo_width(stage)) demoController.setView($FLEURS);
  sync_fleur_viewbox(fleurLayer, fleurField);

  screen.css.setMany({
    __after: {
      opacity: "0 !IMPORTANT"
    }
  });


  // CHANGED: use an explicit document listener so remount teardown can remove it.
  const onDocumentKeyDown = (ke: KeyboardEvent): void => {
    if (ke.key !== "Escape") return;
    demoController.deactivateWidget($OKLCH);
    demoController.deactivateWidget($POINT);
  };

  document.addEventListener("keydown", onDocumentKeyDown);

  stopDemoMount = () => {
    stopStoreBindings();
    content.test.dispose();
    content.towl.dispose();
    document.removeEventListener("keydown", onDocumentKeyDown);
  };

  screen.listen.onClick((ev: MouseEvent) => {
    if (demoController.getView() !== $FLEURS) return;

    const rect = fleurLayer.dom.rect();
    if (!rect) return;

    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;

    void spawn_flower(fleurField, x, y);
  });


  mount_firework(screen);
  return;
}
