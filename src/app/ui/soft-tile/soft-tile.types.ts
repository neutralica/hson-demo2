export type SoftTileHexCoord = Readonly<{ q: number; r: number }>;
export type SoftTilePoint = Readonly<{ x: number; y: number }>;
export type SoftTileBounds = Readonly<{
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}>;
export type SoftTileWall = "left" | "right" | "top" | "bottom";

export type SoftTileBody = Readonly<{
  id: string;
  cells: readonly SoftTileHexCoord[];
  core: readonly SoftTileHexCoord[];
  anchor: SoftTilePoint;
  requiredParentId?: string;
  allowedSupportWalls?: readonly SoftTileWall[];
}>;

export type SoftTileFieldConfig = Readonly<{
  bounds: SoftTileBounds;
  origin: SoftTilePoint;
  hexSize: number;
  gravity: SoftTilePoint;
  growth: SoftTilePoint;
  supportWalls: readonly SoftTileWall[];
  wallContactTolerance: number;
  minOrderStep: number;
  rootRequiresSupport: boolean;
  targetColonyWidth: number;
}>;

export type SoftTileSearchConfig = Readonly<{
  beamWidth: number;
  maxCandidatesPerTile: number;
  searchMarginRows: number;
}>;

export type SoftTileEnergyConfig = Readonly<{
  growthExtentWeight: number;
  areaWeight: number;
  cavityWeight: number;
  contactReward: number;
  multiContactReward: number;
  wallContactWeight: number;
  wallOnlyChainWeight: number;
  excessiveWidthWeight: number;
  orderSlackWeight: number;
  attractorWeight: number;
}>;

export type SoftTileContactEdge = Readonly<{
  cell: SoftTileHexCoord;
  neighbor: SoftTileHexCoord;
  normal: SoftTilePoint;
  tileId?: string;
  wall?: SoftTileWall;
}>;

export type SoftTileContactMetadata = Readonly<{
  edgeCount: number;
  contactedTileIndices: readonly number[];
  contactedTileIds: readonly string[];
  walls: readonly SoftTileWall[];
  edges: readonly SoftTileContactEdge[];
  cavityFillScore: number;
  newlyEnclosedEmptyCells: number;
}>;

export type SoftTilePlacementDiagnostics = Readonly<{
  orderProjection: number;
  gravityProjection: number;
  contactEdges: number;
  contactedTileCount: number;
  wallContact: boolean;
  cavityFillScore: number;
  newlyEnclosedEmptyCells: number;
}>;

export type SoftTilePlacedTile = Readonly<{
  id: string;
  translation: SoftTileHexCoord;
  cells: readonly SoftTileHexCoord[];
  core: readonly SoftTileHexCoord[];
  bounds: SoftTileBounds;
  anchor: SoftTilePoint;
  contacts: SoftTileContactMetadata;
  diagnostics: SoftTilePlacementDiagnostics;
}>;

export type SoftTilePackingDiagnostics = Readonly<{
  generatedCandidateCount: number;
  expandedStateCount: number;
  retainedStateCount: number;
  maximumBeamSize: number;
  completeStateCount: number;
  cavityCellCount: number;
  emptyHoleCount: number;
}>;

export type SoftTilePackingResult = Readonly<{
  tiles: readonly SoftTilePlacedTile[];
  bounds: SoftTileBounds;
  energy: number;
  diagnostics: SoftTilePackingDiagnostics;
}>;

export type SoftTileCandidate = SoftTilePlacedTile & Readonly<{
  localCost: number;
}>;

export type SoftTileSearchState = Readonly<{
  tiles: readonly SoftTilePlacedTile[];
  occupiedByCell: ReadonlyMap<string, number>;
  bounds: SoftTileBounds;
  energy: number;
  tieKey: string;
}>;
