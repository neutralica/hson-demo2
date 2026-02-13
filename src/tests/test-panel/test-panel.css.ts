import type { CssMap } from "hson-live/types";
import { $GEM_WIDTHstr } from "../tests.consts"

export const ROW_SUITE_FAILcss:CssMap = {
  background: "rgba(255, 0, 0, 0.2)",
};

export const ROW_GROUP_FAILcss:CssMap = {
  background: "rgba(255, 0, 0, 0.3)",
};

export const ROW_CASE_FAILcss:CssMap= {
  background: "rgba(255, 0, 0, 0.4)",
};

export const TEST_PANELcss:CssMap = {
    display: "grid",
    gap: "6px",
    gridTemplateColumns: $GEM_WIDTHstr + $GEM_WIDTHstr + $GEM_WIDTHstr,  
    width: "100%",
    boxSizing: "border-box",
}

export const PANEL_BRANCHcss:CssMap = {
    display: "grid",
    gap: "8px",
    padding: "10px",
    width: "100%",
    boxSizing: "border-box",
    gridTemplateColumns: `${$GEM_WIDTHstr} ${$GEM_WIDTHstr}`,
    gridTemplateRows: "auto " + $GEM_WIDTHstr,
}