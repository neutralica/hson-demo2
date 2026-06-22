

export const MOTES_LAYERcss = {
  
     position: "fixed",
      left: "0",
      top: "0",
      height: "100%",
      width: "100%",
      pointerEvents: "none",
      zIndex: "100",
  
  
  // position: "absolute",
  // inset: "0",
  // overflow: "hidden",
  // pointerEvents: "none", // motes should not block hit testing
  // // a little “terminal softness”
  // filter: "contrast(1.05)",
} as const;

export const MOTEcss = {
  position: "absolute",
  left: "0",
  top: "0",
  willChange: "transform, opacity",
  fontFamily: "monospace",
  fontSize: "14px",
  lineHeight: "14px",
  userSelect: "none",
  pointerEvents: "any",
  // “Apple II-ish” vibe via glow; tweak to taste
  textShadow: "0 0 6px rgba(120,255,160,0.25)",
} as const;
