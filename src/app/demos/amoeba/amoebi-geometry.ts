// amoebi-geometry.ts

import { AMOEBA_W, AMOEBA_H, BUTTON_BASE_DEPTH, BUTTON_BASE_SPAN, HEX_SIZE, SQRT3 } from "./amoebi.consts";
import type { AmoebaButtonInput, AmoebiRenderButton, AmoebiRenderState, HexCoord, Point } from "./amoebi.types";

export const MENU_HEX_ORIGIN_X = AMOEBA_W * 0.16;
export const MENU_HEX_ORIGIN_Y = AMOEBA_H * 0.18;
export const MENU_ANCHORS: readonly HexCoord[] = [
  { q: 0, r: 0 },
  { q: -1, r: 2 },
  { q: -2, r: 4 },
  { q: -2, r: 6 },
  { q: -4, r: 8 },
  { q: -4, r: 10 },
  { q: -6, r: 12 },
  { q: -4, r: 13 },
  { q: -7, r: 15 },
  { q: -8, r: 17 },
];
function span_for_button(button: AmoebaButtonInput, rng: () => number): number {
  const labelBoost = button.label.length >= 7 ? 1 : 0;
  const jitter = rng() > 0.82 ? 1 : 0;
  return Math.max(5, BUTTON_BASE_SPAN + labelBoost + jitter);
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
export function hex_center(coord: HexCoord, size: number): Point {
  return {
    x: MENU_HEX_ORIGIN_X + size * SQRT3 * (coord.q + coord.r / 2),
    y: MENU_HEX_ORIGIN_Y + size * 1.5 * coord.r,
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
export function hex_cell_path(coord: HexCoord, size: number): string {
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
  return center.x > 22 && center.x < AMOEBA_W * 0.54 && center.y > 18 && center.y < AMOEBA_H - 34;
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
function center_penalty(cells: readonly HexCoord[], anchor: HexCoord): number {
  if (!cells.length) return 0;

  const centers = cells.map((cell) => hex_center(cell, HEX_SIZE));
  const avg = centers.reduce<Point>((sum, point) => ({
    x: sum.x + point.x,
    y: sum.y + point.y,
  }), { x: 0, y: 0 });
  const cx = avg.x / centers.length;
  const cy = avg.y / centers.length;
  const anchorCenter = hex_center(anchor, HEX_SIZE);
  const dx = Math.abs(cx - anchorCenter.x);
  const dy = Math.abs(cy - anchorCenter.y);
  const rightDrift = Math.max(0, cx - anchorCenter.x);
  const leftDrift = Math.max(0, anchorCenter.x - cx);

  return dx * 1.15 + dy * 0.22 + rightDrift * 1.65 + leftDrift * 0.18;
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

  let best: Readonly<{ cells: readonly HexCoord[]; score: number; contact: number; }> | undefined;
  let bestTouching: Readonly<{ cells: readonly HexCoord[]; score: number; contact: number; }> | undefined;

  attempts.forEach((attempt) => {
    const cells = make_lozenge_blob(attempt, span, depth, rng);
    if (!cells.length || !has_minimum_body_height(cells)) return;
    if (cells_overlap(cells, occupied)) return;

    const contact = contact_score(cells, occupied);
    const distance = anchor_distance(anchor, attempt);
    const score = contact * 54 - distance * 18 - center_penalty(cells, anchor) * 0.12 + rng();
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
      return center_penalty(a, anchor) - center_penalty(b, anchor);
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
function anchor_for_button(_button: AmoebaButtonInput, index: number, rng: () => number): HexCoord {
  const base = MENU_ANCHORS[index % MENU_ANCHORS.length] ?? { q: -2, r: -8 + index * 2 };
  const cycle = Math.floor(index / MENU_ANCHORS.length);
  const qJitter = rng() > 0.86 ? 1 : 0;
  const rJitter = rng() > 0.72 ? Math.floor(rng() * 3) - 1 : 0;

  return {
    q: base.q + qJitter,
    r: base.r + cycle * 3 + rJitter,
  };
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
function make_layout(buttons: readonly AmoebaButtonInput[], seed: number): AmoebiRenderButton[] {
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
export function make_initial_state(seed: number, buttons: readonly AmoebaButtonInput[], activeIds: readonly string[]): AmoebiRenderState {
  return {
    selectedId: activeIds[0] ?? "",
    hoveredId: null,
    activeIds,
    layout: make_layout(buttons, seed),
  };
}
export function make_seed(): number {
  return Math.floor((Date.now() ^ Math.floor(Math.random() * 1000000)) >>> 0);
}

