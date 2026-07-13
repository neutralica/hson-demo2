import { AMOEBA_H, AMOEBA_W, AMOEBI_GEOMETRY, HEX_SIZE, SQRT3 } from "./amoebi.consts";
import type {
  AmoebaButtonInput,
  AmoebiBounds,
  AmoebiGeometryConfig,
  AmoebiRenderButton,
  AmoebiRenderState,
  HexCoord,
  Point,
} from "./amoebi.types";

export const MENU_HEX_ORIGIN_X = AMOEBA_W * 0.11;
export const MENU_HEX_ORIGIN_Y = HEX_SIZE * 3.25;

const MENU_CHANNEL_LEFT = 18;
const MENU_CHANNEL_RIGHT = MENU_CHANNEL_LEFT + 220;
const BUTTON_X_DEVIATIONS = [0, 0, 0, -1, 0, 0, 0, -1, 0, 0] as const;

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
  const ratio = config.fringeRatioMin + rng() * (config.fringeRatioMax - config.fringeRatioMin);
  const target = Math.round(core.length * ratio);
  for (let added = 0; added < target; added += 1) {
    const candidates = new Map<string, HexCoord>();
    cells.forEach((cell) => hex_neighbors(cell).forEach((neighbor) => {
      if (!cells.has(key_of(neighbor))) candidates.set(key_of(neighbor), neighbor);
    }));
    const viable = [...candidates.values()].filter((candidate) => fringeBand.has(key_of(candidate)) && aspect_is_allowed([...cells.values(), candidate], config));
    if (!viable.length) break;
    const chosen = viable[Math.floor(rng() * viable.length)];
    if (chosen) cells.set(key_of(chosen), chosen);
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

function contact_count(cells: readonly HexCoord[], neighborKeys: ReadonlySet<string>): number {
  return cells.reduce((count, cell) => count + hex_neighbors(cell).filter((neighbor) => neighborKeys.has(key_of(neighbor))).length, 0);
}

function add_contact_skin(
  cells: readonly HexCoord[],
  core: readonly HexCoord[],
  occupied: ReadonlySet<string>,
  config: AmoebiGeometryConfig,
): readonly HexCoord[] {
  if (!occupied.size) return cells;
  const skinned = new Map(cells.map((cell) => [key_of(cell), cell] as const));
  const additionLimit = Math.round(core.length * config.contactSkinRatio);
  const coreCenterR = core.reduce((sum, cell) => sum + cell.r, 0) / core.length;
  const coreMinR = Math.min(...core.map(({ r }) => r));
  const coreMaxR = Math.max(...core.map(({ r }) => r));
  const initialBounds = bounds_for_cells(cells, config.hexSize);
  const skinReachX = SQRT3 * config.hexSize;

  for (let added = 0; added < additionLimit; added += 1) {
    const candidates = new Map<string, HexCoord>();
    skinned.forEach((cell) => hex_neighbors(cell).forEach((neighbor) => {
      const key = key_of(neighbor);
      if (!skinned.has(key) && !occupied.has(key)) candidates.set(key, neighbor);
    }));

    let best: Readonly<{ cell: HexCoord; score: number }> | undefined;
    candidates.forEach((candidate) => {
      if (candidate.r < coreMinR - 2 || candidate.r > coreMaxR + 1) return;
      const center = hex_center(candidate, config.hexSize);
      if (center.x < initialBounds.left - skinReachX || center.x > initialBounds.right + skinReachX) return;
      const occupiedContacts = hex_neighbors(candidate).filter((neighbor) => occupied.has(key_of(neighbor))).length;
      if (!occupiedContacts) return;
      const nextCells = [...skinned.values(), candidate];
      const bounds = bounds_for_cells(nextCells, config.hexSize);
      if (bounds.left < MENU_CHANNEL_LEFT || bounds.right > MENU_CHANNEL_RIGHT) return;
      if (!aspect_is_allowed(nextCells, config)) return;
      const bodyContacts = hex_neighbors(candidate).filter((neighbor) => skinned.has(key_of(neighbor))).length;
      const upwardPull = Math.max(0, coreCenterR - candidate.r);
      const score = occupiedContacts * 100 + bodyContacts * 18 + upwardPull * 4;
      if (!best || score > best.score) best = { cell: candidate, score };
    });
    if (!best) break;
    skinned.set(key_of(best.cell), best.cell);
  }
  return [...skinned.values()];
}

function place_shape(
  cells: readonly HexCoord[],
  core: readonly HexCoord[],
  index: number,
  previousCells: readonly HexCoord[],
  occupied: ReadonlySet<string>,
  config: AmoebiGeometryConfig,
): Readonly<{ cells: readonly HexCoord[]; core: readonly HexCoord[] }> {
  const localBounds = bounds_for_cells(cells, config.hexSize);
  const deviation = BUTTON_X_DEVIATIONS[index % BUTTON_X_DEVIATIONS.length] ?? 0;
  const previousKeys = new Set(previousCells.map(key_of));

  if (previousCells.length) {
    const previousBounds = bounds_for_cells(previousCells, config.hexSize);
    const candidateDeltas = new Map<string, HexCoord>();
    previousCells.forEach((previousCell) => {
      hex_neighbors(previousCell).forEach((openNeighbor) => {
        cells.forEach((cell) => {
          const delta = { q: openNeighbor.q - cell.q, r: openNeighbor.r - cell.r };
          candidateDeltas.set(key_of(delta), delta);
        });
      });
    });
    let best: Readonly<{ cells: readonly HexCoord[]; core: readonly HexCoord[]; score: number }> | undefined;

    candidateDeltas.forEach((delta) => {
      const candidate = translate_cells(cells, delta);
      const bounds = bounds_for_cells(candidate, config.hexSize);
      if (bounds.left < MENU_CHANNEL_LEFT || bounds.right > MENU_CHANNEL_RIGHT) return;
      if (bounds.top <= previousBounds.top) return;
      if (candidate.some((cell) => occupied.has(key_of(cell)))) return;
      const previousContacts = contact_count(candidate, previousKeys);
      if (!previousContacts) return;
      const totalContacts = contact_count(candidate, occupied);
      const targetQ = -Math.round(delta.r / 2) + deviation;
      const horizontalDrift = Math.abs(delta.q - targetQ);
      const score = previousContacts * 1_000
        + totalContacts * 220
        - horizontalDrift * 12
        - bounds.bottom * 0.08;
      if (!best || score > best.score) best = { cells: candidate, core: translate_cells(core, delta), score };
    });
    if (best) return { cells: add_contact_skin(best.cells, best.core, occupied, config), core: best.core };
  }

  const previousBottom = previousCells.length ? bounds_for_cells(previousCells, config.hexSize).bottom : 0;
  const desiredTop = index === 0 ? MENU_HEX_ORIGIN_Y - config.hexSize : previousBottom + config.buttonGap;
  const deltaR = Math.max(0, Math.ceil((desiredTop - localBounds.top) / (config.hexSize * 1.5)));
  let deltaQ = -Math.round(deltaR / 2) + deviation;
  let placed = translate_cells(cells, { q: deltaQ, r: deltaR });
  let bounds = bounds_for_cells(placed, config.hexSize);
  while (bounds.left < MENU_CHANNEL_LEFT) { deltaQ += 1; placed = translate_cells(cells, { q: deltaQ, r: deltaR }); bounds = bounds_for_cells(placed, config.hexSize); }
  while (bounds.right > MENU_CHANNEL_RIGHT) { deltaQ -= 1; placed = translate_cells(cells, { q: deltaQ, r: deltaR }); bounds = bounds_for_cells(placed, config.hexSize); }
  return { cells: placed, core: translate_cells(core, { q: deltaQ, r: deltaR }) };
}

export function make_layout(buttons: readonly AmoebaButtonInput[], seed: number, config: AmoebiGeometryConfig = AMOEBI_GEOMETRY): AmoebiRenderButton[] {
  const rng = mulberry32(seed);
  const occupied = new Set<string>();
  let previousCells: readonly HexCoord[] = [];
  return buttons.map((button, index) => {
    const localCore = make_core(button.label, config);
    const localCells = add_fringe(localCore, rng, config);
    const placed = place_shape(localCells, localCore, index, previousCells, occupied, config);
    const bounds = bounds_for_cells(placed.cells, config.hexSize);
    const labelCenter = center_for_core(placed.core, config.hexSize);
    placed.cells.forEach((cell) => occupied.add(key_of(cell)));
    previousCells = placed.cells;
    return { id: button.id, label: button.label, tone: button.tone, cells: placed.cells, coreCells: placed.core, bounds, path: path_for_cells(placed.cells, config.hexSize), cx: labelCenter.x, cy: labelCenter.y };
  });
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
