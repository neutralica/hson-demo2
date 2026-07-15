// intro.ts

import type { LiveTree } from "hson-live";
import { attach_error_underline } from "./error-underline";
import { zalgo_unicode, type ZConfig } from "./zalgo";
import { mk_div_id } from "../../utils/makers";
import { wait } from "../../utils/wait";
import { Intro_keys, Intro_anim } from "./brand.anim-keys";
import { Intro_css, NOTEBOXcss } from "./brand.css";
import { $blu_, $grn_ } from "../../core/consts/old-rgb.consts";
import { SYS_MONOfont, _fontWeight } from "../../core/consts/ui-consts";
import { _colors} from "../../core/consts/colors.consts";
import { FONT_FAM_MONO } from "../../core/consts/css.consts";


const LOGO_TEXT = "TERMINAL_GOTHIC"

const zalgoCol = $blu_.candy;
const zalgoCol2 = $grn_.dragon;

const zConfig: ZConfig = { above: 6, below: 3, mid: 8, seed: 1007 };
const zConfig2: ZConfig = { above: 10, below: 4, mid: 2, seed: 9997 };

export async function mount_brand(s: LiveTree): Promise<void> {
  const stage = s;
  stage.empty();

  const noteBox = mk_div_id(stage, "note-box")
    .css.setMany(NOTEBOXcss);
  mk_div_id(noteBox, "note-text").text.set("// created with hson-live");

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
  return;
}
