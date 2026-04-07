// mount-prairie-phase.ts
import { outcome, relay, type OutcomeAsync } from "intrastructure";
import { LiveTree } from "hson-live";
import { prairie_factory } from "./prairie.js";
import { mk_div_id } from "../../utils/makers.js";
import { $txt_ } from "../../core/consts/ui-consts.js";
import { OKLCH_FLEURS } from "../phase-3-demo/demo-fleurs/fleurs.consts.js";
import { ACID_WASH_OKLCH, CYBERPUNK_2060_NEUTRALS } from "../../core/consts/colors.consts.js";
import { set_alpha } from "../../core/helpers/color-helpers.js";

export async function mount_prairie(stage: LiveTree): OutcomeAsync<void> {
  stage.empty();

  // CHANGED: host fills stage
  const host = mk_div_id(stage, "prairie-phase")
    .css.setMany({
      position: "relative",
      width: "100%",
      height: "100%",
      overflow: "hidden",
      background: "hsl(210 45% 12%)", // sky placeholder
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
    fontSize: $txt_.hsonWordMarkMain,
    fontFamily: "Serif",
    color: ACID_WASH_OKLCH.straw,
    // borderBottom: "5px double " + ACID_WASH_OKLCH.straw,
    fontStyle: "italic",

  });
  box.create.span().text.set("shop").css.setMany({
    alignSelf: "end",
    marginLeft: "6rem",
    marginBottom: "0.7rem",
    fontSize: $txt_.subhead,
    fontFamily: "Serif",
    color: ACID_WASH_OKLCH.straw,
  })
    .create.span().text.set("visit").css.set.margin("6rem")
    .create.span().text.set("tours").css.set.margin("6rem")
    .create.span().text.set("find").css.set.margin("6rem")
  const brand = stage.create.div().text.set("// created entirely in hson-live").css.setMany({
    position: "fixed",
    top: "1rem",
    right: "1rem",
    display: "flex",
    alignSelf: "end",
    marginLeft: "6rem",
    fontSize: $txt_.wee,
    fontFamily: "Courier",
    color: ACID_WASH_OKLCH.straw,
  })

  return relay.ok();
}