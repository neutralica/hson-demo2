import { $blu_ } from "../../../consts/colors.consts";

export const MOUSE_HOSTcss = {
    width: "100%",
    minWidth: "0",
    minHeight: "0",

    // ADDED: keep it from getting absurdly wide or narrow
    maxWidth: "32rem",

    // ADDED: the old panel frame gave you readable text + vibe
    color: $blu_.std,
    fontFamily: "monospace",
    // OPTIONAL: if you want the same glass feel as panels
    background: "rgba(255,255,255,0.03)",
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
    borderRadius: "14px",
    padding: "12px",
  }