import type { LiveTree } from "hson-live/livetree";
import type { SvgLiveTree } from "hson-live/types";
import type {
  SoftTileContactMetadata,
  SoftTilePackingDiagnostics,
  SoftTilePlacementDiagnostics,
} from "../../ui/soft-tile/soft-tile.types";



export type HexCoord = Readonly<{ q: number; r: number; }>;
export type Point = Readonly<{ x: number; y: number; }>;
export type AmoebiBounds = Readonly<{
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}>;
export type AmoebiBodyConfig = Readonly<{
  labelPaddingX: number;
  labelPaddingY: number;
  minCoreRows: number;
  minCoreColumns: number;
  horizontalFringeRatio: number;
  verticalFringeRatio: number;
  maxBodyWidth: number;
}>;
export type AmoebiGeometryConfig = AmoebiBodyConfig & Readonly<{
  hexSize: number;
  labelFontSize: number;
  labelLetterSpacing: number;
  labelGlyphWidthRatio: number;
  minCellCount: number;
  maxAspectRatio: number;
}>;
export type AmoebaButtonInput = Readonly<{
  id: string;
  label: string;
  tone: string;
}>;
export type AmoebaButtonLayout = Readonly<{
  id: string;
  label: string;
  path: string;
  cx: number;
  cy: number;
  tone: string;
}>;
export type AmoebaState = {
  hoveredId: string | null;
  layout: AmoebaButtonLayout[];
};
// === AmoebiMenu API types ===

export type AmoebiMenuItem = AmoebaButtonInput;

export type AmoebiMenuApi = Readonly<{
  root: LiveTree;
  setHoveredId: (id: string | null) => void;
  enter: () => void;
  exit: (onComplete: () => void) => void;
  hideInstantly: () => void;
  dispose: () => void;
}>;

export type AmoebiSelectionSource = Readonly<{
  snap(): readonly string[];
  watch(listener: (ids: readonly string[]) => void): () => void;
}>;

export type AmoebiMenuOptions = Readonly<{
  items?: readonly AmoebiMenuItem[];
  selection?: AmoebiSelectionSource;
  onToggle?: (id: string) => void;
  title?: string;
  showTitle?: boolean;
  ariaLabel?: string;
  seed?: number;
  isolatedIds?: readonly string[];
}>;

export type AmoebiTileParts = Readonly<{
  button: AmoebiRenderButton;
  index: number;
  body: SvgLiveTree;
  cells: readonly SvgLiveTree[];
  target: SvgLiveTree;
  label: SvgLiveTree;
}>;

export type AmoebiRenderButton = AmoebaButtonLayout & Readonly<{
  cells: readonly HexCoord[];
  coreCells: readonly HexCoord[];
  bounds: AmoebiBounds;
  placement: SoftTilePlacementDiagnostics;
  contacts: SoftTileContactMetadata;
}>;
export type AmoebiPackedLayout = Readonly<{
  layout: readonly AmoebiRenderButton[];
  packingDiagnostics: SoftTilePackingDiagnostics;
  packingEnergy: number;
}>;
export type AmoebiRenderState = Omit<AmoebaState, "layout"> & Readonly<{
  layout: readonly AmoebiRenderButton[];
}>;
