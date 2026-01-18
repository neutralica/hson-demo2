// intro.ts

import type { LiveTree } from "hson-live";
import { attach_error_underline } from "./error-underline";
import { zalgo_unicode, type ZConfig } from "./zalgo";
import { Intro_anim, Intro_keys } from "./consts/brand.anim-keys";
import { Intro_css } from "./consts/brand.css";
import { $COLOR } from "../../consts/styling.consts";
import { makeDivId } from "../../../utils/makers";
import { relay, type Outcome, type OutcomeAsync } from "intrastructure";
import { wait } from "../../../utils/wait-for";


const LOGO_TEXT = "TERMINAL_GOTHIC"

const zalgoCol = $COLOR.skyBlue;
const zalgoCol2 = $COLOR.dragonGreen;

const zConfig: ZConfig = { above: 6, below: 3, mid: 8, seed: 1007 };
const zConfig2: ZConfig = { above: 10, below: 4, mid: 2, seed: 9997 };

export async function mount_brand(s: LiveTree): OutcomeAsync<void> {
  const stage = s;
  stage.empty();

  const logoBox = makeDivId(stage, "logo-box")
    .css.setMany(Intro_css.logobox);

  const zalgo1 = makeDivId(logoBox, 'z-logo')
    .setText(zalgo_unicode(LOGO_TEXT, zConfig))
    .css.setMany(Intro_css.zalgo)
    .css.set.color(zalgoCol);

  const zalgo2 = makeDivId(logoBox, 'z2-logo')
    .setText(zalgo_unicode(LOGO_TEXT, zConfig2))
    .css.setMany(Intro_css.zalgo)
    .css.set.color(zalgoCol2);

  const brand = makeDivId(logoBox, 'logo-text')
    .setText(LOGO_TEXT)
    .css.setMany(Intro_css.brand);

  attach_error_underline(brand)

  const iv = setInterval(() => {
    const seed = Math.random() * 1000;
    const seed2 = Math.random() * 1000;
    try {
      zalgo1.setText(zalgo_unicode(LOGO_TEXT, {
        ...zConfig,
        seed
      }))
      zalgo2.setText(zalgo_unicode(LOGO_TEXT, {
        ...zConfig2,
        seed: seed2
      }))
    } catch {
      clearInterval(iv);
    }
  }, 60);

  const brandKeys = [
    Intro_keys.logobox,
    Intro_keys.zalgoFade,
    Intro_keys.zalgoFade_2
  ];

  logoBox.css.keyframes
    .setMany(brandKeys)

  logoBox.css.anim.begin(Intro_anim.logobox);
  zalgo1.css.anim.begin(Intro_anim.zalgo1)
  zalgo2.css.anim.begin(Intro_anim.zalgo2);
  await wait.for(logoBox).anim(Intro_anim.logobox).end();

  brandKeys.forEach(bk => {
    logoBox.css.keyframes.delete(bk.name);
  });


  return relay.ok();
}