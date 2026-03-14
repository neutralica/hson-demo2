import type { LiveTree } from "hson-live";
export type FlowerCultivar =
  | "daisy"
  | "sunburst"
  | "pinwheel"
  | "scissor"
  | "rosette"
  | "wild";

export type FlowerSpec = {
  seed: number;
  x: number;
  y: number;
  scale: number;
  rotation: number;

  cultivar: FlowerCultivar;

  petalCount: number;
  petalLength: number;
  petalWidth: number;
  centerRadius: number;
  opacity: number;

  palette: FlowerPaletteSpec;

  // optional extras
  ringCount: number;
  innerScale: number;
  stamenCount: number;
  stamenRadius: number;
  alternateGeometry: boolean;
};

export type FlowerScene = {
  root: LiveTree;
  field: LiveTree;
  layer: LiveTree;
  spawnAt(x: number, y: number): void;
  clear(): void;
};



export type OklchColor = {
  l: number;
  c: number;
  h: number;
};


export type JitterOpts = {
  l: number;
  c: number;
  h: number;
};

export type FlowerPaletteSpec = {
  primaryPetal: string;
  secondaryPetal: string | null;
  center: string;
  useAlternatingPetals: boolean;
};


export type HueBand = {
  min: number
  max: number
  weight: number
}
export type CultivarShape = {
  petalCount: number;
  petalLength: number;
  petalWidth: number;
  centerRatio: number;
  ringCount: number;
  innerScale: number;
  stamenCount: number;
  stamenRadius: number;
  alternateGeometry: boolean;
};
