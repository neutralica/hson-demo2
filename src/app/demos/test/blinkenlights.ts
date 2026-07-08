// blinkenlights.ts

import type { LiveTree } from "hson-live";
import {
    BLINKENLIGHT_ACTIVE_LABELcss,
    BLINKENLIGHT_ACTIVE_METAcss,
    BLINKENLIGHT_ACTIVE_PODcss,
    BLINKENLIGHT_ACTIVE_RAILcss,
    BLINKENLIGHT_HEADERcss,
    BLINKENLIGHT_LED_STATUScss,
    BLINKENLIGHT_LEDcss,
    BLINKENLIGHT_PANELcss,
    BLINKENLIGHT_RAILcss,
    BLINKENLIGHT_SUITE_CARDcss,
    BLINKENLIGHT_SUITE_GRIDcss,
    BLINKENLIGHT_SUITE_LABELcss,
    BLINKENLIGHT_SUITE_METAcss,
    BLINKENLIGHT_SUMMARY_MAINcss,
    BLINKENLIGHT_SUMMARY_METAcss,
    BLINKENLIGHT_SUMMARYcss,
} from "./tp.css";
import type { TestEvent, TestSuitePlan } from "./tests.types";

type BlinkStatus = "idle" | "running" | "pass" | "fail";
type SuiteStatus = "idle" | "running" | "pass" | "fail";


type BlinkSuiteModel = {
    key: string;
    label: string;
    planned: number;
    done: number;
    fail: number;
    nextIndex: number;
    activeIndex: number | undefined;
    activeCase: string | undefined;
    status: SuiteStatus;
    cells: BlinkStatus[];
    card: LiveTree;
    cardLabel: LiveTree;
    cardMeta: LiveTree;
    cardRail: LiveTree;
};

export type BlinkenlightsPanel = {
    branch: LiveTree;
    clear: () => void;
    loadPlan: (plan: readonly TestSuitePlan[]) => void;
    resetRun: () => void;
    onEvent: (e: TestEvent) => void;
};


const COMPACT_CELL_LIMIT = 16;
const ACTIVE_CELL_LIMIT = 48;
const EMPTY_TEXT = "▢";
const LIT_TEXT = "▣";
const FAIL_TEXT = "▣";

function label_for_suite(suite: string): string {
    const last = suite.split(/[/:]/).pop() ?? suite;
    return last.replace(/[-_]+/g, " ");
}

function text_for_status(status: BlinkStatus): string {
    if (status === "idle") return EMPTY_TEXT;
    if (status === "fail") return FAIL_TEXT;
    return LIT_TEXT;
}

function apply_led_status(led: LiveTree, status: BlinkStatus): void {
    led.attr.set("data-blinkenlight-status", status);
    led.text.set(text_for_status(status));
    led.css.setMany(BLINKENLIGHT_LED_STATUScss(status));
}

function create_led(host: LiveTree, status: BlinkStatus = "idle"): LiveTree {
    const led = host.create.span();
    led.attr.set("data-blinkenlight", "true");
    led.css.setMany(BLINKENLIGHT_LEDcss);
    apply_led_status(led, status);
    return led;
}

function compact_statuses(cells: readonly BlinkStatus[], limit: number): BlinkStatus[] {
    if (cells.length <= limit) return [...cells];

    const compacted: BlinkStatus[] = [];
    for (let i = 0; i < limit; i += 1) {
        const start = Math.floor((i * cells.length) / limit);
        const end = Math.max(start + 1, Math.floor(((i + 1) * cells.length) / limit));
        const bucket = cells.slice(start, end);

        if (bucket.includes("fail")) compacted.push("fail");
        else if (bucket.includes("running")) compacted.push("running");
        else if (bucket.some((status) => status === "pass")) compacted.push("pass");
        else compacted.push("idle");
    }

    return compacted;
}

function render_rail(rail: LiveTree, statuses: readonly BlinkStatus[]): void {
    rail.empty();
    for (const status of statuses) create_led(rail, status);
}

function planned_from_event(e: Extract<TestEvent, { t: "suite_begin" }>): number {
    return Math.max(1, e.totalPlanned ?? 1);
}

function progress_text(model: BlinkSuiteModel): string {
    const planned = Math.max(model.planned, model.cells.length, 1);
    const base = `${model.done}/${planned}`;
    if (model.fail > 0) return `${base} fail ${model.fail}`;
    return base;
}

function suite_total(suites: Iterable<BlinkSuiteModel>): number {
    let total = 0;
    for (const model of suites) total += Math.max(model.planned, 0);
    return total;
}

export function create_blinkenlights_panel(host: LiveTree): BlinkenlightsPanel {
    const suites = new Map<string, BlinkSuiteModel>();
    let runPlanned = 0;
    let runDone = 0;
    let runFail = 0;
    let activeSuiteKey: string | undefined;

    const branch = host.create.div()
        .id.set("test-blinkenlights")
        .css.setMany(BLINKENLIGHT_PANELcss);

    const header = branch.create.div().css.setMany(BLINKENLIGHT_HEADERcss);
    header.text.set("instrument panel");

    const summary = branch.create.div().css.setMany(BLINKENLIGHT_SUMMARYcss);
    const summaryMain = summary.create.div().css.setMany(BLINKENLIGHT_SUMMARY_MAINcss);
    const summaryMeta = summary.create.div().css.setMany(BLINKENLIGHT_SUMMARY_METAcss);

    const activePod = branch.create.div().css.setMany(BLINKENLIGHT_ACTIVE_PODcss);
    const activeLabel = activePod.create.div().css.setMany(BLINKENLIGHT_ACTIVE_LABELcss);
    const activeMeta = activePod.create.div().css.setMany(BLINKENLIGHT_ACTIVE_METAcss);
    const activeRail = activePod.create.div().css.setMany(BLINKENLIGHT_ACTIVE_RAILcss);

    const suiteGrid = branch.create.div().css.setMany(BLINKENLIGHT_SUITE_GRIDcss);

    const renderSummary = (): void => {
        if (runPlanned <= 0) {
            summaryMain.text.set("RUN —");
            summaryMeta.text.set("idle");
            return;
        }

        summaryMain.text.set(`RUN ${runDone}/${runPlanned}`);
        summaryMeta.text.set(runFail > 0 ? `fail ${runFail}` : activeSuiteKey ? "running" : "complete");
    };

    const renderActive = (): void => {
        const model = activeSuiteKey ? suites.get(activeSuiteKey) : undefined;
        if (!model) {
            activeLabel.text.set("ACTIVE SUITE");
            activeMeta.text.set("no active event");
            activeRail.empty();
            return;
        }

        activePod.attr.set("data-blinkenlight-suite-status", model.status);
        activeLabel.text.set(model.label);
        activeMeta.text.set(model.activeCase ? `${progress_text(model)} :: ${model.activeCase}` : progress_text(model));
        render_rail(activeRail, compact_statuses(model.cells, ACTIVE_CELL_LIMIT));
    };

    const renderSuiteCard = (model: BlinkSuiteModel): void => {
        model.card.attr.set("data-blinkenlight-suite-status", model.status);
        model.cardLabel.text.set(model.label);
        model.cardMeta.text.set(progress_text(model));
        render_rail(model.cardRail, compact_statuses(model.cells, COMPACT_CELL_LIMIT));
    };

    const renderAll = (): void => {
        renderSummary();
        renderActive();
        for (const model of suites.values()) renderSuiteCard(model);
    };

    const ensureSuite = (suite: string, planned = 1): BlinkSuiteModel => {
        const existing = suites.get(suite);
        if (existing) return existing;

        const card = suiteGrid.create.div().css.setMany(BLINKENLIGHT_SUITE_CARDcss);
        card.attr.set("data-blinkenlight-suite", suite);

        const cardLabel = card.create.div().css.setMany(BLINKENLIGHT_SUITE_LABELcss);
        const cardMeta = card.create.div().css.setMany(BLINKENLIGHT_SUITE_METAcss);
        const cardRail = card.create.div().css.setMany(BLINKENLIGHT_RAILcss);

        const model: BlinkSuiteModel = {
            key: suite,
            label: label_for_suite(suite),
            planned,
            done: 0,
            fail: 0,
            nextIndex: 0,
            activeIndex: undefined,
            activeCase: undefined,
            status: "idle",
            cells: Array.from({ length: planned }, () => "idle"),
            card,
            cardLabel,
            cardMeta,
            cardRail,
        };

        suites.set(suite, model);
        renderSuiteCard(model);
        return model;
    };

    const resetSuiteModel = (model: BlinkSuiteModel): void => {
        model.done = 0;
        model.fail = 0;
        model.nextIndex = 0;
        model.activeIndex = undefined;
        model.activeCase = undefined;
        model.status = "idle";
        model.cells = Array.from({ length: Math.max(model.planned, 1) }, () => "idle");
    };

    const clear = (): void => {
        suites.clear();
        suiteGrid.empty();
        activeSuiteKey = undefined;
        runPlanned = 0;
        runDone = 0;
        runFail = 0;
        renderAll();
    };

    const loadPlan = (plan: readonly TestSuitePlan[]): void => {
        suites.clear();
        suiteGrid.empty();
        activeSuiteKey = undefined;
        runDone = 0;
        runFail = 0;

        for (const item of plan) {
            const count = Math.max(item.count, 1);
            const model = ensureSuite(item.key, count);
            model.label = item.label;
            model.planned = count;
            resetSuiteModel(model);
            renderSuiteCard(model);
        }

        runPlanned = suite_total(suites.values());
        renderAll();
    };

    const resetRun = (): void => {
        activeSuiteKey = undefined;
        runDone = 0;
        runFail = 0;
        for (const model of suites.values()) {
            resetSuiteModel(model);
            renderSuiteCard(model);
        }
        runPlanned = suite_total(suites.values());
        renderAll();
    };

    const onEvent = (e: TestEvent): void => {
        if (e.t === "suite_begin") {
            const planned = planned_from_event(e);
            const model = ensureSuite(e.suite, planned);

            model.planned = planned;
            model.done = 0;
            model.fail = 0;
            model.nextIndex = 0;
            model.activeIndex = undefined;
            model.activeCase = undefined;
            model.status = "running";
            model.cells = Array.from({ length: planned }, () => "idle");

            runPlanned = suite_total(suites.values());
            activeSuiteKey = e.suite;
            renderAll();
            return;
        }

        if (e.t === "case_begin") {
            const model = ensureSuite(e.suite);
            const activeIndex = model.nextIndex;

            while (model.cells.length <= activeIndex) model.cells.push("idle");
            model.activeIndex = activeIndex;
            model.activeCase = e.name;
            model.nextIndex += 1;
            model.status = "running";
            model.cells[activeIndex] = "running";
            activeSuiteKey = e.suite;
            renderAll();
            return;
        }

        if (e.t === "case_end") {
            const model = ensureSuite(e.suite);
            const index = model.activeIndex ?? Math.max(0, model.nextIndex - 1);

            while (model.cells.length <= index) model.cells.push("idle");
            model.cells[index] = e.status === "pass" ? "pass" : "fail";
            model.done += 1;
            runDone += 1;

            if (e.status === "fail") {
                model.fail += 1;
                runFail += 1;
            }

            model.activeIndex = undefined;
            model.activeCase = undefined;
            activeSuiteKey = e.suite;
            renderAll();
            return;
        }

        if (e.t === "suite_end") {
            const model = ensureSuite(e.suite);
            model.status = model.fail > 0 ? "fail" : "pass";
            model.activeIndex = undefined;
            model.activeCase = undefined;
            activeSuiteKey = undefined;
            renderAll();
        }
    };

    renderAll();

    return { branch, clear, loadPlan, resetRun, onEvent };
}
