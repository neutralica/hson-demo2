import { _colors } from "../../core/consts/colors.consts";
import { CLOUD_BAND_LOOPstr as CLOUD_LOOPstr, CLOUD_LAYER_FADEstr, CLOUD_SUN_KISSstr, CLOUD_TILE_W, SKY_GRADIENT } from "./splash.consts";

// keyframes.ts 
export const SPLASHkfs = [
  {
    name: "hson_sky",
    steps: {
      "0%": { background: _colors.backlo },
      "02%": { background: _colors.backlo },
      "37%": { background: "rgba(0,89,255,1)" },
      "92%": { background: "rgba(0, 128, 255, 1)" },
      "100%": { background: _colors.backlo },
    },
  },
  {
    name: "hson_sun_path",
    steps: {
      "0%": { offsetDistance: "0%" },
      "90%": { offsetDistance: "100%" },
      "100%": { offsetDistance: "110%" },
    },
  },
  {
    name: "hson_sun_disk",
    steps: {
      "0%": { opacity: "0", transform: "scale(3.15)", boxShadow: "0 0 0px rgba(255, 196, 84, 0)", },
      "12%": { opacity: "0.1", transform: "scale(3)", boxShadow: "0 0 0px rgba(255, 196, 84, 0)", },
      // "30%": { opacity: "0.2", transform: "scale(2.75)" },
      // "62%": { opacity: ".6", transform: "scale(2.7)" },

      "84%": { opacity: "1", transform: "scale(2.3)", boxShadow: "0 0 48px rgba(204, 255, 84, 0.8)", },
      "100%": { opacity: "1", transform: "scale(2)", boxShadow: "0 0 8px rgba(204, 255, 84, 1)", },
    },
  },
  {
    name: "hson_letters",
    steps: {
      // 0–35%: glow appears (outline vibe), still no fill
      "0%": {
        color: "black",
        textShadow: "0 0 0 transparent",
        filter: "brightness(1)",
      },

      // snap/pulse on
      "18%": {
        color: _colors.backlo,
        textShadow:
          "0 0 2px var(--glow), 0 0 6px var(--glow), 0 0 12px rgba(255,255,255,0.18)",
        filter: "brightness(1.25)",
      },

      // settle slightly dimmer but still outline-y
      "30%": {
        color: _colors.backlo,
        textShadow:
          "0 0 1px var(--glow), 0 0 5px var(--glow), 0 0 10px rgba(255,255,255,0.12)",
        filter: "brightness(1)",
      },

      "50%": {
        color: _colors.backlo,
        textShadow:
          "0 0 1px var(--glow), 0 0 6px var(--glow), 0 0 14px rgba(255,255,255,0.10)",
      },
      "65%": {
        color: _colors.backlo,
        textShadow:
          "0 0 1px var(--glow), 0 0 12px var(--glow), 0 0 20px rgba(255,255,255,0.12)",
        filter: "brightness(1)",
      },
      "75%": {
        color: _colors.backlo,
        textShadow:
          "0 0 1px var(--glow), 0 0 2px var(--glow), 0 0 04px rgba(255,255,255,0.12)",
        filter: "brightness(1)",
      },

      "95%": {
        color: "var(--final)",
        textShadow:
          "0 0 1px var(--glow), 0 0 6px var(--glow), 0 0 14px rgba(255,255,255,0.10)",
      },

      "100%": {
        color: "var(--final)",
        textShadow:
          "0 0 0 transparent",
      },
    },
  },
  {
    name: "hson_letter_starshine",
    steps: {
      "0%": { color: "var(--final)", filter: "brightness(1)", textShadow: "0 0 0 transparent" },
      "62%": { color: "var(--final)", filter: "brightness(1)", textShadow: "0 0 2px var(--starshine), 0 0 2px var(--starshine)" },
      "75%": { color: "var(--final)", filter: "brightness(1.98)", textShadow: "0 0 1px var(--starshine), 0 0 5px var(--starshine)" },
      "85%": { color: "var(--final)", filter: "brightness(1)", textShadow: "0 0 1px var(--starshine), 0 0 2px var(--starshine)" },
      "100%": { color: "var(--final)", filter: "brightness(1)", textShadow: "0 0 0 transparent" },
    },
  },
  {
    name: "hson_ver",
    steps: {
      "0%": { opacity: "0", transform: "translateY(6px)" },
      "100%": { opacity: "1", transform: "translateY(0)" },
    },
  },
  // 1) carrier movement: smooth, linear, visible
  {
    name: "hson_star_move",
    steps: {
      "0%": { offsetDistance: "0%" },
      "100%": { offsetDistance: "100%" },
    },
  },

  // 2) head: on early, off late (no transforms here)
  {
    name: "hson_star_head",
    steps: {
      "0%": { opacity: "0" },
      "6%": { opacity: "1" },   // fade in quickly
      "16%": { opacity: ".2" },   // fade in quickly
      "36%": { opacity: ".4" },   // fade in quickly
      "56%": { opacity: "1" },   // fade in quickly
      "71%": { opacity: ".3" },   // fade in quickly
      "75%": { opacity: "0" },   // stay on
      "90%": { opacity: "0" },   // fade out
      "100%": { opacity: "0" },
    },
  },

  // 3) tails: stretch fast, then linger/fade slowly
  {
    name: "hson_star_tail_a",
    steps: {
      "0%": { opacity: "0", transform: "translate(-100%, -50%) scaleX(0.01)" },
      "6%": { opacity: "0.9", transform: "translate(-100%, -50%) scaleX(0.8)" },
      "18%": { opacity: "0.9", transform: "translate(-100%, -50%) scaleX(22)" },
      "70%": { opacity: "0.05", transform: "translate(-100%, -50%) scaleX(26)" },
      "100%": { opacity: "0", transform: "translate(-100%, -50%) scaleX(26)" },
    },
  },
  {
    name: "hson_star_tail_b",
    steps: {
      "0%": { opacity: "0", transform: "translate(-100%, -50%) scaleX(0.01)" },
      "6%": { opacity: "0.55", transform: "translate(-100%, -50%) scaleX(0.7)" },
      "22%": { opacity: "0.75", transform: "translate(-100%, -50%) scaleX(30)" },
      "78%": { opacity: "0.05", transform: "translate(-100%, -50%) scaleX(34)" },
      "100%": { opacity: "0", transform: "translate(-100%, -50%) scaleX(54)" },
    },
  },
  {
    name: "hson_star_tail_c",
    steps: {
      "0%": { opacity: "0", transform: "translate(-100%, -50%) scaleX(0.01)" },
      "6%": { opacity: "0.28", transform: "translate(-100%, -50%) scaleX(0.6)" },
      "26%": { opacity: "0.58", transform: "translate(-100%, -50%) scaleX(38)" },
      "88%": { opacity: "0.32", transform: "translate(-100%, -50%) scaleX(44)" },
      "100%": { opacity: "0", transform: "translate(-100%, -50%) scaleX(64)" },
    },
  }, {
    name: "hson_lens_flare",
    steps: {
      "0%": {
        opacity: "0",
        transform: "translateX(-10%) translateY(6%) rotate(-2deg) scale(0.96)",
      },
      "54%": {
        opacity: "0",
        transform: "translateX(-10%) translateY(6%) rotate(-2deg) scale(0.96)",
      },
      "68%": {
        opacity: "0.34",
        transform: "translateX(-7%) translateY(9%) rotate(-4deg) scale(1.00)",
      },
      "78%": {
        opacity: "0.88",
        transform: "translateX(-3%) translateY(13%) rotate(-7deg) scale(1.06)",
      },
      "88%": {
        opacity: "0.74",
        transform: "translateX(2%) translateY(18%) rotate(-11deg) scale(1.12)",
      },
      "96%": {
        opacity: "0.26",
        transform: "translateX(6%) translateY(22%) rotate(-14deg) scale(1.18)",
      },
      "100%": {
        opacity: "0",
        transform: "translateX(8%) translateY(24%) rotate(-16deg) scale(1.22)",
      },
    },
  },
  {
    name: "gradient-opacity",
    steps: {
      "0%": { opacity: "0" },
      "02%": { opacity: "0" },
      "62%": { opacity: ".2" },
      "72%": { opacity: ".3" },
      "80%": { opacity: ".8" },   // fade in quickly
      "85%": { opacity: ".3" },   // fade in quickly
      "96%": { opacity: "0" },
      "100%": { opacity: "0" },
    },
  },
  {
  name: "hson_lens_ghost",
  steps: {
    "0%": {
      opacity: "0",
      transform: "translate(-20%, 10%) scale(0.65)",
    },
    "62%": {
      opacity: "0",
      transform: "translate(-20%, 10%) scale(0.65)",
    },
    "74%": {
      opacity: "0.20",
      transform: "translate(-12%, 4%) scale(0.85)",
    },
    "82%": {
      opacity: "0.72",
      transform: "translate(0%, -3%) scale(1.05)",
    },
    "90%": {
      opacity: "0.38",
      transform: "translate(10%, -7%) scale(0.95)",
    },
    "100%": {
      opacity: "0",
      transform: "translate(18%, -10%) scale(0.72)",
    },
  },
}
]

export const LAYER_FADEkf = {
  name: CLOUD_LAYER_FADEstr,
  steps: {
    "0%": { "--layer-fade": "1" },
    "18%": { "--layer-fade": "0.96" },
    "36%": { "--layer-fade": "0.88" },
    "54%": { "--layer-fade": "0.72" },
    "62%": { "--layer-fade": "0.51" },
    "84%": { "--layer-fade": "0" },
    "100%": { "--layer-fade": "0" },
  },
} as const;

export const CLOUD_LOOPkf = {
  name: CLOUD_LOOPstr,
  steps: {
    "0%": {
      "mask-position": "var(--cloud-phase-px) 100%, 0px 100%",
      "-webkit-mask-position": "var(--cloud-phase-px) 100%, 0px 100%",
    },
    "100%": {
      "mask-position": `calc(var(--cloud-phase-px) - ${CLOUD_TILE_W}px) 100%, 0px 100%`,
      "-webkit-mask-position": `calc(var(--cloud-phase-px) - ${CLOUD_TILE_W}px) 100%, 0px 100%`,
    },
  },
} as const;

export const CLOUD_SUN_KISSkf = {
  name: CLOUD_SUN_KISSstr,
  steps: {
    "0%": { "--kiss": "0" },
    "30%": { "--kiss": "0" },
    "95%": { "--kiss": "1" },
    "100%": { "--kiss": "1" },
  },
} as const;