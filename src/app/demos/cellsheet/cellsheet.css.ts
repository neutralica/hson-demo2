import type { CssMap } from "hson-live/types";
import { _colors } from "../../core/consts/colors.consts";
import { COLS } from "./cellsheet-helpers";

export const PANELcss: CssMap = {
    display: "grid",
    gap: "1rem",
    alignContent: "start",
    minHeight: "100%",
    color: _colors.txt.code,
};
export const HEADERcss: CssMap = {
    display: "grid",
    gap: "0.25rem",
};
export const TITLEcss: CssMap = {
    fontSize: "0.9rem",
    letterSpacing: "0.18em",
    textTransform: "uppercase",
};
export const SUBTITLEcss: CssMap = {
    maxWidth: "64ch",
    fontSize: "0.72rem",
    lineHeight: "1.45",
    opacity: "0.74",
};
export const BODYcss: CssMap = {
    display: "grid",
    gridTemplateColumns: "minmax(0, max-content) minmax(14rem, 1fr)",
    gap: "1rem",
    alignItems: "start",
};
export const GRIDcss: CssMap = {
    display: "grid",
    gridTemplateColumns: `repeat(${COLS}, minmax(3.1rem, 4.5rem))`,
    gap: "0.25rem",
    padding: "0.35rem",
    border: "1px solid currentColor",
};
export const CELLcss: CssMap = {
    width: "100%",
    minWidth: "0",
    height: "2.35rem",
    boxSizing: "border-box",
    border: "1px solid currentColor",
    borderWidth: "1px",
    borderStyle: "solid",
    background: "transparent",
    color: "inherit",
    font: "inherit",
    fontSize: "0.78rem",
    fontWeight: "400",
    fontStyle: "normal",
    textDecoration: "none",
    textAlign: "center",
    outline: "1px solid transparent",
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
    gap: "0.35rem",
    padding: "0.7rem",
    border: "1px solid currentColor",
};
export const LABELcss: CssMap = {
    fontSize: "0.68rem",
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    opacity: "0.72",
};
export const METAcss: CssMap = {
    fontSize: "0.75rem",
    lineHeight: "1.35",
    opacity: "0.88",
};
export const RESETcss: CssMap = {
    border: "1px solid currentColor",
    background: "transparent",
    color: "inherit",
    font: "inherit",
    fontSize: "0.72rem",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    padding: "0.55rem 0.75rem",
    cursor: "pointer",
};
