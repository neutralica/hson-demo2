import { pack_soft_tiles } from "../../ui/soft-tile/soft-tile-field";
import type { SoftTileBody } from "../../ui/soft-tile/soft-tile.types";
import {
  AMOEBA_H,
  AMOEBA_W,
  AMOEBI_GEOMETRY,
  AMOEBI_TILE_ENERGY,
  AMOEBI_TILE_FIELD,
  AMOEBI_TILE_SEARCH,
  HEX_SIZE,
  SQRT3,
} from "./amoebi.consts";
import type {
  AmoebaButtonInput,
  AmoebiBounds,
  AmoebiGeometryConfig,
  AmoebiPackedLayout,
  AmoebiRenderButton,
  AmoebiRenderState,
  HexCoord,
  Point,
} from "./amoebi.types";

export const MENU_HEX_ORIGIN_X = AMOEBA_W * 0.11;
export const MENU_HEX_ORIGIN_Y = HEX_SIZE * 1.5;

export const MENU_CHANNEL_LEFT = 0;
export const MENU_CHANNEL_RIGHT = 200;

function key_of(coord: HexCoord): string {
  return `${coord.q},${coord.r}`;
}

export function hex_neighbors({ q, r }: HexCoord): readonly HexCoord[] {
  return [
    { q: q + 1, r }, { q: q + 1, r: r - 1 }, { q, r: r - 1 },
    { q: q - 1, r }, { q: q - 1, r: r + 1 }, { q, r: r + 1 },
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
  return Array.from({ length: 6 }, (_, index) => {
    const angle = Math.PI / 180 * (60 * index - 30);
    return { x: center.x + size * Math.cos(angle), y: center.y + size * Math.sin(angle) };
  });
}

export function hex_cell_path(coord: HexCoord, size: number): string {
  const center = hex_center(coord, size);
  const radius = size * 1.02;
  const points = Array.from({ length: 6 }, (_, index) => {
    const angle = Math.PI / 180 * (60 * index - 30);
    return { x: center.x + radius * Math.cos(angle), y: center.y + radius * Math.sin(angle) };
  });
  const first = points[0];
  if (!first) return "";
  return [`M ${first.x.toFixed(2)} ${first.y.toFixed(2)}`, ...points.slice(1).map((point) => `L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`), "Z"].join(" ");
}

export function label_footprint(label: string, config: AmoebiGeometryConfig): Readonly<{ width: number; height: number }> {
  const glyphsWidth = label.length * config.labelFontSize * config.labelGlyphWidthRatio;
  const spacingWidth = Math.max(0, label.length - 1) * config.labelLetterSpacing;
  return {
    width: glyphsWidth + spacingWidth + config.labelPaddingX * 2,
    height: config.labelFontSize + config.labelPaddingY * 2,
  };
}

export function core_dimensions(label: string, config: AmoebiGeometryConfig = AMOEBI_GEOMETRY): Readonly<{ columns: number; rows: number }> {
  const footprint = label_footprint(label, config);
  const columnStep = SQRT3 * config.hexSize;
  const columnsForWidth = Math.ceil(Math.max(0, footprint.width - columnStep) / columnStep) + 1;
  const rowsForHeight = Math.ceil(Math.max(0, footprint.height - config.hexSize * 2) / (config.hexSize * 1.5)) + 1;
  let columns = Math.max(config.minCoreColumns, columnsForWidth);
  let rows = Math.max(config.minCoreRows, rowsForHeight);
  while (columns * rows < config.minCellCount) {
    if (columns <= rows) columns += 1;
    else rows += 1;
  }
  return { columns, rows };
}

function make_core(label: string, config: AmoebiGeometryConfig): readonly HexCoord[] {
  const { columns, rows } = core_dimensions(label, config);
  const cells: HexCoord[] = [];
  const firstR = -Math.floor(rows / 2);
  for (let row = 0; row < rows; row += 1) {
    const r = firstR + row;
    const firstQ = -Math.floor(columns / 2) - Math.floor(r / 2);
    for (let column = 0; column < columns; column += 1) cells.push({ q: firstQ + column, r });
  }
  return cells;
}

export function bounds_for_cells(cells: readonly HexCoord[], size: number): AmoebiBounds {
  if (!cells.length) return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
  const centers = cells.map((cell) => hex_center(cell, size));
  const halfWidth = SQRT3 * size / 2;
  const left = Math.min(...centers.map(({ x }) => x)) - halfWidth;
  const right = Math.max(...centers.map(({ x }) => x)) + halfWidth;
  const top = Math.min(...centers.map(({ y }) => y)) - size;
  const bottom = Math.max(...centers.map(({ y }) => y)) + size;
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

function aspect_is_allowed(cells: readonly HexCoord[], config: AmoebiGeometryConfig): boolean {
  const bounds = bounds_for_cells(cells, config.hexSize);
  return Math.max(bounds.width / bounds.height, bounds.height / bounds.width) <= config.maxAspectRatio;
}

function add_fringe(core: readonly HexCoord[], rng: () => number, config: AmoebiGeometryConfig): readonly HexCoord[] {
  const cells = new Map(core.map((cell) => [key_of(cell), cell] as const));
  const fringeBand = new Map<string, HexCoord>();
  core.forEach((cell) => hex_neighbors(cell).forEach((neighbor) => {
    if (!cells.has(key_of(neighbor))) fringeBand.set(key_of(neighbor), neighbor);
  }));
  const coreBounds = bounds_for_cells(core, config.hexSize);
  const directionalWidthLimit = Math.min(config.maxBodyWidth, coreBounds.width + SQRT3 * config.hexSize);
  const horizontalTarget = Math.round(core.length * config.horizontalFringeRatio);
  const verticalTarget = Math.round(core.length * config.verticalFringeRatio);
  let horizontalAdded = 0;
  let verticalAdded = 0;
  for (let added = 0; added < horizontalTarget + verticalTarget; added += 1) {
    const candidates = new Map<string, HexCoord>();
    cells.forEach((cell) => hex_neighbors(cell).forEach((neighbor) => {
      if (!cells.has(key_of(neighbor))) candidates.set(key_of(neighbor), neighbor);
    }));
    const viable = [...candidates.values()].filter((candidate) => {
      if (!fringeBand.has(key_of(candidate))) return false;
      const nextCells = [...cells.values(), candidate];
      const nextBounds = bounds_for_cells(nextCells, config.hexSize);
      if (nextBounds.width > directionalWidthLimit + 1e-9 || !aspect_is_allowed(nextCells, config)) return false;
      const center = hex_center(candidate, config.hexSize);
      const horizontal = center.x < coreBounds.left || center.x > coreBounds.right;
      return horizontal ? horizontalAdded < horizontalTarget : verticalAdded < verticalTarget;
    });
    if (!viable.length) break;
    const chosen = viable[Math.floor(rng() * viable.length)];
    if (chosen) {
      const center = hex_center(chosen, config.hexSize);
      if (center.x < coreBounds.left || center.x > coreBounds.right) horizontalAdded += 1;
      else verticalAdded += 1;
      cells.set(key_of(chosen), chosen);
    }
  }
  return [...cells.values()];
}

export function translate_cells(cells: readonly HexCoord[], delta: HexCoord): readonly HexCoord[] {
  return cells.map(({ q, r }) => ({ q: q + delta.q, r: r + delta.r }));
}

function center_for_core(core: readonly HexCoord[], size: number): Point {
  const bounds = bounds_for_cells(core, size);
  return { x: (bounds.left + bounds.right) / 2, y: (bounds.top + bounds.bottom) / 2 };
}

function point_key(point: Point): string { return `${point.x.toFixed(3)},${point.y.toFixed(3)}`; }
function edge_key(a: Point, b: Point): string {
  const ak = point_key(a); const bk = point_key(b);
  return ak < bk ? `${ak}|${bk}` : `${bk}|${ak}`;
}
function polygon_area(points: readonly Point[]): number {
  return Math.abs(points.reduce((area, point, index) => {
    const next = points[(index + 1) % points.length];
    return next ? area + point.x * next.y - next.x * point.y : area;
  }, 0)) * 0.5;
}
function smooth_loop_path(points: readonly Point[]): string {
  const first = points[0]; const last = points[points.length - 1];
  if (!first || !last || points.length < 3) return "";
  const commands = [`M ${((last.x + first.x) / 2).toFixed(2)} ${((last.y + first.y) / 2).toFixed(2)}`];
  points.forEach((point, index) => {
    const next = points[(index + 1) % points.length];
    if (next) commands.push(`Q ${point.x.toFixed(2)} ${point.y.toFixed(2)} ${((point.x + next.x) / 2).toFixed(2)} ${((point.y + next.y) / 2).toFixed(2)}`);
  });
  return [...commands, "Z"].join(" ");
}
export function path_for_cells(cells: readonly HexCoord[], size: number): string {
  const edges = new Map<string, readonly [Point, Point]>();
  cells.forEach((cell) => hex_points(cell, size).forEach((point, index, points) => {
    const next = points[(index + 1) % points.length];
    if (!next) return;
    const key = edge_key(point, next);
    if (edges.has(key)) edges.delete(key); else edges.set(key, [point, next]);
  }));
  const remaining = [...edges.values()];
  const byStart = new Map<string, Array<readonly [Point, Point]>>();
  remaining.forEach((edge) => byStart.set(point_key(edge[0]), [...(byStart.get(point_key(edge[0])) ?? []), edge]));
  const used = new Set<string>(); const loops: Point[][] = [];
  remaining.forEach((edge) => {
    if (used.has(edge_key(edge[0], edge[1]))) return;
    const start = edge[0]; let current = edge[1]; const points = [start, current];
    used.add(edge_key(edge[0], edge[1]));
    for (let guard = 0; guard < remaining.length + 4 && point_key(current) !== point_key(start); guard += 1) {
      const next = (byStart.get(point_key(current)) ?? []).find((item) => !used.has(edge_key(item[0], item[1])));
      if (!next) break;
      used.add(edge_key(next[0], next[1])); current = next[1]; points.push(current);
    }
    if (points.length >= 3) loops.push(points);
  });
  const largest = loops.sort((a, b) => polygon_area(b) - polygon_area(a))[0];
  return largest ? smooth_loop_path(largest) : "";
}

export function pack_amoebi_layout(
  buttons: readonly AmoebaButtonInput[],
  seed: number,
  config: AmoebiGeometryConfig = AMOEBI_GEOMETRY,
): AmoebiPackedLayout {
  const rng = mulberry32(seed);
  const generated = buttons.map((button) => {
    const core = make_core(button.label, config);
    const cells = add_fringe(core, rng, config);
    return { button, core, cells, anchor: center_for_core(core, config.hexSize) };
  });
  const bodies: readonly SoftTileBody[] = generated.map(({ button, cells, core, anchor }) => ({
    id: button.id,
    cells,
    core,
    anchor,
  }));
  const packing = pack_soft_tiles(bodies, AMOEBI_TILE_FIELD, AMOEBI_TILE_SEARCH, AMOEBI_TILE_ENERGY);
  const layout = packing.tiles.map((tile, index): AmoebiRenderButton => {
    const input = buttons[index];
    if (!input) throw new Error(`Missing Amoebi button input for packed tile ${tile.id}`);
    return {
      id: input.id,
      label: input.label,
      tone: input.tone,
      cells: tile.cells,
      coreCells: tile.core,
      bounds: tile.bounds,
      path: path_for_cells(tile.cells, config.hexSize),
      cx: tile.anchor.x,
      cy: tile.anchor.y,
      placement: tile.diagnostics,
      contacts: tile.contacts,
    };
  });
  return {
    layout,
    packingDiagnostics: packing.diagnostics,
    packingEnergy: packing.energy,
  };
}

export function make_layout(
  buttons: readonly AmoebaButtonInput[],
  seed: number,
  config: AmoebiGeometryConfig = AMOEBI_GEOMETRY,
): AmoebiRenderButton[] {
  return [...pack_amoebi_layout(buttons, seed, config).layout];
}

export function amoebi_view_height(state: AmoebiRenderState): number {
  const bottom = state.layout.reduce((maxBottom, button) => Math.max(maxBottom, button.bounds.bottom), 0);
  return Math.max(HEX_SIZE * 12, Math.ceil(bottom + HEX_SIZE * 2.5));
}

export function make_initial_state(seed: number, buttons: readonly AmoebaButtonInput[], activeIds: readonly string[]): AmoebiRenderState {
  return { selectedId: activeIds[0] ?? "", hoveredId: null, activeIds, layout: make_layout(buttons, seed) };
}

export function make_seed(): number {
  return Math.floor((Date.now() ^ Math.floor(Math.random() * 1000000)) >>> 0);
}
