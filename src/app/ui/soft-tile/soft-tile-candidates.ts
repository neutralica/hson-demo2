import type {
  SoftTileBody,
  SoftTileBounds,
  SoftTileCandidate,
  SoftTileContactEdge,
  SoftTileFieldConfig,
  SoftTileHexCoord,
  SoftTilePlacedTile,
  SoftTilePoint,
  SoftTileSearchConfig,
  SoftTileSearchState,
  SoftTileWall,
} from "./soft-tile.types";

const SQRT3 = Math.sqrt(3);

export function soft_tile_key({ q, r }: SoftTileHexCoord): string {
  return `${q},${r}`;
}

export function soft_tile_neighbors({ q, r }: SoftTileHexCoord): readonly SoftTileHexCoord[] {
  return [
    { q: q + 1, r },
    { q: q + 1, r: r - 1 },
    { q, r: r - 1 },
    { q: q - 1, r },
    { q: q - 1, r: r + 1 },
    { q, r: r + 1 },
  ];
}

export function soft_tile_center(
  coord: SoftTileHexCoord,
  field: Pick<SoftTileFieldConfig, "origin" | "hexSize">,
): SoftTilePoint {
  return {
    x: field.origin.x + field.hexSize * SQRT3 * (coord.q + coord.r / 2),
    y: field.origin.y + field.hexSize * 1.5 * coord.r,
  };
}

export function soft_tile_translation_offset(
  translation: SoftTileHexCoord,
  hexSize: number,
): SoftTilePoint {
  return {
    x: hexSize * SQRT3 * (translation.q + translation.r / 2),
    y: hexSize * 1.5 * translation.r,
  };
}

export function soft_tile_translate(
  cells: readonly SoftTileHexCoord[],
  translation: SoftTileHexCoord,
): readonly SoftTileHexCoord[] {
  return cells.map(({ q, r }) => ({ q: q + translation.q, r: r + translation.r }));
}

export function soft_tile_bounds(
  cells: readonly SoftTileHexCoord[],
  field: Pick<SoftTileFieldConfig, "origin" | "hexSize">,
): SoftTileBounds {
  if (!cells.length) return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
  const centers = cells.map((cell) => soft_tile_center(cell, field));
  const halfWidth = SQRT3 * field.hexSize / 2;
  const left = Math.min(...centers.map(({ x }) => x)) - halfWidth;
  const right = Math.max(...centers.map(({ x }) => x)) + halfWidth;
  const top = Math.min(...centers.map(({ y }) => y)) - field.hexSize;
  const bottom = Math.max(...centers.map(({ y }) => y)) + field.hexSize;
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

export function soft_tile_union_bounds(bounds: readonly SoftTileBounds[]): SoftTileBounds {
  if (!bounds.length) return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
  const left = Math.min(...bounds.map((item) => item.left));
  const top = Math.min(...bounds.map((item) => item.top));
  const right = Math.max(...bounds.map((item) => item.right));
  const bottom = Math.max(...bounds.map((item) => item.bottom));
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

export function soft_tile_normalize(vector: SoftTilePoint): SoftTilePoint {
  const length = Math.hypot(vector.x, vector.y);
  if (!length) throw new Error("Soft-tile direction vectors must be non-zero");
  return { x: vector.x / length, y: vector.y / length };
}

export function soft_tile_project(point: SoftTilePoint, vector: SoftTilePoint): number {
  const normalized = soft_tile_normalize(vector);
  return point.x * normalized.x + point.y * normalized.y;
}

export function soft_tile_cavity_cells(
  occupiedByCell: ReadonlyMap<string, number>,
): ReadonlyMap<string, number> {
  const open = new Map<string, SoftTileHexCoord>();
  occupiedByCell.forEach((_tileIndex, key) => {
    const [qText, rText] = key.split(",");
    const q = Number(qText);
    const r = Number(rText);
    soft_tile_neighbors({ q, r }).forEach((neighbor) => {
      const neighborKey = soft_tile_key(neighbor);
      if (!occupiedByCell.has(neighborKey)) open.set(neighborKey, neighbor);
    });
  });
  const cavities = new Map<string, number>();
  open.forEach((cell, key) => {
    const adjacentTiles = new Set<number>();
    let occupiedNeighbors = 0;
    soft_tile_neighbors(cell).forEach((neighbor) => {
      const tileIndex = occupiedByCell.get(soft_tile_key(neighbor));
      if (tileIndex === undefined) return;
      occupiedNeighbors += 1;
      adjacentTiles.add(tileIndex);
    });
    if (adjacentTiles.size >= 2 || occupiedNeighbors >= 3) {
      cavities.set(key, adjacentTiles.size * 2 + occupiedNeighbors);
    }
  });
  return cavities;
}

function allowed_walls(body: SoftTileBody, field: SoftTileFieldConfig): readonly SoftTileWall[] {
  const bodyWalls = body.allowedSupportWalls ?? field.supportWalls;
  return field.supportWalls.filter((wall) => bodyWalls.includes(wall));
}

function wall_contacts(
  cells: readonly SoftTileHexCoord[],
  bounds: SoftTileBounds,
  body: SoftTileBody,
  field: SoftTileFieldConfig,
): Readonly<{ walls: readonly SoftTileWall[]; edges: readonly SoftTileContactEdge[] }> {
  const walls = allowed_walls(body, field).filter((wall) => {
    if (wall === "left") return bounds.left <= field.bounds.left + field.wallContactTolerance;
    if (wall === "right") return bounds.right >= field.bounds.right - field.wallContactTolerance;
    if (wall === "top") return bounds.top <= field.bounds.top + field.wallContactTolerance;
    return bounds.bottom >= field.bounds.bottom - field.wallContactTolerance;
  });
  const wallSet = new Set(walls);
  const edges: SoftTileContactEdge[] = [];
  cells.forEach((cell) => {
    const center = soft_tile_center(cell, field);
    const halfWidth = SQRT3 * field.hexSize / 2;
    if (wallSet.has("left") && center.x - halfWidth <= field.bounds.left + field.wallContactTolerance) {
      edges.push({ cell, neighbor: { q: cell.q - 1, r: cell.r }, normal: { x: -1, y: 0 }, wall: "left" });
    }
    if (wallSet.has("right") && center.x + halfWidth >= field.bounds.right - field.wallContactTolerance) {
      edges.push({ cell, neighbor: { q: cell.q + 1, r: cell.r }, normal: { x: 1, y: 0 }, wall: "right" });
    }
    if (wallSet.has("top") && center.y - field.hexSize <= field.bounds.top + field.wallContactTolerance) {
      edges.push({ cell, neighbor: { q: cell.q, r: cell.r - 1 }, normal: { x: 0, y: -1 }, wall: "top" });
    }
    if (wallSet.has("bottom") && center.y + field.hexSize >= field.bounds.bottom - field.wallContactTolerance) {
      edges.push({ cell, neighbor: { q: cell.q, r: cell.r + 1 }, normal: { x: 0, y: 1 }, wall: "bottom" });
    }
  });
  return { walls, edges };
}

function candidate_contacts(
  cells: readonly SoftTileHexCoord[],
  state: SoftTileSearchState,
  body: SoftTileBody,
  bounds: SoftTileBounds,
  field: SoftTileFieldConfig,
): Readonly<{
  contactedTileIndices: readonly number[];
  edges: readonly SoftTileContactEdge[];
  walls: readonly SoftTileWall[];
}> {
  const contactedIndices = new Set<number>();
  const edges: SoftTileContactEdge[] = [];
  cells.forEach((cell) => soft_tile_neighbors(cell).forEach((neighbor) => {
    const tileIndex = state.occupiedByCell.get(soft_tile_key(neighbor));
    if (tileIndex === undefined) return;
    const tile = state.tiles[tileIndex];
    if (!tile) return;
    contactedIndices.add(tileIndex);
    const from = soft_tile_center(cell, field);
    const to = soft_tile_center(neighbor, field);
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    edges.push({
      cell,
      neighbor,
      normal: { x: (to.x - from.x) / length, y: (to.y - from.y) / length },
      tileId: tile.id,
    });
  }));
  const wall = wall_contacts(cells, bounds, body, field);
  return {
    contactedTileIndices: [...contactedIndices].sort((a, b) => a - b),
    edges: [...edges, ...wall.edges],
    walls: wall.walls,
  };
}

function inside_field(bounds: SoftTileBounds, fieldBounds: SoftTileBounds): boolean {
  return bounds.left >= fieldBounds.left - 1e-9
    && bounds.right <= fieldBounds.right + 1e-9
    && bounds.top >= fieldBounds.top - 1e-9
    && bounds.bottom <= fieldBounds.bottom + 1e-9;
}

function newly_enclosed_empty_cells(
  cells: readonly SoftTileHexCoord[],
  occupiedByCell: ReadonlyMap<string, number>,
  priorCavities: ReadonlyMap<string, number>,
  newTileIndex: number,
): number {
  const candidateKeys = new Set(cells.map(soft_tile_key));
  const open = new Map<string, SoftTileHexCoord>();
  cells.forEach((cell) => soft_tile_neighbors(cell).forEach((neighbor) => {
    const key = soft_tile_key(neighbor);
    if (!candidateKeys.has(key) && !occupiedByCell.has(key)) open.set(key, neighbor);
  }));
  let count = 0;
  open.forEach((cell, key) => {
    if (priorCavities.has(key)) return;
    const adjacentTiles = new Set<number>();
    let occupiedNeighbors = 0;
    soft_tile_neighbors(cell).forEach((neighbor) => {
      const neighborKey = soft_tile_key(neighbor);
      if (candidateKeys.has(neighborKey)) {
        adjacentTiles.add(newTileIndex);
        occupiedNeighbors += 1;
        return;
      }
      const tileIndex = occupiedByCell.get(neighborKey);
      if (tileIndex === undefined) return;
      adjacentTiles.add(tileIndex);
      occupiedNeighbors += 1;
    });
    if (adjacentTiles.size >= 2 || occupiedNeighbors >= 3) count += 1;
  });
  return count;
}

function local_candidate_cost(
  candidate: Omit<SoftTileCandidate, "localCost">,
  previousProjection: number | undefined,
  state: SoftTileSearchState,
  field: SoftTileFieldConfig,
): number {
  const orderAdvance = previousProjection === undefined
    ? candidate.diagnostics.orderProjection
    : candidate.diagnostics.orderProjection - previousProjection;
  const nextBounds = soft_tile_union_bounds([...state.tiles.map((tile) => tile.bounds), candidate.bounds]);
  const addedGrowth = state.tiles.length ? nextBounds.height - state.bounds.height : nextBounds.height;
  const wallOnly = candidate.contacts.walls.length > 0 && candidate.contacts.contactedTileIndices.length === 0;
  return orderAdvance * 2
    + addedGrowth * 3
    + candidate.bounds.width * 0.05
    + Number(wallOnly) * 45
    - candidate.contacts.edgeCount * 7
    - Math.max(0, candidate.contacts.contactedTileIndices.length - 1) * 80
    - candidate.contacts.cavityFillScore * 12
    + soft_tile_project(candidate.anchor, { x: -field.gravity.x, y: -field.gravity.y }) * 0.02;
}

export function enumerate_soft_tile_candidates(
  body: SoftTileBody,
  state: SoftTileSearchState,
  field: SoftTileFieldConfig,
  search: SoftTileSearchConfig,
): readonly SoftTileCandidate[] {
  const localBounds = soft_tile_bounds(body.cells, field);
  const rowStep = field.hexSize * 1.5;
  const columnStep = field.hexSize * SQRT3;
  const minR = Math.ceil((field.bounds.top - localBounds.top) / rowStep - 1e-9);
  const maxR = Math.floor((field.bounds.bottom - localBounds.bottom) / rowStep + 1e-9);
  const previous = state.tiles[state.tiles.length - 1];
  const previousProjection = previous ? soft_tile_project(previous.anchor, field.growth) : undefined;
  const priorCavities = soft_tile_cavity_cells(state.occupiedByCell);
  const candidates: SoftTileCandidate[] = [];

  for (let deltaR = minR; deltaR <= maxR; deltaR += 1) {
    const rShiftX = columnStep * deltaR / 2;
    const minQ = Math.ceil((field.bounds.left - localBounds.left - rShiftX) / columnStep - 1e-9);
    const maxQ = Math.floor((field.bounds.right - localBounds.right - rShiftX) / columnStep + 1e-9);
    for (let deltaQ = minQ; deltaQ <= maxQ; deltaQ += 1) {
      const translation = { q: deltaQ, r: deltaR };
      const cells = soft_tile_translate(body.cells, translation);
      if (cells.some((cell) => state.occupiedByCell.has(soft_tile_key(cell)))) continue;
      const core = soft_tile_translate(body.core, translation);
      const bounds = soft_tile_bounds(cells, field);
      if (!inside_field(bounds, field.bounds)) continue;
      const offset = soft_tile_translation_offset(translation, field.hexSize);
      const anchor = { x: body.anchor.x + offset.x, y: body.anchor.y + offset.y };
      const orderProjection = soft_tile_project(anchor, field.growth);
      if (previousProjection !== undefined && orderProjection < previousProjection + field.minOrderStep - 1e-9) continue;
      if (previousProjection !== undefined
        && orderProjection > previousProjection + search.searchMarginRows * rowStep + 1e-9) continue;
      const contact = candidate_contacts(cells, state, body, bounds, field);
      const contactedTileIds = contact.contactedTileIndices.flatMap((index) => {
        const tile = state.tiles[index];
        return tile ? [tile.id] : [];
      });
      if (body.requiredParentId && !contactedTileIds.includes(body.requiredParentId)) continue;
      const supported = contact.contactedTileIndices.length > 0 || contact.walls.length > 0;
      if ((state.tiles.length > 0 || field.rootRequiresSupport) && !supported) continue;
      const cavityFillScore = cells.reduce((sum, cell) => sum + (priorCavities.get(soft_tile_key(cell)) ?? 0), 0);
      const newlyEnclosedEmptyCells = newly_enclosed_empty_cells(
        cells,
        state.occupiedByCell,
        priorCavities,
        state.tiles.length,
      );
      const contactMetadata = {
        edgeCount: contact.edges.filter((edge) => edge.tileId !== undefined).length,
        contactedTileIndices: contact.contactedTileIndices,
        contactedTileIds,
        walls: contact.walls,
        edges: contact.edges,
        cavityFillScore,
        newlyEnclosedEmptyCells,
      };
      const baseCandidate: Omit<SoftTileCandidate, "localCost"> = {
        id: body.id,
        translation,
        cells,
        core,
        bounds,
        anchor,
        contacts: contactMetadata,
        diagnostics: {
          orderProjection,
          gravityProjection: soft_tile_project(anchor, field.gravity),
          contactEdges: contactMetadata.edgeCount,
          contactedTileCount: contact.contactedTileIndices.length,
          wallContact: contact.walls.length > 0,
          cavityFillScore,
          newlyEnclosedEmptyCells,
        },
      };
      candidates.push({ ...baseCandidate, localCost: local_candidate_cost(baseCandidate, previousProjection, state, field) });
    }
  }
  return candidates
    .sort((a, b) => a.localCost - b.localCost
      || a.diagnostics.orderProjection - b.diagnostics.orderProjection
      || a.translation.r - b.translation.r
      || a.translation.q - b.translation.q)
    .slice(0, search.maxCandidatesPerTile);
}
