import type { LiveTree } from "hson-live";
import type { SvgLiveTree } from "hson-live/types";



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
export type AmoebiGeometryConfig = Readonly<{
  hexSize: number;
  labelFontSize: number;
  labelLetterSpacing: number;
  labelGlyphWidthRatio: number;
  labelPaddingX: number;
  labelPaddingY: number;
  minCoreRows: number;
  minCoreColumns: number;
  minCellCount: number;
  fringeRatioMin: number;
  fringeRatioMax: number;
  contactSkinRatio: number;
  maxAspectRatio: number;
  buttonGap: number;
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
  selectedId: string;
  hoveredId: string | null;
  layout: AmoebaButtonLayout[];
};
// === AmoebiMenu API types ===

export type AmoebiMenuItem = AmoebaButtonInput;

export type AmoebiMenuApi = Readonly<{
  root: LiveTree;
  setActiveIds: (ids: readonly string[]) => void;
  getActiveIds: () => readonly string[];
  setHoveredId: (id: string | null) => void;
}>;

export type AmoebiMenuOptions = Readonly<{
  items?: readonly AmoebiMenuItem[];
  activeIds?: readonly string[];
  onToggle?: (id: string, nextActiveIds: readonly string[]) => void;
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
}>;
export type AmoebiRenderState = Omit<AmoebaState, "layout"> & Readonly<{
  activeIds: readonly string[];
  layout: readonly AmoebiRenderButton[];
}>;
