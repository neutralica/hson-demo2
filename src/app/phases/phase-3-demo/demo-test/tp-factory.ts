import { hson, LiveTree } from "hson-live";
import { _test_full_loop } from "hson-live/diagnostics";
import { type Outcome, relay } from "intrastructure";
import { build_suites_for_mode } from "./build-test-suites";
import { create_inspector } from "../../../../tests/inspector/test-inspector";
import { create_test_log } from "./test-logger";
import { run_test_suites } from "./test-runner";
import type { UiLevel, TestRunMode, CaseKey, TestEvent } from "./tests.types";
import { $grn_, $ylw_, ACID_WASH_RGBA, $blu_ } from "../../../core/consts/old-rgb.consts";
import { ACID_WASH_OKLCH } from "../../../core/consts/oklch.consts";
import { OKLCH_NEUTRALS, OKLCH_VIBRANT } from "../../../core/consts/oklch.consts";
import { $PANEL_HIDDEN, øfontSize, øHSON_COL, SYS_SMOLfont, TXTcol_MAIN, TXTcol_MENU } from "../../../core/consts/ui-consts";
import { mk_div_id } from "../../../utils/makers";
import { mk_btn } from "../../../widgets/chips-deprecate/make-btn";
import { OKLCH_FLEURS } from "../demo-fleurs/fleurs.consts";
import { SYS_MONOfont } from "../../../core/consts/ui-consts";
import { create_test_chips, get_line_color } from "./test-helpers";
import type { TestPanel } from "./tp.types";
import { flush_dom, next_frame } from "../../../../tests/inspector/inspector.helpers";
import { _snip } from "../../../utils/helpers";
import type { LoopReport } from "../../../../../../hson-live/dist/types/diagnostics.types";
import { FONT_FAM_MONO } from "../../../core/consts/css.consts";
import { TP_BRANCHcss, TEST_ROW_CONTAINERcss, TP_CONTROL_ROWcss, TEST_SELECTORcss, TEST_RUN_BTNcss, TEST_CLEAR_BTNcss, TEST_CONTENTcss, TEST_INSPECTOR_PANEcss, TEST_LOG_PANEcss, TEST_LOGGERcss, LOG_SPANcss, TP_LOG_ROWcss } from "./tp.css";
import { LOG_HR_PART, LOG_HR_FULL } from "../../../state/state-helpers";

const MODES: readonly Readonly<{ key: TestRunMode; label: string }>[] = [
    { key: "all", label: "all" },
    { key: "transform", label: "transform" },
    { key: "livetree", label: "livetree" },
    { key: "legacy", label: "legacy" },
    { key: "unit", label: "unit" },
    { key: "dev", label: "dev" },
    { key: "fuzz-json", label: "fuzz-json" },
] as const;


export function tp_factory(): Outcome<TestPanel> {
    let inited = false;
    let mounted = false;
    let level: UiLevel = "normal";
    let mode: TestRunMode = "all";

    const branch = hson.liveTree.create.div()
        .id.set("test-panel-branch")
        .css.setMany(TP_BRANCHcss);

    // top row
    const rowContainer = mk_div_id(branch, "row-container").css.setMany(TEST_ROW_CONTAINERcss);
    const controlsRow = mk_div_id(rowContainer, "test-controls").css.setMany(TP_CONTROL_ROWcss);

    const runChip = mk_btn(controlsRow, "test-run", "run");
    const suiteSel = controlsRow.create.select().id.set("test-select").css.setMany(TEST_SELECTORcss);
    const clearChip = mk_btn(controlsRow, "test-clear", "clear");

    const runBtn = runChip.tree.css.setMany(TEST_RUN_BTNcss);
    const clearBtn = clearChip.tree.css.setMany(TEST_CLEAR_BTNcss);

    const chips = create_test_chips(rowContainer);

    // main two-column content
    const content = mk_div_id(branch, "test-content").css.setMany(TEST_CONTENTcss);

    const inspectorPane = mk_div_id(content, "test-inspector-pane")
        .css.setMany(TEST_INSPECTOR_PANEcss);

    const logPane = mk_div_id(content, "test-log-pane")
        .css.setMany(TEST_LOG_PANEcss);

    const logger = mk_div_id(logPane, "test-logger")
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

    const mkLogRow = (line: string): LiveTree => {
        return logger.create.div().css.setMany(TP_LOG_ROWcss(line));
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
        const span = host.create.span().css.setMany(LOG_SPANcss(line));

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
            appendLogLine(LOG_HR_FULL);
            appendLogLine(`suite: beginning ${e.suite}`);
            appendLogLine(LOG_HR_PART);
            return;
        }

        if (e.t === "case_begin") {
            currentCaseLine = appendLogLine(`• ${e.name}`);
            return;
        }

        if (e.t === "case_end") {
            const statusText = e.status.toUpperCase();

            if (currentCaseLine) {
                const t = appendLogLine(statusText);

                if (typeof e.ms === "number") {
                    appendLogSpan(t, `(${e.ms.toFixed(1)}ms)`);
                }

                if (e.status === "fail" && e.err) {
                    appendLogSpan(currentCaseLine, _snip(`— ${e.err}`, 2000));
                    appendLogLine(LOG_HR_FULL);
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
            appendLogLine(LOG_HR_PART);
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
            const v = suiteSel.form.getValue() ?? "all";
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

