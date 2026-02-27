import { make_section, make_div } from "../../widgets/buds-deprecate/bud-config";
import { WORD_CSS } from "../../wordmark/wordmark.css";
import { SKYanim, FLAREanim, GRADIENTanim, SUN_CARRIERanim, SUN_DISKanim, STAR_CARRIER_ANIM, STAR_HEAD_ANIM, TAIL_A_ANIM as STAR_TAIL_A_ANIM, TAIL_B_ANIM as STAR_TAIL_B_ANIM, TAIL_C_ANIM as STAR_TAIL_C_ANIM } from "./splash.anim";
import { AT_LAYER_FADE, AT_LAYER_MAX, KISSat } from "./splash.consts";
import { SKY_CSS, FRAME_CSS_SPLASH, FLARE_BOX_CSS, FLARE_CSS, GRADIENT_CSS, CLOUD_BOX_CSS, SUN_CARRIER_CSS, SUN_CSS, STAR_CARRIER_CSS, STAR_WRAP_CSS, STAR_HEAD_CSS, STAR_TAIL_A_CSS, STAR_TAIL_B_CSS, STAR_TAIL_C_CSS } from "./splash.css";
import { SPLASHkfs, CLOUD_LOOPkf, CLOUD_SUN_KISSkf, LAYER_FADEkf } from "./splash.keys";




export const SPLASH_BUDS = {
    // stage -> sky
    sky: {
        name: "sky",
        make: make_section,
        id: "sky",
        css: SKY_CSS,
        kf: SPLASHkfs,
    },

    // sky -> logoBox -> frame
    logoBox: {
        name: "logoBox",
        make: make_div,
        id: "hson-logo",
    },

    frame: {
        name: "frame",
        make: make_div,
        id: "frame",
        css: FRAME_CSS_SPLASH,
        anim: SKYanim,
    },

    // frame -> wordmark
    wordmark: {
        name: "wordmark",
        make: make_div,
        id: "wordmark",
        css: WORD_CSS,
    },

    // frame -> flare
    flareBox: {
        name: "flareBox",
        make: make_div,
        id: "flare-box",
        css: FLARE_BOX_CSS,
    },
    flare: {
        name: "flare",
        make: make_div,
        id: "lens-flare",
        css: FLARE_CSS,
        anim: FLAREanim,
    },

    // frame -> sky gradient
    gradient: {
        name: "gradient",
        make: make_div,
        id: "sky-gradient",
        css: GRADIENT_CSS,
        anim: GRADIENTanim
    },

    // frame -> cloud box
    cloudBox: {
        name: "cloudBox",
        make: make_div,
        id: "cloud-box",
        css: CLOUD_BOX_CSS,
        at: [AT_LAYER_FADE, AT_LAYER_MAX, KISSat],
        kf: [CLOUD_LOOPkf, CLOUD_SUN_KISSkf, LAYER_FADEkf],
    },

    // word -> sun
    sunCarrier: {
        name: "sunCarrier",
        make: make_div,
        id: "sun-carrier",
        css: SUN_CARRIER_CSS,
        anim: SUN_CARRIERanim,
    },
    sun: {
        name: "sun",
        make: make_div,
        id: "sun",
        css: SUN_CSS,
        anim: SUN_DISKanim,
    },

    // frame -> star cluster
    starCarrier: {
        name: "starCarrier",
        make: make_div,
        id: "star-carrier",
        css: STAR_CARRIER_CSS,
        anim: STAR_CARRIER_ANIM,
    },
    starWrap: {
        name: "starWrap",
        make: make_div,
        id: "star-wrap",
        css: STAR_WRAP_CSS,
    },
    starHead: {
        name: "starHead",
        make: make_div,
        id: "star-head",
        css: STAR_HEAD_CSS,
        anim: STAR_HEAD_ANIM,
    },
    starTailA: {
        name: "starTailA",
        make: make_div,
        cls: "star-tail a",
        css: STAR_TAIL_A_CSS,
        anim: STAR_TAIL_A_ANIM
    },
    starTailB: {
        name: "starTailB",
        make: make_div,
        cls: "star-tail b",
        css: STAR_TAIL_B_CSS,
        anim: STAR_TAIL_B_ANIM
    },
    starTailC: {
        name: "starTailC",
        make: make_div,
        cls: "star-tail c",
        css: STAR_TAIL_C_CSS,
        anim: STAR_TAIL_C_ANIM
    },
};
