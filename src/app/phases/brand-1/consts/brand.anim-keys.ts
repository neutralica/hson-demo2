// keyframes.consts.ts

import { PHASE_LINGER } from "../../../consts/config.consts";


const LOGOBOX_KEYF = {
  name: 'logo-fade',
  steps: {
    "0%": { opacity: "0" },
    "02%": { opacity: "0" },
    "08%": { opacity: "1" },
    "75%": { opacity: "1" },
    "95%": { opacity: "0" },
    "100%": { opacity: "0" },

  }
}

const ZALGO_FADE = {
  name: 'zalgo-fade',
  steps: {
    "0%": { opacity: "0", transform: "translateX(1px) rotate(0deg) scale(1)" },
    "02%": { opacity: "0", transform: "translateX(1px) rotate(0deg) scale(1)" },
    "70%": { opacity: "0.9", transform: "translateX(3px) rotate(1deg) scale(1.05)" },
    "98%": { opacity: "0", transform: "translateX(5px) rotate(2deg) scale(1.1)" },
    "100%": { opacity: "0", transform: "translateX(5px) rotate(2deg) scale(1.1)" },

  }
};
const ZALGO_FADE_2 = {
  name: 'zalgo-fade2',
  steps: {
    "0%": { opacity: "0", transform: "translateX(1px) rotate(0deg) scale(1.1)" },
    "12%": { opacity: "0", transform: "translateX(1px) rotate(0deg) scale(1.1)" },
    "70%": { opacity: "0.6", transform: "translateX(0px) rotate(-1deg)  scale(1.05)" },
    "88%": { opacity: "0", transform: "translateX(-1px) rotate(-2deg) scale(1)" },
    "100%": { opacity: "0", transform: "translateX(-1px) rotate(-2deg) scale(1)" },

  }
};
export const Intro_keys = {
  logobox: LOGOBOX_KEYF,
  zalgoFade: ZALGO_FADE,
  zalgoFade_2: ZALGO_FADE_2,


}

 const LOGOBOX_ANIM = {
  name: 'logo-fade',
  duration: `${PHASE_LINGER}ms`,
  timingFunction: "linear"
}

 const ZALGO_ANIM_1 ={
    name: 'zalgo-fade',
    duration: `${PHASE_LINGER}ms`,
    timingFunction: "linear"
}
  
 const ZALGO_ANIM_2 ={
      name: 'zalgo-fade2',
      duration: `${PHASE_LINGER}ms`,
      timingFunction: "linear"
}
    
export const Intro_anim = {
  zalgo1: ZALGO_ANIM_1,
  zalgo2: ZALGO_ANIM_2,
  logobox: LOGOBOX_ANIM,

}