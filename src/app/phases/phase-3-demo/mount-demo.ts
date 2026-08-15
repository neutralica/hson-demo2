import { LiveTree } from "hson-live/livetree";
import type { SvgLiveTree } from "hson-live/types";
import { _colors } from "../../core/consts/colors.consts";
import { LETTER_LOWS, HSONlower } from "../../core/consts/config.consts";
import { OKLCH_NEUTRALS } from "../../core/consts/oklch.consts";
import { $PANEL_HIDDEN, $MENU_SHADOW, HSON_LIVE_GRAFFITIstr } from "../../core/consts/ui-consts";
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
import { POINT_SLOTcss, POINT_HOSTcss } from "../../demos/pointer/point.css";
import { mount_test_panels } from "../../demos/tests/panel/mount-tp";
import { mount_towl_panel } from "../../demos/towl/mount-towl";
import { classify_towl_room_url, create_towl_room_url, is_direct_towl_path, towl_departure_url } from "../../demos/towl/towl.room";
import mount_color_sudoku from "../../demos/mount-color-sudoku";
import { make_amoebi } from "../../demos/amoeba/make-amoebi";
import type { AmoebiMenuItem } from "../../demos/amoeba/amoebi.types";
import type { DemoView, DemoWidget, MainViewId, WidgetId } from "../../state/state.types";
import type { PublicMainViewId } from "../../state/shell-ids";
import { MAIN_VIEW_IDS, PUBLIC_MAIN_VIEW_IDS, WIDGET_IDS } from "../../state/shell-ids";
import { demo_shell_locations, set_view, toggle_view, deactivate_widget, toggle_widget } from "../../state/store";
import { write_bling_preference } from "../../state/local-preferences";
import { mount_panel_simple } from "../../ui/panels/panel-simple";
import { mk_div_id_cls, mk_div_id, mk_span_id } from "../../utils/makers";
import {
  MENU_OPTIONS,
  WIDGET_MENU_KEYS,
  COPY_TEXTstr,
  shade_class,
  $PARSE,
  $TEST,
  $BUILD,
  $ABOUT,
  $BARBAR,
  $POINT,
  $OKLCH,
  $FLEURS,
  $CELLS,
  $TOWL,
} from "./demo.consts";
import {
  DEMOcss,
  DEMO_SCREENcss,
  FX_LAYERcss,
  HSON_GRAFFITIcss,
  UI_ROOTcss,
  MENU_CONTAINERcss,
  COPYRITEcss,
  DEMO_HEADLINEcss,
  HSON_WORDcss,
  HSON_SUBcss,
  MAIN_MENUcss,
  PLAIN_MENU_ROOTcss,
  PLAIN_MENU_MARKERcss,
  OKLCH_HOSTcss,
  MENU_BOXcss,
} from "./demo.css";
import { seed_demo_theme_vars, set_global_css } from "./set-global-css";
import { mount_firework, type FireworkController } from "../../widgets/wasm-fireworks/wasm-fireworks";
import {
  create_shell_lifecycle_reconciler,
  type SurfaceController,
  type SurfaceRegistration,
} from "./shell-lifecycle";

export type MenuKey = typeof MENU_OPTIONS[number];
type DemoMenuView = PublicMainViewId;

export type DemoShellController = SurfaceController & Readonly<{
  root: LiveTree;
}>;

export type DemoMountOptions = Readonly<{
  directTowlEntry?: boolean;
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

type PlainMenuApi = Readonly<{
  root: LiveTree;
  setActiveIds(ids: readonly string[]): void;
  dispose(): void;
}>;

let activeDemoShell: DemoShellController | undefined;

const _hide = (tree: LiveTree): void => { tree.classlist.add($PANEL_HIDDEN); };
const _unhide = (tree: LiveTree): void => { tree.classlist.remove($PANEL_HIDDEN); };

function is_widget_menu_key(key: MenuKey): key is DemoWidget {
  return (WIDGET_MENU_KEYS as readonly string[]).includes(key);
}

function is_demo_menu_key(key: MenuKey): key is DemoMenuView {
  return !is_widget_menu_key(key);
}

function menu_key_from_id(id: string): MenuKey | undefined {
  return (MENU_OPTIONS as readonly string[]).includes(id) ? id as MenuKey : undefined;
}

function active_menu_ids(view: DemoView, widgets: readonly WidgetId[]): readonly string[] {
  const publicView = view !== null && (PUBLIC_MAIN_VIEW_IDS as readonly string[]).includes(view)
    ? [view]
    : [];
  return [...publicView, ...widgets];
}

function amoebi_menu_items(): readonly AmoebiMenuItem[] {
  return MENU_OPTIONS.map((key) => ({
    id: key,
    label: key,
    tone: is_widget_menu_key(key) ? _colors.txt.widget : _colors.txt.menu,
  }));
}

function make_plain_menu(menuBox: LiveTree, onToggle: (key: MenuKey) => void): PlainMenuApi {
  const root = menuBox.create.div()
    .id.set("plain-menu-demo")
    .attrs.setMany({ role: "group", "aria-label": "Demo navigation", "data-navigation-skin": "plain" })
    .css.setMany(PLAIN_MENU_ROOTcss);
  root.css.selector("& .plain-menu-marker").setMany(PLAIN_MENU_MARKERcss);
  root.css.selector("& .plain-menu-marker::before").set.content("");
  root.css.selector("& button:hover .plain-menu-marker::before").set.content(">>");
  root.css.selector("& button:focus-visible .plain-menu-marker::before").set.content(">>");
  root.css.selector("& button[data-active] .plain-menu-marker::before").set.content(">");
  root.css.selector("& button[data-active]:hover .plain-menu-marker::before").set.content("X");
  root.css.selector("& button[data-active]:focus-visible .plain-menu-marker::before").set.content("X");
  const buttons = new Map<MenuKey, LiveTree>();
  const release: Array<() => void> = [];
  for (const key of MENU_OPTIONS) {
    const widget = is_widget_menu_key(key);
    const button = root.create.button()
      .id.set(`${key}-button`)
      .classlist.set(widget ? "widget-button" : "view-button")
      .attrs.setMany({ type: "button", "aria-label": key, "aria-pressed": "false", "data-menu-key": key })
      .css.setMany({ ...MAIN_MENUcss, color: widget ? _colors.txt.widget : _colors.txt.menu });
    button.create.span().classlist.set("plain-menu-marker").attrs.set("aria-hidden", "true");
    button.create.span().classlist.set("plain-menu-label").text.set(key);
    const listener = button.listen.stopProp().onClick(() => onToggle(key));
    release.push(() => listener.off());
    buttons.set(key, button);
  }
  return Object.freeze({
    root,
    setActiveIds(ids) {
      const active = new Set(ids);
      for (const [key, button] of buttons) {
        const selected = active.has(key);
        button.data.set("active", selected ? "true" : null);
        button.attrs.set("aria-pressed", selected ? "true" : "false");
      }
    },
    dispose() {
      for (const off of release.splice(0)) off();
      if (!root.isDisposed) root.remove();
    },
  });
}

function after_paint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

function sync_fleur_viewbox(fleurLayer: LiveTree, fleurField: SvgLiveTree): void {
  const rect = fleurLayer.dom.rect();
  if (!rect) return;

  const width = Math.max(1, rect.width);
  const height = Math.max(1, rect.height);
  fleurField.attrs.setMany({
    width: fmtNum(width, 0),
    height: fmtNum(height, 0),
    viewBox: `0 0 ${width} ${height}`,
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
    .classlist.add($PANEL_HIDDEN)
    .css.setMany(HSON_GRAFFITIcss);

  const fleurLayer = mk_div_id(screen, "fleurs-layer")
    .classlist.add($PANEL_HIDDEN)
    .css.setMany(FLOWER_LAYERcss);

  const uiRoot = mk_div_id(screen, "ui-root")
    .attrs.set("data-testid", "demo-main-outlet")
    .css.setMany(UI_ROOTcss);

  const menuContainer = mk_div_id(screen, "menu-container")
    .css.setMany(MENU_CONTAINERcss);

  const motesLayer = mk_div_id(screen, "motes")
    .classlist.add("demo motes")
    .classlist.add($PANEL_HIDDEN)
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
  return { demoLayer, screen, fleurLayer, fleurField, uiRoot, graffitiLayer, menuContainer, motesLayer };
}

function create_demo_wordmark(menuContainer: LiveTree): void {
  const headline = mk_div_id(menuContainer, "hson-headline").css.setMany(DEMO_HEADLINEcss);
  LETTER_LOWS.forEach((key) => {
    mk_span_id(headline, `${key}-letter`)
      .text.set(HSONlower[key])
      .classlist.add(shade_class(key))
      .classlist.add("demo-wordmark")
      .css.setMany({
        ...HSON_WORDcss,
        textShadow: $MENU_SHADOW + set_alpha(_colors.hson[key], 0.1)
          + ", 0 0 18px " + set_alpha(OKLCH_NEUTRALS.pearlIvory, 0.1),
      })
      .css.selector(`.${shade_class(key)}`).setMany({ color: _colors.hson[key] });
  });

  const subhead = mk_div_id(menuContainer, "livedemo-subhead").css.setMany(HSON_SUBcss);
  subhead.create.span()
    .classlist.set("plain-menu-marker")
    .attrs.set("aria-hidden", "true")
    .css.setMany(PLAIN_MENU_MARKERcss);
  subhead.create.span().classlist.set("livedemo-label").text.set("liveDemo");
}

function host_controller(host: LiveTree, cleanup: () => void = () => undefined): SurfaceController {
  let disposed = false;
  return Object.freeze({
    activate: () => _unhide(host),
    deactivate: () => _hide(host),
    dispose: () => {
      if (disposed) return;
      disposed = true;
      try {
        cleanup();
      } finally {
        if (!host.isDisposed) host.remove();
      }
    },
  });
}

function main_host(uiRoot: LiveTree, id: MainViewId): LiveTree {
  return mount_panel_simple(uiRoot, id)
    .data.set("shell-main-surface", id);
}

function make_main_registrations(
  shell: DemoShell,
  onTowlBack: () => void,
  onTowlLeave: () => void,
): Record<MainViewId, SurfaceRegistration> {
  const mount = (
    id: MainViewId,
    factory: (host: LiveTree) => void | (() => void),
  ): SurfaceController => {
    const host = main_host(shell.uiRoot, id);
    const cleanup = factory(host) ?? (() => undefined);
    return host_controller(host, cleanup);
  };

  const registrations = {
    [$ABOUT]: {
      retention: "recreate",
      mount: () => mount($ABOUT, (host) => { mount_about_panels(host, ABOUT_DOCS); }),
    },
    [$TEST]: {
      retention: "retain",
      mount: () => mount($TEST, (host) => {
        const panels = mount_test_panels(host);
        return panels.dispose;
      }),
    },
    [$PARSE]: {
      retention: "recreate",
      mount: () => mount($PARSE, (host) => {
        const panels = mount_parsing_panels(host);
        return panels.dispose;
      }),
    },
    [$BUILD]: {
      retention: "recreate",
      mount: () => mount($BUILD, (host) => { mount_build_panels(host); }),
    },
    [$BARBAR]: {
      retention: "recreate",
      mount: () => mount($BARBAR, (host) => {
        const panel = mount_bar_bar(host);
        return panel.dispose;
      }),
    },
    [$TOWL]: {
      retention: "recreate",
      mount: () => mount($TOWL, (host) => {
        const panel = mount_towl_panel(host, { onBack: onTowlBack, onLeave: onTowlLeave });
        return panel.dispose;
      }),
    },
    [$CELLS]: {
      retention: "retain",
      mount: () => {
        const host = main_host(shell.uiRoot, $CELLS);
        const panel = create_cellsheet_panel(host);
        let disposed = false;
        return Object.freeze({
          activate: () => {
            panel.activate();
            _unhide(host);
          },
          deactivate: () => {
            panel.deactivate();
            _hide(host);
          },
          dispose: () => {
            if (disposed) return;
            disposed = true;
            panel.dispose();
            if (!host.isDisposed) host.remove();
          },
        });
      },
    },
    [$FLEURS]: {
      retention: "recreate",
      mount: () => {
        let disposed = false;
        _unhide(shell.fleurLayer);
        sync_fleur_viewbox(shell.fleurLayer, shell.fleurField);
        return Object.freeze({
          activate: () => {
            _unhide(shell.fleurLayer);
            sync_fleur_viewbox(shell.fleurLayer, shell.fleurField);
          },
          deactivate: () => _hide(shell.fleurLayer),
          dispose: () => {
            if (disposed) return;
            disposed = true;
            shell.fleurField.empty();
            _hide(shell.fleurLayer);
          },
        });
      },
    },
    "color-sudoku": {
      retention: "recreate",
      mount: () => mount("color-sudoku", (host) => {
        host.css.setMany({ overflow: "auto" });
        const rig = mount_color_sudoku(host);
        return rig.dispose;
      }),
    },
  } satisfies Record<MainViewId, SurfaceRegistration>;

  return registrations;
}

function make_widget_registrations(
  shell: DemoShell,
  pointSlot: LiveTree,
  setBlingPresentation: (enabled: boolean) => void,
): Record<WidgetId, SurfaceRegistration> {
  const registrations = {
    [$POINT]: {
      retention: "recreate",
      mount: () => {
        const host = mk_div_id(pointSlot, "mouse-host")
          .data.set("shell-widget-surface", $POINT)
          .css.setMany(POINT_HOSTcss);
        const panel = mount_point_panel(host);
        return host_controller(host, panel.dispose);
      },
    },
    [$OKLCH]: {
      retention: "recreate",
      mount: () => {
        const host = mk_div_id(shell.uiRoot, "oklch")
          .data.set("shell-widget-surface", $OKLCH)
          .css.setMany(OKLCH_HOSTcss);
        const panel = mount_oklch(host);
        return host_controller(host, panel.dispose);
      },
    },
    bling: {
      retention: "recreate",
      mount: () => {
        let disposed = false;
        setBlingPresentation(true);
        _unhide(shell.motesLayer);
        _unhide(shell.graffitiLayer);
        const rig = mount_motes(shell.motesLayer);
        return Object.freeze({
          dispose: () => {
            if (disposed) return;
            disposed = true;
            rig.dispose();
            _hide(shell.motesLayer);
            _hide(shell.graffitiLayer);
            setBlingPresentation(false);
          },
        });
      },
    },
  } satisfies Record<WidgetId, SurfaceRegistration>;

  return registrations;
}

export async function mount_demo(
  stage: LiveTree,
  options: DemoMountOptions = {},
): Promise<DemoShellController> {
  activeDemoShell?.dispose();
  activeDemoShell = undefined;
  stage.empty();

  seed_demo_theme_vars();
  const shell = create_demo_shell(stage);
  const { demoLayer, screen, fleurLayer, fleurField, menuContainer } = shell;
  screen.attrs.set("data-shell-entry", options.directTowlEntry === true ? "direct-towl" : "standard");
  create_demo_wordmark(menuContainer);

  const menuBox = mk_div_id(menuContainer, "menu-box").css.setMany(MENU_BOXcss);
  const pointSlot = mk_div_id(menuContainer, "mouse-slot")
    .attrs.set("data-testid", "demo-widget-outlet")
    .css.setMany(POINT_SLOTcss);
  set_global_css();

  const currentView = demo_shell_locations.currentView;
  const activeWidgets = demo_shell_locations.activeWidgets;
  const initialView = currentView.snap();
  const initialWidgets = activeWidgets.snap();
  const initialRoom = classify_towl_room_url(new URL(globalThis.location.href));
  let rememberedTowlRoomId = initialRoom.kind === "valid" ? initialRoom.roomId : undefined;
  let forgetTowlRoomOnDeparture = false;
  const backFromTowl = (): void => {
    set_view(null);
  };
  const leaveTowl = (): void => {
    forgetTowlRoomOnDeparture = true;
    set_view(null);
  };
  const toggleMenuKey = (key: MenuKey): void => {
    if (is_widget_menu_key(key)) {
      toggle_widget(key);
      return;
    }
    if (!is_demo_menu_key(key)) return;
    if (key === $FLEURS && currentView.snap() === $FLEURS) fleurField.empty();
    toggle_view(key);
  };

  const amoebiMenu = make_amoebi(menuBox, {
    selection: {
      snap: () => active_menu_ids(currentView.snap(), activeWidgets.snap()),
      watch: (listener) => {
        const notify = (): void => listener(active_menu_ids(currentView.snap(), activeWidgets.snap()));
        const stopSelectionView = currentView.watch(notify);
        const stopSelectionWidgets = activeWidgets.watch(notify);
        return () => {
          stopSelectionView();
          stopSelectionWidgets();
        };
      },
    },
    isolatedIds: WIDGET_IDS,
    items: amoebi_menu_items(),
    showTitle: false,
    ariaLabel: "Demo navigation",
    onToggle: (id) => {
      const key = menu_key_from_id(id);
      if (key === undefined) return;
      toggleMenuKey(key);
    },
  });
  const plainMenu = make_plain_menu(menuBox, toggleMenuKey);
  let blingPresentationToken = 0;
  const setBlingPresentation = (enabled: boolean, animate = true): void => {
    blingPresentationToken += 1;
    const token = blingPresentationToken;
    if (enabled) {
      screen.attrs.set("data-shell-navigation-skin", "amoebic");
      plainMenu.root.css.set.display("none");
      amoebiMenu.root.css.set.display("block");
      if (animate) amoebiMenu.enter();
      return;
    }
    if (!animate) {
      amoebiMenu.hideInstantly();
      amoebiMenu.root.css.set.display("none");
      plainMenu.root.css.set.display("grid");
      screen.attrs.set("data-shell-navigation-skin", "plain");
      return;
    }
    amoebiMenu.exit(() => {
      if (token !== blingPresentationToken) return;
      amoebiMenu.root.css.set.display("none");
      plainMenu.root.css.set.display("grid");
      screen.attrs.set("data-shell-navigation-skin", "plain");
    });
  };
  plainMenu.setActiveIds(active_menu_ids(initialView, initialWidgets));
  setBlingPresentation(false, false);

  const mainRegistrations = make_main_registrations(shell, backFromTowl, leaveTowl);
  const widgetRegistrations = make_widget_registrations(shell, pointSlot, setBlingPresentation);
  const lifecycle = create_shell_lifecycle_reconciler({
    mainIds: MAIN_VIEW_IDS,
    widgetIds: WIDGET_IDS,
    main: mainRegistrations,
    widgets: widgetRegistrations,
  });

  let reconciledView: DemoView = null;
  const reconcileMain = (next: DemoView): void => {
    const source = new URL(globalThis.location.href);
    if (next === $TOWL) {
      const room = classify_towl_room_url(source);
      if (room.kind === "valid") {
        rememberedTowlRoomId = room.roomId;
        if (room.changed) globalThis.history.replaceState(globalThis.history.state, "", room.url.toString());
      } else if (room.kind === "absent") {
        const address = rememberedTowlRoomId === undefined
          ? create_towl_room_url(source)
          : create_towl_room_url(source, () => rememberedTowlRoomId!);
        rememberedTowlRoomId = address.roomId;
        globalThis.history.replaceState(globalThis.history.state, "", address.url.toString());
      }
    } else if (reconciledView === $TOWL) {
      const room = classify_towl_room_url(source);
      if (!forgetTowlRoomOnDeparture && room.kind === "valid") rememberedTowlRoomId = room.roomId;
      if (forgetTowlRoomOnDeparture) rememberedTowlRoomId = undefined;
      forgetTowlRoomOnDeparture = false;
      const departure = towl_departure_url(source);
      if (departure.toString() !== source.toString()) {
        globalThis.history.replaceState(globalThis.history.state, "", departure.toString());
      }
      if (is_direct_towl_path(source.pathname)) screen.attrs.set("data-shell-entry", "standard");
    }
    lifecycle.reconcileMain(next);
    reconciledView = next;
    screen.attrs.set("data-shell-current-main", next ?? "");
    plainMenu.setActiveIds(active_menu_ids(next, activeWidgets.snap()));
  };
  const reconcileWidgets = (next: readonly WidgetId[]): void => {
    lifecycle.reconcileWidgets(next);
    screen.attrs.set("data-shell-active-widgets", next.join(" "));
    plainMenu.setActiveIds(active_menu_ids(currentView.snap(), next));
  };

  const stopView = currentView.watch(reconcileMain);
  const stopWidgets = activeWidgets.watch((next) => {
    write_bling_preference(next.includes("bling"));
    reconcileWidgets(next);
  });
  reconcileMain(initialView);
  reconcileWidgets(initialWidgets);

  const keyListener = screen.listen.document.onKeyDown((event) => {
    if (event.key === "0") {
      set_view("color-sudoku");
      return;
    }
    if (event.key !== "Escape") return;
    deactivate_widget($OKLCH);
    deactivate_widget($POINT);
  });

  const fleurClickListener = screen.listen.onClick((event: MouseEvent) => {
    if (currentView.snap() !== $FLEURS) return;
    const rect = fleurLayer.dom.rect();
    if (!rect) return;
    void spawn_flower(fleurField, event.clientX - rect.left, event.clientY - rect.top);
  });

  const deck = mount_deck(stage);
  const fireworksAbort = new AbortController();
  let fireworks: FireworkController | undefined;
  let disposed = false;
  void mount_firework(screen, fireworksAbort.signal).then(
    (controller) => {
      if (disposed) controller.teardown();
      else fireworks = controller;
    },
    (error: unknown) => {
      if (!fireworksAbort.signal.aborted) console.error(error);
    },
  );

  const controller: DemoShellController = Object.freeze({
    root: demoLayer,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      stopView();
      stopWidgets();
      keyListener.off();
      fleurClickListener.off();
      lifecycle.dispose();
      fireworksAbort.abort();
      fireworks?.teardown();
      deck.dispose();
      amoebiMenu.dispose();
      plainMenu.dispose();
      if (!demoLayer.isDisposed) demoLayer.remove();
      if (activeDemoShell === controller) activeDemoShell = undefined;
    },
  });
  activeDemoShell = controller;

  await after_paint();
  sync_fleur_viewbox(fleurLayer, fleurField);
  screen.css.setMany({ __after: { opacity: "0 !IMPORTANT" } });
  return controller;
}
