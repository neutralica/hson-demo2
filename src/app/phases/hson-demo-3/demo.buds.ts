import { make_div, type BudList, type BudSpec } from "../../config/bud-config";
import { DEMOcss, DEMO_WALLcss, DEMO_WALL_FXcss, DEMO_SCREEN_INSETcss, DEMO_SCREENcss, DEMO_SCREEN_FXcss, MENU_BOXcss } from "./demo.css";
import { $DS } from "./demo.consts";

export const DEMO_BUDS = {
  demo: {
    name: $DS.demo,
    make: make_div,
    id: $DS.demo,
    cls: $DS.demo,
    css: DEMOcss,
  },

  wall: {
    name: $DS.wall,
    make: make_div,
    id: $DS.wall,
    cls: "demo wall",
    css: DEMO_WALLcss,
  },

  wallFx: {
    name: $DS.wallFx,
    make: make_div,
    id: $DS.wallFx,
    cls: "demo wall fx",
    css: DEMO_WALL_FXcss,
  },

  screenInset: {
    name: $DS.inset,
    make: make_div,
    id: $DS.inset,
    cls: "demo screen inset",
    css: DEMO_SCREEN_INSETcss,
  },

  screen: {
    name: $DS.screen,
    make: make_div,
    id: $DS.screen,
    cls: "demo screen",
    css: DEMO_SCREENcss,
  },

  screenFx: {
    name: $DS.screenFx,
    make: make_div,
    id: $DS.screenFx,
    cls: "demo screen fx",
    css: DEMO_SCREEN_FXcss,
  },
  menuBox: {
    name: $DS.menuBox,
    make: make_div,
    id: $DS.menuBox,
    cls: "ui menu box",
    css: MENU_BOXcss,
  }
} as const;
