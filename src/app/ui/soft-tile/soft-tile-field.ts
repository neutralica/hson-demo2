import {
  enumerate_soft_tile_candidates,
  soft_tile_cavity_cells,
  soft_tile_key,
  soft_tile_union_bounds,
} from "./soft-tile-candidates";
import { soft_tile_colony_energy, soft_tile_empty_hole_count } from "./soft-tile-energy";
import type {
  SoftTileBody,
  SoftTileBounds,
  SoftTileCandidate,
  SoftTileEnergyConfig,
  SoftTileFieldConfig,
  SoftTilePackingResult,
  SoftTileSearchConfig,
  SoftTileSearchState,
} from "./soft-tile.types";

const EMPTY_BOUNDS: SoftTileBounds = Object.freeze({
  left: 0,
  top: 0,
  right: 0,
  bottom: 0,
  width: 0,
  height: 0,
});

export const DEFAULT_SOFT_TILE_SEARCH: SoftTileSearchConfig = Object.freeze({
  beamWidth: 64,
  maxCandidatesPerTile: 24,
  searchMarginRows: 7,
});

export const DEFAULT_SOFT_TILE_ENERGY: SoftTileEnergyConfig = Object.freeze({
  growthExtentWeight: 18,
  areaWeight: 0.004,
  cavityWeight: 20,
  contactReward: 10,
  multiContactReward: 90,
  wallContactWeight: 18,
  wallOnlyChainWeight: 55,
  excessiveWidthWeight: 8,
  orderSlackWeight: 9,
  attractorWeight: 0.4,
});

function state_with_candidate(
  state: SoftTileSearchState,
  candidate: SoftTileCandidate,
  field: SoftTileFieldConfig,
  energyConfig: SoftTileEnergyConfig,
): SoftTileSearchState {
  const tileIndex = state.tiles.length;
  const occupiedByCell = new Map(state.occupiedByCell);
  candidate.cells.forEach((cell) => occupiedByCell.set(soft_tile_key(cell), tileIndex));
  const tiles = [...state.tiles, candidate];
  const bounds = soft_tile_union_bounds(tiles.map((tile) => tile.bounds));
  const tieKey = `${state.tieKey}|${candidate.translation.r}:${candidate.translation.q}`;
  const nextState: SoftTileSearchState = { tiles, occupiedByCell, bounds, energy: 0, tieKey };
  return { ...nextState, energy: soft_tile_colony_energy(nextState, field, energyConfig) };
}

function compare_states(a: SoftTileSearchState, b: SoftTileSearchState): number {
  return a.energy - b.energy || a.tieKey.localeCompare(b.tieKey);
}

export function pack_soft_tiles(
  bodies: readonly SoftTileBody[],
  field: SoftTileFieldConfig,
  search: SoftTileSearchConfig = DEFAULT_SOFT_TILE_SEARCH,
  energyConfig: SoftTileEnergyConfig = DEFAULT_SOFT_TILE_ENERGY,
): SoftTilePackingResult {
  if (search.beamWidth < 1 || search.maxCandidatesPerTile < 1 || search.searchMarginRows < 1) {
    throw new Error("Soft-tile search controls must be positive");
  }
  let beam: readonly SoftTileSearchState[] = [{
    tiles: [],
    occupiedByCell: new Map(),
    bounds: EMPTY_BOUNDS,
    energy: 0,
    tieKey: "",
  }];
  let generatedCandidateCount = 0;
  let expandedStateCount = 0;
  let retainedStateCount = 0;
  let maximumBeamSize = 1;

  bodies.forEach((body, bodyIndex) => {
    const expanded: SoftTileSearchState[] = [];
    beam.forEach((state) => {
      const candidates = enumerate_soft_tile_candidates(body, state, field, search);
      generatedCandidateCount += candidates.length;
      candidates.forEach((candidate) => expanded.push(state_with_candidate(state, candidate, field, energyConfig)));
      expandedStateCount += 1;
    });
    if (!expanded.length) throw new Error(`Soft-tile field could not place body ${body.id} at index ${bodyIndex}`);
    const unique = new Map<string, SoftTileSearchState>();
    expanded.sort(compare_states).slice(0, search.beamWidth * 3).forEach((state) => {
      if (!unique.has(state.tieKey)) unique.set(state.tieKey, state);
    });
    beam = [...unique.values()]
      .map((state) => ({
        ...state,
        energy: state.energy + soft_tile_empty_hole_count(state) * energyConfig.cavityWeight * 3,
      }))
      .sort(compare_states)
      .slice(0, search.beamWidth);
    retainedStateCount += beam.length;
    maximumBeamSize = Math.max(maximumBeamSize, beam.length);
  });

  const best = [...beam].sort(compare_states)[0];
  if (!best) throw new Error("Soft-tile field produced no complete colony");
  return {
    tiles: best.tiles,
    bounds: best.bounds,
    energy: best.energy,
    diagnostics: {
      generatedCandidateCount,
      expandedStateCount,
      retainedStateCount,
      maximumBeamSize,
      completeStateCount: beam.length,
      cavityCellCount: soft_tile_cavity_cells(best.occupiedByCell).size,
      emptyHoleCount: soft_tile_empty_hole_count(best),
    },
  };
}
