// app.ts

import { type LiveTree } from "hson-live";
import { mount_brand } from "./phases/brand-mark-1/mount-brand";
import { mount_splash } from "./phases/logo-splash-2/mount-splash";
import { STAGE_CSS } from "./phases/logo-splash-2/splash.css";
import { _sleep } from "../app/utils/helpers";
import { makeDivId } from "../app/utils/makers";
import { make_skip_promise, run_phase, type PhaseResult, type RaceResult } from "../app/utils/skip-promise";
import { outcome, relay, relay_data, type Outcome, type OutcomeAsync } from "intrastructure";
import { mount_demo } from "./phases/hson-demo-3/mount-demo";
import { make_vines } from "./widgets/vines/vines";
import { PHASE_LINGER } from "./consts/config.consts";
import { $cols } from "./consts/colors.consts";
import { _test_full_loop } from "hson-live/diagnostics";
import { HTML_FIXTURES_LEGACY } from "../../data-old/data/html-fixtures";
import { JSON_FIXTURES_DEV } from "../../data-old/data/json-fixtures";


const _pause = () => _sleep(PHASE_LINGER);
const _shortpause = () => _sleep(PHASE_LINGER * 0.15);


export async function run_app(root: LiveTree): OutcomeAsync<void> {
    root.empty();
    const app = makeDivId(root, "app").classlist.set("app").css.set.backgroundColor($cols.bckgd);
    const stage = makeDivId(app, "stage")
        .classlist.add("stage")
        .css.setMany(STAGE_CSS);

/**
 * confirm test results by manually testing fixtures 
 **/
    if (false) {
        console.log("debug - testing string:");
        const report = _test_full_loop(JSON_FIXTURES_DEV, { verbose: true, capture: true, stopOnFirstFail: false })
        console.log("report", report);
        console.log(report.artifacts);
    }

    const { skip, cancel } = make_skip_promise(stage);

    try {
        // --- phase 1: intro ---
        {
            const introP = run_phase(stage, mount_brand, _shortpause); // OutcomeAsync<void>
            const res = await Promise.race([introP, skip]);       // "skip" | Outcome<void>
            cancel();
            if (res === "skip") {
                stage.empty();
            }

        }
        // --- phase 2: splash ---
        let wordMark: LiveTree | undefined = undefined;
        {
            const splashP = run_phase(stage, mount_splash, _shortpause);
            const res = await Promise.race([splashP, skip]);
            if (res === "skip") {
                stage.empty(); //  hard cut
            }
        }
        // --- phase 3: feature demo ---
        {
            const demo = run_phase(stage, mount_demo, _shortpause);
        }

        return relay.ok();
    } finally {
        // tear down the global skip listener (avoid it lingering into demo)
        cancel();
    }
}


export function mount_ornament(parent: LiveTree): LiveTree {
    const pre = parent.create.pre().data.set("role", "ornament");
    pre.setText(make_vines({ width: 72, rows: 81, seed: (Math.random() * 10000) - 1 }));
    pre.css.setMany({
        position: "absolute",
        left: "18px",
        right: "18px",
        bottom: "14px",
        whiteSpace: "pre",
        pointerEvents: "none",
        opacity: "0.22",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        fontSize: "12px",
        lineHeight: "12px",
        letterSpacing: "0.02em",
        // optional: tint via currentColor
        color: "rgba(160, 220, 255, 0.85)",
        // subtle glow
        textShadow: "0 0 10px rgba(160, 220, 255, 0.25)",
    });

    return pre;
}