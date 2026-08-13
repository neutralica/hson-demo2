import type { CssMap } from "hson-live/types";
import { _colors } from "../../core/consts/colors.consts";
import { COLS } from "./cellsheet-evaluator";

// colors for text and borders etc
const main = _colors.txt.code;
const alt = _colors.code.alt;
const chrome = _colors.chrome;

// accent color
const green = _colors.hson.n;
const blue = _colors.hson.h;
const pink = _colors.hson.o;
const yellow = _colors.hson.s;
// state color aliases
export const RESIZE_EDGE = blue;
export const SEL_EDGE = yellow;
export const AUTH_TEXT = main;
export const DER_TEXT = green;
export const OPERATOR_COLOR = blue;
export const ERR_TEXT = pink;
export const RELAT_EDGE = yellow;
export const BORDER = chrome;
export const DER_BORDER = alt;
export const ERR_BORDER = pink;

export const PANELcss: CssMap = {
    display: "grid",
    gridTemplateRows: "auto minmax(0, 1fr) auto",
    gap: "1.1rem",
    alignContent: "stretch",
    justifyItems: "center",
    width: "100%",
    minHeight: "100%",
    color: main,
};
export const HEADERcss: CssMap = {
    display: "grid",
    gap: "0.55rem",
    justifySelf: "center",
    width: "min(38rem, 100%)",
};
export const TITLEcss: CssMap = {
    fontSize: "0.9rem",
    letterSpacing: "0.22em",
    textTransform: "uppercase",
    textAlign: "center",
    color: blue,
};
export const SUBTITLEcss: CssMap = {
    whiteSpace: "pre-line",
    maxWidth: "52ch",
    justifySelf: "center",
    fontSize: "0.72rem",
    lineHeight: "1.48",
    opacity: "0.74",
    color: alt,
};
export const BODYcss: CssMap = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: "100%",
    minWidth: "0",
    minHeight: "0",
    overflow: "auto",
};

export const FOOTERcss: CssMap = {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    gap: "0.75rem",
    alignItems: "stretch",
    alignSelf: "end",
    width: "min(40rem, 100%)",
};
export const GRIDcss: CssMap = {
    display: "grid",
    boxSizing: "border-box",
    gridTemplateColumns: `repeat(${COLS}, minmax(3.1rem, 4.5rem))`,
    gap: "0.25rem",
    padding: "0.42rem",
    border: `1px solid ${chrome}`,
    maxWidth: "100%",
    maxHeight: "100%",
    overflow: "auto",
};
export const CELLcss: CssMap = {
    width: "100%",
    minWidth: "0",
    height: "2.35rem",
    boxSizing: "border-box",
    border: `1px solid ${chrome}`,
    borderWidth: "1px",
    borderStyle: "solid",
    background: "transparent",
    color: main,
    font: "inherit",
    fontSize: "0.78rem",
    fontWeight: "400",
    fontStyle: "normal",
    textDecoration: "none",
    textAlign: "center",
    outline: `1px solid transparent`,
    outlineOffset: "-1px",
    opacity: "0.88",
};
export const SIDEBARcss: CssMap = {
    display: "grid",
    gap: "0.75rem",
    alignContent: "start",
    minWidth: "14rem",
};
export const CARDcss: CssMap = {
    display: "grid",
    alignContent: "start",
    gap: "0.35rem",
    padding: "0.62rem 0.7rem",
    border: `1px solid ${chrome}`,
};
export const LABELcss: CssMap = {
    fontSize: "0.68rem",
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    opacity: "0.72",
    color: yellow,
};
export const METAcss: CssMap = {
    fontSize: "0.75rem",
    lineHeight: "1.35",
    opacity: "0.88",
    color: alt,
};
export const RESETcss: CssMap = {
    border: `1px solid ${green}`,
    background: "transparent",
    color: green,
    font: "inherit",
    fontSize: "0.72rem",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    padding: "0.55rem 1rem",
    cursor: "pointer",
};
