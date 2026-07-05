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
                            {
                                ok: same_json(events, expected),
                                label: "sub emitted projected root changes until stopped",
                                actual: json_text(events),
                                expected: json_text(expected),
                            },
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
                            {
                                ok: events.length === 1,
                                label: "only one diff emitted before stop",
                                actual: String(events.length),
                                expected: "1",
                            },
                            {
                                ok: same_json(events, expected),
                                label: "diff event includes previous and next snapshots",
                                actual: json_text(events),
                                expected: json_text(expected),
                            },
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
                            {
                                ok: same_json(events, expected),
                                label: "selector emitted only selected changes",
                                actual: json_text(events),
                                expected: json_text(expected),
                            },
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
                            {
                                ok: same_json(events, expected),
                                label: "selector custom equality suppressed equivalent arrays",
                                actual: json_text(events),
                                expected: json_text(expected),
                            },
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
                            {
                                ok: same_json(events, expected),
                                label: "path emitted only path changes",
                                actual: json_text(events),
                                expected: json_text(expected),
                            },
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
                            {
                                ok: same_json(events, expected),
                                label: "path custom equality suppressed equivalent arrays",
                                actual: json_text(events),
                                expected: json_text(expected),
                            },
                        ],
                    };
                },
            },
        ] as const,
    };
}