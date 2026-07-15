import { LiveTree, hson } from "hson-live";
import { _snip } from "../../utils/helpers";
import  { mk_div_id, mk_div_id_txt } from "../../utils/makers";
import { create_test_chips } from "./test-helpers";
import { create_test_log } from "./test-logger";
import type { TestEvent, UiLevel } from "./tests.types";
import { TEST_ROW_CONTAINERcss, TP_CONTROL_ROWcss, TEST_RUN_BTNcss, TEST_CLEAR_BTNcss, TEST_SELECTORcss, TEST_CONTENTcss, TEST_LOG_PANEcss, TEST_INSPECTOR_PANEcss, TEST_LOGGERcss, TP_BRANCHcss, TP_LOG_ROWcss, LOG_SPANcss, TP_ROOTcss } from "./tp.css";
import type { TestPanel, TestPanels } from "./tp.types";
import { make_hosted_test_panel_adapter } from "./hosted-test-panel-adapter";
import { make_remote_hosted_test_runtime } from "./hosted-test-panel-runtime";
import { HOSTED_TEST_VISIBLE_SUITES, type HostedTestSuiteId } from "../../hosted-test/hosted-test-suite";
import type { HostedTestPanelAdapter } from "./hosted-test-panel-adapter";
import { make_hosted_test_case_list } from "./hosted-test-case-list";
import { copy_hosted_case_report, open_hosted_case_report, serialize_hosted_run_report } from "./hosted-test-report-view";
import { format_hosted_test_duration } from "../../hosted-test/hosted-test-timing";

const LOG_HR_FULL = "|=•=-----=•=-----=•=|"
const LOG_HR_PART = " ----------=•=|"

const MODES = HOSTED_TEST_VISIBLE_SUITES.map((entry) => Object.freeze({ key: entry.id, label: entry.label }));

type LogVerbosity = "normal" | "verbose";
const LOG_VERBOSITY: readonly LogVerbosity[] = ["normal", "verbose"];

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

function populateModeSelector(suiteSel: LiveTree, mode: HostedTestSuiteId): void {
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
    copyReportsBtn: LiveTree;
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
    const copyReportsBtn = mk_div_id_txt(controlsRow, "test-copy-reports", "copy reports").css.setMany({
        ...TEST_CLEAR_BTNcss,
        gridColumn: "1 / 3",
    });
    const chips = create_test_chips(rowContainer);

    return { runBtn, suiteSel, verbosityBtn, clearBtn, copyReportsBtn, chips };
}

type TestSurfaceParts = {
    leftColumn: LiveTree;
    rightColumn: LiveTree;
    casePane: LiveTree;
    logger: LiveTree;
};

function createTestSurface(branch: LiveTree): TestSurfaceParts {
    const leftColumn = mk_div_id(branch, "test-left-column").css.setMany(TEST_CONTENTcss);
    const rightColumn = mk_div_id(branch, "test-right-column").css.setMany(TEST_LOG_PANEcss);

    const casePane = mk_div_id(leftColumn, "test-case-pane")
        .css.setMany(TEST_INSPECTOR_PANEcss);

    const logger = mk_div_id(rightColumn, "test-logger")
        .css.setMany(TEST_LOGGERcss);

    return { leftColumn, rightColumn, casePane, logger };
}

export function tp_factory(): TestPanel {
    let mounted = false;
    let level: UiLevel = "normal";
    let mode: HostedTestSuiteId = "hosted/all";
    let verbosity: LogVerbosity = "normal";

    const branch = hson.liveTree.create.div()
        .id.set("test-panel-branch")
        .css.setMany(TP_BRANCHcss);

    const { leftColumn, rightColumn, casePane, logger } = createTestSurface(branch);
    const { runBtn, suiteSel, verbosityBtn, clearBtn, copyReportsBtn, chips } = create_test_console(leftColumn, rightColumn);

    const tlog = create_test_log();
    let hostedAdapter: HostedTestPanelAdapter | undefined;
    let lastResult: Awaited<ReturnType<HostedTestPanelAdapter["start"]>> | undefined;
    const caseList = make_hosted_test_case_list(casePane, {
        async view(key) {
            if (!hostedAdapter) throw new Error("Hosted runtime is not ready.");
            open_hosted_case_report(await hostedAdapter.inspect(key));
        },
        async copy(key) {
            if (!hostedAdapter) throw new Error("Hosted runtime is not ready.");
            await copy_hosted_case_report(await hostedAdapter.inspect(key));
        },
    });

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
    hostedAdapter = make_hosted_test_panel_adapter(hostedRuntime.client, {
        reset(suite) {
            chips.clear();
            tlog.clear();
            clearLogLines();
            caseList.reset();
            appendLogLine(`running hosted ${suite}…`);
        },
        onEvent(event) { doLogOnEvent(event); caseList.on_event(event); },
        renderSummary(summary) {
            chips.render(summary);
        },
        renderReport() {},
        showInfrastructureError(message) {
            appendLogLine(`host error: ${message}`);
            caseList.show_error(message);
        },
        renderTiming(timing) {
            chips.render({ ...tlog.getSummary(), msTotal: timing.roundTripMs });
            appendLogLine(`elapsed ${format_hosted_test_duration(timing.roundTripMs)} · runner ${format_hosted_test_duration(timing.runnerMs)} · host ${format_hosted_test_duration(timing.hostMs)}`);
        },
    });
    void hostedRuntime.ready().catch((error: unknown) => {
        appendLogLine(`host connection error: ${error instanceof Error ? error.message : String(error)}`);
    });

    const mount = (hostBody: LiveTree): void => {
        if (mounted) return;
        mounted = true;
        hostBody.append(branch);

        populateModeSelector(suiteSel, mode);

        suiteSel.listen.on("change", () => {
            const v = suiteSel.form.getValue() ?? "hosted/all";
            mode = (MODES.find(m => m.key === v)?.key ?? "hosted/all");
        });

        implClickFeedback(runBtn);
        implClickFeedback(clearBtn);
        implClickFeedback(verbosityBtn);
        implClickFeedback(copyReportsBtn);

        verbosityBtn.listen.onClick(() => {
            verbosity = nextVerbosity(verbosity);
            syncVerbosity();
            appendLogLine(`log verbosity: ${verbosity}`);
        });

        syncVerbosity();

        runBtn.listen.onClick(async () => {

            const hostedSuite = mode;
            try {
                await hostedRuntime.ready();
                lastResult = await hostedAdapter!.start(hostedSuite);
            } catch (error) {
                if (hostedAdapter.router === undefined) {
                    appendLogLine(`host connection error: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
        });

        copyReportsBtn.listen.onClick(async () => {
            try {
                if (!hostedAdapter || !lastResult) throw new Error("Run a hosted collection before copying reports.");
                const report = hostedAdapter.capture();
                if (!report) throw new Error("No hosted report is available.");
                const text = await serialize_hosted_run_report(report, lastResult, (key) => hostedAdapter!.inspect(key));
                await navigator.clipboard.writeText(text);
                appendLogLine("reports copied");
            } catch (error) { caseList.show_error(error instanceof Error ? error.message : String(error)); }
        });

        clearBtn.listen.onClick(() => {
            hostedAdapter.dispose();
            tlog.clear();
            chips.clear();
            clearLogLines();
            appendLogLine("idle");
            caseList.reset();
            lastResult = undefined;
        });

    };

    return {
        branch,
        mount,
        runBtn,
        clearBtn,
        suiteSel,
        logger,
        chips,
        getLevel: () => level,
        getMode: () => mode,
        clearLogs: clearLogLines,
        setLog: appendLogLine,
        dispose: () => {
            hostedAdapter?.dispose();
            hostedRuntime.dispose();
        },
    } as const;
}
export function mount_test_panels(host: LiveTree): TestPanels {
    const old = host.find.byId("test-panels-root");
    if (old) old.removeSelf();

    const root = host.create.div()
        .id.set("test-panels-root")
        .css.setMany(TP_ROOTcss);

    const tp = tp_factory();
    tp.mount(root);
    return {
        root,
        tp,
        testSurface: tp.branch,
        dispose: () => {
            tp.dispose();
            root.removeSelf();
        },
    };
}
