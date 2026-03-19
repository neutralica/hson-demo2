// intro.ts

import type { LiveTree } from "hson-live";
import { attach_error_underline } from "./error-underline";
import { zalgo_unicode, type ZConfig } from "./zalgo";
import { mk_div_id } from "../../utils/makers";
import { relay, type Outcome, type OutcomeAsync } from "intrastructure";
import { wait } from "../../utils/wait";
import { Intro_keys, Intro_anim } from "./brand.anim-keys";
import { Intro_css } from "./brand.css";
import { $blu_, $cols_, $grn_ } from "../../core/consts/colors.consts";


const LOGO_TEXT = "TERMINAL_GOTHIC"

const zalgoCol = $blu_.sky;
const zalgoCol2 = $grn_.dragon;

const zConfig: ZConfig = { above: 6, below: 3, mid: 8, seed: 1007 };
const zConfig2: ZConfig = { above: 10, below: 4, mid: 2, seed: 9997 };

export async function mount_brand(s: LiveTree): OutcomeAsync<void> {
  const stage = s;
  stage.empty();
  const introNote = "// created with hson-live"
  const noteBox = mk_div_id(stage, "note-box");
  noteBox.css.setMany({
    position: "fixed",
    top: "1rem",
    left: "1rem",
    backgroundColor: $cols_.bckgd,
    padding: "1rem",
    fontFamily: "monospace",
    color: $grn_.std,
    filter: "blur(0.5px)",
  })
  const noteText = mk_div_id(noteBox, "note-text")
  noteText.text.set(introNote);

  const logoBox = mk_div_id(stage, "logo-box")
    .css.setMany(Intro_css.logobox);

  const zalgo1 = mk_div_id(logoBox, 'z-logo')
    .text.set(zalgo_unicode(LOGO_TEXT, zConfig))
    .css.setMany(Intro_css.zalgo)
    .css.set.color(zalgoCol);

  const zalgo2 = mk_div_id(logoBox, 'z2-logo')
    .text.set(zalgo_unicode(LOGO_TEXT, zConfig2))
    .css.setMany(Intro_css.zalgo)
    .css.set.color(zalgoCol2);

  const brand = mk_div_id(logoBox, 'logo-text')
    .text.set(LOGO_TEXT)
    .css.setMany(Intro_css.brand);

  attach_error_underline(brand)

  const iv = setInterval(() => {
    const seed = Math.random() * 1000;
    const seed2 = Math.random() * 1000;
    try {
      zalgo1.text.set(zalgo_unicode(LOGO_TEXT, {
        ...zConfig,
        seed
      }))
      zalgo2.text.set(zalgo_unicode(LOGO_TEXT, {
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

  stage.empty();
  return relay.ok();
}