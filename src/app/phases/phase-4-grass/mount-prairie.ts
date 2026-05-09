// mount-prairie-phase.ts
import {  relay, type OutcomeAsync } from "intrastructure";
import { LiveTree } from "hson-live";
import { prairie_factory } from "./prairie.js";
import { mk_div_id } from "../../utils/makers.js";
import { _TXT } from "../../core/consts/ui-consts.js";
import { ACID_WASH_OKLCH } from "../../core/consts/oklch.js";


const skyColor = "hsl(210 45% 12%)";
export async function mount_prairie(stage: LiveTree): OutcomeAsync<void> {
  stage.empty();

  // CHANGED: host fills stage
  const host = mk_div_id(stage, "prairie-phase")
    .css.setMany({
      position: "relative",
      width: "100%",
      height: "100%",
      overflow: "hidden",
      background: skyColor, // sky placeholder
    });

  prairie_factory(host);
  const box = stage.create.div().css.setMany({
    position: "fixed",
    top: "3rem",
    left: "4rem",
    display: "flex",

  })
  const prairie = box.create.div().text.set("spp.").css.setMany({
    alignSelf: "end",
    fontSize: _TXT.main,
    fontFamily: "Serif",
    color: ACID_WASH_OKLCH.straw,
    // borderBottom: "5px double " + ACID_WASH_OKLCH.straw,
    fontStyle: "italic",

  });
  box.create.span().text.set("shop").css.setMany({
    alignSelf: "end",
    marginLeft: "6rem",
    marginBottom: "0.7rem",
    fontSize: _TXT.main,
    fontFamily: "Serif",
    color: ACID_WASH_OKLCH.straw,
  })
    .create.span().text.set("visit").css.set.margin("6rem")
    .create.span().text.set("tours").css.set.margin("6rem")
    .create.span().text.set("find").css.set.margin("6rem")

  stage.create.div().text.set("// made in hson-live").css.setMany({
    position: "fixed",
    bottom: "1rem",
    right: "1rem",
    display: "flex",
    alignSelf: "end",
    marginLeft: "6rem",
    fontSize: _TXT.main,
    fontFamily: "Courier",
    color: skyColor,
  })

  return relay.ok();
}