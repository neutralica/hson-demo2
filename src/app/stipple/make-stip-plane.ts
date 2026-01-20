// import type { CssMap } from "hson-live/types";

// export function make_stipple_plane(opts?: {
//   speed?: number;
//   rotDur?: number;
//   opacity?: number;
// }): CssMap {
//   const speed = opts?.speed ?? 6;
//   const rotDur = opts?.rotDur ?? 240;
//   const opacity = opts?.opacity ?? 1;

//   const dur = Math.max(40, Math.round(420 / speed));

//   return {
//     position: "absolute",
//     inset: "0",
//     pointerEvents: "none",
//     opacity,

//     backgroundImage: [
//       "radial-gradient(circle at 2px 2px, rgba(56,100,144,0.22) 0 0.6px, transparent 2.8px)",
//       "radial-gradient(circle at 6px 5px, rgba(123,69,69,0.18) 0 0.9px, transparent 4.1px)",
//       "radial-gradient(circle at 3px 3px, rgba(196,199,158,0.14) 0 0.7px, transparent 4.6px)",
//     ].join(", "),

//     // CHANGED: per-layer repeats (critical)
//     backgroundRepeat: ["repeat", "repeat", "repeat"].join(", "),

//     // CHANGED: per-layer sizes
//     backgroundSize: ["53px 19px", "41px 37px", "49px 41px"].join(", "),

//     // CHANGED: per-layer positions (keeps the value shape stable for animation)
//     backgroundPosition: ["0px 0px", "0px 0px", "0px 0px"].join(", "),

//     animation: [
//       `stipple_bgpos_all ${dur}s linear infinite`,
//       `stipple_rotate_slow ${rotDur}s linear infinite`,
//     ].join(", "),

//     transformOrigin: "50% 50%",
//     willChange: "background-position, transform",
//   };
// }