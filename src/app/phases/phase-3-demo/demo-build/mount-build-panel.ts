import { LiveTree, hson } from "hson-live";
import { outcome, relay, relay_data, type Outcome } from "intrastructure";
import { bp_factory, type BuildDemo } from "./build";

type StatusKind = "idle" | "typing" | "valid" | "invalid";
type BuildTabKey = "render" | "html";

export function mount_build_panels(host: LiveTree): Outcome<BuildDemo> {
    const bp = relay_data(bp_factory(host));

    initBuild(bp);
    return relay.data(bp);
}

export function initBuild(bp: BuildDemo): void {
    let inProgress = false;
    let activeTab: BuildTabKey = "render";
    let touched = false;

    const getSrc = (): string => bp.input.textarea.getFormValue() ?? "";
    const setSrc = (v: string): void => void bp.input.textarea.setFormValue(v, { silent: true });

    const setStatus = (k: StatusKind): void => {
        // keep this tiny + predictable
        if (k === "idle") {
            bp.input.status.text.set("");
            bp.input.status.css.setMany({ opacity: "0" });
            return;
        }
        if (k === "typing") {
            bp.input.status.text.set("...");
            bp.input.status.css.setMany({ opacity: "1" });
            return;
        }
        if (k === "valid") {
            bp.input.status.text.set("valid");
            bp.input.status.css.setMany({ opacity: "1" });
            return;
        }
        bp.input.status.text.set("invalid");
        bp.input.status.css.setMany({ opacity: "1" });
    };

    const syncTabs = (): void => {
        // show/hide the two output panes
        const showRender = activeTab === "render";
        bp.output.previewHost.css.setMany({ display: showRender ? "block" : "none" }); 
        bp.output.htmlBox.css.setMany({ display: showRender ? "none" : "block" });

        // simple active affordance (optional)
        // TODO - change over to .data.set
        bp.tabs.render.attr.set("data-active", String(showRender));
        bp.tabs.html.attr.set("data-active", String(!showRender));
    };

    const render = (raw: string): void => {
        // NOTE: do not overwrite anything if invalid; just mark invalid.
        const t = raw.trim();
        const empty = t.length === 0;

        // update watermark-ish state if you want
        // bp.input.wmEmpty.css.setMany({ opacity: empty ? "0.25" : "0" });

        if (!touched) {
            // don’t scream until first input
            setStatus("idle");
        } else if (empty) {
            setStatus("invalid");
        } else {
            setStatus("typing");
        }

        if (empty) return;

        // Parse HSON → build preview + html
        try {
            // IMPORTANT: this must throw on invalid input
            const doc = hson.fromHson(raw);

            // 1) output html string
            const htmlTxt = doc.toHtml().serialize();

            // 2) output preview tree
            // Prefer LiveTree path (no DOM string parse). If your API differs, swap this line.
            const branch = hson.liveTree.fromHson(raw);

            // Update output panes
            bp.output.previewHost.empty();
            bp.output.previewHost.append(branch);

            bp.output.htmlBox.text.set(htmlTxt);

            setStatus("valid");
        } catch {
            setStatus("invalid");
            // keep last valid output; do not mutate preview/htmlBox
        }
    };

    // --- events ---

    // Tabs
    bp.tabs.render.listen.onClick(() => {
        activeTab = "render";
        syncTabs();
    });
    bp.tabs.html.listen.onClick(() => {
        activeTab = "html";
        syncTabs();
    });

    // Input
    bp.input.textarea.listen.onInput(() => {
        if (inProgress) return;
        inProgress = true;
        try {
            touched = true;
            render(getSrc());
        } finally {
            inProgress = false;
        }
    });

    // Buttons

    bp.input.clearBtn.listen.onClick(() => {
        touched = false;
        setSrc("");
        bp.output.previewHost.empty();
        bp.output.htmlBox.text.set("");
        setStatus("idle");
        // bp.input.wmEmpty.css.setMany({ opacity: "0.25" });
    });

    bp.input.copyBtn.listen.onClick(() => {
        // Copy current tab by default; easy to change
        const clip = globalThis.navigator?.clipboard?.writeText;
        if (!clip) return;

        const txt =
            activeTab === "html"
                ? (bp.output.htmlBox.text.get() ?? "") // if you have .getText; else store htmlTxt elsewhere
                : getSrc();

        void clip.call(navigator.clipboard, txt);
    });

    // bp.input.testBtn.listen.onClick(() => {
    //     // Simple starter payload; tweak anytime.
    //     const starter = bp.input.textarea.text.get();

    //     setSrc(starter);
    //     touched = true;
    //     render(starter);
    // });

    // Initial paint
    syncTabs();
    render(getSrc());

}