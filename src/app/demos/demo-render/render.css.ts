import type { CssMap } from "hson-live/types";
import { _cols } from "../../core/consts/colors.consts";
import { FONT_FAM_MONO } from "../../core/consts/css.consts";
import { øfontSize } from "../../core/consts/ui-consts";


export const ROOT_CSS: CssMap = {
    ...FONT_FAM_MONO,
    fontSize: øfontSize.smol,
    display: "grid",
    width: "100%",
    gap: "0.35rem",
    alignContent: "start",
    lineHeight: "1.35",
    color: _cols.fade,
    userSelect: "none",
};
export const NODE_CSS: CssMap = {
    display: "grid",
    position: "relative",
    gridTemplateColumns: "0.9rem max-content max-content minmax(1rem, 1fr)",
    gap: "0",
    boxSizing: "border-box",
    width: "100%",
    minWidth: "max-content",
    border: "0",
    borderRadius: "0.18rem",
    background: "transparent",
};
export const NODE_HIT_CSS: CssMap = {
    position: "absolute",
    inset: "0",
    zIndex: "0",
    pointerEvents: "auto",
};
export const ROW_CSS: CssMap = {
    display: "grid",
    position: "relative",
    zIndex: "1",
    gridColumn: "1 / -1",
    gridTemplateColumns: "subgrid",
    width: "100%",
    gap: "0",
    alignItems: "stretch",
    minHeight: "1.35em",
};
export const CONNECTOR_CSS: CssMap = {
    alignSelf: "start",
    height: "1.75em",
    minHeight: "1.75em",
    width: "0.9rem",
};
export const KEY_CSS: CssMap = {
    color: _cols.fmt.json,
    opacity: "0.72",
    overflow: "visible",
    whiteSpace: "nowrap",
    display: "flex",
    alignItems: "flex-start",
    boxSizing: "border-box",
};
export const VALUE_CSS: CssMap = {
    minWidth: "0",
    width: "max-content",
    overflow: "visible",
    alignSelf: "start",
};
export const COMPLEX_VALUE_CSS: CssMap = {
    ...VALUE_CSS,
    paddingTop: "0.36em",
};
export const TRIGGER_CSS: CssMap = {
    alignSelf: "stretch",
    minHeight: "1.35em",
    width: "100%",
};
export const PRIMITIVE_CSS: CssMap = {
    color: _cols.yellowlike,

    overflow: "visible",
    whiteSpace: "nowrap",
};
export const DEMO_ROOT_CSS: CssMap = {
    ...FONT_FAM_MONO,
    display: "grid",
    gridTemplateColumns: "minmax(16rem, 0.45fr) minmax(0, 1fr)",
    gap: "0.75rem",
    height: "100%",
    minHeight: "0",
    boxSizing: "border-box",
    padding: "0.75rem",
    color: _cols.fade,
};
export const DEMO_COLUMN_CSS: CssMap = {
    display: "grid",
    gridTemplateRows: "auto minmax(0, 1fr)",
    gap: "0.45rem",
    minHeight: "0",
};
export const DEMO_LABEL_CSS: CssMap = {
    color: _cols.fade,
    opacity: "0.58",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontSize: "0.68rem",
};
export const DEMO_TEXTAREA_CSS: CssMap = {
    width: "100%",
    height: "100%",
    minHeight: "0",
    boxSizing: "border-box",
    resize: "none",
    padding: "0.75rem",
    border: `1px solid ${_cols.bluelike}`,
    background: _cols.backlo,
    color: _cols.fmt.json,
    outline: "none",
    ...FONT_FAM_MONO,
    fontSize: øfontSize.smol,
};
export const DEMO_OUTPUT_CSS: CssMap = {
    minHeight: "0",
    overflow: "auto",
    boxSizing: "border-box",
    padding: "0.75rem",
    border: "0",
    borderRadius: "0.18rem",
    background: `linear-gradient(to bottom right, ${_cols.backlo} 0%, ${_cols.backlo} 72%, ${_cols.backhi} 135%)`,
};
export const DEMO_ERROR_CSS: CssMap = {
    color: _cols.red,
    whiteSpace: "pre-wrap",
};
export const HIGHLIGHT_CLEAR_CSS: CssMap = {
    boxShadow: "",
    filter: "",
    color: "",
    opacity: "",
    textShadow: "",
    fontWeight: "",
};
export const HIGHLIGHT_RELATED_CSS: CssMap = {};
export const HIGHLIGHT_SELF_CSS: CssMap = {};
export const HIGHLIGHT_TEXT_CSS: CssMap = {
    color: _cols.yellowlike,
    opacity: "1",
    textShadow: `0 0 0.08rem ${_cols.yellowlike}`,
    fontWeight: "700",
};
export const HIGHLIGHT_CONNECTOR_CSS: CssMap = {
    filter: `drop-shadow(0 0 0.08rem ${_cols.yellowlike})`,
};
export const CONNECTOR_RAIL_CLEAR_CSS: CssMap = {
    opacity: "0",
    background: "transparent",
    filter: "",
};
export const PATH_TEXT_CSS: CssMap = {
    ...HIGHLIGHT_TEXT_CSS,
    color: _cols.yellowlike,
    opacity: "1",
    textShadow: `0 0 0.08rem ${_cols.yellowlike}`,
    fontWeight: "700",
};export function nodeCss(depth: number): CssMap {
    const safeDepth = Math.min(depth, 12);
    const shadeStop = `${180 - safeDepth * 4}%`;
    return {
        ...NODE_CSS,
        padding: "0.08rem 0 0.12rem 0",
        background: `linear-gradient(to bottom right, transparent 0%, ${_cols.backhi} ${shadeStop})`,
    };
}
export const PATH_OVERLAY_CSS: CssMap = {
    display: "block",
    position: "absolute",
    inset: "0",
    pointerEvents: "none",
    overflow: "visible",
    // CHANGED: keep the active trace above the rendered node panels so it
    // does not appear to fade out as the JSON gets visually denser.
    zIndex: "7",
};
export const PATH_OVERLAY_SVG_CSS: CssMap = {
    display: "block",
    position: "absolute",
    inset: "0",
    width: "100%",
    height: "100%",
    overflow: "visible",
};

