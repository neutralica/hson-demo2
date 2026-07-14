import { _colors } from "../../core/consts/colors.consts";
import type { AmoebaButtonInput, AmoebiGeometryConfig, Point } from "./amoebi.types";
import type { SoftTileEnergyConfig, SoftTileFieldConfig, SoftTileSearchConfig } from "../../ui/soft-tile/soft-tile.types";

/* DO NOT SET HEX_SIZE LESS THAN 5; your CPU will die */
export const HEX_SIZE = 9;
export const AMOEBA_W = 720;
export const AMOEBA_H = 560;
export const SQRT3 = Math.sqrt(3);

export const AMOEBI_GEOMETRY: AmoebiGeometryConfig = Object.freeze({
  hexSize: HEX_SIZE,
  labelFontSize: 18,
  labelLetterSpacing: 18 * 0.08,
  labelGlyphWidthRatio: 0.62,
  labelPaddingX: 8,
  labelPaddingY: 10,
  minCoreRows: 3,
  minCoreColumns: 4,
  minCellCount: 12,
  horizontalFringeRatio: 0.045,
  verticalFringeRatio: 0.16,
  maxBodyWidth: 135,
  maxAspectRatio: 3.35,
});

export const AMOEBI_TILE_FIELD: SoftTileFieldConfig = Object.freeze({
  bounds: { left: 0, top: HEX_SIZE * 2.25, right: 200, bottom: 720, width: 200, height: 720 - HEX_SIZE * 2.25 },
  origin: { x: AMOEBA_W * 0.11, y: HEX_SIZE * 3.25 },
  hexSize: HEX_SIZE,
  gravity: { x: -0.3, y: -1 },
  growth: { x: 0.3, y: 1 },
  supportWalls: ["left", "top"] as const,
  wallContactTolerance: SQRT3 * HEX_SIZE / 2,
  minOrderStep: HEX_SIZE * 0.3,
  rootRequiresSupport: true,
  targetColonyWidth: 200,
});

export const AMOEBI_TILE_SEARCH: SoftTileSearchConfig = Object.freeze({
  beamWidth: 32,
  maxCandidatesPerTile: 10,
  searchMarginRows: 6,
});

export const AMOEBI_TILE_ENERGY: SoftTileEnergyConfig = Object.freeze({
  growthExtentWeight: 20,
  areaWeight: 0.004,
  cavityWeight: 24,
  contactReward: 11,
  multiContactReward: 110,
  wallContactWeight: 90,
  wallOnlyChainWeight: 180,
  excessiveWidthWeight: 10,
  orderSlackWeight: 10,
  attractorWeight: 0.35,
});

export const BUTTONS: AmoebaButtonInput[] = [
  { id: "about", label: "about", tone: _colors.txt.menu },
  { id: "test", label: "test", tone: _colors.hson.h },
  { id: "parse", label: "parse", tone: _colors.hson.s },
  { id: "build", label: "build", tone: _colors.hson.o },
  { id: "bar", label: "bar-bar", tone: _colors.txt.widget },
  { id: "cells", label: "cells", tone: _colors.hson.n },
  { id: "fleurs", label: "fleurs", tone: _colors.txt.menu },
  { id: "point", label: "point", tone: _colors.hson.h },
  { id: "oklch", label: "oklch", tone: _colors.hson.o },
  { id: "bling", label: "bling", tone: _colors.hson.n },
];

export const TARGETS: readonly Point[] = Object.freeze([
  { x: 214, y: 92 },
  { x: 404, y: 102 },
  { x: 252, y: 172 },
  { x: 448, y: 180 },
  { x: 304, y: 262 },
  { x: 500, y: 276 },
  { x: 242, y: 366 },
  { x: 438, y: 386 },
  { x: 326, y: 468 },
  { x: 502, y: 474 },
]);
