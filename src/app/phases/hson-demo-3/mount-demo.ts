// mount-demo.ts

import type { LiveTree } from "hson-live";
import { makeDivId } from "../../../utils/makers";
import { relay, type OutcomeAsync } from "intrastructure";
import { DEMO_CSS, DEMO_SCREEN_CSS, DEMO_SCREEN_FX_CSS, DEMO_SCREEN_INSET_CSS, DEMO_WALL_CSS, DEMO_WALL_FX_CSS } from "./demo.css";
import { $COL } from "../../consts/colors.consts";
import { init_parsing_panels } from "../../widgets/parse-panel/init.pp";
import { pp_factory } from "../../widgets/parse-panel/pp-factory";
import { style_parsing_panels } from "../../widgets/parse-panel/style-pp";




export async function mount_demo(stage: LiveTree): OutcomeAsync<void> {
  stage.empty();
  const demo = makeDivId(stage, "demo").classlist.add("demo");
  const wall = makeDivId(demo, "demo-wall").classlist.add("demo-wall");
  const wallFx = makeDivId(wall, "demo-wall-fx").classlist.add("demo-wall-fx");
  const screeninset = makeDivId(wall, "screen-inset").classlist.add("screen-inset");
  const screen = makeDivId(screeninset, "demo-screen").classlist.add("demo-screen");
  const screenFx = makeDivId(screen, "demo-screen-fx").classlist.add("demo-screen-fx");
  
  demo.css.setMany(DEMO_CSS);
  wall.css.setMany(DEMO_WALL_CSS);
  wallFx.css.setMany(DEMO_WALL_FX_CSS);
  screeninset.css.setMany(DEMO_SCREEN_INSET_CSS);
  screen.css.setMany(DEMO_SCREEN_CSS);
  screenFx.css.setMany(DEMO_SCREEN_FX_CSS);
  
  
  const menuBox = makeDivId(screen, 'menu-box').classlist.add('ui menu box');
  menuBox.css.setMany({
    position: "absolute",
    left: "500px",
    height: "max-content",
    width: "max-content",
    zIndex: "60",
    color: $COL.skyBlue,
    filter: "blur(0.35px)",
    margin: "2rem",
    fontFamily: "monospace",
    border: "1px solid aquamarine",
    pointerEvents: "any",
    padding: "1rem",
  })
  menuBox.setText("parsing panels")

  menuBox.listen.onClick(ev => {
    const pp = pp_factory(screen);
    init_parsing_panels(pp);
    style_parsing_panels(pp);

  })

  return relay.ok();


}