// make-amoebi.ts

import { hson, type LiveTree } from "hson-live";
import type { JsonValue, LiveMap, SvgLiveTree } from "hson-live/types";
import { OKLCH_NEUTRALS } from "../../core/consts/oklch.consts";
import { set_alpha } from "../../core/helpers/color-helpers";
import type { AmoebaButtonLayout, AmoebiMenuApi, AmoebiMenuOptions, AmoebiRenderButton, AmoebiRenderState, AmoebiTileParts, HexCoord, Point } from "./amoebi.types";
import { AMOEBA_W, AMOEBA_H, HEX_SIZE, BUTTONS } from "./amoebi.consts";
import { amoebi_view_height, hex_cell_path, hex_center, make_initial_state, make_seed } from "./amoebi-geometry";
import { PATH_BASEcss, AMOEBI_ROOTcss, AMOEBI_TITLEcss, AMOEBI_SVGcss } from "./amoebi.css";
import { _txt } from "../../core/consts/ui-consts";


const RECEDED_AMOEBI_TILES = new WeakSet<AmoebiTileParts>();

const AMOEBI_MOTION_TOKENS = new WeakMap<SvgLiveTree, number>();

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

function string_ids(value: JsonValue | undefined): readonly string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function has_id(value: JsonValue | undefined, id: string): boolean {
  return string_ids(value).includes(id);
}

function has_hover(value: JsonValue | undefined): boolean {
  return typeof value === "string" && value.length > 0;
}

function amoeba_path_css(
  button: AmoebaButtonLayout,
  hoveredId: JsonValue | undefined,
  activeIds: JsonValue | undefined,
): Readonly<Record<string, string>> {
  const activeList = string_ids(activeIds);
  const hovered = hoveredId === button.id;
  const active = activeList.includes(button.id);
  const anyActive = activeList.length > 0;
  const anyHover = has_hover(hoveredId);
  const suppressed = !hovered && !active && (anyHover || anyActive);
  const activeHover = active && hovered;
  const neutralHover = hovered && anyActive && !active;

  return {
    fill: activeHover ? set_alpha(OKLCH_NEUTRALS.black, 0.42) : active ? "transparent" : set_alpha(button.tone, hovered ? 0.29 : 0.22),
    stroke: neutralHover ? set_alpha(OKLCH_NEUTRALS.pearlIvory, 0.68) : hovered || active ? button.tone : set_alpha(button.tone, suppressed ? 0.36 : 0.66),
    strokeWidth: hovered ? "2.4" : active ? "2" : suppressed ? "1" : "1.35",
    filter: hovered && !active ? `drop-shadow(0 0 8px ${set_alpha(button.tone, 0.22)})` : "none",
  };
}
function render_amoebi_cells(svg: SvgLiveTree, map: LiveMap<AmoebiRenderState>, button: AmoebiRenderButton, index: number): readonly SvgLiveTree[] {
  return button.cells.map((cell, cellIndex) => render_amoebi_cell(svg, map, button, cell, index, cellIndex));
}

function bind_amoebi_interaction(
  target: SvgLiveTree,
  parts: AmoebiTileParts,
  tiles: readonly AmoebiTileParts[],
  map: LiveMap<AmoebiRenderState>,
  onToggle: ((id: string, nextActiveIds: readonly string[]) => void) | undefined,
): void {
  target.listen.on("pointerenter", () => {
    apply_amoebi_menu_motion(tiles, parts.button.id, map.snap().activeIds);
    map.at(["hoveredId"]).set(parts.button.id);
  });

  target.listen.on("pointerleave", () => {
    const leavingId = parts.button.id;
    const activeIds = map.snap().activeIds;

    if (!activeIds.includes(leavingId)) {
      recede_amoebi_tile(parts);
    }

    window.setTimeout(() => {
      if (map.snap().hoveredId !== leavingId) return;
      map.at(["hoveredId"]).set(null);
      apply_amoebi_menu_motion(tiles, null, map.snap().activeIds);
    }, 45);
  });

  target.listen.onClick(() => toggle_amoebi_active(map, tiles, parts.button.id, onToggle));
}

function render_amoebi_body(svg: SvgLiveTree, map: LiveMap<AmoebiRenderState>, button: AmoebiRenderButton): SvgLiveTree {
  const path = svg.create.path()
    .attr.setMany({
      d: button.path,
      "data-amoeba-id": button.id,
    })
    .css.setMany(PATH_BASEcss)
    .css.setMany({ pointerEvents: "none" });

  path.bind.cssPaths(map, [["hoveredId"], ["activeIds"]], (values) => amoeba_path_css(button, values[0], values[1]));
  return path;
}

function render_amoebi_label(svg: SvgLiveTree, button: AmoebiRenderButton, index: number): SvgLiveTree {
  const label = svg.create.text()
    .text.set(button.label)
    .attr.setMany({
      x: button.cx.toFixed(2),
      y: button.cy.toFixed(2),
    });

  set_svg_text_style(label);
  grow_amoebi_node(label, { x: button.cx, y: button.cy }, index * 72 + 250, 220);
  return label;
}

function render_amoebi_hit_target(svg: SvgLiveTree, button: AmoebiRenderButton): SvgLiveTree {
  return svg.create.path()
    .attr.setMany({
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

function render_amoebi_tile(svg: SvgLiveTree, map: LiveMap<AmoebiRenderState>, button: AmoebiRenderButton, index: number): AmoebiTileParts {
  const cells = render_amoebi_cells(svg, map, button, index);
  const body = render_amoebi_body(svg, map, button);
  const target = render_amoebi_hit_target(svg, button);
  const label = render_amoebi_label(svg, button, index);
  const parts = { button, index, body, cells, target, label } satisfies AmoebiTileParts;

  RECEDED_AMOEBI_TILES.delete(parts);
  grow_amoebi_outline(body, button, index);
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

function recede_amoebi_motion_from_current(tree: SvgLiveTree, origin: Point, delay: number, duration = DEFAULT_RECEDE_DURATION): void {
  const token = next_motion_token(tree);
  set_motion_origin(tree, origin);

  requestAnimationFrame(() => {
    if (!is_current_motion_token(tree, token)) return;
    tree.css.setMany({ transition: motion_transition("recede", duration, delay) });
    set_motion_frame(tree, 0.22, 0.045);
  });
}

function play_amoebi_motion(tree: SvgLiveTree, mode: AmoebiMotionMode, options: AmoebiMotionOptions = {}): void {
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

  requestAnimationFrame(() => {
    if (!is_current_motion_token(tree, token)) return;
    requestAnimationFrame(() => {
      if (!is_current_motion_token(tree, token)) return;
      tree.css.setMany({ transition: motion_transition(mode, duration, delay) });
      set_motion_frame(tree, toScale, toOpacity);
    });
  });
}

function grow_amoebi_node(tree: SvgLiveTree, origin: Point, delay: number, duration = DEFAULT_GROW_DURATION): void {
  play_amoebi_motion(tree, "grow", { origin, delay, duration });
}

function recede_amoebi_node(tree: SvgLiveTree, origin: Point, delay: number, duration = DEFAULT_RECEDE_DURATION): void {
  recede_amoebi_motion_from_current(tree, origin, delay, duration);
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

function grow_amoebi_cell(cell: SvgLiveTree, coord: HexCoord, delay: number, duration = 260, fromScale = DEFAULT_GROW_SCALE, fromOpacity = 0): void {
  play_amoebi_motion(cell, "grow", {
    origin: hex_center(coord, HEX_SIZE),
    delay,
    duration,
    fromScale,
    fromOpacity,
  });
}



function render_amoebi_cell(svg: SvgLiveTree, map: LiveMap<AmoebiRenderState>, button: AmoebiRenderButton, cell: HexCoord, buttonIndex: number, cellIndex: number): SvgLiveTree {
  const cellPath = svg.create.path()
    .attr.setMany({
      d: hex_cell_path(cell, HEX_SIZE),
      "data-amoebi-cell": button.id,
    })
    .css.setMany({
      pointerEvents: "none",
      transition: "fill 120ms ease, stroke 120ms ease, opacity 180ms ease, transform 280ms cubic-bezier(.16, 1, .3, 1)",
      vectorEffect: "non-scaling-stroke",
    });

  cellPath.bind.cssPaths(map, [["hoveredId"], ["activeIds"]], (values) => {
    const hovered = values[0] === button.id;
    const active = has_id(values[1], button.id);
    const hidden = !hovered && active;

    return {
      fill: hidden ? "transparent" : set_alpha(button.tone, hovered ? 0.2 : 0.13),
      stroke: "transparent",
      strokeWidth: "0",
    };
  });

  grow_amoebi_cell(cellPath, cell, buttonIndex * 72 + Math.round(cell_distance_from_label(button, cell) * 1.4 + cellIndex * 9));
  return cellPath;
}

function grow_amoebi_outline(path: SvgLiveTree, button: AmoebiRenderButton, buttonIndex: number): void {
  play_amoebi_motion(path, "grow", {
    origin: { x: button.cx, y: button.cy },
    delay: buttonIndex * 72 + 34,
    duration: 360,
    fromScale: 0.38,
  });
}

function render_amoeba(
  svg: SvgLiveTree,
  map: LiveMap<AmoebiRenderState>,
  onToggle: ((id: string, nextActiveIds: readonly string[]) => void) | undefined
): void {
  svg.empty();
  const state = map.snap();
  const tiles = state.layout.map((button, index) => render_amoebi_tile(svg, map, button, index));

  tiles.forEach((tile) => bind_amoebi_interaction(tile.target, tile, tiles, map, onToggle));

  // tiles.forEach((tile) => {
  //   bind_amoebi_interaction(tile.target, tile, tiles, map, onToggle);
  //   bind_amoebi_interaction(tile.label, tile, tiles, map, onToggle);
  // });
}

export function make_amoebi(stage: LiveTree, options: AmoebiMenuOptions = {}): AmoebiMenuApi {
  const items = options.items ?? BUTTONS;
  const seed = options.seed ?? make_seed();
  const activeIds = options.activeIds ?? [];
  // CHANGED: geometry is settled first so the containing SVG can adopt its
  // required height without changing the horizontal coordinate scale.
  const initialState = make_initial_state(seed, items, activeIds);
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
    .attr.setMany({
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: `0 0 ${AMOEBA_W} ${viewHeight}`,
      // CHANGED: anchor the SVG viewBox to the left edge instead of centering it.
      preserveAspectRatio: "xMinYMid meet",
      role: "group",
      "aria-label": options.ariaLabel ?? "Amoebi menu experiment",
    })
    .css.setMany(AMOEBI_SVGcss)
    .css.setMany({
      // CHANGED: width still determines scale; height follows the generated menu.
      height: "auto",
      aspectRatio: `${AMOEBA_W} / ${viewHeight}`,
    });

  render_amoeba(svg, state, options.onToggle);

  return {
    root,
    setActiveIds: (ids) => set_amoebi_active_ids(state, ids),
    getActiveIds: () => state.snap().activeIds,
    setHoveredId: (id) => state.at(["hoveredId"]).set(id),
  };
}

function apply_amoebi_menu_motion(tiles: readonly AmoebiTileParts[], hoveredId: string | null, activeIds: readonly string[]): void {
  tiles.forEach((tile) => {
    const hovered = hoveredId === tile.button.id;
    const active = activeIds.includes(tile.button.id);
    const shouldGrow = hovered || active || (hoveredId === null && activeIds.length === 0);

    if (shouldGrow) grow_amoebi_tile(tile);
    else recede_amoebi_tile(tile);
  });
}

function set_amoebi_active_ids(map: LiveMap<AmoebiRenderState>, ids: readonly string[]): void {
  map.at(["activeIds"]).set([...ids]);
  map.at(["selectedId"]).set(ids[0] ?? "");
}

function toggle_amoebi_active(
  map: LiveMap<AmoebiRenderState>,
  tiles: readonly AmoebiTileParts[],
  id: string,
  onToggle: ((id: string, nextActiveIds: readonly string[]) => void) | undefined,
): void {
  const state = map.snap();
  const next = state.activeIds.includes(id) ? [] : [id];

  set_amoebi_active_ids(map, next);
  apply_amoebi_menu_motion(tiles, state.hoveredId, next);
  onToggle?.(id, next);
}

function grow_amoebi_tile(parts: AmoebiTileParts): void {
  if (!RECEDED_AMOEBI_TILES.has(parts)) return;
  RECEDED_AMOEBI_TILES.delete(parts);

  ordered_cell_entries(parts).forEach(({ cell, coord }, orderIndex) => {
    const isSpark = orderIndex < 9;
    grow_amoebi_cell(
      cell,
      coord,
      isSpark ? 0 : Math.max(0, orderIndex * 6 - 18),
      isSpark ? 210 : 270,
      isSpark ? 0.16 : 0.08,
      isSpark ? 0.2 : 0.05,
    );
  });

  play_amoebi_motion(parts.body, "grow", {
    origin: { x: parts.button.cx, y: parts.button.cy },
    delay: 220,
    duration: 340,
    fromScale: 0.992,
    fromOpacity: 0,
  });
}

function recede_amoebi_tile(parts: AmoebiTileParts): void {
  if (RECEDED_AMOEBI_TILES.has(parts)) return;
  RECEDED_AMOEBI_TILES.add(parts);

  recede_amoebi_node(parts.body, { x: parts.button.cx, y: parts.button.cy }, 40, 430);
  const ordered = [...ordered_cell_entries(parts)].reverse();
  ordered.forEach(({ cell, coord }, orderIndex) => {
    recede_amoebi_node(cell, hex_center(coord, HEX_SIZE), 35 + orderIndex * 10, 420);
  });
}
