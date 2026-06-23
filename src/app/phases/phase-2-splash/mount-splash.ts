// mount-splash.ts

import { CssManager, type LiveTree } from "hson-live";
import { O_ROT, VER_CSS, VER6_CSS } from "../../ui/wordmark/wordmark.css";
import { CLOUD_LAYER_FADEanim } from "./splash.anim";
import { CLOUD_CONFIG, SUN_DELnum } from "./splash.consts";
import { SPLASHkfs } from "./splash.keys";
import { FLAREanim, NEON_FLASHanim, STAR_CARRIER_ANIM, STAR_HEAD_ANIM, STARSHINEanim, SUN_DISKanim, TAIL_A_ANIM as STAR_TAIL_A_ANIM, TAIL_B_ANIM as STAR_TAIL_B_ANIM, TAIL_C_ANIM as STAR_TAIL_C_ANIM, VERanim } from "./splash.anim";
import { get_letter_key } from "../../utils/helpers";
import type { LetterCaps, LetterKey } from "../../core/types/core.types";
import { CELL_CSS, LETTER_CSS, LETTER_CSS_FINAL } from "../../ui/wordmark/wordmark.css";
import { mk_span_cls } from "../../utils/makers";
import { wait } from "../../utils/wait";
import { relay, type Outcome, type OutcomeAsync } from "intrastructure";
import { create_clouds } from "../../widgets/clouds/make-cloud";
import { bud_node } from "../../widgets/buds-deprecate/bud-config";
import { SPLASH_BUDS } from "./splash.buds";
import { _colors } from "../../core/consts/colors.consts";




/**
 * this is all very messy but it works; organize/structure calls better TODO
 */
export async function mount_splash(stage: LiveTree): OutcomeAsync<LiveTree> {
    /* clear livetree contents */
    stage.empty();
    const b = bud_node(stage)
    /* create structural layers */
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
    const clouds = create_clouds(cloudBox.tree, CLOUD_CONFIG).content.all();
    if (!clouds?.length) return relay.err("no clouds created");
    
    /* create H-S-O-N letters */
    const createLetter = (ltr: LetterCaps): readonly [LiveTree, LiveTree] => {
        const cell = mk_span_cls(wordMark.tree, ["cell", ltr])
        const l = mk_span_cls(cell, ["letter", ltr]).text.set(ltr)
        return [l, cell];
    }
    const [h, hCell] = createLetter("H")
    const [s, sCell] = createLetter("S")
    const [o, oCell] = createLetter("O")
    const [n, nCell] = createLetter("N")
    const letters = [h, s, o, n];
    const cells = [hCell, sCell, oCell, nCell];
    /* create semver pop-up */
    const ver = mk_span_cls(nCell, ["ver"]);
    mk_span_cls(ver, "ver-a").text.set("2.0.2");
    const ver6 = mk_span_cls(ver, "ver-6").text.set("6");

    /* style letters */
    cells.forEach(c => c.css.setMany(CELL_CSS));
    letters.forEach(l => {
        const k = get_letter_key(l);
        if (!k) return;
        const col = _colors.hson[k]
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
        cl.css.anim.begin(CLOUD_LAYER_FADEanim(i));
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

    SPLASHkfs.forEach(kf => {
        sky.tree.css.keyframes.delete(kf.name)
    });
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
    tailA.css.anim.begin(STAR_TAIL_A_ANIM);
    tailB.css.anim.begin(STAR_TAIL_B_ANIM);
    tailC.css.anim.begin(STAR_TAIL_C_ANIM);
}
