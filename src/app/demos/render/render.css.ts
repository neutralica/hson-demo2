import type { CssMap } from "hson-live/types";
import { _colors } from "../../core/consts/colors.consts";
import { FONT_FAM_MONO } from "../../core/consts/css.consts";
import { _fontSize } from "../../core/consts/ui-consts";

// CHANGED: centralize render-demo colors so the visual system can be tuned
// from one place without hunting through each CSS object.
const renderColorBaseText = _colors.chrome;
const renderColorJsonText = _colors.fmt.json;
const renderColorPrimitiveText = _colors.yellowlike;
const renderColorActiveText = _colors.yellowlike;
const renderColorActiveGlow = _colors.yellowlike;
const renderColorConnectorGlow = _colors.yellowlike;
const renderColorPanelBorder = _colors.bluelike;
const renderColorPanelBackLow = _colors.backlo;
const renderColorPanelBackHigh = _colors.backhi;
const renderColorErrorText = _colors.red;

export const ROOT_CSS: CssMap = {
    ...FONT_FAM_MONO,
    fontSize: _fontSize.smol,
    display: "grid",
    width: "100%",
    gap: "0.35rem",
    alignContent: "start",
    lineHeight: "1.35",
    color: renderColorBaseText,
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
    color: renderColorJsonText,
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
    color: renderColorPrimitiveText,

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
    color: renderColorBaseText,
};
export const DEMO_COLUMN_CSS: CssMap = {
    display: "grid",
    gridTemplateRows: "auto minmax(0, 1fr)",
    gap: "0.45rem",
    minHeight: "0",
};
export const DEMO_LABEL_CSS: CssMap = {
    color: renderColorBaseText,
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
    border: `1px solid ${renderColorPanelBorder}`,
    background: renderColorPanelBackLow,
    color: renderColorJsonText,
    outline: "none",
    ...FONT_FAM_MONO,
    fontSize: _fontSize.smol,
};
export const DEMO_OUTPUT_CSS: CssMap = {
    minHeight: "0",
    overflow: "auto",
    boxSizing: "border-box",
    padding: "0.75rem",
    border: "0",
    borderRadius: "0.18rem",
    background: `linear-gradient(to bottom right, ${renderColorPanelBackLow} 0%, ${renderColorPanelBackLow} 72%, ${renderColorPanelBackHigh} 135%)`,
};
export const DEMO_ERROR_CSS: CssMap = {
    color: renderColorErrorText,
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
    color: renderColorActiveText,
    opacity: "1",
    textShadow: `0 0 0.08rem ${renderColorActiveGlow}`,
    fontWeight: "700",
};
export const HIGHLIGHT_CONNECTOR_CSS: CssMap = {
    filter: `drop-shadow(0 0 0.08rem ${renderColorConnectorGlow})`,
};
export const CONNECTOR_RAIL_CLEAR_CSS: CssMap = {
    opacity: "0",
    background: "transparent",
    filter: "",
};
export const PATH_TEXT_CSS: CssMap = {
    ...HIGHLIGHT_TEXT_CSS,
    color: renderColorActiveText,
    opacity: "1",
    textShadow: `0 0 0.08rem ${renderColorActiveGlow}`,
    fontWeight: "700",
};export function nodeCss(depth: number): CssMap {
    const safeDepth = Math.min(depth, 12);
    const shadeStop = `${180 - safeDepth * 4}%`;
    return {
        ...NODE_CSS,
        padding: "0.08rem 0 0.12rem 0",
        background: `linear-gradient(to bottom right, transparent 0%, ${renderColorPanelBackHigh} ${shadeStop})`,
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
