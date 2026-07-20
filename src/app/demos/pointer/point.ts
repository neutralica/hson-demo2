// ---- types ----

import { LiveTree } from "hson-live";

export type PointPanelRig = Readonly<{
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
export function point_init(rig: PointPanelRig): void {
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
    rig.root.listen.window.passive().onPointerMove(onMove);
    // window.addEventListener("pointermove", onMove, { passive: true });

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

        rig.pointer.style.setMany({
            transform: `translate(0, -50%) rotate(${deg}deg)`,
        });
        const hitStack = rig.root.dom.doc?.treesFromPoint(x, y).array().reverse() ?? [];
        const ghostStack = find_visual_only_elements(rig.root, x, y, hitStack);

        const stack: LiveTree[] = [...hitStack, ...ghostStack];

        for (let i = 0; i < MAX; i += 1) {
            const row = rig.readout.rows[i];
            const item = stack[i];

            if (!row) continue;

            if (!item) {
                row.ix.text.set("");
                row.tag.text.set("");
                continue;
            }


            const tag = item.node.$_tag;
            const idValue = item.attrs.get("id");
            const classValue = item.attrs.get("class");
            const classText = typeof classValue === "string" ? classValue : "";
            const id = idValue ? `#${idValue}` : "";
            const cls = classText
                ? "." + classText.trim().split(/\s+/).filter(Boolean).slice(0, 2).join(".")
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
    };
}

function find_visual_only_elements(
    root: LiveTree,
    x: number,
    y: number,
    hitStack: readonly LiveTree[],
): LiveTree[] {
    const hitSet = new Set(hitStack.map(t => t.quid));
    const out: LiveTree[] = [];

    // Equivalent to `[rootEl, ...rootEl.querySelectorAll("*")]`, but LiveTree-native.
    const candidates: readonly LiveTree[] = [root, ...root.content.deep().array()];

    for (const tree of candidates) {
        if (hitSet.has(tree.quid)) continue;

        const cs = tree.dom.computed();
        if (!cs) continue;

        // only ghosts
        if (cs.pointerEvents !== "none") continue;
        if (cs.display === "none") continue;
        if (cs.visibility === "hidden") continue;

        const r = tree.dom.rect();
        if (!r) continue;
        if (r.width <= 0 || r.height <= 0) continue;

        const inside =
            x >= r.left &&
            x <= r.right &&
            y >= r.top &&
            y <= r.bottom;

        if (!inside) continue;

        out.push(tree);
    }

    // smaller first tends to surface local overlays before giant containers
    out.sort((a, b) => {
        const ar = a.dom.rect();
        const br = b.dom.rect();
        if (!ar || !br) return 0;
        return (ar.width * ar.height) - (br.width * br.height);
    });

    return out;
}