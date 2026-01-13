// intro.ts

import type { LiveTree } from "hson-live";
import { relay, void_sync, type Outcome } from "intrastructure";
import { bckColor } from "../splash/types-consts/css.consts";
import { attach_error_underline } from "./error-underline";
import { zalgo_unicode, type ZConfig } from "./zalgo";
import { phaseLinger } from "../../app";
import type { CssMap } from "hson-live/types";

const LOGO_TEXT = "TERMINAL_GOTHIC"

const zalgoCol = "rgba(24, 201, 137, 1)";
const zalgoCol2 = "rgba(68, 149, 255, 1)";
const textCol = "white";

const zConfig: ZConfig = { above: 6, below: 3, mid: 5, seed: 1007 };
const zConfig2: ZConfig = { above: 10, below: 4, mid: 8, seed: 1007 };

export function mount_intro(stage: LiveTree): boolean {
  const logoBox = stage.create.div().id.set("logo-box")

  const ZTZG = logoBox.create.div().id.set('z-logo');
  const Z22G = logoBox.create.div().id.set('z2-logo');
  ZTZG.setText(zalgo_unicode(LOGO_TEXT, zConfig));
  Z22G.setText(zalgo_unicode(LOGO_TEXT, zConfig2));

  const $T$G = logoBox.create.div().id.set('logo-text').setText(LOGO_TEXT);
  attach_error_underline($T$G)

  logoBox.css.setMany({
    display: "flex",
    placeItems: "center",
    height: "5rem",
    position: "fixed",
    bottom: "2rem",
    right: "2rem",
    overflowX: "hidden",
    overflowY: "hidden",
    color: "white",
    width: "15ch",
    backgroundColor: bckColor,
    fontFamily: `monospace`,
  });

  $T$G.css.setMany({
    height: "3rem",
    position: "absolute",
    bottom: "1rem",
    display: "flex",
    placeItems: "center",
    zIndex: 50,
    filter: `drop-shadow(0 1px 0 rgba(0,0,0,.7))
          drop-shadow(0 0 6px rgba(0,0,0,.35))`

  });

  const ZALGO_CSS: CssMap = {
    height: "5rem",
    position: "absolute",
    bottom: "0",
    display: "grid",
    placeItems: "center",
    whiteSpace: "pre",
    pointerEvents: "none",
    opacity: "0",
    filter: "blur(0.3px)",
     

  }
  ZTZG.css.setMany(ZALGO_CSS).css.set.color(zalgoCol);
  Z22G.css.setMany(ZALGO_CSS).css.set.color(zalgoCol2);

  logoBox.css.keyframes.set({
    name: 'logo-fade',
    steps: {
      "0%": { opacity: "0" },
      "02%": { opacity: "0" },
      "08%": { opacity: "1" },
      "75%": { opacity: "1" },
      "95%": { opacity: "0" },
      "100%": { opacity: "0" },

    }
  })
  logoBox.css.anim.begin({
    name: 'logo-fade',
    duration: `${phaseLinger}ms`,
    timingFunction: "linear"
  })
  logoBox.css.keyframes.set({
    name: 'zalgo-fade',
    steps: {
      "0%": { opacity: "0", transform: "translateX(1px) rotate(0deg) scale(1)" },
      "12%": { opacity: "0", transform: "translateX(1px) rotate(0deg) scale(1)" },
      "50%": { opacity: "0.7", transform: "translateX(2px) rotate(1deg) scale(1.05)" },
      "88%": { opacity: "0", transform: "translateX(3px) rotate(2deg) scale(1.1)" },
      "100%": { opacity: "0", transform: "translateX(3px) rotate(2deg) scale(1.1)" },

    }
  })
  logoBox.css.keyframes.set({
    name: 'zalgo-fade2',
    steps: {
      "0%": { opacity: "0", transform: "translateX(1px) rotate(0deg) scale(0.8)" },
      "22%": { opacity: "0", transform: "translateX(1px) rotate(0deg) scale(0.8)" },
      "50%": { opacity: "0.7", transform: "translateX(0px) rotate(-1deg)  scale(0.85)" },
      "78%": { opacity: "0", transform: "translateX(-1px) rotate(-2deg) scale(0.9)" },
      "100%": { opacity: "0", transform: "translateX(-1px) rotate(-2deg) scale(0.9)" },

    }
  })
  ZTZG.css.anim.begin({
    name: 'zalgo-fade',
    duration: `${phaseLinger}ms`,
    timingFunction: "linear"
  })
  Z22G
    .css.anim.begin({
      name: 'zalgo-fade2',
      duration: `${phaseLinger}ms`,
      timingFunction: "linear"
    })


  return true;

}