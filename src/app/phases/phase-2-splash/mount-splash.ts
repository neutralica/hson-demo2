// mount-splash.ts

import { CssManager, type LiveTree } from "hson-live/livetree";
import { O_ROT, VER_CSS, VER6_CSS } from "../../ui/wordmark/wordmark.css";
import { CLOUD_LAYER_FADEanim, FLAREHEXanim } from "./splash.anim";
import { CLOUD_CONFIG, SUN_DELnum } from "./splash.consts";
import { LENS_HEX_RAILkf, SPLASHkfs } from "./splash.keys";
import { FLAREanim, NEON_FLASHanim, STAR_CARRIER_ANIM, STAR_HEAD_ANIM, STARSHINEanim, SUN_DISKanim, TAIL_A_ANIM as STAR_TAIL_A_ANIM, TAIL_B_ANIM as STAR_TAIL_B_ANIM, TAIL_C_ANIM as STAR_TAIL_C_ANIM, VERanim } from "./splash.anim";
import { _rng_xs32, get_letter_key } from "../../utils/helpers";
import type { LetterCaps, LetterKey } from "../../core/types/core.types";
import { CELL_CSS, LETTER_CSS, LETTER_CSS_FINAL } from "../../ui/wordmark/wordmark.css";
import { mk_span_cls } from "../../utils/makers";
import { wait } from "../../utils/wait";
import { create_clouds } from "./make-cloud";
import { bud_node } from "../../widgets/buds-deprecate/bud-config";
import { SPLASH_BUDS } from "./splash.buds";
import { _colors } from "../../core/consts/colors.consts";
import { mount_firework } from "../../widgets/wasm-fireworks/wasm-fireworks";
import { make_rng } from "../../utils/rng";
import type { SplashRunContext } from "./splash-lifecycle";




/**
 * this is all very messy but it works; organize/structure calls better TODO
 */
export async function mount_splash(
    stage: LiveTree,
    lifecycle: SplashRunContext,
): Promise<LiveTree> {
    lifecycle.throwIfCancelled();
    lifecycle.onCleanup(() => {
        stage.empty();
    });
    /* clear livetree contents */
    stage.empty();

    const b = bud_node(stage, lifecycle.queue)
    /* create structural layers */
    const sky = b.bud(SPLASH_BUDS.sky);
    const logoBox = sky.bud(SPLASH_BUDS.logoBox);
    const frame = logoBox.bud(SPLASH_BUDS.frame);
    const wordMark = frame.bud(SPLASH_BUDS.wordmark);
    const cloudBox = frame.bud(SPLASH_BUDS.cloudBox);



    /* create sun elements */
    const sunCarrier = wordMark.bud(SPLASH_BUDS.sunCarrier);
    const sun = sunCarrier.bud(SPLASH_BUDS.sun);
    /* create lighting effects */
    const flareBox = sunCarrier.bud(SPLASH_BUDS.flareBox);
    const flare = flareBox.bud(SPLASH_BUDS.flare);

    const hexRail = mk_span_cls(sunCarrier.tree, "lens-hex-rail");

    const HEX_FLARES = [
        { size: 18, startX: 3, endX: -58, opacity: 0.16 },
        { size: 28, startX: 23, endX: -22, opacity: 0.24 },
        { size: 44, startX: 44, endX: 14, opacity: 0.15 },
        { size: 26, startX: 65, endX: 48, opacity: 0.21 },
        { size: 15, startX: 84, endX: 84, opacity: 0.13 },
    ] as const;

    const hexFlares: LiveTree[] = [];
    hexRail.css.setMany({
        position: "absolute",
        inset: "0",
        pointerEvents: "none",
        transformOrigin: "84% 50%",
    });

    hexRail.css.keyframes.set(LENS_HEX_RAILkf);

    HEX_FLARES.forEach(({ size, startX, endX, opacity }, index) => {
        const hex = mk_span_cls(hexRail, [
            "lens-hex",
            `lens-hex-${index + 1}`,
        ]);

        const spacingAnimationName = `hson_lens_hex_spacing_${index + 1}`;

        hex.css.setMany({
            position: "absolute",
            left: `${startX}%`,
            top: "50%",
            width: `${size}px`,
            height: `${size}px`,
            opacity:    "0",
            transform: "translate(-50%, -50%) rotate(30deg)",
            clipPath:
                "polygon(25% 6.7%, 75% 6.7%, 100% 50%, 75% 93.3%, 25% 93.3%, 0 50%)",
            background: "rgba(210, 235, 255, 0.42)",
            boxShadow: "0 0 10px rgba(190, 225, 255, 0.16)",
            filter: "blur(0.25px)",
        });

        const spacingDistance = endX - startX;

        hex.css.keyframes.set({
            name: spacingAnimationName,
            steps: {
                "0%": {
                    opacity:    "0",
                    left: `${endX}%`,
                },
                "1%": {
                    opacity:    "0.01",
                    left: `${endX}%`,
                },
                "38%": {
                        opacity:    String(opacity),
                    left: `${startX + spacingDistance * 0.36}%`,
                },
                "58%": {
                        opacity:    String(opacity),
                    left: `${startX + spacingDistance * 0.58}%`,
                },
                "76%": {
                        opacity:    String(opacity),
                    left: `${startX + spacingDistance * 0.76}%`,
                },
                "90%": {
                        opacity:    String(opacity),
                    left: `${startX + spacingDistance * 0.90}%`,
                },
                "99%": {
                    opacity:    "0.01",
                    left: `${startX + spacingDistance * 0.90}%`,
                },
                "100%": { 
                    opacity:    "0",
                    left: `${startX + spacingDistance}%`,
                },
            },
        });

        hexFlares.push(hex);
    });

    const gradient = frame.bud(SPLASH_BUDS.gradient);

    /* create star elements */
    const starCarrier = frame.bud(SPLASH_BUDS.starCarrier);
    const starWrap = starCarrier.bud(SPLASH_BUDS.starWrap);
    const starHead = starWrap.bud(SPLASH_BUDS.starHead);
    const tailA = starWrap.bud(SPLASH_BUDS.starTailA);
    const tailB = starWrap.bud(SPLASH_BUDS.starTailB);
    const tailC = starWrap.bud(SPLASH_BUDS.starTailC);
    lifecycle.throwIfCancelled();
    const sparkleHost = stage.create.div();
    const sparkles = await mount_firework(sparkleHost, lifecycle.signal);
    lifecycle.onCleanup(sparkles.teardown);
    lifecycle.throwIfCancelled();
    /* create clouds */
    const clouds = create_clouds(cloudBox.tree, CLOUD_CONFIG).content.all();
    if (!clouds?.length) throw new Error("no clouds created");

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

    lifecycle.throwIfCancelled();
    frame.animate()

    clouds.array().forEach((cl, i) => {
        cl.css.anim.begin(CLOUD_LAYER_FADEanim(i));
    });

    await lifecycle.wait(SUN_DELnum);
    lifecycle.throwIfCancelled();
    sunCarrier.animate();
    sun.animate();
    gradient.animate()
    flare.animate();
    hexRail.css.anim.begin(FLAREHEXanim);
    hexFlares.forEach((hex, index) => {
        hex.css.anim.begin({
            ...FLAREHEXanim,
            name: `hson_lens_hex_spacing_${index + 1}`,
            timingFunction: "linear",
            fillMode: "forwards"
        });
    });
    await wait.for(flareBox.tree).anim(FLAREanim).end({ signal: lifecycle.signal });
    lifecycle.throwIfCancelled();
    flareBox.tree.remove();
    hexRail.remove();

    await wait.for(sun.tree).anim(SUN_DISKanim).end({ signal: lifecycle.signal })
    lifecycle.throwIfCancelled();
    sunCarrier.tree.remove();
    letters.forEach(l => { l.css.anim.begin(NEON_FLASHanim) });

    await wait.for(h).anim(NEON_FLASHanim).end({ signal: lifecycle.signal })
    lifecycle.throwIfCancelled();
    begin_star(starCarrier.tree, starHead.tree, tailA.tree, tailB.tree, tailC.tree);
    ver.css.anim.begin(VERanim);
    for (let i = 0; i < 15; i++) {
        const rng = Math.random() * 2000;
        lifecycle.schedule(() => {
            sparkles.fire(2)
        }, rng);
    }
    lifecycle.throwIfCancelled();
    letters.forEach((l) => {
        l.css.setMany(LETTER_CSS_FINAL);
        l.css.anim.begin(STARSHINEanim);
    });

    await wait.for(tailC.tree).anim(STAR_TAIL_C_ANIM).end({ signal: lifecycle.signal });
    lifecycle.throwIfCancelled();
    return stage;
}


export function begin_star(
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
