import { LiveTree, hson } from "hson-live";
import  { mk_div_id, mk_div_id_txt } from "../../utils/makers";
import { create_test_chips } from "./test-helpers";
import type { TestSummary, UiLevel } from "./tests.types";
import { TEST_ROW_CONTAINERcss, TP_CONTROL_ROWcss, TEST_RUN_BTNcss, TEST_CLEAR_BTNcss, TEST_SELECTORcss, TEST_CONTENTcss, TEST_LOG_PANEcss, TEST_INSPECTOR_PANEcss, TEST_LOGGERcss, TP_BRANCHcss, TP_LOG_ROWcss, TP_ROOTcss, TEST_COMPARISON_GRIDcss, TEST_COMPARISON_COLUMNcss, TEST_COMPARISON_LABELcss } from "./tp.css";
import type { TestPanel, TestPanels } from "./tp.types";
import { make_hosted_test_panel_adapter } from "./hosted-test-panel-adapter";
import { make_remote_hosted_test_runtime } from "./hosted-test-panel-runtime";
import { HOSTED_TEST_VISIBLE_SUITES, type HostedTestSuiteId } from "../../hosted-test/hosted-test-suite";
import type { HostedTestPanelAdapter } from "./hosted-test-panel-adapter";
import { make_hosted_test_case_list, type HostedTestCaseList } from "./hosted-test-case-list";
import { copy_hosted_case_report, open_hosted_case_report, serialize_hosted_run_report } from "./hosted-test-report-view";
import { format_hosted_test_duration } from "../../hosted-test/hosted-test-timing";
import { make_hosted_test_live_inspector, type HostedTestLiveInspector } from "./hosted-test-live-inspector";

// TODO - tidy up selector: keep future display labels separate from canonical suite IDs.
const MODES = HOSTED_TEST_VISIBLE_SUITES.map((entry) => Object.freeze({ key: entry.id, label: entry.label }));
const HOSTED_TEST_RECOVERY_RUN_KEY = "hson-livedemo.hosted-test.run-id";

function remembered_hosted_test_run(): string | undefined {
    try { return globalThis.sessionStorage?.getItem(HOSTED_TEST_RECOVERY_RUN_KEY) ?? undefined; }
    catch { return undefined; }
}

function remember_hosted_test_run(runId?: string): void {
    try {
        if (runId === undefined) globalThis.sessionStorage?.removeItem(HOSTED_TEST_RECOVERY_RUN_KEY);
        else globalThis.sessionStorage?.setItem(HOSTED_TEST_RECOVERY_RUN_KEY, runId);
    } catch { /* Storage may be unavailable in privacy-restricted contexts. */ }
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

function visible_suite_for(suite: HostedTestSuiteId): HostedTestSuiteId {
    if (suite === "livemap/replay") return "category/livemap";
    if (suite === "livehost/all") return "category/livehost";
    if (suite === "node/all" || suite === "dom/core" || suite === "canvas/core") return "hosted/all";
    return suite;
}

function supports_live_inspector_comparison(suite: HostedTestSuiteId): boolean {
    return suite === "livemap/replay" || suite === "category/livemap";
}

type TestConsoleParts = {
    runBtn: LiveTree;
    suiteSel: LiveTree;
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
    const copyReportsBtn = mk_div_id_txt(controlsRow, "test-copy-reports", "copy reports").css.setMany({
        ...TEST_CLEAR_BTNcss,
        gridColumn: "1 / 3",
    });
    const chips = create_test_chips(rowContainer);

    return { runBtn, suiteSel, clearBtn, copyReportsBtn, chips };
}

type TestSurfaceParts = {
    leftColumn: LiveTree;
    rightColumn: LiveTree;
    comparisonGrid: LiveTree;
    legacyPane: LiveTree;
    inspectorColumn: LiveTree;
    inspectorPane: LiveTree;
    logger: LiveTree;
};

function createTestSurface(branch: LiveTree): TestSurfaceParts {
    const leftColumn = mk_div_id(branch, "test-left-column").css.setMany(TEST_CONTENTcss);
    const rightColumn = mk_div_id(branch, "test-right-column").css.setMany(TEST_LOG_PANEcss);

    const comparisonGrid = mk_div_id(leftColumn, "test-comparison-grid").css.setMany({ ...TEST_INSPECTOR_PANEcss, ...TEST_COMPARISON_GRIDcss });
    const legacyColumn = mk_div_id(comparisonGrid, "test-legacy-column").css.setMany(TEST_COMPARISON_COLUMNcss);
    legacyColumn.create.div().text.set("legacy projection").css.setMany(TEST_COMPARISON_LABELcss);
    const legacyPane = mk_div_id(legacyColumn, "test-case-pane").css.setMany(TEST_INSPECTOR_PANEcss);
    const inspectorColumn = mk_div_id(comparisonGrid, "test-live-inspector-column").css.setMany(TEST_COMPARISON_COLUMNcss);
    inspectorColumn.create.div().text.set("live inspector").css.setMany(TEST_COMPARISON_LABELcss);
    const inspectorPane = mk_div_id(inspectorColumn, "test-live-inspector-pane").css.setMany(TEST_INSPECTOR_PANEcss);

    const logger = mk_div_id(rightColumn, "test-logger")
        .css.setMany(TEST_LOGGERcss);

    return { leftColumn, rightColumn, comparisonGrid, legacyPane, inspectorColumn, inspectorPane, logger };
}

export function tp_factory(): TestPanel {
    let mounted = false;
    let level: UiLevel = "normal";
    let mode: HostedTestSuiteId = "hosted/all";

    const branch = hson.liveTree.create.div()
        .id.set("test-panel-branch")
        .css.setMany(TP_BRANCHcss);

    const { leftColumn, rightColumn, comparisonGrid, legacyPane, inspectorColumn, inspectorPane, logger } = createTestSurface(branch);
    const { runBtn, suiteSel, clearBtn, copyReportsBtn, chips } = create_test_console(leftColumn, rightColumn);
    let hostedAdapter: HostedTestPanelAdapter | undefined;
    let lastResult: Awaited<ReturnType<HostedTestPanelAdapter["start"]>> | undefined;
    let caseList: HostedTestCaseList | undefined;
    let liveInspector: HostedTestLiveInspector | undefined;
    let latestSummary: TestSummary = { suites: 0, cases: 0, pass: 0, fail: 0, skip: 0, msTotal: 0, failures: [] };
    let cancelSummaryFrame: (() => void) | undefined;

    const make_case_list = (): HostedTestCaseList => {
        let projection: HostedTestCaseList;
        projection = make_hosted_test_case_list(legacyPane, {
            async view(key) {
                const adapter = hostedAdapter;
                if (!adapter) throw new Error("Hosted runtime is not ready.");
                const diagnostic = await adapter.inspect(key);
                if (caseList === projection) open_hosted_case_report(diagnostic);
            },
            async copy(key) {
                const adapter = hostedAdapter;
                if (!adapter) throw new Error("Hosted runtime is not ready.");
                const diagnostic = await adapter.inspect(key);
                if (caseList === projection) await copy_hosted_case_report(diagnostic);
            },
        });
        return projection;
    };

    const replace_case_list = (suite: HostedTestSuiteId = mode): void => {
        caseList?.dispose();
        liveInspector?.dispose();
        legacyPane.empty();
        inspectorPane.empty();
        caseList = make_case_list();
        liveInspector = make_hosted_test_live_inspector(inspectorPane, suite);
        inspectorColumn.css.setMany({ display: supports_live_inspector_comparison(suite) ? "grid" : "none" });
        comparisonGrid.css.setMany({ gridTemplateColumns: supports_live_inspector_comparison(suite)
            ? "repeat(auto-fit, minmax(min(100%, 28rem), 1fr))"
            : "minmax(0, 1fr)" });
    };

    const flush_summary = (): void => {
        cancelSummaryFrame?.();
        cancelSummaryFrame = undefined;
        chips.render(latestSummary);
    };

    const schedule_summary = (terminal: boolean): void => {
        if (terminal) {
            flush_summary();
            return;
        }
        if (cancelSummaryFrame !== undefined) return;
        let active = true;
        const id = requestAnimationFrame(() => {
            cancelSummaryFrame = undefined;
            if (active) chips.render(latestSummary);
        });
        cancelSummaryFrame = () => {
            if (!active) return;
            active = false;
            cancelAnimationFrame(id);
        };
    };

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

    const clearLogLines = (): void => {
        logger.empty();
    };

    const hostedRuntime = make_remote_hosted_test_runtime();
    hostedAdapter = make_hosted_test_panel_adapter(hostedRuntime, {
        reset(suite) {
            cancelSummaryFrame?.();
            cancelSummaryFrame = undefined;
            chips.clear();
            clearLogLines();
            replace_case_list(suite);
            latestSummary = { suites: 0, cases: 0, pass: 0, fail: 0, skip: 0, msTotal: 0, failures: [] };
            appendLogLine(`running hosted ${suite}…`);
        },
        ingest(update) {
            const projection = caseList;
            if (projection === undefined) return;
            projection.ingest(update);
            liveInspector?.ingest(update);
            latestSummary = {
                suites: projection.suite_count(),
                cases: update.report.summary.cases,
                pass: update.report.summary.pass,
                fail: update.report.summary.fail,
                skip: update.report.summary.skip,
                msTotal: update.report.run.timing?.runnerMs ?? 0,
                failures: [],
            };
            schedule_summary(update.terminal);
        },
        showInfrastructureError(message) {
            appendLogLine(`host error: ${message}`);
            caseList?.show_error(message);
        },
        renderTiming(timing) {
            latestSummary = { ...latestSummary, msTotal: timing.roundTripMs };
            flush_summary();
            appendLogLine(`elapsed ${format_hosted_test_duration(timing.roundTripMs)} · runner ${format_hosted_test_duration(timing.runnerMs)} · host ${format_hosted_test_duration(timing.hostMs)}`);
        },
    });
    void hostedRuntime.ready().then(async () => {
        const runId = remembered_hosted_test_run();
        if (runId === undefined) return;
        try {
            lastResult = await hostedAdapter!.recover(runId);
            mode = visible_suite_for(lastResult.suite);
            if (mounted) populateModeSelector(suiteSel, mode);
        } catch {
            remember_hosted_test_run();
        }
    }).catch((error: unknown) => {
        appendLogLine(`host connection error: ${error instanceof Error ? error.message : String(error)}`);
    });

    const mount = (hostBody: LiveTree): void => {
        if (mounted) return;
        mounted = true;
        hostBody.append(branch);
        replace_case_list();

        populateModeSelector(suiteSel, mode);

        suiteSel.listen.on("change", () => {
            const v = suiteSel.form.getValue() ?? "hosted/all";
            mode = (MODES.find(m => m.key === v)?.key ?? "hosted/all");
        });

        implClickFeedback(runBtn);
        implClickFeedback(clearBtn);
        implClickFeedback(copyReportsBtn);

        runBtn.listen.onClick(async () => {

            const hostedSuite = mode;
            try {
                await hostedRuntime.ready();
                lastResult = await hostedAdapter!.start(hostedSuite);
                remember_hosted_test_run(lastResult.runId);
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
            } catch (error) { caseList?.show_error(error instanceof Error ? error.message : String(error)); }
        });

        clearBtn.listen.onClick(() => {
            hostedAdapter.dispose();
            cancelSummaryFrame?.();
            cancelSummaryFrame = undefined;
            chips.clear();
            clearLogLines();
            appendLogLine("idle");
            replace_case_list();
            latestSummary = { suites: 0, cases: 0, pass: 0, fail: 0, skip: 0, msTotal: 0, failures: [] };
            lastResult = undefined;
            remember_hosted_test_run();
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
            cancelSummaryFrame?.();
            cancelSummaryFrame = undefined;
            caseList?.dispose();
            liveInspector?.dispose();
            hostedAdapter?.dispose();
            hostedRuntime.dispose();
        },
    } as const;
}
export function mount_test_panels(host: LiveTree): TestPanels {
    const old = host.find.byId("test-panels-root");
    if (old) old.remove();

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
            root.remove();
        },
    };
}
