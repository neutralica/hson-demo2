// mount-splash.ts

import { type LiveTree } from "hson-live";
import { SUN_CSS, FRAME_CSS_SPLASH, SKY_CSS, SUN_CARRIER_CSS, STAR_CARRIER_CSS, STAR_HEAD_CSS, STAR_TAIL_A_CSS, STAR_TAIL_B_CSS, STAR_TAIL_C_CSS, STAR_WRAP_CSS, FLARE_CSS, FLARE_BOX_CSS, GRADIENT_CSS, CLOUD_BOX_CSS } from "./splash.css";
import { O_ROT, VER_CSS, WORD_CSS, VER6_CSS } from "../../wordmark/wordmark.css";
import { LETTER_COLOR_std } from "../../consts/colors.consts";
import { CLOUD_LOOPkf, CLOUD_SUN_KISSkf, LAYER_FADEkf } from "./splash.keys";
import { CLOUD_LAYER_FADEanim, GRADIENTanim } from "./splash.anim";
import { AT_LAYER_FADE, AT_LAYER_MAX, CLOUD_CONFIG, KISSat, SUN_DELnum } from "./splash.consts";
import { SPLASH_KEYS } from "./splash.keys";
import { FLAREanim, NEON_FLASHanim, SKYanim, STAR_CARRIER_ANIM, STAR_HEAD_ANIM, STARSHINEanim, SUN_CARRIERanim, SUN_DISKanim, TAIL_A_ANIM as STAR_TAIL_A_ANIM, TAIL_B_ANIM as STAR_TAIL_B_ANIM, TAIL_C_ANIM as STAR_TAIL_C_ANIM, VERanim } from "./splash.anim";
import { get_letter_key } from "../../../utils/helpers";
import type { LetterKey } from "../../../types/core.types";
import { CELL_CSS, LETTER_CSS, LETTER_CSS_FINAL } from "../../wordmark/wordmark.css";
import { makeDivClass, makeDivId, makeSectionClass, makeSpanClass } from "../../../utils/makers";
import { wait } from "../../../utils/wait";
import { relay, type Outcome, type OutcomeAsync } from "intrastructure";
import { create_clouds } from "../../widgets/clouds/make-cloud";
import { make_budder, make_div, make_section } from "../../config/bud-config";



export const SPLASH_BUDS = {
    // stage -> sky
    sky: {
        name: "sky",
        make: make_section,
        id: "sky",
        css: SKY_CSS,
        kf: SPLASH_KEYS,
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
}
/**
 * this is all very messy but it works; organize/structure calls better TODO
 */
export async function mount_splash(stage: LiveTree): OutcomeAsync<LiveTree> {
    /* clear livetree contents */
    stage.empty();
    const b = make_budder(stage)
   
    /* create structural layers */
    // NOT ANYMORE!!! /* stacking order matters here: */
    const sky = b.bud(SPLASH_BUDS.sky);
    const logoBox = sky.bud(SPLASH_BUDS.logoBox);
    const frame = logoBox.bud(SPLASH_BUDS.frame);
    const wordMark = frame.bud(SPLASH_BUDS.wordmark);
    const cloudBox = frame.bud(SPLASH_BUDS.cloudBox);
   
    /* create lighting effects */
    const flareBox = frame.bud(SPLASH_BUDS.flareBox);
    const flare = flareBox.bud(SPLASH_BUDS.flare);
    const gradient = frame.bud(SPLASH_BUDS.gradient);
   
    /* create sun elements */
    const sunCarrier = wordMark.bud(SPLASH_BUDS.sunCarrier);
    const sun = sunCarrier.bud(SPLASH_BUDS.sun);
   
    /* create star elements */
    const starCarrier = frame.bud(SPLASH_BUDS.starCarrier);
    const starWrap = starCarrier.bud(SPLASH_BUDS.starWrap);
    const starHead = starWrap.bud(SPLASH_BUDS.starHead);
    const tailA = starWrap.bud(SPLASH_BUDS.starTailA);
    const tailB = starWrap.bud(SPLASH_BUDS.starTailA);
    const tailC = starWrap.bud(SPLASH_BUDS.starTailC);
    
    /* create clouds */
    const wrapper = create_clouds(cloudBox.tree, CLOUD_CONFIG).content.mustOnly();
    const clouds = wrapper.content.all();
    if (!clouds?.length) return relay.err("no clouds created");
    
    /* create H-S-O-N letters */
    const createLetter = (ltr: LetterKey): readonly [LiveTree, LiveTree] => {
        const cell = makeSpanClass(wordMark.tree, ["cell", ltr])
        const l = makeSpanClass(cell, ["letter", ltr]).setText(ltr)
        return [l, cell];
    }
    const [h, hCell] = createLetter("H")
    const [s, sCell] = createLetter("S")
    const [o, oCell] = createLetter("O")
    const [n, nCell] = createLetter("N")
    const letters = [h, s, o, n];
    const cells = [hCell, sCell, oCell, nCell];
    /* create semver pop-up */
    const ver = makeSpanClass(nCell, ["ver"]);
    makeSpanClass(ver, "ver-a").setText("2.0.2");
    const ver6 = makeSpanClass(ver, "ver-6").setText("6");


    /* style letters */
    cells.forEach(c => c.css.setMany(CELL_CSS));
    letters.forEach(l => {
        const k = get_letter_key(l);
        if (!k) return;
        const col = LETTER_COLOR_std[k]
        l.css.set.var("--glow", col);
        l.css.set.var("--final", col);
        l.css.set.var("--starshine", col);

    });
    h.css.set.transform("translateX(13px)");  // tiny nudges
    s.css.set.transform("translateX(6px)");
    o.css.setMany(O_ROT); // rotate 'O'

    letters.forEach(l => l.css.setMany(LETTER_CSS));
    ver.css.setMany(VER_CSS);
    ver6.css.setMany(VER6_CSS);

    frame.animate()

    clouds.forEach((cl, i) => {
        // 1) per-layer fade runs on the parent layer
        cl.css.anim.begin(CLOUD_LAYER_FADEanim(i));
        cl.css.setMany({
            willChange: "opacity, bottom",
        });
    });

    await wait.timer(SUN_DELnum);
    sunCarrier.animate();
    sun.animate();
    gradient.animate()
    flare.animate();
    
    await wait.for(flareBox.tree).anim(FLAREanim).end();
    flareBox.tree.removeSelf();

    await wait.for(sun.tree).anim(SUN_DISKanim).end()
    sunCarrier.tree.removeSelf();
    letters.forEach(l => { l.css.anim.begin(NEON_FLASHanim) });

    await wait.for(h).anim(NEON_FLASHanim).end()
    ver.css.anim.begin(VERanim);
    begin_star(starCarrier.tree, starHead.tree, tailA.tree, tailB.tree, tailC.tree);
    letters.forEach((l) => {
        l.css.setMany(LETTER_CSS_FINAL);
        l.css.anim.begin(STARSHINEanim);
    });

    await wait.for(tailC.tree).anim(STAR_TAIL_C_ANIM).end();

    SPLASH_KEYS.forEach(kf => {
        sky.tree.css.keyframes.delete(kf.name)
    });

    return relay.ok();
}


function begin_star(
    carrier: LiveTree,
    head: LiveTree,
    tailA: LiveTree,
    tailB: LiveTree,
    tailC: LiveTree
): void {
    /* reset to known “pose” (helps if re-run) */
    carrier.css.set.offsetDistance("0%");
    head.css.set.opacity("0");
    tailA.css.set.opacity("0");
    tailB.css.set.opacity("0");
    tailC.css.set.opacity("0");

    /* animate star */
    carrier.css.anim.begin(STAR_CARRIER_ANIM);
    head.css.anim.begin(STAR_HEAD_ANIM);
    tailA.css.anim.begin(STAR_TAIL_A_ANIM);
    tailB.css.anim.begin(STAR_TAIL_B_ANIM);
    tailC.css.anim.begin(STAR_TAIL_C_ANIM);
}
