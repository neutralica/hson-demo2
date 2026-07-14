import {
  soft_tile_cavity_cells,
  soft_tile_key,
  soft_tile_neighbors,
  soft_tile_project,
} from "./soft-tile-candidates";
import type {
  SoftTileEnergyConfig,
  SoftTileFieldConfig,
  SoftTileHexCoord,
  SoftTileSearchState,
} from "./soft-tile.types";

export function soft_tile_empty_hole_count(state: SoftTileSearchState): number {
  if (!state.occupiedByCell.size) return 0;
  const occupiedCells: SoftTileHexCoord[] = [];
  state.occupiedByCell.forEach((_index, key) => {
    const [qText, rText] = key.split(",");
    occupiedCells.push({ q: Number(qText), r: Number(rText) });
  });
  const minQ = Math.min(...occupiedCells.map(({ q }) => q)) - 1;
  const maxQ = Math.max(...occupiedCells.map(({ q }) => q)) + 1;
  const minR = Math.min(...occupiedCells.map(({ r }) => r)) - 1;
  const maxR = Math.max(...occupiedCells.map(({ r }) => r)) + 1;
  const open = new Map<string, SoftTileHexCoord>();
  for (let r = minR; r <= maxR; r += 1) {
    for (let q = minQ; q <= maxQ; q += 1) {
      const cell = { q, r };
      if (!state.occupiedByCell.has(soft_tile_key(cell))) open.set(soft_tile_key(cell), cell);
    }
  }
  const exterior = new Set<string>();
  const pending = [...open.values()].filter(({ q, r }) => q === minQ || q === maxQ || r === minR || r === maxR);
  pending.forEach((cell) => exterior.add(soft_tile_key(cell)));
  while (pending.length) {
    const cell = pending.pop();
    if (!cell) continue;
    soft_tile_neighbors(cell).forEach((neighbor) => {
      const key = soft_tile_key(neighbor);
      if (!open.has(key) || exterior.has(key)) return;
      exterior.add(key);
      pending.push(neighbor);
    });
  }
  return [...open.keys()].filter((key) => !exterior.has(key)).length;
}

function wall_only_chain_cost(state: SoftTileSearchState): number {
  let current = 0;
  let longest = 0;
  let previousWall = "";
  state.tiles.forEach((tile) => {
    const wall = tile.contacts.contactedTileIndices.length === 0 ? (tile.contacts.walls[0] ?? "") : "";
    if (wall && wall === previousWall) current += 1;
    else current = wall ? 1 : 0;
    previousWall = wall;
    longest = Math.max(longest, current);
  });
  return longest * longest;
}

export function soft_tile_colony_energy(
  state: SoftTileSearchState,
  field: SoftTileFieldConfig,
  weights: SoftTileEnergyConfig,
): number {
  if (!state.tiles.length) return 0;
  const orderProjections = state.tiles.map((tile) => soft_tile_project(tile.anchor, field.growth));
  const growthExtent = Math.max(...orderProjections) - Math.min(...orderProjections);
  const orderSlack = state.tiles.slice(1).reduce((sum, tile, index) => {
    const previous = state.tiles[index];
    if (!previous) return sum;
    return sum + Math.max(0, soft_tile_project(tile.anchor, field.growth)
      - soft_tile_project(previous.anchor, field.growth) - field.minOrderStep);
  }, 0);
  const contactEdges = state.tiles.reduce((sum, tile) => sum + tile.contacts.edgeCount, 0);
  const multiContacts = state.tiles.reduce((sum, tile) => sum + Math.max(0, tile.contacts.contactedTileIndices.length - 1), 0);
  const wallContacts = state.tiles.reduce((sum, tile) => sum + Number(tile.contacts.walls.length > 0), 0);
  const cavityCount = soft_tile_cavity_cells(state.occupiedByCell).size;
  const holes = state.tiles.reduce((sum, tile) => sum + tile.contacts.newlyEnclosedEmptyCells, 0);
  const excessiveWidth = Math.max(0, state.bounds.width - field.targetColonyWidth);
  const attractorDistance = -state.tiles.reduce((sum, tile) => sum + soft_tile_project(tile.anchor, field.gravity), 0) / state.tiles.length;
  return growthExtent * weights.growthExtentWeight
    + state.bounds.width * state.bounds.height * weights.areaWeight
    + (cavityCount + holes * 3) * weights.cavityWeight
    + wallContacts * weights.wallContactWeight
    + wall_only_chain_cost(state) * weights.wallOnlyChainWeight
    + excessiveWidth * weights.excessiveWidthWeight
    + orderSlack * weights.orderSlackWeight
    + attractorDistance * weights.attractorWeight
    - contactEdges * weights.contactReward
    - multiContacts * weights.multiContactReward;
}
