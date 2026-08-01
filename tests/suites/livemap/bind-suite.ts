// bind-suite.ts

import { hson } from "hson-live";
import type { TestCase, TestSuite } from "../../harness/core/test-contracts";
import { equal_row, preview_value } from "./test-helpers";

export function livemap_bind_suite(): TestSuite {
    const SUITE = "livemap/bind";

    return {
        suite: SUITE,
        cases: [
            make_bind_text_initial_case(SUITE),
            make_bind_text_update_case(SUITE),
            make_bind_text_previous_case(SUITE),
            make_bind_attr_boolean_case(SUITE),
            make_bind_attrs_mapper_case(SUITE),
            make_bind_css_mapper_case(SUITE),
            make_bind_attrs_drop_on_update_case(SUITE),
            make_bind_css_drop_on_update_case(SUITE),
            make_bind_paths_previous_case(SUITE),
            make_bind_text_missing_path_case(SUITE),
            make_bind_attr_mapper_case(SUITE),
            make_bind_paths_style_bridge_case(SUITE),
            make_bind_paths_dispose_case(SUITE),
            make_bind_text_paths_case(SUITE),
            make_bind_attrs_paths_case(SUITE),
            make_bind_css_paths_case(SUITE),
            make_bind_path_case(SUITE),
            make_bind_paths_case(SUITE),
            make_bind_dispose_case(SUITE),
        ] as const,
    };
}

function make_bind_text_initial_case(suite: string): TestCase {
    return {
        suite,
        name: "LiveTree bind.text syncs initial path value",
        meta: {
            input: preview_value({ label: "about" }),
            path: preview_value(["label"]),
        },
        run: () => {
            const host = hson.liveTree.create.div();
            const text = host.create.span();
            const map = hson.liveMap.fromJson({ label: "about" });

            const dispose = text.bind.text(map, ["label"]);

            const rows = [
                equal_row("text binding reads initial map value", text.text.get(), "about"),
            ];
            dispose();

            return { assertRows: rows };
        },
    };
}

function make_bind_text_update_case(suite: string): TestCase {
    return {
        suite,
        name: "LiveTree bind.text updates when path changes",
        meta: {
            input: preview_value({ label: "about" }),
            next: preview_value({ label: "parse" }),
        },
        run: () => {
            const host = hson.liveTree.create.div();
            const text = host.create.span();
            const map = hson.liveMap.fromJson({ label: "about" });

            const dispose = text.bind.text(map, ["label"]);
            map.at(["label"]).set("parse");

            const rows = [
                equal_row("text binding updates after map write", text.text.get(), "parse"),
            ];
            dispose();

            return { assertRows: rows };
        },
    };
}

function make_bind_text_previous_case(suite: string): TestCase {
    return {
        suite,
        name: "LiveTree bind.text mapper receives previous value",
        meta: {
            input: preview_value({ label: "about" }),
            next: preview_value({ label: "parse" }),
        },
        run: () => {
            const host = hson.liveTree.create.div();
            const text = host.create.span();
            const map = hson.liveMap.fromJson({ label: "about" });
            const seen: string[] = [];

            const dispose = text.bind.text(map, ["label"], (value, previous) => {
                seen.push(`${String(previous ?? "none")}→${String(value ?? "none")}`);
                return String(value ?? "");
            });
            map.at(["label"]).set("parse");

            const rows = [
                equal_row("initial sync has no previous value", seen[0], "none→about"),
                equal_row("update sync receives previous value", seen[1], "about→parse"),
            ];
            dispose();

            return { assertRows: rows };
        },
    };
}

function make_bind_attr_boolean_case(suite: string): TestCase {
    return {
        suite,
        name: "LiveTree bind.attr sets and drops boolean-style attrs",
        meta: {
            input: preview_value({ disabled: true }),
            next: preview_value({ disabled: false }),
        },
        run: () => {
            const host = hson.liveTree.create.div();
            const input = host.create.input();
            const map = hson.liveMap.fromJson({ disabled: true });

            const dispose = input.bind.attr(map, ["disabled"], "disabled");
            const initial = input.attrs.has("disabled");

            map.at(["disabled"]).set(false);
            const rows = [
                equal_row("true value sets attr", initial, true),
                equal_row("false value drops attr", input.attrs.has("disabled"), false),
            ];
            dispose();

            return { assertRows: rows };
        },
    };
}

function make_bind_attrs_mapper_case(suite: string): TestCase {
    return {
        suite,
        name: "LiveTree bind.attrs maps one path to many attrs",
        meta: {
            input: preview_value({ selected: false }),
            next: preview_value({ selected: true }),
        },
        run: () => {
            const host = hson.liveTree.create.div();
            const button = host.create.button();
            const map = hson.liveMap.fromJson({ selected: false });

            const dispose = button.bind.attrs(map, ["selected"], (selected) => ({
                "aria-pressed": selected ? "true" : "false",
                "data-selected": selected ? "yes" : null,
            }));

            const initialAria = button.attrs.get("aria-pressed");
            const initialSelected = button.attrs.has("data-selected");
            map.at(["selected"]).set(true);

            const rows = [
                equal_row("initial mapped attr is set", initialAria, "false"),
                equal_row("initial null mapped attr is absent", initialSelected, false),
                equal_row("mapped attr updates", button.attrs.get("aria-pressed"), "true"),
                equal_row("mapped nullable attr appears", button.attrs.get("data-selected"), "yes"),
            ];
            dispose();

            return { assertRows: rows };
        },
    };
}

function make_bind_css_mapper_case(suite: string): TestCase {
    return {
        suite,
        name: "LiveTree bind.css maps path value to style props",
        meta: {
            input: preview_value({ hovered: false }),
            next: preview_value({ hovered: true }),
        },
        run: () => {
            const host = hson.liveTree.create.div();
            const button = host.create.button();
            const map = hson.liveMap.fromJson({ hovered: false });

            const dispose = button.bind.css(map, ["hovered"], (hovered) => ({
                opacity: hovered ? 1 : 0.5,
                transform: hovered ? "scale(1.02)" : null,
            }));

            const initialOpacity = button.css.get.property("opacity");
            const initialTransform = button.css.get.property("transform");
            map.at(["hovered"]).set(true);

            const rows = [
                equal_row("initial css value is set", initialOpacity, "0.5"),
                equal_row("initial null css value is absent", initialTransform, undefined),
                equal_row("css value updates", button.css.get.property("opacity"), "1"),
                equal_row("css nullable value appears", button.css.get.property("transform"), "scale(1.02)"),
            ];
            dispose();

            return { assertRows: rows };
        },
    };
}

function make_bind_attrs_drop_on_update_case(suite: string): TestCase {
    return {
        suite,
        name: "LiveTree bind.attrs drops mapped attrs on later update",
        meta: {
            input: preview_value({ selected: true }),
            next: preview_value({ selected: false }),
        },
        run: () => {
            const host = hson.liveTree.create.div();
            const button = host.create.button();
            const map = hson.liveMap.fromJson({ selected: true });

            const dispose = button.bind.attrs(map, ["selected"], (selected) => ({
                "data-selected": selected ? "yes" : null,
            }));

            const initialSelected = button.attrs.get("data-selected");
            map.at(["selected"]).set(false);

            const rows = [
                equal_row("initial nullable attr appears", initialSelected, "yes"),
                equal_row("later null mapped attr is dropped", button.attrs.has("data-selected"), false),
            ];
            dispose();

            return { assertRows: rows };
        },
    };
}

function make_bind_css_drop_on_update_case(suite: string): TestCase {
    return {
        suite,
        name: "LiveTree bind.css removes mapped css props on later update",
        meta: {
            input: preview_value({ hovered: true }),
            next: preview_value({ hovered: false }),
        },
        run: () => {
            const host = hson.liveTree.create.div();
            const button = host.create.button();
            const map = hson.liveMap.fromJson({ hovered: true });

            const dispose = button.bind.css(map, ["hovered"], (hovered) => ({
                transform: hovered ? "scale(1.02)" : null,
            }));

            const initialTransform = button.css.get.property("transform");
            map.at(["hovered"]).set(false);

            const rows = [
                equal_row("initial nullable css value appears", initialTransform, "scale(1.02)"),
                equal_row("later null mapped css value is removed", button.css.get.property("transform"), undefined),
            ];
            dispose();

            return { assertRows: rows };
        },
    };
}

function make_bind_paths_previous_case(suite: string): TestCase {
    return {
        suite,
        name: "LiveTree bind.paths receives previous values",
        meta: {
            input: preview_value({ hoveredId: null, selectedId: "about" }),
            paths: preview_value([["hoveredId"], ["selectedId"]]),
        },
        run: () => {
            const host = hson.liveTree.create.div();
            const button = host.create.button();
            const map = hson.liveMap.fromJson({ hoveredId: null, selectedId: "about" });
            const seen: string[] = [];

            const dispose = button.bind.paths(map, [["hoveredId"], ["selectedId"]], (_tree, values, previous) => {
                const prev = previous ? `${String(previous[0] ?? "none")}/${String(previous[1] ?? "none")}` : "unset";
                const next = `${String(values[0] ?? "none")}/${String(values[1] ?? "none")}`;
                seen.push(`${prev}→${next}`);
            });

            map.at(["hoveredId"]).set("about");

            const rows = [
                equal_row("initial bind.paths call has no previous values", seen[0], "unset→none/about"),
                equal_row("updated bind.paths call receives previous values", seen[1], "none/about→about/about"),
            ];
            dispose();

            return { assertRows: rows };
        },
    };
}

function make_bind_text_missing_path_case(suite: string): TestCase {
    return {
        suite,
        name: "LiveTree bind.text maps null path to empty text",
        meta: {
            input: preview_value({ label: null }),
            path: preview_value(["label"]),
        },
        run: () => {
            const host = hson.liveTree.create.div();
            const text = host.create.span();
            const map = hson.liveMap.fromJson({ label: null });

            const dispose = text.bind.text(map, ["label"]);
            const initial = text.text.get();
            map.at(["label"]).set("about");

            const rows = [
                equal_row("null path starts as empty text", initial, ""),
                equal_row("null path binding updates when value appears", text.text.get(), "about"),
            ];
            dispose();

            return { assertRows: rows };
        },
    };
}

function make_bind_attr_mapper_case(suite: string): TestCase {
    return {
        suite,
        name: "LiveTree bind.attr maps value through formatter",
        meta: {
            input: preview_value({ index: 2 }),
            next: preview_value({ index: 7 }),
        },
        run: () => {
            const host = hson.liveTree.create.div();
            const item = host.create.li();
            const map = hson.liveMap.fromJson({ index: 2 });

            const dispose = item.bind.attr(map, ["index"], "data-index", (index) => `item-${String(index ?? "none")}`);
            const initial = item.attrs.get("data-index");
            map.at(["index"]).set(7);

            const rows = [
                equal_row("initial mapped attr value is formatted", initial, "item-2"),
                equal_row("updated mapped attr value is formatted", item.attrs.get("data-index"), "item-7"),
            ];
            dispose();

            return { assertRows: rows };
        },
    };
}

function make_bind_paths_style_bridge_case(suite: string): TestCase {
    return {
        suite,
        name: "LiveTree bind.paths can bridge multiple map paths to css",
        meta: {
            input: preview_value({ hoveredId: null, selectedId: "about" }),
            paths: preview_value([["hoveredId"], ["selectedId"]]),
        },
        run: () => {
            const host = hson.liveTree.create.div();
            const button = host.create.button();
            const map = hson.liveMap.fromJson({ hoveredId: null, selectedId: "about" });
            const id = "about";

            const dispose = button.bind.paths(map, [["hoveredId"], ["selectedId"]], (tree, values) => {
                const hovered = values[0] === id;
                const selected = values[1] === id;
                tree.css.setMany({
                    opacity: hovered ? "1" : selected ? "0.85" : "0.45",
                    strokeWidth: hovered ? "2.4" : selected ? "1.7" : "1.35",
                });
            });

            const initialOpacity = button.css.get.property("opacity");
            const initialStroke = button.css.get.property("stroke-width");
            map.at(["hoveredId"]).set("about");
            const hoverOpacity = button.css.get.property("opacity");
            const hoverStroke = button.css.get.property("stroke-width");
            map.at(["selectedId"]).set("parse");
            map.at(["hoveredId"]).set(null);

            const rows = [
                equal_row("initial selected state maps to css", initialOpacity, "0.85"),
                equal_row("initial selected stroke maps to css", initialStroke, "1.7"),
                equal_row("hovered state maps to css", hoverOpacity, "1"),
                equal_row("hovered stroke maps to css", hoverStroke, "2.4"),
                equal_row("unselected unhovered state maps to css", button.css.get.property("opacity"), "0.45"),
                equal_row("unselected unhovered stroke maps to css", button.css.get.property("stroke-width"), "1.35"),
            ];
            dispose();

            return { assertRows: rows };
        },
    };
}

function make_bind_paths_dispose_case(suite: string): TestCase {
    return {
        suite,
        name: "LiveTree bind.paths disposer stops all path updates",
        meta: {
            input: preview_value({ a: "one", b: "two" }),
            paths: preview_value([["a"], ["b"]]),
        },
        run: () => {
            const host = hson.liveTree.create.div();
            const text = host.create.span();
            const map = hson.liveMap.fromJson({ a: "one", b: "two" });

            const dispose = text.bind.paths(map, [["a"], ["b"]], (tree, values) => {
                tree.text.set(`${String(values[0] ?? "")}/${String(values[1] ?? "")}`);
            });
            const initial = text.text.get();
            dispose();
            map.at(["a"]).set("three");
            map.at(["b"]).set("four");

            return {
                assertRows: [
                    equal_row("initial bind.paths value is applied", initial, "one/two"),
                    equal_row("disposed bind.paths does not react to either path", text.text.get(), "one/two"),
                ],
            };
        },
    };
}

function make_bind_text_paths_case(suite: string): TestCase {
    return {
        suite,
        name: "LiveTree bind.textPaths maps multiple paths to text",
        meta: {
            input: preview_value({ first: "one", second: "two" }),
            paths: preview_value([["first"], ["second"]]),
        },
        run: () => {
            const host = hson.liveTree.create.div();
            const text = host.create.span();
            const map = hson.liveMap.fromJson({ first: "one", second: "two" });
            const seen: string[] = [];

            const dispose = text.bind.textPaths(map, [["first"], ["second"]], (values, previous) => {
                const prev = previous ? `${String(previous[0] ?? "")}/${String(previous[1] ?? "")}` : "unset";
                const next = `${String(values[0] ?? "")}/${String(values[1] ?? "")}`;
                seen.push(`${prev}→${next}`);
                return next;
            });

            const initial = text.text.get();
            map.at(["second"]).set("three");

            const rows = [
                equal_row("initial textPaths value is applied", initial, "one/two"),
                equal_row("updated textPaths value is applied", text.text.get(), "one/three"),
                equal_row("initial textPaths mapper has no previous values", seen[0], "unset→one/two"),
                equal_row("updated textPaths mapper receives previous values", seen[1], "one/two→one/three"),
            ];
            dispose();

            return { assertRows: rows };
        },
    };
}

function make_bind_attrs_paths_case(suite: string): TestCase {
    return {
        suite,
        name: "LiveTree bind.attrsPaths maps multiple paths to attrs",
        meta: {
            input: preview_value({ hoveredId: null, selectedId: "about" }),
            paths: preview_value([["hoveredId"], ["selectedId"]]),
        },
        run: () => {
            const host = hson.liveTree.create.div();
            const button = host.create.button();
            const map = hson.liveMap.fromJson({ hoveredId: null, selectedId: "about" });
            const id = "about";

            const dispose = button.bind.attrsPaths(map, [["hoveredId"], ["selectedId"]], (values) => {
                const hovered = values[0] === id;
                const selected = values[1] === id;
                return {
                    "aria-current": selected ? "page" : null,
                    "data-hovered": hovered ? "yes" : null,
                };
            });

            const initialCurrent = button.attrs.get("aria-current");
            const initialHovered = button.attrs.has("data-hovered");
            map.at(["hoveredId"]).set("about");
            const hoverValue = button.attrs.get("data-hovered");
            map.at(["selectedId"]).set("parse");
            map.at(["hoveredId"]).set(null);

            const rows = [
                equal_row("initial attrsPaths selected attr is set", initialCurrent, "page"),
                equal_row("initial attrsPaths hover attr is absent", initialHovered, false),
                equal_row("hover attrsPaths attr appears", hoverValue, "yes"),
                equal_row("selected attrsPaths attr is dropped", button.attrs.has("aria-current"), false),
                equal_row("hover attrsPaths attr is dropped", button.attrs.has("data-hovered"), false),
            ];
            dispose();

            return { assertRows: rows };
        },
    };
}

function make_bind_css_paths_case(suite: string): TestCase {
    return {
        suite,
        name: "LiveTree bind.cssPaths maps multiple paths to css",
        meta: {
            input: preview_value({ hoveredId: null, selectedId: "about" }),
            paths: preview_value([["hoveredId"], ["selectedId"]]),
        },
        run: () => {
            const host = hson.liveTree.create.div();
            const button = host.create.button();
            const map = hson.liveMap.fromJson({ hoveredId: null, selectedId: "about" });
            const id = "about";

            const dispose = button.bind.cssPaths(map, [["hoveredId"], ["selectedId"]], (values) => {
                const hovered = values[0] === id;
                const selected = values[1] === id;
                return {
                    opacity: hovered ? "1" : selected ? "0.85" : "0.45",
                    transform: hovered ? "scale(1.02)" : null,
                };
            });

            const initialOpacity = button.css.get.property("opacity");
            const initialTransform = button.css.get.property("transform");
            map.at(["hoveredId"]).set("about");
            const hoverOpacity = button.css.get.property("opacity");
            const hoverTransform = button.css.get.property("transform");
            map.at(["selectedId"]).set("parse");
            map.at(["hoveredId"]).set(null);

            const rows = [
                equal_row("initial cssPaths selected value is set", initialOpacity, "0.85"),
                equal_row("initial cssPaths nullable value is absent", initialTransform, undefined),
                equal_row("hover cssPaths value updates", hoverOpacity, "1"),
                equal_row("hover cssPaths nullable value appears", hoverTransform, "scale(1.02)"),
                equal_row("unselected cssPaths value updates", button.css.get.property("opacity"), "0.45"),
                equal_row("unhovered cssPaths nullable value is removed", button.css.get.property("transform"), undefined),
            ];
            dispose();

            return { assertRows: rows };
        },
    };
}

function make_bind_path_case(suite: string): TestCase {
    return {
        suite,
        name: "LiveTree bind.path exposes node value and previous value",
        meta: {
            input: preview_value({ label: "about" }),
            next: preview_value({ label: "build" }),
        },
        run: () => {
            const host = hson.liveTree.create.div();
            const button = host.create.button();
            const map = hson.liveMap.fromJson({ label: "about" });
            const seen: string[] = [];

            const dispose = button.bind.path(map, ["label"], (tree, value, previous) => {
                seen.push(`${tree === button}:${String(previous ?? "none")}→${String(value ?? "none")}`);
            });
            map.at(["label"]).set("build");

            const rows = [
                equal_row("initial bind.path call receives node and value", seen[0], "true:none→about"),
                equal_row("updated bind.path call receives previous value", seen[1], "true:about→build"),
            ];
            dispose();

            return { assertRows: rows };
        },
    };
}

function make_bind_paths_case(suite: string): TestCase {
    return {
        suite,
        name: "LiveTree bind.paths observes multiple paths",
        meta: {
            input: preview_value({ hoveredId: null, selectedId: "about" }),
            paths: preview_value([["hoveredId"], ["selectedId"]]),
        },
        run: () => {
            const host = hson.liveTree.create.div();
            const button = host.create.button();
            const map = hson.liveMap.fromJson({ hoveredId: null, selectedId: "about" });
            const seen: string[] = [];

            const dispose = button.bind.paths(map, [["hoveredId"], ["selectedId"]], (_tree, values) => {
                seen.push(`${String(values[0] ?? "none")}/${String(values[1] ?? "none")}`);
            });

            map.at(["hoveredId"]).set("about");
            map.at(["selectedId"]).set("parse");

            const rows = [
                equal_row("initial bind.paths call reads both paths", seen[0], "none/about"),
                equal_row("first path update syncs values", seen[1], "about/about"),
                equal_row("second path update syncs values", seen[2], "about/parse"),
            ];
            dispose();

            return { assertRows: rows };
        },
    };
}

function make_bind_dispose_case(suite: string): TestCase {
    return {
        suite,
        name: "LiveTree binding disposer stops later updates",
        meta: {
            input: preview_value({ label: "about" }),
            next: preview_value({ label: "parse" }),
        },
        run: () => {
            const host = hson.liveTree.create.div();
            const text = host.create.span();
            const map = hson.liveMap.fromJson({ label: "about" });

            const dispose = text.bind.text(map, ["label"]);
            dispose();
            map.at(["label"]).set("parse");

            return {
                assertRows: [
                    equal_row("disposed binding does not update text", text.text.get(), "about"),
                ],
            };
        },
    };
}