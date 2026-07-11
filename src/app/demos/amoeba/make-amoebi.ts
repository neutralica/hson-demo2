// make-amoebi.ts

import { hson, type LiveTree } from "hson-live";
import type { JsonValue, LiveMap, SvgLiveTree } from "hson-live/types";
import { OKLCH_NEUTRALS } from "../../core/consts/oklch.consts";
import { set_alpha } from "../../core/helpers/color-helpers";
import type { AmoebaButtonInput, Point, HexCoord, AmoebaButtonLayout, AmoebaState } from "./amoebi.types";
import { BUTTON_BASE_SPAN, AMOEBA_W, SQRT3, AMOEBA_H, HEX_SIZE, BUTTON_BASE_DEPTH, BUTTONS, TARGETS } from "./amoebi.consts";
import { PATH_BASEcss, AMOEBI_ROOTcss, AMOEBI_TITLEcss, AMOEBI_SVGcss } from "./amoebi.css";

type AmoebiRenderButton = AmoebaButtonLayout & Readonly<{
  cells: readonly HexCoord[];
}>;

type AmoebiRenderState = Omit<AmoebaState, "layout"> & Readonly<{
  activeIds: readonly string[];
  layout: readonly AmoebiRenderButton[];
}>;

type AmoebiTileOptions = Readonly<{
  index: number;
  interactive?: boolean;
  showCells?: boolean;
  showLabel?: boolean;
  shrinkOnHover?: boolean;
}>;


type AmoebiTileParts = Readonly<{
  button: AmoebiRenderButton;
  index: number;
  body: SvgLiveTree;
  cells: readonly SvgLiveTree[];
  target: SvgLiveTree | undefined;
  label: SvgLiveTree | undefined;
}>;

const RECEDED_AMOEBI_TILES = new WeakSet<AmoebiTileParts>();

function span_for_button(button: AmoebaButtonInput, rng: () => number): number {
  const labelBoost = button.label.length >= 7 ? 1 : 0;
  const jitter = Math.floor(rng() * 3) - 1;
  return Math.max(4, BUTTON_BASE_SPAN + labelBoost + jitter);
}

function key_of(coord: HexCoord): string {
  return `${coord.q},${coord.r}`;
}

function hex_neighbors(coord: HexCoord): readonly HexCoord[] {
  const { q, r } = coord;
  return [
    { q: q + 1, r },
    { q: q + 1, r: r - 1 },
    { q, r: r - 1 },
    { q: q - 1, r },
    { q: q - 1, r: r + 1 },
    { q, r: r + 1 },
  ];
}


function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}


function hex_center(coord: HexCoord, size: number): Point {
  return {
    x: AMOEBA_W * 0.5 + size * SQRT3 * (coord.q + coord.r / 2),
    y: AMOEBA_H * 0.52 + size * 1.5 * coord.r,
  };
}

function hex_points(coord: HexCoord, size: number): readonly Point[] {
  const center = hex_center(coord, size);
  return Array.from({ length: 6 }, (_, i) => {
    const angle = Math.PI / 180 * (60 * i - 30);
    return {
      x: center.x + size * Math.cos(angle),
      y: center.y + size * Math.sin(angle),
    };
  });
}

function hex_cell_path(coord: HexCoord, size: number): string {
  const center = hex_center(coord, size);
  const radius = size * 1.02;
  const points = Array.from({ length: 6 }, (_, i) => {
    const angle = Math.PI / 180 * (60 * i - 30);
    return {
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle),
    };
  });
  const first = points[0];
  if (!first) return "";

  return [
    `M ${first.x.toFixed(2)} ${first.y.toFixed(2)}`,
    ...points.slice(1).map((point) => `L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`),
    "Z",
  ].join(" ");
}

function point_key(point: Point): string {
  return `${point.x.toFixed(3)},${point.y.toFixed(3)}`;
}

function edge_key(a: Point, b: Point): string {
  const ak = point_key(a);
  const bk = point_key(b);
  return ak < bk ? `${ak}|${bk}` : `${bk}|${ak}`;
}



function is_allowed(coord: HexCoord): boolean {
  const center = hex_center(coord, HEX_SIZE);
  return center.x > 42 && center.x < AMOEBA_W - 42 && center.y > 48 && center.y < AMOEBA_H - 34;
}


function add_contiguous_row(cells: Map<string, HexCoord>, qStart: number, r: number, span: number): void {
  for (let i = 0; i < span; i += 1) {
    const coord = { q: qStart + i, r };
    if (is_allowed(coord)) cells.set(key_of(coord), coord);
  }
}

function make_lozenge_blob(anchor: HexCoord, span: number, depth: number, rng: () => number): readonly HexCoord[] {
  const cells = new Map<string, HexCoord>();
  const rowRadius = Math.max(1, depth);
  const shoulderSide = rng() > 0.5 ? -1 : 1;

  for (let row = -rowRadius; row <= rowRadius; row += 1) {
    const distance = Math.abs(row);
    const isCore = distance === 0;
    const rowSpan = isCore ? span + Math.round(rng()) : Math.max(3, span - 1 + Math.round(rng()));
    const centerOffset = Math.floor((span - rowSpan) / 2);
    const qStart = anchor.q + centerOffset - Math.floor(row / 2);

    add_contiguous_row(cells, qStart, anchor.r + row, rowSpan);
  }

  const shoulderRow = anchor.r + (rng() > 0.5 ? -1 : 1);
  const shoulderQ = shoulderSide < 0 ? anchor.q - 1 : anchor.q + span;
  add_contiguous_row(cells, shoulderQ, shoulderRow, 2);

  return Array.from(cells.values());
}

function has_minimum_body_height(cells: readonly HexCoord[]): boolean {
  return new Set(cells.map((cell) => cell.r)).size >= 2;
}

function cells_overlap(cells: readonly HexCoord[], occupied: Set<string>): boolean {
  return cells.some((cell) => occupied.has(key_of(cell)));
}

function contact_score(cells: readonly HexCoord[], occupied: Set<string>): number {
  let score = 0;
  cells.forEach((cell) => {
    hex_neighbors(cell).forEach((neighbor) => {
      if (occupied.has(key_of(neighbor))) score += 1;
    });
  });
  return score;
}

function largest_connected_cells(cells: readonly HexCoord[]): readonly HexCoord[] {
  const remaining = new Map(cells.map((cell) => [key_of(cell), cell] as const));
  const groups: HexCoord[][] = [];

  while (remaining.size > 0) {
    const first = remaining.values().next().value as HexCoord | undefined;
    if (!first) break;

    const group: HexCoord[] = [];
    const stack: HexCoord[] = [first];
    remaining.delete(key_of(first));

    while (stack.length > 0) {
      const cell = stack.pop();
      if (!cell) continue;
      group.push(cell);

      hex_neighbors(cell).forEach((neighbor) => {
        const key = key_of(neighbor);
        const next = remaining.get(key);
        if (!next) return;
        remaining.delete(key);
        stack.push(next);
      });
    }

    groups.push(group);
  }

  return groups.sort((a, b) => b.length - a.length)[0] ?? [];
}

function anchor_distance(a: HexCoord, b: HexCoord): number {
  return Math.abs(a.q - b.q) + Math.abs(a.r - b.r);
}

function center_penalty(cells: readonly HexCoord[]): number {
  if (!cells.length) return 0;

  const centers = cells.map((cell) => hex_center(cell, HEX_SIZE));
  const avg = centers.reduce<Point>((sum, point) => ({
    x: sum.x + point.x,
    y: sum.y + point.y,
  }), { x: 0, y: 0 });
  const cx = avg.x / centers.length;
  const cy = avg.y / centers.length;
  const dx = cx - AMOEBA_W * 0.52;
  const dy = cy - AMOEBA_H * 0.52;

  return Math.sqrt(dx * dx + dy * dy);
}

function settle_blob(anchor: HexCoord, span: number, depth: number, occupied: Set<string>, rng: () => number): readonly HexCoord[] {
  const attempts: HexCoord[] = [anchor];

  for (let radius = 1; radius <= 8; radius += 1) {
    for (let dr = -radius; dr <= radius; dr += 1) {
      for (let dq = -radius; dq <= radius; dq += 1) {
        if (Math.max(Math.abs(dq), Math.abs(dr)) !== radius) continue;
        attempts.push({ q: anchor.q + dq, r: anchor.r + dr });
      }
    }
  }

  let best: Readonly<{ cells: readonly HexCoord[]; score: number; contact: number }> | undefined;
  let bestTouching: Readonly<{ cells: readonly HexCoord[]; score: number; contact: number }> | undefined;

  attempts.forEach((attempt) => {
    const cells = make_lozenge_blob(attempt, span, depth, rng);
    if (!cells.length || !has_minimum_body_height(cells)) return;
    if (cells_overlap(cells, occupied)) return;

    const contact = contact_score(cells, occupied);
    const distance = anchor_distance(anchor, attempt);
    const score = contact * 80 - distance * 8 - center_penalty(cells) * 0.035 + rng();
    const candidate = { cells, score, contact };

    if (!best || score > best.score) best = candidate;
    if (contact > 0 && (!bestTouching || score > bestTouching.score)) bestTouching = candidate;
  });

  const chosen = occupied.size > 0 ? bestTouching ?? best : best;
  if (chosen) {
    chosen.cells.forEach((cell) => occupied.add(key_of(cell)));
    return chosen.cells;
  }

  const fallback = attempts
    .map((attempt) => make_lozenge_blob(attempt, span, depth, rng).filter((cell) => !occupied.has(key_of(cell))))
    .filter((cells) => cells.length > 0 && has_minimum_body_height(cells))
    .sort((a, b) => {
      const contactDiff = contact_score(b, occupied) - contact_score(a, occupied);
      if (contactDiff !== 0) return contactDiff;
      return center_penalty(a) - center_penalty(b);
    })[0] ?? [];

  fallback.forEach((cell) => occupied.add(key_of(cell)));
  return fallback;
}
function polygon_area(points: readonly Point[]): number {
  let area = 0;
  points.forEach((point, index) => {
    const next = points[(index + 1) % points.length];
    if (!next) return;
    area += point.x * next.y - next.x * point.y;
  });
  return Math.abs(area) * 0.5;
}

function smooth_loop_path(points: readonly Point[]): string {
  if (points.length < 3) return "";

  const first = points[0];
  const second = points[1];
  const last = points[points.length - 1];
  if (!first || !second || !last) return "";

  const start = {
    x: (last.x + first.x) / 2,
    y: (last.y + first.y) / 2,
  };

  const commands = [`M ${start.x.toFixed(2)} ${start.y.toFixed(2)}`];

  points.forEach((point, index) => {
    const next = points[(index + 1) % points.length];
    if (!next) return;
    const mid = {
      x: (point.x + next.x) / 2,
      y: (point.y + next.y) / 2,
    };
    commands.push(`Q ${point.x.toFixed(2)} ${point.y.toFixed(2)} ${mid.x.toFixed(2)} ${mid.y.toFixed(2)}`);
  });

  commands.push("Z");
  return commands.join(" ");
}

function path_for_cells(cells: readonly HexCoord[], size: number): string {
  const edges = new Map<string, readonly [Point, Point]>();

  cells.forEach((cell) => {
    const pts = hex_points(cell, size);
    pts.forEach((point, i) => {
      const next = pts[(i + 1) % pts.length];
      if (!next) return;
      const key = edge_key(point, next);
      if (edges.has(key)) edges.delete(key);
      else edges.set(key, [point, next]);
    });
  });

  const remaining = Array.from(edges.values());
  if (!remaining.length) return "";

  const byStart = new Map<string, Array<readonly [Point, Point]>>();
  remaining.forEach((edge) => {
    const list = byStart.get(point_key(edge[0])) ?? [];
    list.push(edge);
    byStart.set(point_key(edge[0]), list);
  });

  const used = new Set<string>();
  const loops: Point[][] = [];

  remaining.forEach((edge) => {
    const startKey = edge_key(edge[0], edge[1]);
    if (used.has(startKey)) return;

    const start = edge[0];
    let current = edge[1];
    used.add(startKey);
    const points: Point[] = [start, current];

    for (let guard = 0; guard < remaining.length + 4; guard += 1) {
      if (point_key(current) === point_key(start)) break;
      const nextEdges = byStart.get(point_key(current)) ?? [];
      const next = nextEdges.find((candidate) => !used.has(edge_key(candidate[0], candidate[1])));
      if (!next) break;
      used.add(edge_key(next[0], next[1]));
      current = next[1];
      points.push(current);
    }

    if (points.length >= 3) loops.push(points);
  });

  const largest = loops.sort((a, b) => polygon_area(b) - polygon_area(a))[0];
  return largest ? smooth_loop_path(largest) : "";
}

function anchor_for_button(button: AmoebaButtonInput, index: number, rng: () => number): HexCoord {
  const target = TARGETS[index % TARGETS.length] ?? { x: AMOEBA_W * 0.5, y: AMOEBA_H * 0.5 };
  const r = Math.round((target.y - AMOEBA_H * 0.52) / (HEX_SIZE * 1.5)) + Math.floor(rng() * 3) - 1;
  const mid = (BUTTON_BASE_SPAN - 1) / 2;
  const q = Math.round((target.x - AMOEBA_W * 0.5) / (HEX_SIZE * SQRT3) - r / 2 - mid) + Math.floor(rng() * 3) - 1;
  return { q, r };
}

function label_center_for_cells(cells: readonly HexCoord[], span: number): Point {
  if (!cells.length) return { x: AMOEBA_W * 0.5, y: AMOEBA_H * 0.5 };

  const centers = cells.map((coord) => hex_center(coord, HEX_SIZE));
  const ys = centers.map((point) => point.y);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const rows = new Map<number, HexCoord[]>();
  cells.forEach((cell) => {
    const row = rows.get(cell.r) ?? [];
    row.push(cell);
    rows.set(cell.r, row);
  });

  const rs = cells.map((cell) => cell.r);
  const midR = (Math.min(...rs) + Math.max(...rs)) / 2;
  const minSafeSpan = Math.max(3, Math.min(span, 5));
  const labelRow = Array.from(rows.values())
    .filter((row) => row.length >= minSafeSpan)
    .sort((a, b) => Math.abs((a[0]?.r ?? midR) - midR) - Math.abs((b[0]?.r ?? midR) - midR) || b.length - a.length)[0]
    ?? Array.from(rows.values()).sort((a, b) => b.length - a.length)[0]
    ?? cells;

  const sortedRow = [...labelRow].sort((a, b) => a.q - b.q);
  const trim = Math.max(0, Math.floor((sortedRow.length - span) / 2));
  const readableRun = sortedRow.slice(trim, sortedRow.length - trim || sortedRow.length);
  const runCenters = readableRun.map((coord) => hex_center(coord, HEX_SIZE));
  const xs = runCenters.map((point) => point.x);

  return {
    x: (Math.min(...xs) + Math.max(...xs)) / 2,
    y: (minY + maxY) / 2,
  };
}

function make_layout(buttons: AmoebaButtonInput[], seed: number): AmoebiRenderButton[] {
  const rng = mulberry32(seed);
  const occupied = new Set<string>();

  return buttons.map((button, index) => {
    const span = span_for_button(button, rng);
    const anchor = anchor_for_button(button, index, rng);
    const coords = largest_connected_cells(settle_blob(anchor, span, BUTTON_BASE_DEPTH, occupied, rng));
    const labelCenter = label_center_for_cells(coords, span);

    return {
      id: button.id,
      label: button.label,
      cells: coords,
      path: path_for_cells(coords, HEX_SIZE),
      cx: labelCenter.x,
      cy: labelCenter.y,
      tone: button.tone,
    };
  });
}

function make_initial_state(seed: number): AmoebiRenderState {
  return {
    selectedId: "",
    hoveredId: null,
    activeIds: [],
    layout: make_layout(BUTTONS, seed),
  };
}

function make_seed(): number {
  return Math.floor((Date.now() ^ Math.floor(Math.random() * 1000000)) >>> 0);
}


function set_svg_text_style(text: SvgLiveTree): void {
  text.css.setMany({
    fontFamily: "DM Mono, Inconsolata, monospace",
    fontSize: "21px",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
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

function bind_amoebi_interaction(target: SvgLiveTree, parts: AmoebiTileParts, tiles: readonly AmoebiTileParts[], map: LiveMap<AmoebiRenderState>): void {
  target.listen.on("pointerenter", () => {
    apply_amoebi_menu_motion(tiles, parts.button.id, map.snap().activeIds);
    map.at(["hoveredId"]).set(parts.button.id);
  });

  target.listen.on("pointerleave", () => {
    const leavingId = parts.button.id;
    window.setTimeout(() => {
      if (map.snap().hoveredId !== leavingId) return;
      map.at(["hoveredId"]).set(null);
      apply_amoebi_menu_motion(tiles, null, map.snap().activeIds);
    }, 45);
  });

  target.listen.onClick(() => toggle_amoebi_active(map, tiles, parts.button.id));
}

function render_amoebi_body(svg: SvgLiveTree, map: LiveMap<AmoebiRenderState>, button: AmoebiRenderButton, options: AmoebiTileOptions): SvgLiveTree {
  const path = svg.create.path()
    .attr.setMany({
      d: button.path,
      tabindex: options.interactive === false ? "-1" : "0",
      role: options.interactive === false ? "presentation" : "button",
      "aria-label": button.label,
      "data-amoeba-id": button.id,
    })
    .css.setMany(PATH_BASEcss)
    .css.setMany({ pointerEvents: "none" });

  path.bind.cssPaths(map, [["hoveredId"], ["activeIds"]], (values) => (
    amoeba_path_css(button, values[0], values[1])
  ));

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
      pointerEvents: "all",
      outline: "none",
    });
}

function render_amoebi_tile(svg: SvgLiveTree, map: LiveMap<AmoebiRenderState>, button: AmoebiRenderButton, options: AmoebiTileOptions): AmoebiTileParts {
  const cells = options.showCells === false ? [] : render_amoebi_cells(svg, map, button, options.index);
  const body = render_amoebi_body(svg, map, button, options);
  const target = options.interactive === false ? undefined : render_amoebi_hit_target(svg, button);
  const label = options.showLabel === false ? undefined : render_amoebi_label(svg, button, options.index);
  const parts = { button, index: options.index, body, cells, target, label } satisfies AmoebiTileParts;

  RECEDED_AMOEBI_TILES.delete(parts);

  grow_amoebi_outline(body, button, options.index);
  return parts;
}

// --- Amoebi animation helpers ---
type AmoebiMotionMode = "grow" | "recede";

type AmoebiMotionOptions = Readonly<{
  delay?: number;
  duration?: number;
  fromScale?: number;
  toScale?: number;
  origin?: Point;
}>;

const DEFAULT_GROW_DURATION = 460;
const DEFAULT_RECEDE_DURATION = 280;
const DEFAULT_GROW_SCALE = 0.08;

function motion_transition(mode: AmoebiMotionMode, duration: number, delay: number): string {
  const transformTiming = mode === "grow" ? "linear" : "cubic-bezier(.55, 0, .35, 1)";
  const opacityTiming = mode === "grow" ? "linear" : "ease-out";

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

function play_amoebi_motion(tree: SvgLiveTree, mode: AmoebiMotionMode, options: AmoebiMotionOptions = {}): void {
  const duration = options.duration ?? (mode === "grow" ? DEFAULT_GROW_DURATION : DEFAULT_RECEDE_DURATION);
  const delay = options.delay ?? 0;
  const origin = options.origin ?? { x: AMOEBA_W * 0.5, y: AMOEBA_H * 0.52 };
  const fromScale = options.fromScale ?? (mode === "grow" ? DEFAULT_GROW_SCALE : 1);
  const toScale = options.toScale ?? (mode === "grow" ? 1 : DEFAULT_GROW_SCALE);
  const fromOpacity = mode === "grow" ? 0 : 1;
  const toOpacity = mode === "grow" ? 1 : 0;

  set_motion_origin(tree, origin);
  tree.css.setMany({ transition: "none" });
  set_motion_frame(tree, fromScale, fromOpacity);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      tree.css.setMany({ transition: motion_transition(mode, duration, delay) });
      set_motion_frame(tree, toScale, toOpacity);
    });
  });
}

function grow_amoebi_node(tree: SvgLiveTree, origin: Point, delay: number, duration = DEFAULT_GROW_DURATION): void {
  play_amoebi_motion(tree, "grow", { origin, delay, duration });
}

function recede_amoebi_node(tree: SvgLiveTree, origin: Point, delay: number, duration = DEFAULT_RECEDE_DURATION): void {
  play_amoebi_motion(tree, "recede", { origin, delay, duration });
}

function cell_delay(button: AmoebiRenderButton, cell: HexCoord, index: number): number {
  const center = hex_center(cell, HEX_SIZE);
  const dx = center.x - button.cx;
  const dy = center.y - button.cy;
  return Math.round(Math.sqrt(dx * dx + dy * dy) * 1.4 + index * 9);
}

function grow_amoebi_cell(cell: SvgLiveTree, coord: HexCoord, button: AmoebiRenderButton, buttonIndex: number, cellIndex: number): void {
  grow_amoebi_node(cell, hex_center(coord, HEX_SIZE), buttonIndex * 72 + cell_delay(button, coord, cellIndex), 260);
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

  grow_amoebi_cell(cellPath, cell, button, buttonIndex, cellIndex);
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

function render_amoeba(svg: SvgLiveTree, map: LiveMap<AmoebiRenderState>): void {
  svg.empty();
  const state = map.snap();
  const tiles = state.layout.map((button, index) => render_amoebi_tile(svg, map, button, {
    index,
    interactive: true,
    showCells: true,
    showLabel: true,
    shrinkOnHover: true,
  }));

  tiles.forEach((tile) => {
    if (tile.target) bind_amoebi_interaction(tile.target, tile, tiles, map);
  });
}

export function make_amoebi(stage: LiveTree): void {
  const root = stage.create.div()
    .id.set("amoebi-menu-demo")
    .classlist.add("amoebi-menu-demo")
    .css.setMany(AMOEBI_ROOTcss);

  root.create.div()
    .text.set("'amoeba' menu sketch v0.1")
    .css.setMany(AMOEBI_TITLEcss);

  const svg = root.create.svg()
    .attr.setMany({
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: `0 0 ${AMOEBA_W} ${AMOEBA_H}`,
      preserveAspectRatio: "xMidYMid meet",
      role: "group",
      "aria-label": "Amoebi menu experiment",
    })
    .css.setMany(AMOEBI_SVGcss);

  const initialState = make_initial_state(make_seed()) as unknown as JsonValue;
  const state = hson.liveMap.fromJson(initialState) as unknown as LiveMap<AmoebiRenderState>;
  render_amoeba(svg, state);
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

function toggle_amoebi_active(map: LiveMap<AmoebiRenderState>, tiles: readonly AmoebiTileParts[], id: string): void {
  const state = map.snap();
  const next = state.activeIds.includes(id) ? [] : [id];

  map.at(["activeIds"]).set(next);
  map.at(["selectedId"]).set(next[0] ?? "");
  apply_amoebi_menu_motion(tiles, state.hoveredId, next);
}

function grow_amoebi_tile(parts: AmoebiTileParts): void {
  if (!RECEDED_AMOEBI_TILES.has(parts)) return;
  RECEDED_AMOEBI_TILES.delete(parts);

  parts.cells.forEach((cell, cellIndex) => {
    const coord = parts.button.cells[cellIndex];
    if (!coord) return;
    grow_amoebi_node(cell, hex_center(coord, HEX_SIZE), Math.max(0, cell_delay(parts.button, coord, cellIndex) - 44), 230);
  });

  play_amoebi_motion(parts.body, "grow", {
    origin: { x: parts.button.cx, y: parts.button.cy },
    delay: 190,
    duration: 190,
    fromScale: 0.98,
  });
}

function recede_amoebi_tile(parts: AmoebiTileParts): void {
  if (RECEDED_AMOEBI_TILES.has(parts)) return;
  RECEDED_AMOEBI_TILES.add(parts);

  recede_amoebi_node(parts.body, { x: parts.button.cx, y: parts.button.cy }, 120, 360);

  const total = parts.cells.length;
  parts.cells.forEach((cell, cellIndex) => {
    const coord = parts.button.cells[cellIndex];
    if (!coord) return;
    const reverseIndex = total - cellIndex - 1;
    recede_amoebi_node(cell, hex_center(coord, HEX_SIZE), 40 + reverseIndex * 18, 340);
  });
}