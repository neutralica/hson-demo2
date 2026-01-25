// mount-splash.ts

import { type LiveTree } from "hson-live";
import { SUN_CSS, FRAME_CSS_SPLASH, SKY_CSS, SUN_CARRIER_CSS, STAR_CARRIER_CSS, STAR_HEAD_CSS, STAR_TAIL_A_CSS, STAR_TAIL_B_CSS, STAR_TAIL_C_CSS, STAR_WRAP_CSS, FLARE_CSS, FLARE_BOX_CSS, GRADIENT_CSS, CLOUD_BOX_CSS } from "./splash.css";
import { O_ROT, VER_CSS, WORD_CSS, VER6_CSS } from "../../wordmark/wordmark.css";
import { LETTER_COLOR_std } from "../../consts/colors.consts";
import { KF_CLOUD_BAND_LOOP_WEBKIT, KF_CLOUD_BOX_FADE, KF_LAYER_FADE } from "./splash.keys";
import { CLOUD_BAND_ANIM, CLOUD_FADE_ANIM, GRADIENT_ANIM } from "./splash.anim";
import { CLOUD_TILE_W, cloudTimeNum, cloudtimeStr, sunDelay } from "./splash.consts";
import { SPLASH_KEYS } from "./splash.keys";
import { FLARE_ANIM, NEON_FLASH, SKY_ANIM, STAR_CARRIER_ANIM, STAR_HEAD_ANIM, STARSHINE_ANIM, SUN_CARRIER_ANIM, SUN_DISK_ANIM, TAIL_A_ANIM, TAIL_B_ANIM, TAIL_C_ANIM, VER_ANIM } from "./splash.anim";
import { get_letter_key } from "../../../utils/helpers";
import type { LetterKey } from "../../../types/core.types";
import { CELL_CSS, LETTER_CSS, LETTER_CSS_FINAL } from "../../wordmark/wordmark.css";
import { makeDivClass, makeSection, makeSpanClass } from "../../../utils/makers";
import { wait } from "../../../utils/wait";
import { relay, type Outcome, type OutcomeAsync } from "intrastructure";
import { create_cloud_river } from "../../widgets/clouds/make-cloud";

const CLOUD_CONFIG = {
    layers: 20,
    seed: 1211,
    w: CLOUD_TILE_W,
    circlesMin: 20,
    circlesMax: 40,

}

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
    cloudBox.css.atProperty.register({
        name: "--layer-fade",
        syn: "<number>",
        inh: true,
        init: "1",
    });

    cloudBox.css.atProperty.register({
        name: "--layer-max",
        syn: "<number>",
        inh: true,
        init: "0.1",
    });
    cloudBox.css.keyframes.set(KF_LAYER_FADE);

    const cloudRiver = create_cloud_river(cloudBox /* not frame */, CLOUD_CONFIG);
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

    /* style frame/sky/sun */
    sky.css.setMany(SKY_CSS);
    frame.css.setMany(FRAME_CSS_SPLASH);
    sunCarrier.css.setMany(SUN_CARRIER_CSS);
    sun.css.setMany(SUN_CSS);
    flare.css.setMany(FLARE_CSS);
    flareBox.css.setMany(FLARE_BOX_CSS);
    gradient.css.setMany(GRADIENT_CSS);

    /* style letters */
    hsonWord.css.setMany(WORD_CSS);
    letters.forEach(l => l.css.setMany(LETTER_CSS));
    ver.css.setMany(VER_CSS);
    ver6.css.setMany(VER6_CSS);

    /* style star */
    starCarrier.css.setMany(STAR_CARRIER_CSS);
    starWrap.css.setMany(STAR_WRAP_CSS);
    starHead.css.setMany(STAR_HEAD_CSS);
    tailA.css.setMany(STAR_TAIL_A_CSS);
    tailB.css.setMany(STAR_TAIL_B_CSS);
    tailC.css.setMany(STAR_TAIL_C_CSS);
    sky.css.keyframes.setMany(SPLASH_KEYS);
    frame.css.anim.begin(SKY_ANIM);

    cloudBox.css.keyframes.set(KF_CLOUD_BAND_LOOP_WEBKIT);
    cloudBox.css.keyframes.set(KF_CLOUD_BOX_FADE);

    // Optional global fade for the whole system (slower than layers)
    cloudBox.css.anim.begin({
        name: "cloud-box-fade",
        duration: `${cloudTimeNum}ms`, // CHANGED: slower global fade
        timingFunction: "linear",
        iterationCount: "1",
        fillMode: "forwards",
        delay: "0s",
    });

    const clouds = cloudRiver.content.mustOnly()?.content.all();
    if (!clouds?.length) return relay.err("no length in clouds");

    // Per-layer fade keyframe generator (bakes opacity numerically)
    const ensure_layer_fade_kf = (i: number, maxOpacity: number): string => {
        const kfName = `cloud_fade_layer_${i}`;

        cloudBox.css.keyframes.set({
            name: kfName,
            steps: {
                // CHANGED: fade in quickly, hold, then fade out + drop near end
                "0%": { opacity: "1", bottom: "0px" },
                "10%": { opacity: String(maxOpacity), bottom: "0px" },
                "80%": { opacity: String(maxOpacity), bottom: "-80px" },
                "100%": { opacity: "0", bottom: "-100px" },
            },
        } as const);

        return kfName;
    };

    clouds.forEach((cl, i) => {
        // 1) scud runs on the paint child (mask-position animation)
        const paint = cl.content.mustOnly(); // CHANGED: scud target is child
        paint.css.anim.begin(CLOUD_BAND_ANIM(i));

        // 2) per-layer fade runs once on the parent layer
        const maxStr = cl.data.get("cloud-max") ?? "0.12"; // CHANGED: hyphen key
        const max = Number(maxStr);

        const kfName = ensure_layer_fade_kf(i, max);

        cl.css.anim.begin({
            name: kfName,
            duration: cloudtimeStr,                 // e.g. "6000ms"
            timingFunction: "linear",
            iterationCount: "1",
            fillMode: "forwards",
            // CHANGED: top clears first (small stagger, not a big “pause”)
            // delay: `${(i * 0.14).toFixed(2)}s`,
        });
        cl.css.anim.begin({
            name: "cloud-layer-fade",
            duration: cloudtimeStr,
            timingFunction: "linear",
            iterationCount: "1",
            fillMode: "forwards",
            delay: `${(i * 320).toFixed(0)}ms`, // tune: 60–180ms per layer
        });
        cl.css.setMany({
            willChange: "opacity, bottom",
        });
    });

    await wait.timer(sunDelay);
    sunCarrier.css.anim.begin(SUN_CARRIER_ANIM);
    sun.css.anim.begin(SUN_DISK_ANIM);
    gradient.css.anim.begin(GRADIENT_ANIM);
    flare.css.anim.begin(FLARE_ANIM);

    console.log(cloudtimeStr)
    await wait.for(flare).anim(FLARE_ANIM).end();
    flareBox.removeSelf();

    await wait.for(sun).anim(SUN_DISK_ANIM).end()
    sunCarrier.removeSelf();
    letters.forEach(l => { l.css.anim.begin(NEON_FLASH) });

    await wait.for(h).anim(NEON_FLASH).end()
    ver.css.anim.begin(VER_ANIM);
    begin_star(starCarrier, starHead, tailA, tailB, tailC);
    letters.forEach((l) => {
        l.css.setMany(LETTER_CSS_FINAL);
        l.css.anim.begin(STARSHINE_ANIM);
    });

    await wait.for(tailC).anim(TAIL_C_ANIM).end();

    SPLASH_KEYS.forEach(kf => {
        sky.css.keyframes.delete(kf.name)
    })

    /* unnecessary: remove? */
    starCarrier.removeSelf();
    sunCarrier.removeSelf();
    flareBox.removeSelf();
    gradient.removeSelf();
    sky.removeSelf();
    stage.empty();
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
