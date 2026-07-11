// make-amoebi.ts

import { hson, type LiveTree } from "hson-live";
import type { JsonValue, LiveMap, SvgLiveTree } from "hson-live/types";
import { OKLCH_NEUTRALS } from "../../core/consts/oklch.consts";
import { set_alpha } from "../../core/helpers/color-helpers";
import type { AmoebaButtonInput, Point, HexCoord, AmoebaButtonLayout, AmoebaState } from "./amoebi.types";
import { BUTTON_BASE_SPAN, AMOEBA_W, SQRT3, AMOEBA_H, HEX_SIZE, BUTTON_BASE_DEPTH, BUTTONS, TARGETS } from "./amoebi.consts";
import { PATH_BASEcss, AMOEBI_ROOTcss, AMOEBI_TITLEcss, AMOEBI_SVGcss } from "./amoebi.css";

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

function make_layout(buttons: AmoebaButtonInput[], seed: number): AmoebaButtonLayout[] {
  const rng = mulberry32(seed);
  const occupied = new Set<string>();

  return buttons.map((button, index) => {
    const span = span_for_button(button, rng);
    const anchor = anchor_for_button(button, index, rng);
    const coords = settle_blob(anchor, span, BUTTON_BASE_DEPTH, occupied, rng);
    const labelCenter = label_center_for_cells(coords, span);

    return {
      id: button.id,
      label: button.label,
      path: path_for_cells(coords, HEX_SIZE),
      cx: labelCenter.x,
      cy: labelCenter.y,
      tone: button.tone,
    };
  });
}

function make_initial_state(seed: number): AmoebaState {
  return {
    selectedId: BUTTONS[0]?.id ?? "",
    hoveredId: null,
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
    fill: OKLCH_NEUTRALS.pearlIvory,
    pointerEvents: "none",
    userSelect: "none",
  });
}

function amoeba_path_css(button: AmoebaButtonLayout, hoveredId: JsonValue | undefined, selectedId: JsonValue | undefined): Readonly<Record<string, string>> {
  const hovered = hoveredId === button.id;
  const selected = selectedId === button.id;

  return {
    fill: set_alpha(button.tone, hovered ? 0.29 : selected ? 0.27 : 0.22),
    stroke: hovered ? button.tone : set_alpha(button.tone, selected ? 0.9 : 0.66),
    strokeWidth: hovered ? "2.4" : selected ? "1.7" : "1.35",
    filter: hovered ? `drop-shadow(0 0 8px ${set_alpha(button.tone, 0.22)})` : "none",
  };
}

function render_amoeba(svg: SvgLiveTree, map: LiveMap<AmoebaState>): void {
  svg.empty();
  const state = map.snap();

  state.layout.forEach((button) => {
    const path = svg.create.path()
      .attr.setMany({
        d: button.path,
        tabindex: "0",
        role: "button",
        "aria-label": button.label,
        "data-amoeba-id": button.id,
      })
      .css.setMany(PATH_BASEcss);

    path.bind.cssPaths(map, [["hoveredId"], ["selectedId"]], (values) => (
      amoeba_path_css(button, values[0], values[1])
    ));

    path.listen.on("pointerenter", () => map.at(["hoveredId"]).set(button.id));
    path.listen.on("pointerleave", () => map.at(["hoveredId"]).set(null));
    path.listen.onClick(() => map.at(["selectedId"]).set(button.id));

    const label = svg.create.text()
      .text.set(button.label)
      .attr.setMany({
        x: button.cx.toFixed(2),
        y: button.cy.toFixed(2),
      });
    set_svg_text_style(label);
  });
}

export function make_amoebi(stage: LiveTree): void {
  const root = stage.create.div()
    .id.set("amoebi-menu-demo")
    .classlist.add("amoebi-menu-demo")
    .css.setMany(AMOEBI_ROOTcss);

  root.create.div()
    .text.set("amoeba menu sketch")
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
  const state = hson.liveMap.fromJson(initialState) as unknown as LiveMap<AmoebaState>;
  render_amoeba(svg, state);
}