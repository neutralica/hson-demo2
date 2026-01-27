// mount-splash.ts

import { type LiveTree } from "hson-live";
import { SUN_CSS, FRAME_CSS_SPLASH, SKY_CSS, SUN_CARRIER_CSS, STAR_CARRIER_CSS, STAR_HEAD_CSS, STAR_TAIL_A_CSS, STAR_TAIL_B_CSS, STAR_TAIL_C_CSS, STAR_WRAP_CSS, FLARE_CSS, FLARE_BOX_CSS, GRADIENT_CSS, CLOUD_BOX_CSS } from "./splash.css";
import { O_ROT, VER_CSS, WORD_CSS, VER6_CSS } from "../../wordmark/wordmark.css";
import { LETTER_COLOR_std } from "../../consts/colors.consts";
import { kf_CLOUD_LOOP, kf_CLOUD_SUN_KISS, kf_LAYER_FADE } from "./splash.keys";
import { anim_CLOUD_LOOP, anim_CLOUD_LAYER_FADE, anim_CLOUD_SUN_KISS, GRADIENTanim } from "./splash.anim";
import { AT_LAYER_FADE, AT_LAYER_MAX, CLOUD_CONFIG, CLOUD_DURnum, CLOUD_DURstr, SUN_DELnum } from "./splash.consts";
import { SPLASH_KEYS } from "./splash.keys";
import { FLAREanim, NEON_FLASHanim, SKYanim, STAR_CARRIER_ANIM, STAR_HEAD_ANIM, STARSHINEanim, SUN_CARRIERanim, SUN_DISKanim, TAIL_A_ANIM, TAIL_B_ANIM, TAIL_C_ANIM, VERanim } from "./splash.anim";
import { get_letter_key } from "../../../utils/helpers";
import type { LetterKey } from "../../../types/core.types";
import { CELL_CSS, LETTER_CSS, LETTER_CSS_FINAL } from "../../wordmark/wordmark.css";
import { makeDivClass, makeSection, makeSpanClass } from "../../../utils/makers";
import { wait } from "../../../utils/wait";
import { relay, type Outcome, type OutcomeAsync } from "intrastructure";
import { create_clouds } from "../../widgets/clouds/make-cloud";

/**
 * this is all very messy but it works; organize/structure calls better TODO
 */
export async function mount_splash(stage: LiveTree): OutcomeAsync<LiveTree> {
    /* clear livetree contents */
    stage.empty();
    /* create container layers */
    const sky = makeSection(stage, "sky");
    /* stacking order matters here: */
    const logoBox = makeDivClass(sky, "hson-logo")
    const frame = makeDivClass(logoBox, "frame");
    const hsonWord = makeDivClass(frame, "wordmark");
    const flareBox = makeDivClass(frame, "flare-box");
    const flare = makeDivClass(flareBox, "lens-flare");
    /* sky gradient */
    const gradient = makeDivClass(frame, "sky-gradient");
    const cloudBox = makeDivClass(frame, "cloud-box");
    cloudBox.css.setMany(CLOUD_BOX_CSS);
    cloudBox.css.atProperty.register(AT_LAYER_FADE);
    cloudBox.css.atProperty.register(AT_LAYER_MAX);
    const wrapper = create_clouds(cloudBox /* not frame */, CLOUD_CONFIG).content.mustOnly();
    const clouds = wrapper.content.all();
    if (!clouds?.length) return relay.err("no clouds created");

    /* create sun */
    const sunCarrier = makeDivClass(hsonWord, "sun-carrier");
    const sun = makeDivClass(sunCarrier, "sun");
    /* create H-S-O-N letters */
    const createLetter = (ltr: LetterKey): readonly [LiveTree, LiveTree] => {
        const cell = makeSpanClass(hsonWord, ["cell", ltr])
        const l = makeSpanClass(cell, ["letter", ltr]).setText(ltr)
        return [l, cell];
    }
    const [h, hCell] = createLetter("H")
    const [s, sCell] = createLetter("S")
    const [o, oCell] = createLetter("O")
    const [n, nCell] = createLetter("N")
    const letters = [h, s, o, n];
    const cells = [hCell, sCell, oCell, nCell];


    /* create star */
    const starCarrier = makeDivClass(frame, "star-carrier");
    const starWrap = makeDivClass(starCarrier, "star-wrap");
    const starHead = makeDivClass(starWrap, "star-head");
    const tailA = makeDivClass(starWrap, ["star-tail", "a"]);
    const tailB = makeDivClass(starWrap, ["star-tail", "b"]);
    const tailC = makeDivClass(starWrap, ["star-tail", "c"]);

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
    
    hsonWord.css.setMany(WORD_CSS);
    letters.forEach(l => l.css.setMany(LETTER_CSS));
    ver.css.setMany(VER_CSS);
    ver6.css.setMany(VER6_CSS);

    /* style frame/sky/sun */
    sky.css.setMany(SKY_CSS);
    frame.css.setMany(FRAME_CSS_SPLASH);
    sunCarrier.css.setMany(SUN_CARRIER_CSS);
    sun.css.setMany(SUN_CSS);
    flare.css.setMany(FLARE_CSS);
    flareBox.css.setMany(FLARE_BOX_CSS);
    gradient.css.setMany(GRADIENT_CSS);


    /* style star */
    starCarrier.css.setMany(STAR_CARRIER_CSS);
    starWrap.css.setMany(STAR_WRAP_CSS);
    starHead.css.setMany(STAR_HEAD_CSS);
    tailA.css.setMany(STAR_TAIL_A_CSS);
    tailB.css.setMany(STAR_TAIL_B_CSS);
    tailC.css.setMany(STAR_TAIL_C_CSS);
    sky.css.keyframes.setMany(SPLASH_KEYS);
    frame.css.anim.begin(SKYanim);

    /* clouds keyframes */
    cloudBox.css.keyframes.set(kf_CLOUD_LOOP);
    cloudBox.css.keyframes.set(kf_CLOUD_SUN_KISS);
    cloudBox.css.keyframes.set(kf_LAYER_FADE);

    clouds.forEach((cl, i) => {
        // 1) per-layer fade runs on the parent layer
        cl.css.anim.begin(anim_CLOUD_LAYER_FADE(i));
        cl.css.setMany({
            willChange: "opacity, bottom",
        });
        // 2) scud runs on the paint child (mask-position animation)
        const paint = cl.content.mustOnly();
        // paint.css.anim.begin(anim_CLOUD_SUN_KISS);
        // paint.css.anim.begin(anim_CLOUD_LOOP(i));
    });

    await wait.timer(SUN_DELnum);
    sunCarrier.css.anim.begin(SUN_CARRIERanim);
    sun.css.anim.begin(SUN_DISKanim);
    gradient.css.anim.begin(GRADIENTanim);
    flare.css.anim.begin(FLAREanim);

    await wait.for(flare).anim(FLAREanim).end();
    flareBox.removeSelf();

    await wait.for(sun).anim(SUN_DISKanim).end()
    sunCarrier.removeSelf();
    letters.forEach(l => { l.css.anim.begin(NEON_FLASHanim) });

    await wait.for(h).anim(NEON_FLASHanim).end()
    ver.css.anim.begin(VERanim);
    begin_star(starCarrier, starHead, tailA, tailB, tailC);
    letters.forEach((l) => {
        l.css.setMany(LETTER_CSS_FINAL);
        l.css.anim.begin(STARSHINEanim);
    });

    await wait.for(tailC).anim(TAIL_C_ANIM).end();

    SPLASH_KEYS.forEach(kf => {
        sky.css.keyframes.delete(kf.name)
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
    tailA.css.anim.begin(TAIL_A_ANIM);
    tailB.css.anim.begin(TAIL_B_ANIM);
    tailC.css.anim.begin(TAIL_C_ANIM);
}
