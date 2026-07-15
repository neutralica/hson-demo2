import { LiveTree, hson } from "hson-live";
import  { mk_div_id, mk_div_id_txt } from "../../utils/makers";
import { create_test_chips } from "./test-helpers";
import type { TestSummary, UiLevel } from "./tests.types";
import { TEST_ROW_CONTAINERcss, TP_CONTROL_ROWcss, TEST_RUN_BTNcss, TEST_CLEAR_BTNcss, TEST_SELECTORcss, TEST_CONTENTcss, TEST_LOG_PANEcss, TEST_INSPECTOR_PANEcss, TEST_LOGGERcss, TP_BRANCHcss, TP_LOG_ROWcss, TP_ROOTcss } from "./tp.css";
import type { TestPanel, TestPanels } from "./tp.types";
import { make_hosted_test_panel_adapter } from "./hosted-test-panel-adapter";
import { make_remote_hosted_test_runtime } from "./hosted-test-panel-runtime";
import { HOSTED_TEST_VISIBLE_SUITES, type HostedTestSuiteId } from "../../hosted-test/hosted-test-suite";
import type { HostedTestPanelAdapter } from "./hosted-test-panel-adapter";
import { make_hosted_test_case_list, type HostedTestCaseList } from "./hosted-test-case-list";
import { copy_hosted_case_report, open_hosted_case_report, serialize_hosted_run_report } from "./hosted-test-report-view";
import { format_hosted_test_duration } from "../../hosted-test/hosted-test-timing";

const MODES = HOSTED_TEST_VISIBLE_SUITES.map((entry) => Object.freeze({ key: entry.id, label: entry.label }));

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

    const branch = hson.liveTree.create.div()
        .id.set("test-panel-branch")
        .css.setMany(TP_BRANCHcss);

    const { leftColumn, rightColumn, casePane, logger } = createTestSurface(branch);
    const { runBtn, suiteSel, clearBtn, copyReportsBtn, chips } = create_test_console(leftColumn, rightColumn);
    let hostedAdapter: HostedTestPanelAdapter | undefined;
    let lastResult: Awaited<ReturnType<HostedTestPanelAdapter["start"]>> | undefined;
    let caseList: HostedTestCaseList | undefined;
    let latestSummary: TestSummary = { suites: 0, cases: 0, pass: 0, fail: 0, skip: 0, msTotal: 0, failures: [] };
    let cancelSummaryFrame: (() => void) | undefined;

    const make_case_list = (): HostedTestCaseList => {
        let projection: HostedTestCaseList;
        projection = make_hosted_test_case_list(casePane, {
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

    const replace_case_list = (): void => {
        caseList?.dispose();
        caseList = make_case_list();
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
    hostedAdapter = make_hosted_test_panel_adapter(hostedRuntime.client, {
        reset(suite) {
            cancelSummaryFrame?.();
            cancelSummaryFrame = undefined;
            chips.clear();
            clearLogLines();
            replace_case_list();
            latestSummary = { suites: 0, cases: 0, pass: 0, fail: 0, skip: 0, msTotal: 0, failures: [] };
            appendLogLine(`running hosted ${suite}…`);
        },
        ingest(update) {
            const projection = caseList;
            if (projection === undefined) return;
            projection.ingest(update);
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
    void hostedRuntime.ready().catch((error: unknown) => {
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
