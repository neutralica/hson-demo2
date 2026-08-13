// make-amoebi.ts

import { hson, } from "hson-live";
import {  LiveTree } from "hson-live/livetree";
import type { JsonValue, LiveMap, SvgLiveTree } from "hson-live/types";
import { OKLCH_NEUTRALS } from "../../core/consts/oklch.consts";
import { set_alpha } from "../../core/helpers/color-helpers";
import type { AmoebaButtonLayout, AmoebiMenuApi, AmoebiMenuOptions, AmoebiRenderButton, AmoebiRenderState, AmoebiSelectionSource, AmoebiTileParts, HexCoord, Point } from "./amoebi.types";
import { AMOEBA_W, AMOEBA_H, HEX_SIZE, BUTTONS } from "./amoebi.consts";
import { amoebi_view_height, hex_cell_path, hex_center, make_initial_state, make_seed } from "./amoebi-geometry";
import { PATH_BASEcss, AMOEBI_ROOTcss, AMOEBI_TITLEcss, AMOEBI_SVGcss } from "./amoebi.css";
import { _txt } from "../../core/consts/ui-consts";


const RECEDED_AMOEBI_TILES = new WeakSet<AmoebiTileParts>();

const AMOEBI_MOTION_TOKENS = new WeakMap<SvgLiveTree, number>();

type AmoebiRuntime = Readonly<{
  frame(callback: () => void): void;
  timeout(callback: () => void, delay: number): void;
  clearTimeouts(): void;
  own(dispose: () => void): void;
  isDisposed(): boolean;
  dispose(): void;
}>;

function create_amoebi_runtime(): AmoebiRuntime {
  const frameIds = new Set<number>();
  const timeoutIds = new Set<number>();
  const disposers: Array<() => void> = [];
  let disposed = false;

  const clearTimeouts = (): void => {
    for (const id of timeoutIds) window.clearTimeout(id);
    timeoutIds.clear();
  };

  return Object.freeze({
    frame: (callback) => {
      if (disposed) return;
      const id = requestAnimationFrame(() => {
        frameIds.delete(id);
        if (!disposed) callback();
      });
      frameIds.add(id);
    },
    timeout: (callback, delay) => {
      if (disposed) return;
      const id = window.setTimeout(() => {
        timeoutIds.delete(id);
        if (!disposed) callback();
      }, delay);
      timeoutIds.add(id);
    },
    clearTimeouts,
    own: (dispose) => {
      if (disposed) dispose();
      else disposers.push(dispose);
    },
    isDisposed: () => disposed,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      clearTimeouts();
      for (const id of frameIds) cancelAnimationFrame(id);
      frameIds.clear();
      for (const stop of disposers.splice(0).reverse()) stop();
    },
  });
}

const EMPTY_SELECTION: AmoebiSelectionSource = Object.freeze({
  snap: () => [],
  watch: () => () => undefined,
});

function next_motion_token(tree: SvgLiveTree): number {
  const token = (AMOEBI_MOTION_TOKENS.get(tree) ?? 0) + 1;
  AMOEBI_MOTION_TOKENS.set(tree, token);
  return token;
}

function is_current_motion_token(tree: SvgLiveTree, token: number): boolean {
  return AMOEBI_MOTION_TOKENS.get(tree) === token;
}

function set_svg_text_style(text: SvgLiveTree): void {
  text.css.setMany({
    fontFamily: "DM Mono, Inconsolata, monospace",
    fontSize: _txt.size.main,
    letterSpacing: "0.08em",
    textTransform: "lowercase",
    textAnchor: "middle",
    dominantBaseline: "middle",
    fill: set_alpha(OKLCH_NEUTRALS.pearlIvory, 0.76),
    pointerEvents: "none",
    userSelect: "none",
  });
}

function has_id(value: readonly string[], id: string): boolean {
  return value.includes(id);
}

function has_hover(value: JsonValue | undefined): boolean {
  return typeof value === "string" && value.length > 0;
}

function is_isolated_id(
  isolatedIds: readonly string[],
  id: string,
): boolean {
  return isolatedIds.includes(id);
}

function amoeba_path_css(
  button: AmoebaButtonLayout,
  hoveredId: string | null,
  activeIds: readonly string[],
  isolatedIds: readonly string[],
): Readonly<Record<string, string>> {
  const activeList = activeIds;
  const hovered = hoveredId === button.id;
  const active = activeList.includes(button.id);
  const anyBlockingActive = activeList.some((id) => {
    return !is_isolated_id(
      isolatedIds,
      id,
    );
  });

  const hoveredWithoutSelection = hovered
    && !active
    && !anyBlockingActive;

  const suppressed = !hovered
    && !active
    && anyBlockingActive;

  const activeHover = active && hovered;
  const neutralHover = hovered
    && anyBlockingActive
    && !active;

  return {
    fill: activeHover
      ? set_alpha(OKLCH_NEUTRALS.black, 0.42)
      : active || hoveredWithoutSelection
        ? "transparent"
        : set_alpha(
          button.tone,
          hovered ? 0.29 : 0.22,
        ),

    stroke: neutralHover
      ? set_alpha(
        OKLCH_NEUTRALS.pearlIvory,
        0.68,
      )
      : hovered || active
        ? button.tone
        : set_alpha(
          button.tone,
          suppressed ? 0.36 : 0.66,
        ),

    strokeWidth: hovered
      ? "2.4"
      : active
        ? "2"
        : suppressed
          ? "1"
          : "1.35",

    filter: hovered && !active
      ? `drop-shadow(0 0 8px ${set_alpha(
        button.tone,
        0.22,
      )})`
      : "none",
  };
}

function render_amoebi_cells(runtime: AmoebiRuntime, svg: SvgLiveTree, button: AmoebiRenderButton, index: number): readonly SvgLiveTree[] {
  return button.cells.map((cell, cellIndex) => render_amoebi_cell(runtime, svg, button, cell, index, cellIndex));
}

function bind_amoebi_interaction(
  runtime: AmoebiRuntime,
  target: SvgLiveTree,
  parts: AmoebiTileParts,
  tiles: readonly AmoebiTileParts[],
  map: LiveMap<AmoebiRenderState>,
  selection: AmoebiSelectionSource,
  onToggle: ((id: string) => void) | undefined,
  isolatedIds: readonly string[],
): void {
  const enter = target.listen.on("pointerenter", () => {
    if (runtime.isDisposed()) return;
    runtime.clearTimeouts();
    const activeIds = selection.snap();
    apply_amoebi_menu_motion(
      runtime,
      tiles,
      parts.button.id,
      activeIds,
      isolatedIds,
    );

    map.at(["hoveredId"]).set(parts.button.id);
    apply_amoebi_appearance(tiles, parts.button.id, activeIds, isolatedIds);
  });

  const leave = target.listen.on("pointerleave", () => {
    const leavingId = parts.button.id;

    runtime.timeout(() => {
      if (
        map.snap().hoveredId
        !== leavingId
      ) {
        return;
      }

      map.at(["hoveredId"]).set(null);
      const activeIds = selection.snap();
      apply_amoebi_appearance(tiles, null, activeIds, isolatedIds);

      apply_amoebi_menu_motion(
        runtime,
        tiles,
        null,
        activeIds,
        isolatedIds,
      );
    }, 45);
  });

  const click = target.listen.stopProp().onClick(() => {
    if (!runtime.isDisposed()) onToggle?.(parts.button.id);
  });

  runtime.own(() => enter.off());
  runtime.own(() => leave.off());
  runtime.own(() => click.off());
}

function render_amoebi_body(
  svg: SvgLiveTree,
  button: AmoebiRenderButton,
): SvgLiveTree {
  const path = svg.create.path()
    .attrs.setMany({
      d: button.path,
      "data-amoeba-id": button.id,
    })
    .css.setMany(PATH_BASEcss)
    .css.setMany({
      pointerEvents: "none",
    });

  return path;
}

function render_amoebi_label(runtime: AmoebiRuntime, svg: SvgLiveTree, button: AmoebiRenderButton, index: number): SvgLiveTree {
  const label = svg.create.text()
    .text.set(button.label)
    .attrs.setMany({
      x: button.cx.toFixed(2),
      y: button.cy.toFixed(2),
    });

  set_svg_text_style(label);
  grow_amoebi_node(runtime, label, { x: button.cx, y: button.cy }, index * 72 + 250, 220);
  return label;
}

function render_amoebi_hit_target(svg: SvgLiveTree, button: AmoebiRenderButton): SvgLiveTree {
  return svg.create.path()
    .attrs.setMany({
      d: button.path,
      tabindex: "0",
      role: "button",
      "aria-label": button.label,
      "data-amoebi-hit-target": button.id,
    })
    .css.setMany({
      cursor: "pointer",
      fill: "transparent",
      stroke: "transparent",
      strokeWidth: "18",
      // pointerEvents: "stroke",  // or:
      pointerEvents: "all",
      outline: "none",
    });
}

function render_amoebi_tile(
  runtime: AmoebiRuntime,
  svg: SvgLiveTree,
  button: AmoebiRenderButton,
  index: number,
): AmoebiTileParts {
  const cells = render_amoebi_cells(
    runtime,
    svg,
    button,
    index,
  );

  const body = render_amoebi_body(
    svg,
    button,
  );

  const target = render_amoebi_hit_target(
    svg,
    button,
  );

  const label = render_amoebi_label(
    runtime,
    svg,
    button,
    index,
  );

  const parts = {
    button,
    index,
    body,
    cells,
    target,
    label,
  } satisfies AmoebiTileParts;

  RECEDED_AMOEBI_TILES.delete(parts);
  grow_amoebi_outline(runtime, body, button, index);

  return parts;
}

// --- Amoebi animation helpers ---
type AmoebiMotionMode = "grow" | "recede";

type AmoebiMotionOptions = Readonly<{
  delay?: number;
  duration?: number;
  fromScale?: number;
  toScale?: number;
  fromOpacity?: number;
  toOpacity?: number;
  origin?: Point;
}>;

const DEFAULT_GROW_DURATION = 460;
const DEFAULT_RECEDE_DURATION = 280;
const DEFAULT_GROW_SCALE = 0.08;

function motion_transition(mode: AmoebiMotionMode, duration: number, delay: number): string {
  const transformTiming = mode === "grow" ? "cubic-bezier(.08, .86, .22, 1)" : "cubic-bezier(.55, 0, .35, 1)";
  const opacityTiming = mode === "grow" ? "cubic-bezier(.05, .9, .18, 1)" : "ease-out";

  return [
    `opacity ${duration}ms ${opacityTiming} ${delay}ms`,
    `transform ${duration}ms ${transformTiming} ${delay}ms`,
    "fill 120ms ease",
    "stroke 120ms ease",
    "stroke-width 120ms ease",
    "filter 120ms ease",
  ].join(", ");
}

function set_motion_origin(tree: SvgLiveTree, origin: Point): void {
  tree.css.setMany({
    transformBox: "view-box",
    transformOrigin: `${origin.x.toFixed(2)}px ${origin.y.toFixed(2)}px`,
  });
}

function set_motion_frame(tree: SvgLiveTree, scale: number, opacity: number): void {
  tree.css.setMany({
    opacity: opacity.toFixed(3),
    transform: `scale(${scale.toFixed(3)})`,
  });
}

function recede_amoebi_motion_from_current(runtime: AmoebiRuntime, tree: SvgLiveTree, origin: Point, delay: number, duration = DEFAULT_RECEDE_DURATION): void {
  const token = next_motion_token(tree);
  set_motion_origin(tree, origin);

  runtime.frame(() => {
    if (!is_current_motion_token(tree, token)) return;
    tree.css.setMany({ transition: motion_transition("recede", duration, delay) });
    set_motion_frame(tree, 0.22, 0.045);
  });
}

function play_amoebi_motion(runtime: AmoebiRuntime, tree: SvgLiveTree, mode: AmoebiMotionMode, options: AmoebiMotionOptions = {}): void {
  const duration = options.duration ?? (mode === "grow" ? DEFAULT_GROW_DURATION : DEFAULT_RECEDE_DURATION);
  const delay = options.delay ?? 0;
  const origin = options.origin ?? { x: AMOEBA_W * 0.5, y: AMOEBA_H * 0.52 };
  const fromScale = options.fromScale ?? (mode === "grow" ? DEFAULT_GROW_SCALE : 1);
  const toScale = options.toScale ?? (mode === "grow" ? 1 : DEFAULT_GROW_SCALE);
  const fromOpacity = options.fromOpacity ?? (mode === "grow" ? 0 : 1);
  const toOpacity = options.toOpacity ?? (mode === "grow" ? 1 : 0);
  const token = next_motion_token(tree);

  set_motion_origin(tree, origin);
  tree.css.setMany({ transition: "none" });
  set_motion_frame(tree, fromScale, fromOpacity);

  runtime.frame(() => {
    if (!is_current_motion_token(tree, token)) return;
    runtime.frame(() => {
      if (!is_current_motion_token(tree, token)) return;
      tree.css.setMany({ transition: motion_transition(mode, duration, delay) });
      set_motion_frame(tree, toScale, toOpacity);
    });
  });
}

function grow_amoebi_node(runtime: AmoebiRuntime, tree: SvgLiveTree, origin: Point, delay: number, duration = DEFAULT_GROW_DURATION): void {
  play_amoebi_motion(runtime, tree, "grow", { origin, delay, duration });
}

function recede_amoebi_node(runtime: AmoebiRuntime, tree: SvgLiveTree, origin: Point, delay: number, duration = DEFAULT_RECEDE_DURATION): void {
  recede_amoebi_motion_from_current(runtime, tree, origin, delay, duration);
}

// Move with amoebi.geometry.ts; kept here temporarily because motion still calls it.
function cell_distance_from_label(button: AmoebiRenderButton, cell: HexCoord): number {
  const center = hex_center(cell, HEX_SIZE);
  const dx = center.x - button.cx;
  const dy = center.y - button.cy;
  return Math.sqrt(dx * dx + dy * dy);
}



function ordered_cell_entries(parts: AmoebiTileParts): readonly Readonly<{ cell: SvgLiveTree; coord: HexCoord; index: number }>[] {
  return parts.cells
    .map((cell, index) => {
      const coord = parts.button.cells[index];
      return coord ? { cell, coord, index } : undefined;
    })
    .filter((entry): entry is Readonly<{ cell: SvgLiveTree; coord: HexCoord; index: number }> => entry !== undefined)
    .sort((a, b) => cell_distance_from_label(parts.button, a.coord) - cell_distance_from_label(parts.button, b.coord));
}

function grow_amoebi_cell(runtime: AmoebiRuntime, cell: SvgLiveTree, coord: HexCoord, delay: number, duration = 260, fromScale = DEFAULT_GROW_SCALE, fromOpacity = 0): void {
  play_amoebi_motion(runtime, cell, "grow", {
    origin: hex_center(coord, HEX_SIZE),
    delay,
    duration,
    fromScale,
    fromOpacity,
  });
}



function render_amoebi_cell(runtime: AmoebiRuntime, svg: SvgLiveTree, button: AmoebiRenderButton, cell: HexCoord, buttonIndex: number, cellIndex: number): SvgLiveTree {
  const cellPath = svg.create.path()
    .attrs.setMany({
      d: hex_cell_path(cell, HEX_SIZE),
      "data-amoebi-cell": button.id,
    })
    .css.setMany({
      pointerEvents: "none",
      transition: "fill 120ms ease, stroke 120ms ease, opacity 180ms ease, transform 280ms cubic-bezier(.16, 1, .3, 1)",
      vectorEffect: "non-scaling-stroke",
    });

  grow_amoebi_cell(runtime, cellPath, cell, buttonIndex * 72 + Math.round(cell_distance_from_label(button, cell) * 1.4 + cellIndex * 9));
  return cellPath;
}

function grow_amoebi_outline(runtime: AmoebiRuntime, path: SvgLiveTree, button: AmoebiRenderButton, buttonIndex: number): void {
  play_amoebi_motion(runtime, path, "grow", {
    origin: { x: button.cx, y: button.cy },
    delay: buttonIndex * 72 + 34,
    duration: 360,
    fromScale: 0.38,
  });
}

function render_amoeba(
  runtime: AmoebiRuntime,
  svg: SvgLiveTree,
  map: LiveMap<AmoebiRenderState>,
  selection: AmoebiSelectionSource,
  onToggle: ((id: string) => void) | undefined,
  isolatedIds: readonly string[],
): readonly AmoebiTileParts[] {
  svg.empty();

  const state = map.snap();

  const tiles = state.layout.map(
    (button, index) => {
      return render_amoebi_tile(
        runtime,
        svg,
        button,
        index,
      );
    },
  );

  tiles.forEach((tile) => {
    bind_amoebi_interaction(
      runtime,
      tile.target,
      tile,
      tiles,
      map,
      selection,
      onToggle,
      isolatedIds,
    );
  });

  apply_amoebi_appearance(tiles, state.hoveredId, selection.snap(), isolatedIds);
  return tiles;
}

export function make_amoebi(stage: LiveTree, options: AmoebiMenuOptions = {}): AmoebiMenuApi {
  const items = options.items ?? BUTTONS;
  const seed = options.seed ?? make_seed();
  const initialState = make_initial_state(seed, items);
  const isolatedIds = options.isolatedIds ?? [];
  const selection = options.selection ?? EMPTY_SELECTION;
  const runtime = create_amoebi_runtime();
  const viewHeight = amoebi_view_height(initialState);
  const state = hson.liveMap.fromJson(
    initialState as unknown as JsonValue,
  ) as unknown as LiveMap<AmoebiRenderState>;

  const root = stage.create.div()
    .id.set("amoebi-menu-demo")
    .classlist.add("amoebi-menu-demo")
    .css.setMany(AMOEBI_ROOTcss)
    .css.setMany({ height: "auto" });
  if (options.showTitle !== false) {
    root.create.div()
      .text.set(options.title ?? "'amoeba' menu sketch v0.1")
      .css.setMany(AMOEBI_TITLEcss);
  }

  const svg = root.create.svg()
    .attrs.setMany({
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: `0 0 ${AMOEBA_W} ${viewHeight}`,
      // CHANGED: anchor the SVG viewBox to the left edge instead of centering it.
      preserveAspectRatio: "xMinYMin meet",
      role: "group",
      "aria-label": options.ariaLabel ?? "Amoebi menu experiment",
    })
    .css.setMany(AMOEBI_SVGcss)
    .css.setMany({
      // CHANGED: width still determines scale; height follows the generated menu.
      height: "auto",
      aspectRatio: `${AMOEBA_W} / ${viewHeight}`,
    });

  const tiles = render_amoeba(
    runtime,
    svg,
    state,
    selection,
    options.onToggle,
    isolatedIds,
  );

  const refresh = (ids: readonly string[]): void => {
    if (runtime.isDisposed()) return;
    const hoveredId = state.snap().hoveredId;
    apply_amoebi_appearance(tiles, hoveredId, ids, isolatedIds);
    apply_amoebi_menu_motion(runtime, tiles, hoveredId, ids, isolatedIds);
  };
  runtime.own(selection.watch(refresh));

  const setHoveredId = (id: string | null): void => {
    if (runtime.isDisposed()) return;
    state.at(["hoveredId"]).set(id);
    const activeIds = selection.snap();
    apply_amoebi_appearance(tiles, id, activeIds, isolatedIds);
    apply_amoebi_menu_motion(runtime, tiles, id, activeIds, isolatedIds);
  };

  const dispose = (): void => {
    runtime.dispose();
    if (!root.isDisposed) root.remove();
  };

  return Object.freeze({
    root,
    setHoveredId,
    dispose,
  });
}

function apply_amoebi_appearance(
  tiles: readonly AmoebiTileParts[],
  hoveredId: string | null,
  activeIds: readonly string[],
  isolatedIds: readonly string[],
): void {
  for (const tile of tiles) {
    tile.body.css.setMany(amoeba_path_css(tile.button, hoveredId, activeIds, isolatedIds));
    const hovered = hoveredId === tile.button.id;
    const active = has_id(activeIds, tile.button.id);
    const hidden = !hovered && active;
    for (const cell of tile.cells) {
      cell.css.setMany({
        fill: hidden ? "transparent" : set_alpha(tile.button.tone, hovered ? 0.2 : 0.13),
        stroke: "transparent",
        strokeWidth: "0",
      });
    }
  }
}

function apply_amoebi_menu_motion(
  runtime: AmoebiRuntime,
  tiles: readonly AmoebiTileParts[],
  hoveredId: string | null,
  activeIds: readonly string[],
  isolatedIds: readonly string[],
): void {
  const hoveredIsIsolated = hoveredId !== null
    && is_isolated_id(
      isolatedIds,
      hoveredId,
    );

  const hasBlockingActive = activeIds.some((id) => {
    return !is_isolated_id(
      isolatedIds,
      id,
    );
  });

  tiles.forEach((tile) => {
    const hovered = hoveredId
      === tile.button.id;

    const active = activeIds.includes(
      tile.button.id,
    );

    let shouldGrow: boolean;

    if (hoveredId === null) {
      shouldGrow = active
        || !hasBlockingActive;
    } else if (hoveredIsIsolated) {
      shouldGrow = hovered
        || active
        || !hasBlockingActive;
    } else {
      shouldGrow = hovered
          || active
        || !hasBlockingActive;
    }

    if (shouldGrow) {
      grow_amoebi_tile(runtime, tile);
    } else {
      recede_amoebi_tile(runtime, tile);
    }
  });
}

function grow_amoebi_tile(runtime: AmoebiRuntime, parts: AmoebiTileParts): void {
  if (!RECEDED_AMOEBI_TILES.has(parts)) return;
  RECEDED_AMOEBI_TILES.delete(parts);
  ordered_cell_entries(parts).forEach(({ cell, coord }, orderIndex) => {
    const isSpark = orderIndex < 9;
    grow_amoebi_cell(
      runtime,
      cell,
      coord,
      isSpark ? 0 : Math.max(0, orderIndex * 6 - 18),
      isSpark ? 210 : 270,
      isSpark ? 0.16 : 0.08,
      isSpark ? 0.2 : 0.05,
    );
  });

  play_amoebi_motion(runtime, parts.body, "grow", {
    origin: { x: parts.button.cx, y: parts.button.cy },
    delay: 220,
    duration: 340,
    fromScale: 0.992,
    fromOpacity: 0,
  });
}

function recede_amoebi_tile(runtime: AmoebiRuntime, parts: AmoebiTileParts): void {
  if (RECEDED_AMOEBI_TILES.has(parts)) return;
  RECEDED_AMOEBI_TILES.add(parts);

  recede_amoebi_node(runtime, parts.body, { x: parts.button.cx, y: parts.button.cy }, 40, 430);
  const ordered = [...ordered_cell_entries(parts)].reverse();
  ordered.forEach(({ cell, coord }, orderIndex) => {
    recede_amoebi_node(runtime, cell, hex_center(coord, HEX_SIZE), 35 + orderIndex * 10, 420);
  });
}
