// motes.ts

import { CssManager, type LiveTree } from "hson-live";
import { ANIM_RISE, ANIM_SPIN } from "./motes.anim";
import { KF_MOTE_DIE, KF_MOTE_RISE, KF_MOTE_SPIN } from "./motes.keys";

const COUNT_DEFAULT = 120;

const RISE_MIN_S = 33;
const RISE_MAX_S = 38;
const SPIN_MIN_S = 2.5;
const SPIN_MAX_S = 10;

const KILL_PAD_PX = 6;

let _mouseHooked = false;
let _motesCssBooted = false;

// ADDED: stable names
export const $MOTE_RISE = "mote-rise";
export const $MOTE_SPIN = "mote-spin";
export const $MOTE_DIE = "mote-die";

// ADDED: class names so globals CSS is predictable
const $CLS_MOTE = "mote";
const $CLS_SPIN = "mote-spin";
function _randomMinMax(min: number, max: number): number {
    return min + Math.random() * (max - min);
}

// CHANGED: register all motes infra once
function ensure_motes_css(tree: LiveTree): void {
    if (_motesCssBooted) return;
    _motesCssBooted = true;

    // typed custom properties (safe if unsupported; your try/catch is fine)
    try {
        tree.css.atProperty.registerMany([
            { name: "--x", syn: "<length>", inh: false, init: "0px" },
            { name: "--y0", syn: "<length>", inh: false, init: "0px" },
            { name: "--ty", syn: "<length>", inh: false, init: "0px" },
            { name: "--alpha", syn: "<number>", inh: false, init: "1" },
            { name: "--dead", syn: "<number>", inh: false, init: "0" },
        ]);
    } catch { }

    try {
        tree.css.keyframes.set(KF_MOTE_RISE);
        tree.css.keyframes.set(KF_MOTE_SPIN);
        tree.css.keyframes.set(KF_MOTE_DIE);
    } catch { }

    // ADDED: global structural CSS for motes (no per-element inline clutter)
    // NOTE: using css.globals so we don't need to pre-bake these into a stylesheet file.
    const cssgl = CssManager.globals.invoke()
    cssgl.class(`.${$CLS_MOTE}`)
        .setMany({
            position: "absolute",
            top: "0",
            left: "0",
            pointerEvents: "auto",
            willChange: "transform",
            transform: "translate3d(var(--x,0px), calc(var(--y0,0px) + var(--ty,0px)), 0)",
        });

    cssgl.sel(`.${$CLS_MOTE} > .${$CLS_SPIN}`)
        .setMany({
            display: "grid",
            placeItems: "center",
            width: "100%",
            height: "100%",
            lineHeight: "1",
            transformOrigin: "50% 50%",
            willChange: "transform, opacity, filter",
            opacity: "calc(var(--alpha,1) * (1 - var(--dead,0)))",
        });

}

export function begin_motes(tree: LiveTree, count = COUNT_DEFAULT): void {
    ensure_motes_css(tree);

    const overlay = tree.find.must.byId("motes-container");

    // CHANGED: listen on overlay for rise completion; rise is iterationCount: 1
   
    overlay.listen.onAnimationEnd((e: AnimationEvent) => {
        if (e.animationName !== $MOTE_RISE) return;
        const moteEl = (e.target as Element).closest?.(`.${$CLS_MOTE}`) as HTMLElement | null;
        if (!moteEl) return;
        respawn_mote_el(moteEl);
    });

    for (let i = 0; i < count; i++) {
        // CHANGED: class names now stable and match globals
        const mote = overlay.create.div().classlist.add($CLS_MOTE);
        const spin = mote.create.div().classlist.add($CLS_SPIN).setText("*");

        // CHANGED: only per-instance values are inline: size/color/vars/durations
        seed_mote(mote, spin);

        // CHANGED: animations are declared via anim manager
        mote.css.anim.begin(ANIM_RISE); // rises once; end triggers respawn
        spin.css.anim.begin(ANIM_SPIN); // spins forever
    }

    // Mouse kill: still fine to stay as your cheap elementFromPoint approach.
    if (!_mouseHooked) {
        tree.listen.onMouseMove((e) => {
            const el = document.elementFromPoint(e.clientX, e.clientY);
            if (!el) return;

            const moteEl = (el as Element).closest?.(`.${$CLS_MOTE}`) as HTMLElement | null;
            if (!moteEl) return;

            const r = moteEl.getBoundingClientRect();
            if (
                e.clientX >= r.left - KILL_PAD_PX &&
                e.clientX <= r.right + KILL_PAD_PX &&
                e.clientY >= r.top - KILL_PAD_PX &&
                e.clientY <= r.bottom + KILL_PAD_PX
            ) {
                kill_mote_el(moteEl);
            }
        });

        _mouseHooked = true;
    }
}

/* ------------------------- helpers ------------------------- */

function seed_mote(mote: LiveTree, spin: LiveTree): void {
    const W = window.innerWidth;
    const H = window.innerHeight;

    const size = _randomMinMax(0.8, 2.8);
    const hue = _randomMinMax(0, 360);

    const x = _randomMinMax(0, W);
    const y0 = _randomMinMax(0, H); // CHANGED: start on-screen

    const riseS = _randomMinMax(RISE_MIN_S, RISE_MAX_S);
    const spinS = _randomMinMax(SPIN_MIN_S, SPIN_MAX_S);

    mote.style.setMany({
        width: `${(size * 10).toFixed(2)}px`,
        height: `${(size * 10).toFixed(2)}px`,
        "--x": `${x.toFixed(3)}px`,
        "--y0": `${y0.toFixed(3)}px`,
        "--ty": "0px",
        "--dead": "0",
        // CHANGED: per-instance duration is just a style override
        "animation-duration": `${riseS.toFixed(3)}s`,
    });

    spin.style.setMany({
        "font-size": `${(size * 5).toFixed(2)}px`,
        color: `hsl(${hue.toFixed(1)} 70% 75%)`,
        "--alpha": `${_randomMinMax(0.55, 0.95).toFixed(3)}`,
        "border-radius": `${(size / 2).toFixed(3)}px`,
        "animation-duration": `${spinS.toFixed(3)}s`,
    });
}

function kill_mote_el(moteEl: HTMLElement): void {
    moteEl.style.setProperty("--dead", "1");
    moteEl.style.pointerEvents = "none";

    // CHANGED: to respawn soon, shorten *current* rise
    moteEl.style.animationDuration = "0.40s";

    const spin = moteEl.querySelector(`.${$CLS_SPIN}`) as HTMLElement | null;
    if (spin) {
        // IMPORTANT: don't "begin()" twice; use animation lists.
        // CHANGED: set die + spin together so die doesn't replace spin.
        const spinDur = spin.style.animationDuration || "4s";
        spin.style.animationName = `${$MOTE_DIE}, ${$MOTE_SPIN}`;
        spin.style.animationDuration = `0.35s, ${spinDur}`;
        spin.style.animationTimingFunction = "linear, linear";
        spin.style.animationIterationCount = "1, infinite";
        spin.style.animationFillMode = "forwards, both";
    }
}

function respawn_mote_el(moteEl: HTMLElement): void {
    moteEl.style.setProperty("--dead", "0");
    moteEl.style.pointerEvents = "auto";

    const spin = moteEl.querySelector(`.${$CLS_SPIN}`) as HTMLElement | null;
    if (spin) {
        // CHANGED: reset back to pure spin
        spin.style.animationName = $MOTE_SPIN;
        spin.style.animationTimingFunction = "linear";
        spin.style.animationIterationCount = "infinite";
        spin.style.animationFillMode = "both";
    }

    // reseed
    const W = window.innerWidth;
    const H = window.innerHeight;

    const size = 0.8 + Math.random() * 2.8;
    const hue = Math.random() * 360;

    const x = Math.random() * W;
    const y0 = H + 20 + Math.random() * 80; // spawn below

    const riseS = RISE_MIN_S + Math.random() * (RISE_MAX_S - RISE_MIN_S);
    const spinS = SPIN_MIN_S + Math.random() * (SPIN_MAX_S - SPIN_MIN_S);

    moteEl.style.width = `${(size * 10).toFixed(2)}px`;
    moteEl.style.height = `${(size * 10).toFixed(2)}px`;
    moteEl.style.setProperty("--x", `${x.toFixed(3)}px`);
    moteEl.style.setProperty("--y0", `${y0.toFixed(3)}px`);
    moteEl.style.setProperty("--ty", "0px");
    moteEl.style.animationDuration = `${riseS.toFixed(3)}s`;

    if (spin) {
        spin.style.fontSize = `${(size * 5).toFixed(2)}px`;
        spin.style.color = `hsl(${hue.toFixed(1)} 70% 75%)`;
        spin.style.setProperty("--alpha", `${(0.55 + Math.random() * 0.4).toFixed(3)}`);
        spin.style.borderRadius = `${(size / 2).toFixed(3)}px`;
        spin.style.animationDuration = `${spinS.toFixed(3)}s`;
    }

    // CHANGED: restart rise robustly (same trick, but now it matters because rise is 1x)
    moteEl.style.animationName = "none";
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    moteEl.offsetHeight;
    moteEl.style.animationName = $MOTE_RISE;
}