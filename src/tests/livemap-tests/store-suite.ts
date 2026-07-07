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

function as_ui_map(value: UiState): LiveMap<UiState> {
    return hson.liveMap.fromJson(value) as unknown as LiveMap<UiState>;
}

function as_count_map(value: CountState): LiveMap<CountState> {
    return hson.liveMap.fromJson(value) as unknown as LiveMap<CountState>;
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
                            prev: { ui: { currentView: null, activeWidgets: [] } },
                            next: { ui: { currentView: "test", activeWidgets: [] } },
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
        ] as const,
    };
}