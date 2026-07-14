import { _colors } from "../../core/consts/colors.consts";
import type { AmoebaButtonInput, AmoebiGeometryConfig, Point } from "./amoebi.types";

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
  labelPaddingX: 16,
  labelPaddingY: 10,
  minCoreRows: 3,
  minCoreColumns: 5,
  minCellCount: 15,
  fringeRatioMin: 0.16,
  fringeRatioMax: 0.3,
  contactSkinRatio: 0.14,
  maxAspectRatio: 3.35,
  buttonGap: 0,
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
