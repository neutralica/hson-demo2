
// ---- types ----

import { LiveTree } from "hson-live";

export type MousePanelRig = Readonly<{
    root: LiveTree;
    stage: LiveTree;
    pointer: LiveTree;
    readout: {
        xy: LiveTree;
        angle: LiveTree;
        rows: ReadonlyArray<{
            ix: LiveTree;        // index
            tag: LiveTree;       // tag#id.class
            // quid: LiveTree;      // data-_quid
        }>;
    };
    dispose: () => void;
}>;

type DerivKey =
    | "pos"
    | "vel"
    | "acc"
    | "jerk"
    | "snap"
    | "crackle"
    | "pop";

type Vec = { x: number; y: number };
type Chain = Record<DerivKey, Vec>;

export const DERIV_LABELS: ReadonlyArray<[DerivKey, string]> = [
    ["pos", "pos"],
    ["vel", "vel"],
    ["acc", "acc"],
    ["jerk", "jerk"],
    ["snap", "snap"],
    ["crackle", "crackle"],
    ["pop", "pop"],
] as const;

// ---- tiny math ----

const mag = (v: Vec): number => Math.hypot(v.x, v.y);

const fmt = (n: number, d = 2): string => {
    if (!Number.isFinite(n)) return "—";

    // ADDED: normalize -0 to +0 (after rounding decision)
    const p = Math.pow(10, d);
    const rounded = Math.round(n * p) / p;
    const clean = Object.is(rounded, -0) ? 0 : rounded;

    return clean.toFixed(d);
};
const fmt_int = (n: number): string => String(Math.round(n));

const fmt_box = (r: DOMRect): string =>
    `${fmt_int(r.left)},${fmt_int(r.top)}  ${fmt_int(r.width)}×${fmt_int(r.height)}`;

const fmt_zn = (s: string): string => (s === "auto" ? "auto" : s);

const get_quid = (el: Element): string =>
    (el instanceof HTMLElement ? (el.dataset?._quid ?? "") : "");

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

// Small EMA smoothing. t near 1 = heavy smoothing, near 0 = raw.
const smoothVec = (prev: Vec, next: Vec, t: number): Vec => ({
    x: lerp(next.x, prev.x, t),
    y: lerp(next.y, prev.y, t),
});

// ---- init (behavior) ----
export function mouse_init(rig: MousePanelRig): void {
    let raf = 0;
    let mounted = true;

    let lastPos: { x: number; y: number } = { x: 0, y: 0 };
    let dirty = true;

    // If your widget should not interfere with hit testing:
    // make sure its root/panel has pointerEvents: "none"
    // OR at least the overlay portions do.
    // (Otherwise elementsFromPoint will just return your widget.)
    rig.root.css.setMany({ pointerEvents: "none" });

    const onMove = (ev: PointerEvent): void => {
        lastPos = { x: ev.clientX, y: ev.clientY };
        dirty = true;
    };
    // ADDED: stable center for pointer math
    const getStageCenter = (): { x: number; y: number } => {
        const el = rig.stage.asDomElement();
        if (!el) return { x: 0, y: 0 };
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    };

    // ADDED: radians -> degrees
    const rad_to_deg = (rad: number): number => (rad * 180) / Math.PI;
    window.addEventListener("pointermove", onMove, { passive: true });

    const MAX = rig.readout.rows.length;

    const render_stack = (): void => {
        const { x, y } = lastPos;
        // coords line (keep your existing xy/angle fields if you like)
        rig.readout.xy.text.set(`x: ${fmt_int(x)}   y: ${fmt_int(y)}`);
        // ADDED: pointer swivel (stage center -> mouse)
        const c = getStageCenter();
        const dx = x - c.x;
        const dy = y - c.y;
        const theta = Math.atan2(dy, dx);
        const deg = rad_to_deg(theta);

        // restore angle readout as angle (not bbox)
        rig.readout.angle.text.set(`θ: ${deg.toFixed(1)}°`);

        // ADDED: rotate pointer
        rig.pointer.css.setMany({
            transform: `translate(0, -50%) rotate(${deg}deg)`,
        });
        const els = document.elementsFromPoint(x, y);

        // OPTIONAL: constrain to your demo root so you don’t list the entire app chrome.
        // If you have a known root element for the demo panel, filter by containment.
        // const demoRoot = rig.root.asDomElement()?.closest(`#${$DS.demo}`) ?? null;
        // const stack = demoRoot ? els.filter(e => demoRoot.contains(e)) : els;
        const stack = els;

        for (let i = 0; i < MAX; i++) {
            const row = rig.readout.rows[i];
            const el = stack[i];

            if (!row) continue;

            if (!el) {
                row.ix.text.set("");
                row.tag.text.set("");
                // row.quid.text.set("");
                continue;
            }

            const tag = el.tagName.toLowerCase();
            const id = (el instanceof HTMLElement && el.id) ? `#${el.id}` : "";
            const cls =
                el instanceof HTMLElement && el.classList.length
                    ? "." + Array.from(el.classList).slice(0, 2).join(".")
                    : "";

            const cs = (el instanceof Element) ? getComputedStyle(el) : null;

            row.ix.text.set(String(i));
            row.tag.text.set(`${tag}${id}${cls}`);
            // row.quid.text.set(get_quid(el));
        }

        // OPTIONAL: show bbox for the top element only
        // const top = stack[0];
        // if (top instanceof Element) {
        //     const r = top.getBoundingClientRect();
        //     rig.readout.angle.text.set(`θ: ${deg.toFixed(1)}°   box: ${fmt_box(r)}`);
        //     // Or if angle is still used for pointer swivel, put bbox somewhere else.
        // }
    };

    const tick = (): void => {
        if (!mounted) return;

        if (dirty) {
            dirty = false;
            render_stack();
        }

        raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    (rig as any).dispose = (): void => {
        mounted = false;
        cancelAnimationFrame(raf);
        window.removeEventListener("pointermove", onMove);
    };
}