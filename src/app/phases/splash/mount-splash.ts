// mount-splash.ts

import type { LiveTree } from "hson-live";
import { LETTER_CSS, LETTER_COLOR, O_ROT, SUN_CSS, VER_CSS, WORD_CSS, FRAME_CSS, SKY_CSS, CELL_CSS, HSON_LETTERS, VER6_CSS, SUN_CARRIER_CSS, STAR_CARRIER_CSS, STAR_HEAD_CSS, STAR_TAIL_A_CSS, STAR_TAIL_B_CSS, STAR_TAIL_C_CSS, STAR_WRAP_CSS, skyTimeString, LETTER_CSS_FINAL, FLARE_CSS, FLARE_BOX_CSS } from "./types-consts/css.consts";
import { FLARE_ANIM, NEON_FLASH, SKY_ANIM, SPLASH_KEYS, STAR_CARRIER_ANIM, STAR_HEAD_ANIM, STARSHINE_ANIM, SUN_CARRIER_ANIM, SUN_DISK_ANIM, TAIL_A_ANIM, TAIL_B_ANIM, TAIL_C_ANIM, VER_ANIM } from "./types-consts/keys-anim";
import { get_letter_key } from "../../../utils/helpers";
import type { LetterKey } from "../../../types/core.types";

export function mount_splash(stage: LiveTree): boolean {
    const makeDiv = (lt: LiveTree, cls: string | string[]) => lt.create.div().classlist.set(cls);
    /* clear livetree contents */
    stage.empty();

    /* create container layers */
    const sky = stage.create.section().id.set("splash").classlist.set(["splash"]);

    const frame = makeDiv(sky, 'splash-frame');
    const flareBox = makeDiv(frame, 'flare-box');
    const flare = makeDiv(flareBox, 'lens-flare');
    const word = makeDiv(frame, "wordmark");

    /* create sun */
    const sunCarrier = makeDiv(word, "sun-carrier");
    const sun = makeDiv(sunCarrier, "sun");

    /* create H-S-O-N letters */
    const createLetter = (ltr: LetterKey): readonly [LiveTree, LiveTree] => {
        const cell = word.create.span().classlist.set(["cell", ltr])
        const l = cell.create.span().classlist.set(["letter", ltr]).setText(ltr)
        return [l, cell];
    }
    const [h, hCell] = createLetter("H")
    const [s, sCell] = createLetter("S")
    const [o, oCell] = createLetter("O")
    const [n, nCell] = createLetter("N")
    const letters = [h, s, o, n];
    const cells = [hCell, sCell, oCell, nCell];


    /* create star */
    const starCarrier = makeDiv(frame, "star-carrier");
    const starWrap = makeDiv(starCarrier, "star-wrap");
    const starHead = makeDiv(starWrap, "star-head");
    const tailA = makeDiv(starWrap, ["star-tail", "a"]);
    const tailB = makeDiv(starWrap, ["star-tail", "b"]);
    const tailC = makeDiv(starWrap, ["star-tail", "c"]);

    /* create semver pop-up */
    const ver = nCell.create.span().classlist.set(["ver"]);
    ver.create.span().classlist.set(["ver-a"]).setText("2.0.2");
    const ver6 = ver.create.span().classlist.set(["ver-6"]).setText("6");

    /* style letters */
    cells.forEach(c => c.css.setMany(CELL_CSS));
    letters.forEach(l => {
        const k = get_letter_key(l);
        if (!k) return;
        const col = LETTER_COLOR[k]
        l.css.set.var("--glow", col);
        l.css.set.var("--final", col);
        l.css.set.var("--starshine", col);

    });
    h.css.set.transform("translateX(13px)");  // tiny nudges
    s.css.set.transform("translateX(6px)");
    o.css.setMany(O_ROT); // rotate 'O'
    
    /* style frame/sky/sun */
    sky.css.setMany(SKY_CSS);
    frame.css.setMany(FRAME_CSS);
    sunCarrier.css.setMany(SUN_CARRIER_CSS);
    sun.css.setMany(SUN_CSS);
    sky.css.keyframes.setMany(SPLASH_KEYS);
    flare.css.setMany(FLARE_CSS);
    flareBox.css.setMany(FLARE_BOX_CSS);
    
    
    /* style letters */
    word.css.setMany(WORD_CSS);
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

    /* begin animation */
    frame.css.anim.begin(SKY_ANIM);
    sunCarrier.css.anim.begin(SUN_CARRIER_ANIM);
    sun.css.anim.begin(SUN_DISK_ANIM);
    sun.listen.once().onAnimationStart((an: AnimationEvent) => {
        if (an.animationName !== "hson_sun_disk") return;
        flare.css.anim.begin(FLARE_ANIM);
    });
    /* animation sequencing avoids recalculating hard-coded duration/delay consts */
    sun.listen.once().onAnimationEnd((ev) => {
        if (ev.animationName !== "hson_sun_disk") return;
        letters.forEach((l) => {
            l.css.anim.begin(NEON_FLASH);
        });
        letters[0]!
            .listen.once()
            .onAnimationEnd((ev) => {
                if (ev.animationName !== "hson_letters") return;
                letters.forEach((l) => l.css.setMany(LETTER_CSS_FINAL));

                ver.css.anim.begin(VER_ANIM);
            });
        s.listen.once().onAnimationEnd((ev) => {
            console.log(ev.animationName);
            if (ev.animationName !== "hson_letters") return;
            begin_star(starCarrier, starHead, tailA, tailB, tailC);
            letters.forEach(l => {
                l.css.anim.begin(STARSHINE_ANIM)
            })
        });
    });


    return true;
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
