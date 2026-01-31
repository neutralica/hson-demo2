// demo.consts.ts

/* GOOD SEEDS: 1129, 3577 */
export const PAL_SEED = "3577";
export const PAL_CONFIG = { volatility: 1, grayWarmth: 0.35 };

const DEMO_STRINGS = {
  stage: "stage",
  demo: "demo",
  wall: "wall",
  wallFx: "wall-fx",
  inset: "screen-inset",
  screen: "demo-screen",
  screenFx: "screen-fx",
  menuBox: "menu-box",
} as const;
export const $DS = DEMO_STRINGS;

const DEMO_SUBHEADstr = "<hson-live 2026>";

const MENU_TABS = {
  parse: "parse",
  test: "test",
  oklch: "oklch",
}



  export const shade_class = (l: string) => {
    let shadeClass: string;
    switch (l) {
      case "h":
        return "blue-shade";
      case "s":
        return "yellow-shade";
      case "o":
        return "green-shade";
      case "n":
        return "pink-shade";
    }
    console.warn("shadeClass function failed");
    return "shadeClass function failed"
  }
