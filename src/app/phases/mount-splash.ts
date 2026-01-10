// mount-splash.ts

import type { LiveTree } from "hson-live";
import { LETTER_CSS, LETTER_COLOR, O_ROT, SUN_CSS, VER_CSS, WORD_CSS, FRAME_CSS, SKY_CSS, CELL_CSS, HSON_LETTERS, VER6_CSS, SUN_CARRIER_CSS, STAR_CARRIER_CSS, STAR_HEAD_CSS, STAR_TAIL_A_CSS, STAR_TAIL_B_CSS, STAR_TAIL_C_CSS, STAR_WRAP_CSS, skyTimeString } from "./splash/consts/css.consts";
import { SPLASH_KEYS } from "./splash/consts/keyframes";
import { get_letter_key } from "../../utils/helpers";
import type { LetterKey } from "../../types/core.types";

export function mount_splash(stage: LiveTree): boolean {
    stage.empty();
    const splash = stage.create.section().id.set("splash").classlist.set(["splash"]);
    const makeDiv = (lt: LiveTree, cls: string | string[]) => lt.create.div().classlist.set(cls);

    const frame = makeDiv(splash, 'splash-frame');
    const starCarrier = makeDiv(frame, "star-carrier");
    const starWrap = makeDiv(starCarrier, "star-wrap");
    const starHead = makeDiv(starWrap, "star-head");
    const tailA = makeDiv(starWrap, ["star-tail", "a"]);
    const tailB = makeDiv(starWrap, ["star-tail", "b"]);
    const tailC = makeDiv(starWrap, ["star-tail", "c"]);

    starCarrier.css.setMany(STAR_CARRIER_CSS);
    starWrap.css.setMany(STAR_WRAP_CSS);
    starHead.css.setMany(STAR_HEAD_CSS);
    tailA.css.setMany(STAR_TAIL_A_CSS);
    tailB.css.setMany(STAR_TAIL_B_CSS);
    tailC.css.setMany(STAR_TAIL_C_CSS);

    const word = makeDiv(frame, ["wordmark"]);

    const sunCarrier = makeDiv(word, ["sun-carrier"]);
    const sun = makeDiv(sunCarrier, ["sun"]);

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
    cells.forEach(c => c.css.setMany(CELL_CSS));
    letters.forEach(l => {
        const k = get_letter_key(l);
        if (!k) return;
        l.css.set.var("--glow", LETTER_COLOR[k]);
        l.css.set.var("--final", LETTER_COLOR[k]);
        l.css.set.var("--starshine", LETTER_COLOR[k]); // reuse same color for glow

    });

    h.css.set.transform("translateX(13px)");
    s.css.set.transform("translateX(6px)");
    o.css.setMany(O_ROT);

    const ver = n.create.span().classlist.set(["ver"]);
    ver.create.span().classlist.set(["ver-a"]).setText("2.0.2");
    const ver6 = ver.create.span().classlist.set(["ver-6"]).setText("6");

    ver6.css.setMany(VER6_CSS);
    splash.css.setMany(SKY_CSS);
    frame.css.setMany(FRAME_CSS);
    word.css.setMany(WORD_CSS);
    sunCarrier.css.setMany(SUN_CARRIER_CSS);
    sun.css.setMany(SUN_CSS);
    letters.forEach(l => l.css.setMany(LETTER_CSS));

    // Version stamp: hidden until the end
    ver.css.setMany(VER_CSS);
    splash.css.keyframes.setMany(SPLASH_KEYS);
    ver.css.anim.begin({
        name: "hson_ver",
        delay: "10000ms",
        duration: "700ms",
        timingFunction: "ease-out",
    });
    frame.css.anim.begin({
        name: "hson_sky",
        duration: skyTimeString,
        timingFunction: "ease-in-out",
        fillMode: "forwards",
    });

    sunCarrier.css.anim.begin({
        name: "hson_sun_path",
        duration: skyTimeString,
        timingFunction: "linear",
        fillMode: "forwards",
    });

    sun.css.anim.begin({
        name: "hson_sun_disk",
        duration: skyTimeString,
        timingFunction: "ease-in-out",
        fillMode: "forwards",
    });
    sun.listen.once().onAnimationEnd((ev) => {
        if (ev.animationName !== "hson_sun_disk") return;
        letters.forEach((l) => {
            l.css.anim.begin({
                name: "hson_letters",
                duration: "1200ms",
                timingFunction: "ease-in-out",
                fillMode: "forwards",
            });
        });
        h.listen.once().onAnimationEnd((ev) => {
            console.log(ev.animationName);
            if (ev.animationName !== "hson_letters") return;
            begin_star(starCarrier, starHead, tailA, tailB, tailC);
        });
        if (letters[3]) { // might be undefined ??
            letters[3]
                .listen.once()
                .onAnimationEnd((ev) => {
                    if (ev.animationName !== "hson_letters") return;

                    ver.css.anim.begin({
                        name: "hson_ver",
                        duration: "700ms",
                        delay: "1000ms",
                        timingFunction: "ease-out",
                        fillMode: "forwards",
                    });
                });
        }
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
    // reset to known “pose” (helps if we re-run)
    carrier.css.set.offsetDistance("0%");
    head.css.set.opacity("0");
    tailA.css.set.opacity("0");
    tailB.css.set.opacity("0");
    tailC.css.set.opacity("0");

    // 1) movement: single source of truth for where the star is
    carrier.css.anim.begin({
        name: "hson_star_move",
        duration: "1400ms",
        timingFunction: "linear",
        fillMode: "forwards",
    });

    // 2) head visibility only (no transforms here)
    head.css.anim.begin({
        name: "hson_star_head",
        duration: "1400ms",
        timingFunction: "linear",
        fillMode: "forwards",
    });

    // 3) tails: same duration so they stay “attached” to the moving anchor,
    // but their own keyframes can fade/stretch/linger differently.
    tailA.css.anim.begin({
        name: "hson_star_tail_a",
        duration: "1400ms",
        timingFunction: "ease-out",
        fillMode: "forwards",
    });

    tailB.css.anim.begin({
        name: "hson_star_tail_b",
        duration: "1400ms",
        timingFunction: "ease-out",
        fillMode: "forwards",
    });

    tailC.css.anim.begin({
        name: "hson_star_tail_c",
        duration: "1400ms",
        timingFunction: "ease-out",
        fillMode: "forwards",
    });
}
