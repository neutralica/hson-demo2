// keyframes.ts 
export const SPLASH_KEYS = [
  {
    name: "hson_sky",
    steps: {
      "0%": { background: "rgb(0,0,0)" },
      "20%": { background: "rgb(0,0,0)" },
      "69%": { background: "rgba(0,89,255,1)" },  // redundant but might need finer tuning
      "74%": { background: "rgba(0,89,255,1)" },
      "100%": { background: "rgb(0,0,0)" },
    },
  },
  {
    name: "hson_sun_path",
    steps: {
      "0%": { offsetDistance: "0%" },
      "90%": { offsetDistance: "100%" },
      "100%": { offsetDistance: "100%" },
    },
  },
  {
    name: "hson_sun_disk",
    steps: {
      "0%": { opacity: "0", transform: "scale(3.15)", boxShadow: "0 0 0px rgba(255, 196, 84, 0)", },
      "12%": { opacity: "0.1", transform: "scale(3)", boxShadow: "0 0 0px rgba(255, 196, 84, 0)", },
      // "30%": { opacity: "0.2", transform: "scale(2.75)" },
      // "62%": { opacity: ".6", transform: "scale(2.7)" },

      "74%": { opacity: "1", transform: "scale(2.3)", boxShadow: "0 0 8px rgba(204, 255, 84, 0.8)", },
      "100%": { opacity: "1", transform: "scale(1.9)", boxShadow: "0 0 48px rgba(204, 255, 84, 1)", },
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
        color: "black",
        textShadow:
          "0 0 2px var(--glow), 0 0 6px var(--glow), 0 0 12px rgba(255,255,255,0.18)",
        filter: "brightness(1.25)",
      },

      // settle slightly dimmer but still outline-y
      "35%": {
        color: "black",
        textShadow:
          "0 0 1px var(--glow), 0 0 5px var(--glow), 0 0 10px rgba(255,255,255,0.12)",
        filter: "brightness(1)",
      },

      // 55–100%: fill comes in
      "55%": {
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
      "0%": { textShadow: "0 0 0 transparent", filter: "brightness(1)" },
      "35%": { textShadow: "0 0 0 transparent", filter: "brightness(1)" },

      // hit window (tune these %s to match the star crossing)
      "45%": {
        textShadow: "0 0 2px var(--glow), 0 0 10px var(--glow), 0 0 22px rgba(255,255,255,0.10)",
        filter: "brightness(1.25)",
      },
      "55%": {
        textShadow: "0 0 1px var(--glow), 0 0 6px var(--glow), 0 0 14px rgba(255,255,255,0.08)",
        filter: "brightness(1.08)",
      },

      "100%": { textShadow: "0 0 0 transparent", filter: "brightness(1)" },
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
      "65%": { opacity: "1" },   // stay on
      "85%": { opacity: "0" },   // fade out
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
      "70%": { opacity: "0.45", transform: "translate(-100%, -50%) scaleX(26)" },
      "100%": { opacity: "0", transform: "translate(-100%, -50%) scaleX(26)" },
    },
  },
  {
    name: "hson_star_tail_b",
    steps: {
      "0%": { opacity: "0", transform: "translate(-100%, -50%) scaleX(0.01)" },
      "6%": { opacity: "0.55", transform: "translate(-100%, -50%) scaleX(0.7)" },
      "22%": { opacity: "0.55", transform: "translate(-100%, -50%) scaleX(30)" },
      "78%": { opacity: "0.25", transform: "translate(-100%, -50%) scaleX(34)" },
      "100%": { opacity: "0", transform: "translate(-100%, -50%) scaleX(34)" },
    },
  },
  {
    name: "hson_star_tail_c",
    steps: {
      "0%": { opacity: "0", transform: "translate(-100%, -50%) scaleX(0.01)" },
      "6%": { opacity: "0.28", transform: "translate(-100%, -50%) scaleX(0.6)" },
      "26%": { opacity: "0.58", transform: "translate(-100%, -50%) scaleX(38)" },
      "88%": { opacity: "0.42", transform: "translate(-100%, -50%) scaleX(44)" },
      "100%": { opacity: "0", transform: "translate(-100%, -50%) scaleX(44)" },
    },
  },
];