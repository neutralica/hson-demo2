import { hson } from "hson-live";
import { LiveTree } from "hson-live/livetree";
import  { mk_div_id, mk_div_id_txt } from "../../utils/makers";
import { create_test_chips } from "./test-helpers";
import type { TestSummary, UiLevel } from "./tests.types";
import { TEST_ROW_CONTAINERcss, TP_CONTROL_ROWcss, TEST_RUN_BTNcss, TEST_CLEAR_BTNcss, TEST_SELECTORcss, TEST_CONTENTcss, TEST_LOG_PANEcss, TEST_INSPECTOR_PANEcss, TEST_LOGGERcss, TP_BRANCHcss, TP_LOG_ROWcss, TP_ROOTcss } from "./tp.css";
import type { TestPanel, TestPanels } from "./tp.types";
import { make_hosted_test_panel_adapter } from "./hosted-test-panel-adapter";
import { make_remote_hosted_test_runtime } from "./hosted-test-panel-runtime";
import type { HostedTestPanelAdapter } from "./hosted-test-panel-adapter";
import { make_hosted_test_case_list, type HostedTestCaseList } from "./hosted-test-case-list";
import {
    copy_hosted_case_report,
    hosted_external_launcher_log_projection,
    open_hosted_case_report,
    serialize_hosted_run_report,
} from "./hosted-test-report-view";
import {
    hosted_test_projection_footer,
    hosted_test_projection_summary,
    type HostedTestProjectionSummary,
} from "./hosted-test-report-summary";
import { format_hosted_test_duration } from "../../hosted-test/hosted-test-timing";
import type { TestExecutorDiscovery } from "../../../test-system/test-discovery";
import {
    hosted_test_panel_selected_ids,
    hosted_test_panel_display_label,
    hosted_test_panel_primary_choices,
    hosted_test_panel_suite_choices,
    hosted_test_panel_test_choices,
    type HostedTestPanelSelectionChoice,
} from "./hosted-test-panel-selection";

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

function populate_discovered_selector(
    suiteSel: LiveTree,
    choices: readonly HostedTestPanelSelectionChoice[],
    selectedKey: string,
): void {
    suiteSel.empty();
    for (const choice of choices) {
        const option = suiteSel.create.option();
        option.attrs.set("value", choice.key);
        option.text.set(hosted_test_panel_display_label(choice.label));
        if (choice.key === selectedKey) option.flags.set("selected");
    }
}

function populate_targeted_suite_selector(
    suiteSel: LiveTree,
    choices: readonly HostedTestPanelSelectionChoice[],
    selectedKey?: string,
    allSuitesLabel = "all suites",
): void {
    suiteSel.empty();
    const placeholder = suiteSel.create.option();
    placeholder.attrs.set("value", "");
    placeholder.text.set(allSuitesLabel);
    if (selectedKey === undefined) placeholder.flags.set("selected");
    for (const choice of choices) {
        const option = suiteSel.create.option();
        option.attrs.set("value", choice.key);
        option.text.set(hosted_test_panel_display_label(choice.label));
        if (choice.key === selectedKey) option.flags.set("selected");
    }
}

function populate_targeted_test_selector(
    testSel: LiveTree,
    choices: readonly HostedTestPanelSelectionChoice[],
    selectedKey?: string,
    allCasesCount?: number,
): void {
    testSel.empty();
    const entireSuite = testSel.create.option();
    entireSuite.attrs.set("value", "");
    entireSuite.text.set(allCasesCount === undefined ? "all cases" : `all cases (${allCasesCount})`);
    if (selectedKey === undefined) entireSuite.flags.set("selected");
    for (const choice of choices) {
        const option = testSel.create.option();
        option.attrs.set("value", choice.key);
        option.text.set(hosted_test_panel_display_label(choice.label));
        if (choice.key === selectedKey) option.flags.set("selected");
    }
}

function all_suites_label(
    primary: HostedTestPanelSelectionChoice | undefined,
    suiteCount: number,
): string {
    if (primary?.selection.kind === "subject") return `all ${primary.selection.subject} suites (${suiteCount})`;
    if (primary?.selection.kind === "collection") return `all ${primary.selection.collection} suites (${suiteCount})`;
    return "all suites";
}

function set_selector_enabled(selector: LiveTree, enabled: boolean): void {
    if (enabled) selector.flags.clear("disabled");
    else selector.flags.set("disabled");
    selector.css.set.opacity(enabled ? "1" : "0.35");
}

type TestConsoleParts = {
    runBtn: LiveTree;
    suiteSel: LiveTree;
    targetedSuiteSel: LiveTree;
    targetedTestSel: LiveTree;
    clearBtn: LiveTree;
    copyReportsBtn: LiveTree;
    executorLabel: LiveTree;
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
    const targetedSuiteSel = controlsRow.create.select().id.set("test-targeted-suite").css.setMany({
        ...TEST_SELECTORcss,
        gridColumn: "1 / 3",
        opacity: "0.35",
    });
    const targetedTestSel = controlsRow.create.select().id.set("test-targeted-case").css.setMany({
        ...TEST_SELECTORcss,
        gridColumn: "1 / 3",
        opacity: "0.35",
    });
    const copyReportsBtn = mk_div_id_txt(controlsRow, "test-copy-reports", "copy reports").css.setMany({
        ...TEST_CLEAR_BTNcss,
        gridColumn: "1 / 3",
    });
    const executorLabel = mk_div_id_txt(controlsRow, "test-executor", "connecting…")
        .attrs.set("data-testid", "hosted-test-executor")
        .css.setMany({
            gridColumn: "1 / 3",
            fontSize: "0.72rem",
            opacity: "0.75",
            textAlign: "center",
            cursor: "pointer",
        });
    const chips = create_test_chips(rowContainer);

    return { runBtn, suiteSel, targetedSuiteSel, targetedTestSel, clearBtn, copyReportsBtn, executorLabel, chips };
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

    const casePane = mk_div_id(leftColumn, "test-case-pane").css.setMany(TEST_INSPECTOR_PANEcss);

    const logger = mk_div_id(rightColumn, "test-logger")
        .css.setMany(TEST_LOGGERcss);

    return { leftColumn, rightColumn, casePane, logger };
}

export function tp_factory(): TestPanel {
    let mounted = false;
    let level: UiLevel = "normal";
    let discovery: TestExecutorDiscovery | undefined;
    let selectionKey = "all";
    let selectionChoices: readonly HostedTestPanelSelectionChoice[] = Object.freeze([]);
    let targetedSuiteChoices: readonly HostedTestPanelSelectionChoice[] = Object.freeze([]);
    let targetedSuiteKey: string | undefined;
    let targetedTestChoices: readonly HostedTestPanelSelectionChoice[] = Object.freeze([]);
    let targetedTestKey: string | undefined;

    const branch = hson.liveTree.create.div()
        .id.set("test-panel-branch")
        .attrs.setMany({
            "data-testid": "hosted-test-panel",
            "data-hosted-execution-count": "0",
            "data-hosted-panel-state": "connecting",
        })
        .css.setMany(TP_BRANCHcss);

    const { leftColumn, rightColumn, casePane, logger } = createTestSurface(branch);
    const { runBtn, suiteSel, targetedSuiteSel, targetedTestSel, clearBtn, copyReportsBtn, executorLabel, chips } = create_test_console(leftColumn, rightColumn);
    let hostedAdapter: HostedTestPanelAdapter | undefined;
    let lastResult: Awaited<ReturnType<HostedTestPanelAdapter["start"]>> | undefined;
    let caseList: HostedTestCaseList | undefined;
    let latestSummary: TestSummary = { suites: 0, cases: 0, pass: 0, fail: 0, skip: 0, msTotal: 0, failures: [] };
    let latestProjectionSummary: HostedTestProjectionSummary | undefined;
    let latestSummaryProjectionKey = "";
    let cancelSummaryFrame: (() => void) | undefined;
    let explicitExecutionCount = 0;
    let plannedCanonicalSuites = 0;
    let plannedExternalSuites = 0;
    const completedCanonicalSuites = new Set<string>();
    const completedExternalSuites = new Set<string>();
    const canonicalSuiteCases = new Map<string, Readonly<{ total: number; fail: number }>>();

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
        if (latestProjectionSummary === undefined) chips.render(latestSummary);
        else chips.renderEntries(hosted_test_projection_footer(latestProjectionSummary, latestSummary.msTotal));
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
            if (active) {
                if (latestProjectionSummary === undefined) chips.render(latestSummary);
                else chips.renderEntries(hosted_test_projection_footer(latestProjectionSummary, latestSummary.msTotal));
            }
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
    const externalLogRows = new Map<string, LiveTree>();
    const externalLogStatuses = new Map<string, string>();
    const shownExternalFailures = new Set<string>();

    const update_run_progress = (): void => {
        if (branch.attrs.get("data-hosted-panel-state") !== "running") return;
        executorLabel.text.set(
            `running · canonical ${completedCanonicalSuites.size}/${plannedCanonicalSuites} suites · library ${completedExternalSuites.size}/${plannedExternalSuites} suites`,
        );
    };

    hostedAdapter = make_hosted_test_panel_adapter(hostedRuntime, {
        reset(suite) {
            cancelSummaryFrame?.();
            cancelSummaryFrame = undefined;
            chips.clear();
            clearLogLines();
            replace_case_list();
            latestSummary = { suites: 0, cases: 0, pass: 0, fail: 0, skip: 0, msTotal: 0, failures: [] };
            latestProjectionSummary = undefined;
            latestSummaryProjectionKey = "";
            externalLogRows.clear();
            externalLogStatuses.clear();
            shownExternalFailures.clear();
            completedCanonicalSuites.clear();
            completedExternalSuites.clear();
            canonicalSuiteCases.clear();
            appendLogLine(`running hosted ${suite}…`);
            update_run_progress();
        },
        ingest(update) {
            const projection = caseList;
            if (projection === undefined) return;
            projection.ingest(update);
            latestSummary = {
                suites: projection.suite_count(),
                cases: hosted_test_projection_summary(update.report).canonical.total,
                pass: hosted_test_projection_summary(update.report).canonical.pass,
                fail: hosted_test_projection_summary(update.report).canonical.fail,
                skip: hosted_test_projection_summary(update.report).canonical.skip,
                msTotal: update.report.run.timing?.runnerMs ?? 0,
                failures: [],
            };
            latestProjectionSummary = hosted_test_projection_summary(update.report);
            const footer = hosted_test_projection_footer(latestProjectionSummary, latestSummary.msTotal);
            const summaryProjectionKey = JSON.stringify(footer);
            if (summaryProjectionKey !== latestSummaryProjectionKey) {
                latestSummaryProjectionKey = summaryProjectionKey;
                schedule_summary(update.terminal);
            }
            for (const testCase of update.newCases) {
                const previous = canonicalSuiteCases.get(testCase.suite) ?? { total: 0, fail: 0 };
                canonicalSuiteCases.set(testCase.suite, Object.freeze({
                    total: previous.total + 1,
                    fail: previous.fail + (testCase.status === "fail" ? 1 : 0),
                }));
            }
            for (const timing of update.newSuiteTimings) {
                if (timing.suite.startsWith("library::")) continue;
                if (completedCanonicalSuites.has(timing.suite)) continue;
                completedCanonicalSuites.add(timing.suite);
                const counts = canonicalSuiteCases.get(timing.suite) ?? { total: 0, fail: 0 };
                appendLogLine(
                    `${counts.fail === 0 ? "pass" : "fail"} ${timing.suite} — ${counts.total} cases — ${format_hosted_test_duration(timing.ms)}`,
                );
            }
            for (const launcher of Object.values(update.report.externalResults)) {
                const previousStatus = externalLogStatuses.get(launcher.id);
                const logProjection = hosted_external_launcher_log_projection(launcher);
                if (previousStatus !== launcher.status) {
                    externalLogStatuses.set(launcher.id, launcher.status);
                    const row = externalLogRows.get(launcher.id) ?? appendLogLine(logProjection.line);
                    externalLogRows.set(launcher.id, row);
                    row.css.setMany(TP_LOG_ROWcss(logProjection.line));
                    row.text.set(logProjection.line);
                }
                if (launcher.status === "pass" || launcher.status === "fail") {
                    completedExternalSuites.add(launcher.id);
                }
                if (launcher.status === "fail" && !shownExternalFailures.has(launcher.id)) {
                    shownExternalFailures.add(launcher.id);
                    for (const diagnostic of logProjection.failureDiagnostics) appendLogLine(diagnostic);
                }
            }
            update_run_progress();
        },
        showInfrastructureError(message) {
            appendLogLine(`host error: ${message}`);
            caseList?.show_error(message);
        },
        renderTiming(timing) {
            latestSummary = { ...latestSummary, msTotal: timing.roundTripMs };
            flush_summary();
            appendLogLine(`elapsed ${format_hosted_test_duration(timing.roundTripMs)} · runner ${format_hosted_test_duration(timing.runnerMs)} · host ${format_hosted_test_duration(timing.hostMs)}`);
            update_selected_presentation();
        },
    });
    runBtn.flags.set("disabled");
    suiteSel.flags.set("disabled");
    set_selector_enabled(targetedSuiteSel, false);
    set_selector_enabled(targetedTestSel, false);

    const selected_choice = (): HostedTestPanelSelectionChoice | undefined => (
        targetedTestKey !== undefined
            ? targetedTestChoices.find((entry) => entry.key === targetedTestKey)
            : targetedSuiteKey !== undefined
                ? targetedSuiteChoices.find((entry) => entry.key === targetedSuiteKey)
                : selectionChoices.find((entry) => entry.key === selectionKey)
    );

    const update_selected_presentation = (): void => {
        const choice = selected_choice();
        if (discovery !== undefined) {
            executorLabel.text.set(
                `${discovery.executor.label} · ${discovery.catalog.tests.length} canonical cases · ${discovery.externalTargets.length} library launchers · ${choice === undefined ? "no selection" : hosted_test_panel_display_label(choice.label)}`,
            );
        }
        branch.attrs.setMany({
            "data-hosted-selection": choice?.key ?? "",
            "data-hosted-selection-count": String(choice?.count ?? 0),
        });
    };

    const apply_discovery = (next: TestExecutorDiscovery): void => {
        discovery = next;
        selectionChoices = hosted_test_panel_primary_choices(next.catalog.tests, next.externalTargets);
        selectionKey = selectionChoices[0]?.key ?? "all";
        const primaryChoice = selectionChoices.find((choice) => choice.key === selectionKey);
        targetedSuiteChoices = primaryChoice === undefined
            ? Object.freeze([])
            : hosted_test_panel_suite_choices(next.catalog.tests, next.externalTargets, primaryChoice.selection);
        targetedSuiteKey = undefined;
        targetedTestChoices = Object.freeze([]);
        targetedTestKey = undefined;
        if (mounted) populate_discovered_selector(suiteSel, selectionChoices, selectionKey);
        if (mounted) populate_targeted_suite_selector(
            targetedSuiteSel,
            targetedSuiteChoices,
            undefined,
            all_suites_label(primaryChoice, targetedSuiteChoices.length),
        );
        if (mounted) populate_targeted_test_selector(targetedTestSel, targetedTestChoices);
        branch.attrs.setMany({
            "data-hosted-executor": next.executor.id,
            "data-hosted-catalog-version": next.catalogVersion,
            "data-hosted-panel-state": "ready",
        });
        suiteSel.flags.clear("disabled");
        set_selector_enabled(targetedSuiteSel, false);
        set_selector_enabled(targetedTestSel, false);
        update_selected_presentation();
        if (next.catalog.tests.length + next.externalTargets.length > 0) runBtn.flags.clear("disabled");
        else {
            runBtn.flags.set("disabled");
            appendLogLine("host discovery returned no executable tests");
        }
    };

    const refresh_discovery = async (): Promise<void> => {
        branch.attrs.set("data-hosted-panel-state", "discovering");
        executorLabel.text.set("discovering…");
        runBtn.flags.set("disabled");
        suiteSel.flags.set("disabled");
        set_selector_enabled(targetedSuiteSel, false);
        set_selector_enabled(targetedTestSel, false);
        apply_discovery(await hostedRuntime.discover());
    };

    void hostedRuntime.ready().then(async () => {
        try {
            await refresh_discovery();
        } catch (error) {
            branch.attrs.set("data-hosted-panel-state", "discovery-failed");
            executorLabel.text.set("host discovery failed");
            suiteSel.flags.set("disabled");
            set_selector_enabled(targetedSuiteSel, false);
            set_selector_enabled(targetedTestSel, false);
            runBtn.flags.set("disabled");
            appendLogLine(`host discovery failed: ${error instanceof Error ? error.message : String(error)}`);
        }
        const runId = remembered_hosted_test_run();
        if (runId === undefined) return;
        try {
            lastResult = await hostedAdapter!.recover(runId);
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

        populate_discovered_selector(suiteSel, selectionChoices, selectionKey);
        populate_targeted_suite_selector(targetedSuiteSel, Object.freeze([]));
        populate_targeted_test_selector(targetedTestSel, Object.freeze([]));
        set_selector_enabled(targetedSuiteSel, false);
        set_selector_enabled(targetedTestSel, false);

        suiteSel.listen.on("change", () => {
            const value = suiteSel.form.getValue() ?? "";
            if (discovery !== undefined) {
                selectionKey = selectionChoices.some((choice) => choice.key === value) ? value : "all";
                const primaryChoice = selectionChoices.find((choice) => choice.key === selectionKey);
                targetedSuiteChoices = primaryChoice === undefined
                    ? Object.freeze([])
                    : hosted_test_panel_suite_choices(
                        discovery.catalog.tests,
                        discovery.externalTargets,
                        primaryChoice.selection,
                    );
                targetedSuiteKey = undefined;
                targetedTestChoices = Object.freeze([]);
                targetedTestKey = undefined;
                populate_targeted_suite_selector(
                    targetedSuiteSel,
                    targetedSuiteChoices,
                    undefined,
                    all_suites_label(primaryChoice, targetedSuiteChoices.length),
                );
                populate_targeted_test_selector(targetedTestSel, targetedTestChoices);
                set_selector_enabled(targetedSuiteSel, primaryChoice?.selection.kind !== "all");
                set_selector_enabled(targetedTestSel, false);
                const choice = selected_choice();
                const testIds = choice === undefined
                    ? Object.freeze([])
                    : hosted_test_panel_selected_ids(discovery.catalog.tests, choice.selection, discovery.externalTargets);
                update_selected_presentation();
                if (testIds.length > 0) runBtn.flags.clear("disabled");
                else runBtn.flags.set("disabled");
                return;
            }
        });

        targetedSuiteSel.listen.on("change", () => {
            if (discovery === undefined) return;
            const value = targetedSuiteSel.form.getValue() ?? "";
            targetedSuiteKey = targetedSuiteChoices.some((choice) => choice.key === value) ? value : undefined;
            targetedTestKey = undefined;
            const targetedSuite = targetedSuiteChoices.find((choice) => choice.key === targetedSuiteKey);
            targetedTestChoices = targetedSuite?.selection.kind === "suite"
                ? hosted_test_panel_test_choices(discovery.catalog.tests, targetedSuite.selection.suite, discovery.externalTargets)
                : Object.freeze([]);
            populate_targeted_test_selector(targetedTestSel, targetedTestChoices, undefined, targetedSuite?.count);
            const selectedSuiteId = targetedSuite?.selection.kind === "suite" ? targetedSuite.selection.suite : undefined;
            if (targetedSuiteKey === undefined || selectedSuiteId !== undefined
              && discovery.externalTargets.some((target) => target.id === selectedSuiteId)) {
                set_selector_enabled(targetedTestSel, false);
            } else set_selector_enabled(targetedTestSel, true);
            const choice = selected_choice();
            const testIds = choice === undefined
                ? Object.freeze([])
                : hosted_test_panel_selected_ids(discovery.catalog.tests, choice.selection, discovery.externalTargets);
            update_selected_presentation();
            if (testIds.length > 0) runBtn.flags.clear("disabled");
            else runBtn.flags.set("disabled");
        });

        targetedTestSel.listen.on("change", () => {
            if (discovery === undefined || targetedSuiteKey === undefined) return;
            const value = targetedTestSel.form.getValue() ?? "";
            targetedTestKey = targetedTestChoices.some((choice) => choice.key === value) ? value : undefined;
            const choice = selected_choice();
            const testIds = choice === undefined
                ? Object.freeze([])
                : hosted_test_panel_selected_ids(discovery.catalog.tests, choice.selection, discovery.externalTargets);
            update_selected_presentation();
            if (testIds.length > 0) runBtn.flags.clear("disabled");
            else runBtn.flags.set("disabled");
        });

        implClickFeedback(runBtn);
        implClickFeedback(clearBtn);
        implClickFeedback(copyReportsBtn);

        executorLabel.listen.onClick(async () => {
            try {
                await refresh_discovery();
                appendLogLine("host catalog refreshed");
            } catch (error) {
                branch.attrs.set("data-hosted-panel-state", "discovery-failed");
                appendLogLine(`host discovery failed: ${error instanceof Error ? error.message : String(error)}`);
                suiteSel.flags.set("disabled");
                set_selector_enabled(targetedSuiteSel, false);
                set_selector_enabled(targetedTestSel, false);
                runBtn.flags.set("disabled");
            }
        });

        runBtn.listen.onClick(async () => {

            try {
                branch.attrs.set("data-hosted-panel-state", "running");
                runBtn.flags.set("disabled");
                suiteSel.flags.set("disabled");
                set_selector_enabled(targetedSuiteSel, false);
                set_selector_enabled(targetedTestSel, false);
                explicitExecutionCount += 1;
                branch.attrs.set("data-hosted-execution-count", String(explicitExecutionCount));
                await hostedRuntime.ready();
                if (discovery !== undefined) {
                    const activeDiscovery = discovery;
                    const choice = selected_choice();
                    const testIds = choice === undefined
                        ? Object.freeze([])
                        : hosted_test_panel_selected_ids(activeDiscovery.catalog.tests, choice.selection, activeDiscovery.externalTargets);
                    if (testIds.length === 0) throw new Error("The active discovered selection contains no tests.");
                    plannedCanonicalSuites = new Set(testIds
                        .filter((id) => !id.startsWith("library::"))
                        .map((id) => activeDiscovery.catalog.tests.find((test) => test.id === id)?.suite)
                        .filter((suite): suite is string => suite !== undefined)).size;
                    plannedExternalSuites = testIds.filter((id) => id.startsWith("library::")).length;
                    lastResult = await hostedAdapter!.start_selected(testIds);
                } else throw new Error("Canonical hosted-test discovery has not completed.");
                remember_hosted_test_run(lastResult.runId);
                branch.attrs.set("data-hosted-panel-state", "completed");
            } catch (error) {
                branch.attrs.set("data-hosted-panel-state", "run-rejected");
                if (hostedAdapter.router === undefined) {
                    appendLogLine(`run rejected: ${error instanceof Error ? error.message : String(error)}`);
                }
            } finally {
                suiteSel.flags.clear("disabled");
                if (discovery !== undefined) {
                    const primaryChoice = selectionChoices.find((choice) => choice.key === selectionKey);
                    set_selector_enabled(targetedSuiteSel, primaryChoice?.selection.kind !== "all");
                    const targetedSuite = targetedSuiteChoices.find((choice) => choice.key === targetedSuiteKey);
                    const selectedSuiteId = targetedSuite?.selection.kind === "suite" ? targetedSuite.selection.suite : undefined;
                    if (selectedSuiteId !== undefined
                      && !discovery.externalTargets.some((target) => target.id === selectedSuiteId)) {
                        set_selector_enabled(targetedTestSel, true);
                    } else {
                        set_selector_enabled(targetedTestSel, false);
                    }
                    if (discovery.catalog.tests.length + discovery.externalTargets.length > 0) runBtn.flags.clear("disabled");
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
            latestProjectionSummary = undefined;
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
        getMode: () => selectionKey,
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
