
// ---- types ----

import { LiveTree, make_tree_selector } from "hson-live";
import { _DATA_QUID } from "../../../../../../hson-live/dist/consts/constants";

export type MousePanelRig = Readonly<{
    root: LiveTree;
    stage: LiveTree;
    pointer: LiveTree;
    origin: LiveTree;
    readout: {
        x: LiveTree;
        y: LiveTree;
        angle: LiveTree;
        rows: ReadonlyArray<{
            ix: LiveTree;        // index
            tag: LiveTree;       // tag#id.class
            // quid: LiveTree;      // data-_quid
        }>;
    };
    dispose: () => void;
}>;


// ---- tiny math ----

const fmt_int = (n: number): string => String(Math.round(n));


// ---- init (behavior) ----
export function mouse_init(rig: MousePanelRig): void {
    let raf = 0;
    let mounted = true;

    let lastPos: { x: number; y: number } = { x: 0, y: 0 };
    let changed = true;

    rig.root.css.setMany({ pointerEvents: "none" });

    const onMove = (ev: PointerEvent): void => {
        lastPos = { x: ev.clientX, y: ev.clientY };
        changed = true;
    };
    // ADDED: stable center for pointer math
    const getStageCenter = (): { x: number; y: number } => {
        const r = rig.origin.dom.must.rect()
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    };

    // radians -> degrees
    const rad_to_deg = (rad: number): number => (rad * 180) / Math.PI;
    window.addEventListener("pointermove", onMove, { passive: true });

    const MAX = rig.readout.rows.length;

    const render_stack = (): void => {
        const { x, y } = lastPos;

        rig.readout.x.text.set(`x: ${fmt_int(x)}`);
        rig.readout.y.text.set(`y: ${fmt_int(y)}`);

        const c = getStageCenter();
        const dx = x - c.x;
        const dy = y - c.y;
        const theta = Math.atan2(dy, dx);
        const deg = rad_to_deg(theta);

        rig.readout.angle.text.set(`θ: ${deg.toFixed(1)}°`);

        rig.pointer.css.setMany({
            transform: `translate(0, -50%) rotate(${deg}deg)`,
        });
        const hitStack = rig.root.dom.doc?.elementsFromPoint(x, y) ?? [];
        const orderedHits = [...hitStack].reverse() ?? [];
        const ghostStack = find_visual_only_elements(rig.root, x, y, hitStack ?? []) ;

        const stack = [...orderedHits, ...ghostStack];

        for (let i = 0; i < MAX; i += 1) {
            const row = rig.readout.rows[i];
            const item = stack[i];

            if (!row) continue;

            if (!item) {
                row.ix.text.set("");
                row.tag.text.set("");
                continue;
            }


            const tag = item.tagName.toLowerCase();
            const id = (item instanceof HTMLElement && item.id) ? `#${item.id}` : "";
            const cls =
                item instanceof HTMLElement && item.classList.length
                    ? "." + Array.from(item.classList).slice(0, 2).join(".")
                    : "";

            row.ix.text.set(String(i));
            row.tag.text.set(`${tag}${id}${cls}`);
        }
    };

    const tick = (): void => {
        if (!mounted) return;

        if (changed) {
            changed = false;
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

function find_visual_only_elements(
    root: LiveTree,
    x: number,
    y: number,
    hitStack: Element[],
): Element[] {
    const rootEl = root.dom.el();
    if (!(rootEl instanceof Element)) return [];

    const hitSet = new Set<Element>(hitStack);
    const out: Element[] = [];

    // include root itself plus descendants
    const candidates: Element[] = [rootEl, ...Array.from(rootEl.querySelectorAll("*"))];

    for (const el of candidates) {
        if (hitSet.has(el)) continue;

        const cs = getComputedStyle(el);

        // only ghosts
        if (cs.pointerEvents !== "none") continue;
        if (cs.display === "none") continue;
        if (cs.visibility === "hidden") continue;

        const r = el.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) continue;

        const inside =
            x >= r.left &&
            x <= r.right &&
            y >= r.top &&
            y <= r.bottom;

        if (!inside) continue;

        out.push(el);
    }

    // smaller first tends to surface local overlays before giant containers
    out.sort((a, b) => {
        const ar = a.getBoundingClientRect();
        const br = b.getBoundingClientRect();
        return (ar.width * ar.height) - (br.width * br.height);
    });

    return out;
}