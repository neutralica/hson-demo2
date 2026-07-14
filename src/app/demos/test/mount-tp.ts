import { LiveTree, hson } from "hson-live";
import { type LoopReport, _circuit_test} from "hson-live/diagnostics";
import { type Outcome, relay, relay_data } from "intrastructure";
import type { SourceFormat } from "../../../../../hson-live/dist/types/diagnostics.types";
import  { flush_dom } from "../../../tests/inspector/inspector.helpers";
import { make_inspector } from "../../../tests/inspector/make-inspector";
import { $PANEL_HIDDEN } from "../../core/consts/ui-consts";
import { _snip } from "../../utils/helpers";
import  { mk_div_id, mk_div_id_txt } from "../../utils/makers";
import { make_ad_hoc_transform_suite, all_test_suites } from "./all-test-suites";
// import { make_state_smoke_suite } from "./state-smoke-suite";
import { create_test_chips } from "./test-helpers";
import { create_test_log } from "./test-logger";
import  { run_test_suites } from "./test-runner";
import type { TestRunMode, TestEvent, UiLevel, CaseKey } from "./tests.types";
import { TEST_ROW_CONTAINERcss, TP_CONTROL_ROWcss, TEST_RUN_BTNcss, TEST_CLEAR_BTNcss, TEST_SELECTORcss, TEST_CONTENTcss, TEST_LOG_PANEcss, TEST_INSPECTOR_PANEcss, TEST_LOGGERcss, TP_BRANCHcss, TP_LOG_ROWcss, LOG_SPANcss, TP_ROOTcss } from "./tp.css";
import type { TestPanel, TestPanels } from "./tp.types";
import { hosted_test_suite_for_panel_mode, make_hosted_test_panel_adapter } from "./hosted-test-panel-adapter";
import { make_remote_hosted_test_runtime } from "./hosted-test-panel-runtime";

const LOG_HR_FULL = "|=•=-----=•=-----=•=|"
const LOG_HR_PART = " ----------=•=|"

const MODES: readonly Readonly<{ key: TestRunMode; label: string }>[] = [
    { key: "all", label: "all" },
    { key: "transform", label: "transform" },
    { key: "livetree", label: "livetree" },
    { key: "livemap", label: "livemap" },
    { key: "livemap-replay", label: "livemap/replay (hosted)" },
    { key: "livehost-all", label: "livehost/all (hosted)" },
    { key: "node-all", label: "all Node-safe (hosted)" },
    { key: "livehost", label: "livehost" },
    { key: "legacy", label: "legacy" },
    { key: "unit", label: "unit" },
    { key: "dev", label: "dev" },
    { key: "fuzz-json", label: "json fuzzer" },
    // { key: "demo-meta", label: "demo-meta" },
] as const;

type LogVerbosity = "normal" | "verbose";
const LOG_VERBOSITY: readonly LogVerbosity[] = ["normal", "verbose"];

export type ExternalTestAction = {
    label: string;
    isEnabled: () => boolean;
    run: () => void | Promise<void>;
};

function nextVerbosity(current: LogVerbosity): LogVerbosity {
    const i = LOG_VERBOSITY.indexOf(current);
    return LOG_VERBOSITY[(i + 1) % LOG_VERBOSITY.length] ?? "normal";
}

function shouldLogEvent(verbosity: LogVerbosity, e: TestEvent): boolean {
    if (verbosity === "verbose") return true;

    if (e.t === "suite_begin" || e.t === "suite_end") return true;
    if (e.t === "case_end" && e.status === "fail") return true;

    return false;
}

function setButtonClicked(btn: LiveTree, on: boolean): void {
    btn.css.setMany(on
        ? { transform: "translateY(1px)", filter: "brightness(0.98)" }
        : { transform: "translateY(0px)", filter: "brightness(1.0)" });
}

function implClickFeedback(btn: LiveTree): void {
    btn.listen.onPointerDown(() => setButtonClicked(btn, true));
    btn.listen.onPointerUp(() => setButtonClicked(btn, false));
    btn.listen.onPointerLeave(() => setButtonClicked(btn, false));
}

function populateModeSelector(suiteSel: LiveTree, mode: TestRunMode): void {
    suiteSel.empty();
    for (const m of MODES) {
        const opt = suiteSel.create.option();
        opt.attr.set("value", m.key);
        opt.text.set(m.label);
        if (m.key === mode) opt.flag.set("selected");
    }
}

type TestConsoleParts = {
    runBtn: LiveTree;
    suiteSel: LiveTree;
    verbosityBtn: LiveTree;
    clearBtn: LiveTree;
    externalBtn: LiveTree;
    chips: ReturnType<typeof create_test_chips>;
};

function create_test_console(leftColumn: LiveTree, rightColumn: LiveTree): TestConsoleParts {
    const rowContainer = mk_div_id(leftColumn, "row-container").css.setMany(TEST_ROW_CONTAINERcss);
    const controlsRow = mk_div_id(rightColumn, "test-controls").css.setMany(TP_CONTROL_ROWcss);

    const runBtn = mk_div_id_txt(controlsRow, "test-run", "run").css.setMany({
        ...TEST_RUN_BTNcss,
        gridColumn: "1 / 2",
    });
    const clearBtn = mk_div_id_txt(controlsRow, "test-clear", "clear").css.setMany({
        ...TEST_CLEAR_BTNcss,
        gridColumn: "2 / 3",
    });
    const suiteSel = controlsRow.create.select().id.set("test-select").css.setMany({
        ...TEST_SELECTORcss,
        gridColumn: "1 / 3",
    });
    const verbosityBtn = mk_div_id_txt(controlsRow, "test-verbosity", "log: normal").css.setMany({
        ...TEST_CLEAR_BTNcss,
        gridColumn: "1 / 3",
    });
    const externalBtn = mk_div_id_txt(controlsRow, "test-external", "test parse").css.setMany({
        ...TEST_CLEAR_BTNcss,
        gridColumn: "1 / 3",
        opacity: "0.3",
    });

    const chips = create_test_chips(rowContainer);

    return { runBtn, suiteSel, verbosityBtn, clearBtn, externalBtn, chips };
}

type TestSurfaceParts = {
    leftColumn: LiveTree;
    rightColumn: LiveTree;
    inspectorPane: LiveTree;
    logger: LiveTree;
};

function createTestSurface(branch: LiveTree): TestSurfaceParts {
    const leftColumn = mk_div_id(branch, "test-left-column").css.setMany(TEST_CONTENTcss);
    const rightColumn = mk_div_id(branch, "test-right-column").css.setMany(TEST_LOG_PANEcss);

    const inspectorPane = mk_div_id(leftColumn, "test-inspector-pane")
        .css.setMany(TEST_INSPECTOR_PANEcss);

    const logger = mk_div_id(rightColumn, "test-logger")
        .css.setMany(TEST_LOGGERcss);

    return { leftColumn, rightColumn, inspectorPane, logger };
}

export function tp_factory(): Outcome<TestPanel> {
    let mounted = false;
    let level: UiLevel = "normal";
    let mode: TestRunMode = "all";
    let verbosity: LogVerbosity = "normal";
    let externalAction: ExternalTestAction | null = null;

    const branch = hson.liveTree.create.div()
        .id.set("test-panel-branch")
        .css.setMany(TP_BRANCHcss);

    const { leftColumn, rightColumn, inspectorPane, logger } = createTestSurface(branch);
    const { runBtn, suiteSel, verbosityBtn, clearBtn, externalBtn, chips } = create_test_console(leftColumn, rightColumn);

    const tlog = create_test_log();
    const captureMap = new Map<CaseKey, () => Promise<LoopReport>>();

    const inspector = make_inspector(
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

    const syncVerbosity = (): void => {
        verbosityBtn.text.set(`log: ${verbosity}`);
    };

    const syncExternalAction = (): void => {
        const enabled = Boolean(externalAction?.isEnabled());
        externalBtn.text.set(externalAction?.label ?? "test parse");
        externalBtn.css.setMany({
            opacity: enabled ? "1" : "0.3",
            pointerEvents: enabled ? "auto" : "none",
            filter: enabled ? "brightness(1.0)" : "brightness(0.72)",
        });
    };

    const doLogOnEvent = (e: TestEvent): void => {
        tlog.onEvent(e);
        if (!shouldLogEvent(verbosity, e)) return;

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

    const hostedRuntime = make_remote_hosted_test_runtime();
    const hostedAdapter = make_hosted_test_panel_adapter(hostedRuntime.client, {
        reset() {
            chips.clear();
            tlog.clear();
            clearLogLines();
            captureMap.clear();
            appendLogLine("running hosted livemap/replay…");
        },
        onEvent: doLogOnEvent,
        renderSummary(summary) {
            chips.render(summary);
        },
        renderReport() {
            inspector.show();
            inspector.render();
        },
        showInfrastructureError(message) {
            appendLogLine(`host error: ${message}`);
        },
    });
    void hostedRuntime.ready().catch((error: unknown) => {
        appendLogLine(`host connection error: ${error instanceof Error ? error.message : String(error)}`);
    });

    const runAdHocTransform = async (fmt: SourceFormat, text: string): Promise<void> => {
        chips.clear();
        tlog.clear();
        clearLogLines();
        captureMap.clear();

        appendLogLine(`running parse-panel transform: ${fmt} (${text.length} bytes)`);
        await flush_dom();

        const suites = [make_ad_hoc_transform_suite({ _circuit_test }, fmt, text, captureMap)] as const;
        const res = await run_test_suites(suites, doLogOnEvent, { bail: false });
        chips.render(res.summary);
        inspector.show();
        inspector.render();
    };

    // const runBootSmokes = async (): Promise<void> => {
    //     chips.clear();
    //     tlog.clear();
    //     clearLogLines();
    //     captureMap.clear();

    //     appendLogLine("running smoke tests…");
    //     await flush_dom();

    //     const res = await run_test_suites([make_state_smoke_suite()], doLogOnEvent, { bail: false });
    //     chips.render(res.summary);
    //     inspector.show();
    //     inspector.render();
    // };

    const mount = (hostBody: LiveTree): void => {
        if (mounted) return;
        mounted = true;
        hostBody.append(branch);

        populateModeSelector(suiteSel, mode);

        suiteSel.listen.on("change", () => {
            const v = suiteSel.form.getValue() ?? "all";
            mode = (MODES.find(m => m.key === v)?.key ?? "all");
        });

        implClickFeedback(runBtn);
        implClickFeedback(clearBtn);
        implClickFeedback(verbosityBtn);
        implClickFeedback(externalBtn);

        verbosityBtn.listen.onClick(() => {
            verbosity = nextVerbosity(verbosity);
            syncVerbosity();
            appendLogLine(`log verbosity: ${verbosity}`);
        });

        externalBtn.listen.onClick(() => {
            if (!externalAction?.isEnabled()) return;
            void externalAction.run();
        });

        syncVerbosity();
        syncExternalAction();

        runBtn.listen.onClick(async () => {

            const hostedSuite = hosted_test_suite_for_panel_mode(mode);
            if (hostedSuite !== undefined) {
                try {
                    await hostedRuntime.ready();
                    await hostedAdapter.start(hostedSuite);
                } catch (error) {
                    if (hostedAdapter.router === undefined) {
                        appendLogLine(`host connection error: ${error instanceof Error ? error.message : String(error)}`);
                    }
                }
                return;
            }

            chips.clear();
            tlog.clear();
            clearLogLines();
            captureMap.clear();

            appendLogLine("running loop test…");
            await flush_dom();

            const suites = all_test_suites(mode, { _circuit_test }, captureMap);
            const res = await run_test_suites(suites, doLogOnEvent, { bail: false });
            chips.render(res.summary);
            inspector.show();
            inspector.render();
        });

        clearBtn.listen.onClick(() => {
            hostedAdapter.dispose();
            tlog.clear();
            chips.clear();
            clearLogLines();
            appendLogLine("idle");
            inspector.clear();
        });

        // void runBootSmokes();
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
        getVerbosity: () => verbosity,
        clearLogs: clearLogLines,
        setLog: appendLogLine,
        setExternalAction: (action: ExternalTestAction | null) => {
            externalAction = action;
            syncExternalAction();
        },
        runAdHocTransform,
        dispose: () => {
            hostedAdapter.dispose();
            hostedRuntime.dispose();
        },
    } as const);
}
export function mount_test_panels(host: LiveTree): Outcome<TestPanels> {
    try {
        const old = host.find.byId("test-panels-root");
        if (old) old.removeSelf();

        const root = host.create.div()
            .id.set("test-panels-root")
            .css.setMany(TP_ROOTcss);

        const tp = relay_data(tp_factory());
        tp.mount(root);
        return relay.data({
            root,
            tp,
            inspector: tp.inspector,
            inspectorSurface: tp.inspectorSurface,
            testSurface: tp.branch,
            dispose: () => {
                tp.dispose();
                root.removeSelf();
            },
        });
    } catch (err) {
        return relay.err(err instanceof Error ? err.message : "unknown error:", err);
    }
}
