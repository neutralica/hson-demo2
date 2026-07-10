// store-suites.ts

import { hson } from "hson-live";
import type { TestSuite } from "../../app/demos/test/tests.types";
import type { LiveMap } from "hson-live/types";

export const SUITE = "livemap/store";

type UiState = {
    ui: {
        currentView: string | null;
        activeWidgets: string[];
    };
};

type CountState = {
    count: number;
};

type CellState = {
    cells: Record<string, { raw: string }>;
    derived: {
        calls: number;
        lastRaw: string | null;
    };
};

type OptionalUiState = {
    ui: {
        currentView?: string | null;
        activeWidgets: string[];
    };
};

function as_ui_map(value: UiState): LiveMap<UiState> {
    return hson.liveMap.fromJson(value) as unknown as LiveMap<UiState>;
}

function as_count_map(value: CountState): LiveMap<CountState> {
    return hson.liveMap.fromJson(value) as unknown as LiveMap<CountState>;
}

function as_cell_map(value: CellState): LiveMap<CellState> {
    return hson.liveMap.fromJson(value) as unknown as LiveMap<CellState>;
}

function as_optional_ui_map(value: OptionalUiState): LiveMap<OptionalUiState> {
    return hson.liveMap.fromJson(value) as unknown as LiveMap<OptionalUiState>;
}

function same_json(a: unknown, b: unknown): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}

function json_text(value: unknown): string {
    return JSON.stringify(value);
}

function same_string_array(a: readonly string[], b: readonly string[]): boolean {
    return same_json(a, b);
}

function equal_row(label: string, actual: unknown, expected: unknown) {
    return {
        ok: same_json(actual, expected),
        label,
        actual: json_text(actual),
        expected: json_text(expected),
    };
}

export function livemap_suites_store(): TestSuite {
    return {
        suite: SUITE,
        cases: [
            {
                suite: SUITE,
                name: "sub receives projected root changes",
                run: () => {
                    const map = as_count_map({ count: 0 });
                    const events: CountState[] = [];

                    const stop = map.sub((next) => {
                        events.push(next);
                    });

                    map.at(["count"]).set(1);
                    stop();
                    map.at(["count"]).set(2);

                    const expected = [{ count: 1 }];

                    return {
                        assertRows: [
                            equal_row("sub emitted projected root changes until stopped", events, expected),
                        ],
                    };
                },
            },
            {
                suite: SUITE,
                name: "subscribeDiff receives next and previous snapshots",
                run: () => {
                    const map = as_count_map({ count: 0 });
                    const events: { prev: CountState; next: CountState }[] = [];

                    const stop = map.sub.diff((next, prev) => {
                        events.push({ prev, next });
                    });

                    map.at(["count"]).set(1);
                    stop();
                    map.at(["count"]).set(2);

                    const expected = [
                        {
                            prev: { count: 0 },
                            next: { count: 1 },
                        },
                    ];

                    return {
                        assertRows: [
                            equal_row("diff event includes previous and next snapshots", events, expected),
                        ],
                    };
                },
            },
            {
                suite: SUITE,
                name: "subscribeDiff skips unchanged root signature",
                run: () => {
                    const map = as_ui_map({
                        ui: {
                            currentView: null,
                            activeWidgets: [],
                        },
                    });
                    const events: { prev: UiState; next: UiState }[] = [];

                    const stop = map.sub.diff((next, prev) => {
                        events.push({ prev, next });
                    });

                    map.at(["ui"]).replace({ currentView: null, activeWidgets: [] });
                    map.at(["ui", "currentView"]).set("test");
                    stop();

                    const expected = [
                        {
                            prev: {
                                ui: {
                                    currentView: null,
                                    activeWidgets: [],
                                },
                            },
                            next: {
                                ui: {
                                    currentView: "test",
                                    activeWidgets: [],
                                },
                            },
                        },
                    ];

                    return {
                        assertRows: [
                            equal_row("diff suppressed unchanged JSON signature", events, expected),
                        ],
                    };
                },
            },
            {
                suite: SUITE,
                name: "subscribeSel emits only when selected value changes",
                run: () => {
                    const map = as_ui_map({
                        ui: {
                            currentView: null,
                            activeWidgets: [],
                        },
                    });
                    const events: { next: string | null; prev: string | null }[] = [];

                    const stop = map.sub.sel(
                        (state) => state.ui.currentView,
                        (next, prev) => {
                            events.push({ next, prev });
                        },
                    );

                    map.at(["ui", "activeWidgets"]).set(["point"]);
                    map.at(["ui", "currentView"]).set("test");
                    map.at(["ui", "currentView"]).set("test");
                    map.at(["ui", "currentView"]).set(null);
                    stop();

                    const expected = [
                        { next: "test", prev: null },
                        { next: null, prev: "test" },
                    ];

                    return {
                        assertRows: [
                            equal_row("selector emitted only selected changes", events, expected),
                        ],
                    };
                },
            },
            {
                suite: SUITE,
                name: "sub.sel supports custom equality",
                run: () => {
                    const map = as_ui_map({
                        ui: {
                            currentView: null,
                            activeWidgets: [],
                        },
                    });
                    const events: { next: string[]; prev: string[] }[] = [];

                    const stop = map.sub.sel(
                        (state) => state.ui.activeWidgets,
                        (next, prev) => {
                            events.push({ next, prev });
                        },
                        { equal: same_string_array },
                    );

                    map.at(["ui", "activeWidgets"]).set([]);
                    map.at(["ui", "activeWidgets"]).set(["point"]);
                    map.at(["ui", "activeWidgets"]).set(["point"]);
                    map.at(["ui", "activeWidgets"]).set(["point", "test"]);
                    stop();

                    const expected = [
                        { next: ["point"], prev: [] },
                        { next: ["point", "test"], prev: ["point"] },
                    ];

                    return {
                        assertRows: [
                            equal_row("selector custom equality suppressed equivalent arrays", events, expected),
                        ],
                    };
                },
            },
            {
                suite: SUITE,
                name: "subscribePath emits when path value changes",
                run: () => {
                    const map = as_ui_map({
                        ui: {
                            currentView: null,
                            activeWidgets: [],
                        },
                    });
                    const events: { next: string | null; prev: string | null }[] = [];

                    const stop = map.sub.path(["ui", "currentView"], (next, prev) => {
                        events.push({ next, prev });
                    });

                    map.at(["ui", "activeWidgets"]).set(["point"]);
                    map.at(["ui", "currentView"]).set("test");
                    map.at(["ui", "currentView"]).set("test");
                    map.at(["ui", "currentView"]).set(null);
                    stop();

                    const expected = [
                        { next: "test", prev: null },
                        { next: null, prev: "test" },
                    ];

                    return {
                        assertRows: [
                            equal_row("path emitted only path changes", events, expected),
                        ],
                    };
                },
            },
            {
                suite: SUITE,
                name: "sub.path emits when parent replace changes path value",
                run: () => {
                    const map = as_ui_map({
                        ui: {
                            currentView: null,
                            activeWidgets: [],
                        },
                    });
                    const events: { next: string | null; prev: string | null }[] = [];

                    const stop = map.sub.path(["ui", "currentView"], (next, prev) => {
                        events.push({ next, prev });
                    });

                    map.at(["ui"]).replace({ currentView: "test", activeWidgets: ["point"] });
                    stop();

                    const expected = [
                        { next: "test", prev: null },
                    ];

                    return {
                        assertRows: [
                            equal_row("path emitted for parent endpoint replacement", events, expected),
                        ],
                    };
                },
            },
            {
                suite: SUITE,
                name: "sub.path supports custom equality",
                run: () => {
                    const map = as_ui_map({
                        ui: {
                            currentView: null,
                            activeWidgets: [],
                        },
                    });
                    const events: { next: string[]; prev: string[] }[] = [];

                    const stop = map.sub.path(["ui", "activeWidgets"], (next, prev) => {
                        events.push({ next, prev });
                    }, { equal: same_string_array });

                    map.at(["ui", "currentView"]).set("test");
                    map.at(["ui", "activeWidgets"]).set([]);
                    map.at(["ui", "activeWidgets"]).set(["point"]);
                    map.at(["ui", "activeWidgets"]).set(["point"]);
                    map.at(["ui", "activeWidgets"]).set(["point", "test"]);
                    stop();

                    const expected = [
                        { next: ["point"], prev: [] },
                        { next: ["point", "test"], prev: ["point"] },
                    ];

                    return {
                        assertRows: [
                            equal_row("path custom equality suppressed equivalent arrays", events, expected),
                        ],
                    };
                },
            },
            {
                suite: SUITE,
                name: "sub.path parent emits when child value changes",
                run: () => {
                    const map = as_ui_map({
                        ui: {
                            currentView: null,
                            activeWidgets: [],
                        },
                    });
                    const events: { next: UiState["ui"]; prev: UiState["ui"] }[] = [];

                    const stop = map.sub.path(["ui"], (next, prev) => {
                        events.push({ next, prev });
                    });

                    map.at(["ui", "currentView"]).set("test");
                    stop();

                    const expected = [
                        {
                            next: { currentView: "test", activeWidgets: [] },
                            prev: { currentView: null, activeWidgets: [] },
                        },
                    ];

                    return {
                        assertRows: [
                            equal_row("parent path emitted after child update", events, expected),
                        ],
                    };
                },
            },
            {
                suite: SUITE,
                name: "sub.path child ignores sibling updates",
                run: () => {
                    const map = as_ui_map({
                        ui: {
                            currentView: null,
                            activeWidgets: [],
                        },
                    });
                    const events: { next: string | null; prev: string | null }[] = [];

                    const stop = map.sub.path(["ui", "currentView"], (next, prev) => {
                        events.push({ next, prev });
                    });

                    map.at(["ui", "activeWidgets"]).set(["point"]);
                    map.at(["ui", "activeWidgets"]).set(["point", "test"]);
                    stop();

                    return {
                        assertRows: [
                            equal_row("child path ignored sibling branch changes", events, []),
                        ],
                    };
                },
            },
            {
                suite: SUITE,
                name: "sub.sel listener receives cloned selected values",
                run: () => {
                    const map = as_ui_map({
                        ui: {
                            currentView: null,
                            activeWidgets: [],
                        },
                    });

                    const stop = map.sub.sel(
                        (state) => state.ui.activeWidgets,
                        (next) => {
                            next.push("mutated-by-subscriber");
                        },
                    );

                    map.at(["ui", "activeWidgets"]).set(["point"]);
                    stop();

                    const expected = {
                        ui: {
                            currentView: null,
                            activeWidgets: ["point"],
                        },
                    };

                    return {
                        assertRows: [
                            equal_row("selector snapshot mutation did not mutate map", map.snap(), expected),
                        ],
                    };
                },
            },
            {
                suite: SUITE,
                name: "sub.diff listener receives cloned snapshots",
                run: () => {
                    const map = as_ui_map({
                        ui: {
                            currentView: null,
                            activeWidgets: [],
                        },
                    });

                    const stop = map.sub.diff((next, prev) => {
                        next.ui.currentView = "mutated-next";
                        prev.ui.currentView = "mutated-prev";
                    });

                    map.at(["ui", "currentView"]).set("test");
                    stop();

                    const expected = {
                        ui: {
                            currentView: "test",
                            activeWidgets: [],
                        },
                    };

                    return {
                        assertRows: [
                            equal_row("diff snapshot mutation did not mutate map", map.snap(), expected),
                        ],
                    };
                },
            },
            {
                suite: SUITE,
                name: "sub listeners run in registration order",
                run: () => {
                    const map = as_count_map({ count: 0 });
                    const events: string[] = [];

                    const stopA = map.sub(() => {
                        events.push("a");
                    });
                    const stopB = map.sub(() => {
                        events.push("b");
                    });
                    const stopC = map.sub(() => {
                        events.push("c");
                    });

                    map.at(["count"]).set(1);
                    stopA();
                    stopB();
                    stopC();

                    return {
                        assertRows: [
                            equal_row("root subscribers fired in registration order", events, ["a", "b", "c"]),
                        ],
                    };
                },
            },
            {
                suite: SUITE,
                name: "stopping one sub listener leaves later listeners active",
                run: () => {
                    const map = as_count_map({ count: 0 });
                    const events: string[] = [];

                    const stopA = map.sub(() => {
                        events.push("a");
                    });
                    const stopB = map.sub(() => {
                        events.push("b");
                    });

                    stopA();
                    map.at(["count"]).set(1);
                    stopB();

                    return {
                        assertRows: [
                            equal_row("remaining subscriber still fired", events, ["b"]),
                        ],
                    };
                },
            },
            {
                suite: SUITE,
                name: "sub.path stop prevents later path events",
                run: () => {
                    const map = as_ui_map({
                        ui: {
                            currentView: null,
                            activeWidgets: [],
                        },
                    });
                    const events: { next: string | null; prev: string | null }[] = [];

                    const stop = map.sub.path(["ui", "currentView"], (next, prev) => {
                        events.push({ next, prev });
                    });

                    map.at(["ui", "currentView"]).set("test");
                    stop();
                    map.at(["ui", "currentView"]).set("point");

                    const expected = [
                        { next: "test", prev: null },
                    ];

                    return {
                        assertRows: [
                            equal_row("path subscriber stopped after first event", events, expected),
                        ],
                    };
                },
            },
            {
                suite: SUITE,
                name: "sub.path supports root path",
                run: () => {
                    const map = as_count_map({ count: 0 });
                    const events: { next: CountState; prev: CountState }[] = [];

                    const stop = map.sub.path([], (next, prev) => {
                        events.push({ next, prev });
                    });

                    map.at(["count"]).set(1);
                    stop();

                    const expected = [
                        {
                            next: { count: 1 },
                            prev: { count: 0 },
                        },
                    ];

                    return {
                        assertRows: [
                            equal_row("empty path observed root changes", events, expected),
                        ],
                    };
                },
            },
            {
                suite: SUITE,
                name: "sub.path custom equality receives previous selected value",
                run: () => {
                    const map = as_ui_map({
                        ui: {
                            currentView: null,
                            activeWidgets: [],
                        },
                    });
                    const comparisons: { next: string[]; prev: string[] }[] = [];

                    const stop = map.sub.path(["ui", "activeWidgets"], () => {
                        // listener intentionally empty; this case inspects equality inputs
                    }, {
                        equal: (next, prev) => {
                            comparisons.push({ next, prev });
                            return same_string_array(next, prev);
                        },
                    });

                    map.at(["ui", "activeWidgets"]).set([]);
                    map.at(["ui", "activeWidgets"]).set(["point"]);
                    stop();

                    const expected = [
                        { next: ["point"], prev: [] },
                    ];

                    return {
                        assertRows: [
                            equal_row("path equality received next and previous selected values", comparisons, expected),
                        ],
                    };
                },
            },
            {
                suite: SUITE,
                name: "sub.sel custom equality receives previous selected value",
                run: () => {
                    const map = as_ui_map({
                        ui: {
                            currentView: null,
                            activeWidgets: [],
                        },
                    });
                    const comparisons: { next: string[]; prev: string[] }[] = [];

                    const stop = map.sub.sel(
                        (state) => state.ui.activeWidgets,
                        () => {
                            // listener intentionally empty; this case inspects equality inputs
                        },
                        {
                            equal: (next, prev) => {
                                comparisons.push({ next, prev });
                                return same_string_array(next, prev);
                            },
                        },
                    );

                    map.at(["ui", "activeWidgets"]).set([]);
                    map.at(["ui", "activeWidgets"]).set(["point"]);
                    stop();

                    const expected = [
                        { next: ["point"], prev: [] },
                    ];

                    return {
                        assertRows: [
                            equal_row("selector equality received next and previous selected values", comparisons, expected),
                        ],
                    };
                },
            },
            {
                suite: SUITE,
                name: "sub root snapshots are cloned",
                run: () => {
                    const map = as_ui_map({
                        ui: {
                            currentView: null,
                            activeWidgets: [],
                        },
                    });

                    const stop = map.sub((next) => {
                        next.ui.currentView = "mutated-by-subscriber";
                        next.ui.activeWidgets.push("mutated-by-subscriber");
                    });

                    map.at(["ui", "currentView"]).set("test");
                    stop();

                    const expected = {
                        ui: {
                            currentView: "test",
                            activeWidgets: [],
                        },
                    };

                    return {
                        assertRows: [
                            equal_row("subscriber root snapshot mutation did not mutate map", map.snap(), expected),
                        ],
                    };
                },
            },
            {
                suite: SUITE,
                name: "sub.path snapshots are cloned",
                run: () => {
                    const map = as_ui_map({
                        ui: {
                            currentView: null,
                            activeWidgets: [],
                        },
                    });

                    const stop = map.sub.path(["ui", "activeWidgets"], (next) => {
                        next.push("mutated-by-subscriber");
                    });

                    map.at(["ui", "activeWidgets"]).set(["point"]);
                    stop();

                    const expected = {
                        ui: {
                            currentView: null,
                            activeWidgets: ["point"],
                        },
                    };

                    return {
                        assertRows: [
                            equal_row("subscriber path snapshot mutation did not mutate map", map.snap(), expected),
                        ],
                    };
                },
            },
            {
                suite: SUITE,
                name: "sub.path listener can write unrelated derived branch",
                run: () => {
                    const map = as_cell_map({
                        cells: {
                            A1: { raw: "" },
                        },
                        derived: {
                            calls: 0,
                            lastRaw: null,
                        },
                    });
                    const events: { next: CellState["cells"]; prev: CellState["cells"] }[] = [];

                    const stop = map.sub.path(["cells"], (next, prev) => {
                        events.push({ next, prev });
                        map.at(["derived"]).replace({
                            calls: events.length,
                            lastRaw: next.A1?.raw ?? null,
                        });
                    });

                    map.at(["cells", "A1", "raw"]).set("12");
                    stop();

                    const expectedEvents = [
                        {
                            next: { A1: { raw: "12" } },
                            prev: { A1: { raw: "" } },
                        },
                    ];
                    const expectedMap = {
                        cells: {
                            A1: { raw: "12" },
                        },
                        derived: {
                            calls: 1,
                            lastRaw: "12",
                        },
                    };

                    return {
                        assertRows: [
                            equal_row("cells listener fired once", events, expectedEvents),
                            equal_row("listener wrote unrelated derived branch", map.snap(), expectedMap),
                        ],
                    };
                },
            },
            {
                suite: SUITE,
                name: "sub.path listener ignores its own unrelated branch write",
                run: () => {
                    const map = as_cell_map({
                        cells: {
                            A1: { raw: "" },
                        },
                        derived: {
                            calls: 0,
                            lastRaw: null,
                        },
                    });
                    let cellEvents = 0;
                    let derivedEvents = 0;

                    const stopCells = map.sub.path(["cells"], (next) => {
                        cellEvents += 1;
                        map.at(["derived"]).replace({
                            calls: cellEvents,
                            lastRaw: next.A1?.raw ?? null,
                        });
                    });
                    const stopDerived = map.sub.path(["derived"], () => {
                        derivedEvents += 1;
                    });

                    map.at(["cells", "A1", "raw"]).set("12");
                    stopCells();
                    stopDerived();

                    return {
                        assertRows: [
                            equal_row("cells listener did not loop on derived write", cellEvents, 1),
                            equal_row("derived listener observed derived write", derivedEvents, 1),
                        ],
                    };
                },
            },
            {
                suite: SUITE,
                name: "sub.path subscriber mutation does not poison later previous value",
                run: () => {
                    const map = as_ui_map({
                        ui: {
                            currentView: null,
                            activeWidgets: [],
                        },
                    });
                    const events: { next: string[]; prev: string[] }[] = [];

                    const stop = map.sub.path(["ui", "activeWidgets"], (next, prev) => {
                        events.push({ next: [...next], prev: [...prev] });
                        next.push("mutated-by-subscriber");
                    });

                    map.at(["ui", "activeWidgets"]).set(["point"]);
                    map.at(["ui", "activeWidgets"]).set(["point", "test"]);
                    stop();

                    const expected = [
                        { next: ["point"], prev: [] },
                        { next: ["point", "test"], prev: ["point"] },
                    ];

                    return {
                        assertRows: [
                            equal_row("subscriber mutation did not affect later prev", events, expected),
                        ],
                    };
                },
            },
            {
                suite: SUITE,
                name: "sub.sel subscriber mutation does not poison later previous value",
                run: () => {
                    const map = as_ui_map({
                        ui: {
                            currentView: null,
                            activeWidgets: [],
                        },
                    });
                    const events: { next: string[]; prev: string[] }[] = [];

                    const stop = map.sub.sel(
                        (state) => state.ui.activeWidgets,
                        (next, prev) => {
                            events.push({ next: [...next], prev: [...prev] });
                            next.push("mutated-by-subscriber");
                        },
                    );

                    map.at(["ui", "activeWidgets"]).set(["point"]);
                    map.at(["ui", "activeWidgets"]).set(["point", "test"]);
                    stop();

                    const expected = [
                        { next: ["point"], prev: [] },
                        { next: ["point", "test"], prev: ["point"] },
                    ];

                    return {
                        assertRows: [
                            equal_row("selector subscriber mutation did not affect later prev", events, expected),
                        ],
                    };
                },
            },
            {
                suite: SUITE,
                name: "sub.path sibling subscribers receive isolated snapshots",
                run: () => {
                    const map = as_ui_map({
                        ui: {
                            currentView: null,
                            activeWidgets: [],
                        },
                    });
                    const events: string[][] = [];

                    const stopA = map.sub.path(["ui", "activeWidgets"], (next) => {
                        next.push("mutated-by-first-subscriber");
                    });
                    const stopB = map.sub.path(["ui", "activeWidgets"], (next) => {
                        events.push([...next]);
                    });

                    map.at(["ui", "activeWidgets"]).set(["point"]);
                    stopA();
                    stopB();

                    return {
                        assertRows: [
                            equal_row("second subscriber received clean path snapshot", events, [["point"]]),
                        ],
                    };
                },
            },
            {
                suite: SUITE,
                name: "sub root sibling subscribers receive isolated snapshots",
                run: () => {
                    const map = as_ui_map({
                        ui: {
                            currentView: null,
                            activeWidgets: [],
                        },
                    });
                    const events: UiState[] = [];

                    const stopA = map.sub((next) => {
                        next.ui.currentView = "mutated-by-first-subscriber";
                        next.ui.activeWidgets.push("mutated-by-first-subscriber");
                    });
                    const stopB = map.sub((next) => {
                        events.push(next);
                    });

                    map.at(["ui", "currentView"]).set("test");
                    stopA();
                    stopB();

                    const expected = [
                        {
                            ui: {
                                currentView: "test",
                                activeWidgets: [],
                            },
                        },
                    ];

                    return {
                        assertRows: [
                            equal_row("second root subscriber received clean snapshot", events, expected),
                        ],
                    };
                },
            },
            {
                suite: SUITE,
                name: "sub listener can stop itself during emit",
                run: () => {
                    const map = as_count_map({ count: 0 });
                    const events: number[] = [];
                    let stop: (() => void) | undefined;

                    stop = map.sub((next) => {
                        events.push(next.count);
                        stop?.();
                    });

                    map.at(["count"]).set(1);
                    map.at(["count"]).set(2);

                    return {
                        assertRows: [
                            equal_row("self-stopped listener did not fire again", events, [1]),
                        ],
                    };
                },
            },
            {
                suite: SUITE,
                name: "sub listener stopped during emit is inactive on later emits",
                run: () => {
                    const map = as_count_map({ count: 0 });
                    const events: string[] = [];
                    let stopB: (() => void) | undefined;

                    const stopA = map.sub(() => {
                        events.push("a");
                        stopB?.();
                    });
                    stopB = map.sub(() => {
                        events.push("b");
                    });

                    map.at(["count"]).set(1);
                    map.at(["count"]).set(2);
                    stopA();
                    stopB?.();

                    return {
                        assertRows: [
                            equal_row("listener stopped during emit still fired for current emit only", events, ["a", "b", "a"]),
                        ],
                    };
                },
            },
            {
                suite: SUITE,
                name: "sub listener added during emit starts on later emits",
                run: () => {
                    const map = as_count_map({ count: 0 });
                    const events: string[] = [];
                    let added = false;
                    let stopB: (() => void) | undefined;

                    const stopA = map.sub(() => {
                        events.push("a");
                        if (!added) {
                            added = true;
                            stopB = map.sub(() => {
                                events.push("b");
                            });
                        }
                    });

                    map.at(["count"]).set(1);
                    map.at(["count"]).set(2);
                    stopA();
                    stopB?.();

                    return {
                        assertRows: [
                            equal_row("new listener did not fire until later emit", events, ["a", "a", "b"]),
                        ],
                    };
                },
            },
            {
                suite: SUITE,
                name: "sub.path emits when missing leaf is created",
                run: () => {
                    const map = as_optional_ui_map({
                        ui: {
                            activeWidgets: [],
                        },
                    });
                    const events: { next: string | null | undefined; prev: string | null | undefined }[] = [];

                    const stop = map.sub.path(["ui", "currentView"], (next, prev) => {
                        events.push({ next, prev });
                    });

                    map.at(["ui"]).replace({ activeWidgets: [], currentView: "test" });
                    stop();

                    const expected = [
                        { next: "test", prev: undefined },
                    ];

                    return {
                        assertRows: [
                            equal_row("missing path observed value created by parent replacement", events, expected),
                        ],
                    };
                },
            },
            {
                suite: SUITE,
                name: "sub.path parent emits when missing child is created",
                run: () => {
                    const map = as_optional_ui_map({
                        ui: {
                            activeWidgets: [],
                        },
                    });
                    const events: { next: OptionalUiState["ui"]; prev: OptionalUiState["ui"] }[] = [];

                    const stop = map.sub.path(["ui"], (next, prev) => {
                        events.push({ next, prev });
                    });

                    map.at(["ui"]).replace({ activeWidgets: [], currentView: "test" });
                    stop();

                    const expected = [
                        {
                            next: { activeWidgets: [], currentView: "test" },
                            prev: { activeWidgets: [] },
                        },
                    ];

                    return {
                        assertRows: [
                            equal_row("parent path emitted after replacement created missing child", events, expected),
                        ],
                    };
                },
            },
            {
                suite: SUITE,
                name: "sub root ignores no-op same-value write",
                run: () => {
                    const map = as_count_map({ count: 0 });
                    const events: CountState[] = [];

                    const stop = map.sub((next) => {
                        events.push(next);
                    });

                    map.at(["count"]).set(0);
                    map.at(["count"]).set(1);
                    stop();

                    return {
                        assertRows: [
                            equal_row("root subscriber ignored no-op write", events, [{ count: 1 }]),
                        ],
                    };
                },
            },
            {
                suite: SUITE,
                name: "sub.path emits when parent replace removes selected value",
                run: () => {
                    const map = as_optional_ui_map({
                        ui: {
                            currentView: "test",
                            activeWidgets: [],
                        },
                    });
                    const events: { next: string | null | undefined; prev: string | null | undefined }[] = [];

                    const stop = map.sub.path(["ui", "currentView"], (next, prev) => {
                        events.push({ next, prev });
                    });

                    map.at(["ui"]).replace({ activeWidgets: ["point"] });
                    stop();

                    const expected = [
                        { next: undefined, prev: "test" },
                    ];

                    return {
                        assertRows: [
                            equal_row("parent replace emitted removed selected value", events, expected),
                        ],
                    };
                },
            },
        ] as const,
    };
}