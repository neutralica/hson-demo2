import { hson, LiveTree } from "hson-live";
import { _test_full_loop } from "hson-live/diagnostics";
import { type Outcome, relay } from "intrastructure";
import { build_suites_for_mode } from "../build-test-suites";
import { create_inspector } from "../inspector/test-inspector";
import { create_test_log } from "../test-logger";
import { run_test_suites } from "../test-runner";
import type { UiLevel, TestRunMode, CaseKey, TestEvent } from "../tests.types";
import { $grn_, $ylw_, ACID_WASH_RGBA, $blu_ } from "../../app/core/consts/colors.consts";
import { ACID_WASH_OKLCH } from "../../app/core/consts/oklch";
import { OKLCH_NEUTRALS, OKLCH_VIBRANT } from "../../app/core/consts/oklch";
import { $PANEL_HIDDEN, _TXT, HSON_COLOR_ } from "../../app/core/consts/ui-consts";
import { mk_div_id } from "../../app/utils/makers";
import { mk_btn } from "../../app/widgets/chips-deprecate/make-btn";
import { OKLCH_FLEURS } from "../../app/phases/phase-3-demo/demo-fleurs/fleurs.consts";
import { SYS_MONOfont } from "../../app/core/consts/ui-consts";
import { create_test_chips } from "./test-chips";
import type { TestPanel } from "./tp.types";
import { TEST_ROW_CONTAINERcss, CONTROL_ROWcss, TEST_SELECTORcss, TEST_RUN_BTNcss, TEST_CLEAR_BTNcss, TEST_LOGGERcss, TEST_CONTENTcss, TEST_INSPECTOR_PANEcss, TEST_LOG_PANEcss } from "./tp.css";
import { flush_dom, next_frame } from "../inspector/inspector.helpers";
import { PANEL_BRANCHcss } from "./tp-panels.css";
import { _snip } from "../../app/utils/helpers";
import type { LoopReport } from "../../../../hson-live/dist/types/diagnostics.types";


const MODES: readonly Readonly<{ key: TestRunMode; label: string }>[] = [
    { key: "all", label: "all" },
    { key: "transform", label: "transform" },
    { key: "livetree", label: "livetree" },
    { key: "legacy", label: "legacy" },
    { key: "unit", label: "unit" },
    { key: "dev", label: "dev" },
] as const;


export function tp_factory(): Outcome<TestPanel> {
    let inited = false;
    let mounted = false;
    let level: UiLevel = "normal";
    let mode: TestRunMode = "all";

    const branch = hson.liveTree.create.div()
        .id.set("panel-branch")
        .css.setMany(PANEL_BRANCHcss);

    // top row
    const rowContainer = mk_div_id(branch, "row-container").css.setMany(TEST_ROW_CONTAINERcss);
    const controlsRow = rowContainer.create.div()
        .id.set("test-controls")
        .css.setMany(CONTROL_ROWcss);

    const runChip = mk_btn(controlsRow, "test-run", "run");
    const suiteSel = controlsRow.create.select()
        .id.set("test-select")
        .css.setMany(TEST_SELECTORcss);
    const clearChip = mk_btn(controlsRow, "test-clear", "clear");

    const runBtn = runChip.tree.css.setMany(TEST_RUN_BTNcss);
    const clearBtn = clearChip.tree.css.setMany(TEST_CLEAR_BTNcss);

    const chips = create_test_chips(rowContainer);

    // main two-column content
    const content = branch.create.div()
        .id.set("test-content")
        .css.setMany(TEST_CONTENTcss);

    const inspectorPane = content.create.div()
        .id.set("test-inspector-pane")
        .css.setMany(TEST_INSPECTOR_PANEcss);

    const logPane = content.create.div()
        .id.set("test-log-pane")
        .css.setMany(TEST_LOG_PANEcss);

    const logger = logPane.create.div()
        .id.set("test-logger")
        .css.setMany(TEST_LOGGERcss);

    const tlog = create_test_log();
    const captureMap = new Map<CaseKey, () => Promise<LoopReport>>();

    const inspector = create_inspector(
        inspectorPane,
        tlog,
        { hideClass: $PANEL_HIDDEN },
        async (key) => {
            const fn = captureMap.get(key);
            if (fn) return fn();

            const c = tlog.getCase(key);
            const m = c?.meta;

            return {
                ok: c?.status === "pass",
                entry: key,
                dir: "livetree",
                times: 1,
                failures: c?.status === "fail" ? [{ ok: false, step: "assert", error: c.err ?? "fail" }] : [],
                trace: [
                    { ok: true, step: "setup" },
                    { ok: c?.status !== "fail", step: "assert", error: c?.err },
                ],
                artifacts: [
                    m?.fixture ? { lap: 0, fmt: "json", label: "fixture", text: m.fixture } : undefined,
                    m?.sub ? { lap: 0, fmt: "json", label: "sub", text: m.sub } : undefined,
                    m?.preview ? { lap: 0, fmt: "html", label: "preview", text: m.preview } : undefined,
                    m?.input ? { lap: 0, fmt: "html", label: "input", text: m.input } : undefined,
                ].filter(Boolean),
            } as unknown as LoopReport;
        },
    );
    // keep track of the current "run ..." row so PASS/FAIL can append inline
    let currentCaseLine: LiveTree | null = null;

    function get_line_color(line: string): string {
        const head = line.trim().split(/\s+/, 1)[0]?.toUpperCase() ?? "";

        switch (head) {
            case "FAIL": return "red";
            case "PASS": 
            case "OK": return OKLCH_VIBRANT.mossToxic;
            case "SKIP":
            case "WARN": return HSON_COLOR_.s;
            case "RUN": return OKLCH_FLEURS.cyanDust;
            case "DONE": return OKLCH_NEUTRALS.slate;
            case "SUITE": return OKLCH_FLEURS.clayCoral;
            default: return OKLCH_NEUTRALS.silver;
        }
    }

    const mkLogRow = (line: string): LiveTree => {
        return logger.create.div().css.setMany({
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere",
            minWidth: "0",
            fontFamily: SYS_MONOfont,
            fontSize: _TXT.main,
            lineHeight: "1.25",
            paddingBottom: "2px",
            color: get_line_color(line),
        });
    };

    const appendLogLine = (line: string): LiveTree => {
        const row = mkLogRow(line);
        row.text.set(line);

        const el = logger.dom.el();
        if (el instanceof HTMLElement) {
            el.scrollTop = el.scrollHeight;
        }

        return row;
    };

    const appendLogSpan = (host: LiveTree, line: string): LiveTree => {
        const span = host.create.span().css.setMany({
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere",
            minWidth: "0",
            fontFamily: SYS_MONOfont,
            fontSize: _TXT.main,
            lineHeight: "1.25",
            color: get_line_color(line),
            marginLeft: "1ch",
        });

        span.text.set(line);

        const el = logger.dom.el();
        if (el instanceof HTMLElement) {
            el.scrollTop = el.scrollHeight;
        }

        return span;
    };

    const clearLogLines = (): void => {
        currentCaseLine = null;
        logger.empty();
    };

    const doLogOnEvent = (e: TestEvent): void => {
        tlog.onEvent(e);

        if (e.t === "suite_begin") {
            currentCaseLine = null;
            appendLogLine(`suite ${e.suite}`);
            return;
        }

        if (e.t === "case_begin") {
            currentCaseLine = appendLogLine(`run ${e.name}`);
            return;
        }

        if (e.t === "case_end") {
            const statusText = e.status.toUpperCase();

            if (currentCaseLine) {
                appendLogLine(statusText);

                if (typeof e.ms === "number") {
                    appendLogLine( `(${e.ms.toFixed(1)}ms)`);
                }

                if (e.status === "fail" && e.err) {
                    appendLogSpan(currentCaseLine, _snip(`— ${e.err}`, 2000));
                }
            } else {
                const fallback = appendLogLine(statusText);

                if (typeof e.ms === "number") {
                    appendLogSpan(fallback, `(${e.ms.toFixed(1)}ms)`);
                }

                if (e.status === "fail" && e.err) {
                    appendLogSpan(fallback, _snip(`— ${e.err}`, 2000));
                }
            }

            currentCaseLine = null;
            return;
        }

        if (e.t === "suite_end") {
            currentCaseLine = null;
            appendLogLine(`done ${e.suite} (${e.ms.toFixed(1)}ms)`);
            return;
        }
    };

    const mount = (hostBody: LiveTree): void => {
        if (mounted) return;
        mounted = true;
        hostBody.append(branch);

        suiteSel.empty();
        for (const m of MODES) {
            const opt = suiteSel.create.option();
            opt.attr.set("value", m.key);
            opt.text.set(m.label);
            if (m.key === mode) opt.flag.set("selected");
        }

        suiteSel.listen.on("change", () => {
            const v = suiteSel.getFormValue() ?? "all";
            mode = (MODES.find(m => m.key === v)?.key ?? "all");
        });

        const press = (b: LiveTree, on: boolean): void => {
            b.css.setMany(on
                ? { transform: "translateY(1px)", filter: "brightness(0.98)" }
                : { transform: "translateY(0px)", filter: "brightness(1.0)" });
        };

        runBtn.listen.onPointerDown(() => press(runBtn, true));
        runBtn.listen.onPointerUp(() => press(runBtn, false));
        runBtn.listen.onPointerLeave(() => press(runBtn, false));

        clearBtn.listen.onPointerDown(() => press(clearBtn, true));
        clearBtn.listen.onPointerUp(() => press(clearBtn, false));
        clearBtn.listen.onPointerLeave(() => press(clearBtn, false));

        runBtn.listen.onClick(async () => {

            chips.clear();
            tlog.clear();
            clearLogLines();
            captureMap.clear();

            appendLogLine("running loop test…");
            await flush_dom();

            const suites = build_suites_for_mode(mode, { _test_full_loop }, captureMap);
            const res = await run_test_suites(suites, doLogOnEvent, { bail: false });
            chips.render(res.summary);
            inspector.show();
            inspector.render();
        });

        clearBtn.listen.onClick(() => {
            tlog.clear();
            chips.clear();
            clearLogLines();
            appendLogLine("idle");
            inspector.clear();
        });

        appendLogLine("idle");
    };

    return relay.data({
        branch,
        mount,
        runBtn,
        clearBtn,
        suiteSel,
        logger,
        chips,
        inspector,
        inspectorSurface: inspectorPane,
        getLevel: () => level,
        getMode: () => mode,
        clearLogs: clearLogLines,
        setLog: appendLogLine,
    } as const);
}

