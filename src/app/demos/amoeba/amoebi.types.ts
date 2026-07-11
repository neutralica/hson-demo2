export type HexCoord = Readonly<{ q: number; r: number; }>;
export type Point = Readonly<{ x: number; y: number; }>;
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
