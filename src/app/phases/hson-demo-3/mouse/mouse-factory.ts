import type { LiveTree } from "hson-live";
import { type Outcome, relay } from "intrastructure";
import { type MousePanelRig, mouse_init, DERIV_LABELS } from "./mouse";

// ---- factory ----

export function mount_mouse_panel(host: LiveTree): Outcome<MousePanelRig> {
    try {
        const rig = mouse_factory(host);
        mouse_init(rig);
        return relay.data(rig);
    } catch (err) {
        return relay.err(err instanceof Error ? err.message : "unknown error");
    }
}
function mouse_factory(host: LiveTree): MousePanelRig {
    // CHANGED: widget owns its own root container under host
    const old = host.find.byId("mouse-panel-root");
    if (old) old.removeSelf();

    const root = host.create.div()
        .id.set("mouse-panel-root")
        .classlist.add("mouse-panel")
        .css.setMany({
            display: "grid",
            gridTemplateRows: "auto 1fr",
            gap: "10px",
            minWidth: "0",
            minHeight: "0",
            height: "100%",
            width: "500px",
        });

    // header row: coords + angle
    const head = root.create.div().css.setMany({
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "10px",
        alignItems: "center",
    });

    const xy = head.create.div()
        .classlist.add("mouse-xy")
        .css.setMany({
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            fontSize: "12px",
            letterSpacing: "0.06em",
            whiteSpace: "pre",
        })
        .text.set("x: —   y: —");

    const angle = head.create.div()
        .classlist.add("mouse-angle")
        .css.setMany({
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            fontSize: "12px",
            letterSpacing: "0.06em",
            opacity: "0.78",
            whiteSpace: "pre",
            justifySelf: "end",
        })
        .text.set("θ: —°");

    // body: pointer + derivative table
    const body = root.create.div().css.setMany({
        display: "grid",
        gridTemplateColumns: "140px 1fr",
        gap: "12px",
        minWidth: "0",
        minHeight: "0",
        height: "100%",
    });

    // pointer stage
    const stage = body.create.div().css.setMany({
        position: "relative",
        minWidth: "0",
        minHeight: "0",
        maxHeight: "140px",
        maxWidth: "140px",
        borderRadius: "999px",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
        background: "rgba(255,255,255,0.03)",
        overflow: "hidden",
    });

    const pointer = stage.create.div()
        .classlist.add("mouse-pointer")
        .css.setMany({
            position: "absolute",
            left: "50%",
            top: "50%",
            width: "64px",
            height: "2px",
            background: "rgba(255,255,255,0.75)",
            transformOrigin: "0% 50%",
            transform: "translate(0, -50%) rotate(0deg)",
            boxShadow: "0 0 10px rgba(140,210,255,0.20)",
        });

    // center dot
    stage.create.div().css.setMany({
        position: "absolute",
        left: "50%",
        top: "50%",
        width: "6px",
        height: "6px",
        borderRadius: "99px",
        background: "rgba(255,255,255,0.6)",
        transform: "translate(-50%, -50%)",
    });

    // readout table
    const table = body.create.div().css.setMany({
        display: "grid",
        gridAutoRows: "auto",
        gap: "6px",
        minWidth: "0",
        minHeight: "0",
        alignContent: "start",
    });

    // table header
    const hdr = table.create.div().css.setMany({
        display: "grid",
        gridTemplateColumns: "72px 1fr 1fr 1fr",
        gap: "8px",
        opacity: "0.65",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        fontSize: "11px",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
    });
    hdr.create.div().text.set("term");
    hdr.create.div().text.set("x");
    hdr.create.div().text.set("y");
    hdr.create.div().text.set("|v|");

    const rows = DERIV_LABELS.map(([key, label]) => {
        const row = table.create.div().css.setMany({
            display: "grid",
            gridTemplateColumns: "72px 1fr 1fr 1fr",
            gap: "8px",
            minWidth: "0",
            alignItems: "baseline",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            fontSize: "12px",
            letterSpacing: "0.04em",
            opacity: key === "pos" ? "0.95" : "0.85",
        });

        row.create.div().text.set(label);

        const x = row.create.div().text.set("—");
        const y = row.create.div().text.set("—");
        const m = row.create.div().text.set("—");

        return { label, x, y, mag: m };
    });

    // placeholder dispose; init will replace
    const dispose = (): void => void 0;

    return {
        root,
        pointer,
        readout: { xy, angle, rows },
        dispose,
    };
}
