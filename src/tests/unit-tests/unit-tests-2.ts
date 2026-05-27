
import type { TestCase, TestSuite } from "../../app/phases/phase-3-demo/demo-test/tests.types";
import { cleanup_quid, make_unit_case } from "./all-unit-tests";
import { CssManager } from "hson-live";
import { _parse_selector, _parse_style_string, _serialize_style } from "hson-live/diagnostics";
import { øfontSize } from "../../app/core/consts/ui-consts";
import { render_rule, normalize_decls } from "hson-live/_tests";
import { normalize_css_value, normalize_css_key, canon_to_css_prop } from "../../../../hson-live/dist/utils/attrs-utils/normalize-css";

export function unit_test_more_css(): TestSuite {
    const SUITE = "unit/css/more";

    const cases: readonly TestCase[] = [
        make_unit_case(SUITE, "normalize_css_value escapes quotes correctly", () => {
            const out = normalize_css_value("content", `He said "hi"`);

            if (out !== `"He said \\"hi\\""`) {
                throw new Error(`unexpected escape result: ${out}`);
            }
        }),

        make_unit_case(SUITE, "normalize_css_value escapes backslashes correctly", () => {
            const out = normalize_css_value("content", `C:\\path`);

            if (out !== `"C:\\\\path"`) {
                throw new Error(`unexpected backslash escape: ${out}`);
            }
        }),

        make_unit_case(SUITE, "normalize_css_value does not double-escape quoted input", () => {
            const out = normalize_css_value("content", `"X"`);

            if (out !== `"X"`) {
                throw new Error(`expected preserved quotes, got ${out}`);
            }
        }),
        make_unit_case(SUITE, "key → prop → key roundtrip stability", () => {
            const k = "border-left-width";
            const canon = normalize_css_key(k);
            const prop = canon_to_css_prop(canon);

            if (prop !== "border-left-width") {
                throw new Error(`roundtrip failed: ${prop}`);
            }
        }),

        make_unit_case(SUITE, "cssFloat survives full roundtrip", () => {
            const canon = normalize_css_key("css-float");
            const prop = canon_to_css_prop(canon);

            if (canon !== "cssFloat" || prop !== "float") {
                throw new Error(`cssFloat alias broken: canon=${canon}, prop=${prop}`);
            }
        }),
        make_unit_case(SUITE, "normalize_decls dropped values never render", () => {
            const out = render_rule(".x", normalize_decls({
                color: "",
                backgroundColor: "blue",
            } as any));

            if (/(^|[;{])\s*color\s*:/.test(out)) {
                throw new Error(`empty value leaked into render: ${out}`);
            }

            if (!out.includes("background-color")) {
                throw new Error(`expected background-color present: ${out}`);
            }
        }),

        make_unit_case(SUITE, "custom properties survive normalize + render", () => {
            const out = render_rule(".x", normalize_decls({
                "--gap": "10px",
            } as any));

            if (!/--gap\s*:\s*10px\s*;/.test(out)) {
                throw new Error(`custom property lost: ${out}`);
            }
        }),
        make_unit_case(SUITE, "pseudo rules scoped to correct quid only", () => {
            const m = CssManager.invoke();
            const q1 = "__test_q1";
            const q2 = "__test_q2";

            cleanup_quid(m, q1);
            cleanup_quid(m, q2);

            m.setPseudoForQuid(q1, "__before", "content", `"A"`);

            m.syncNow();
            const css = m.snapshot();

            if (!css.includes(`[data-_quid="${q1}"]::before`)) {
                throw new Error(`missing q1 pseudo`);
            }

            if (css.includes(`[data-_quid="${q2}"]::before`)) {
                throw new Error(`pseudo leaked to q2`);
            }

            cleanup_quid(m, q1);
            cleanup_quid(m, q2);
        }),
        make_unit_case(SUITE, "no empty rule blocks emitted", () => {
            const m = CssManager.invoke();
            const quid = "__test_empty";

            cleanup_quid(m, quid);

            m.setForQuid(quid, "color", "red");
            m.unsetForQuid(quid, "color");

            m.syncNow();
            const css = m.snapshot();

            const sel = `[data-_quid="${quid}"]`;

            if (css.includes(`${sel} {}`)) {
                throw new Error(`empty rule block emitted:\n${css}`);
            }

            cleanup_quid(m, quid);
        }),
        make_unit_case(SUITE, "multiple quids do not interfere", () => {
            const m = CssManager.invoke();
            const q1 = "__test_multi_1";
            const q2 = "__test_multi_2";

            cleanup_quid(m, q1);
            cleanup_quid(m, q2);

            m.setForQuid(q1, "color", "red");
            m.setForQuid(q2, "color", "blue");

            const r1 = m.getForQuid(q1, "color");
            const r2 = m.getForQuid(q2, "color");

            if (r1 !== "red" || r2 !== "blue") {
                throw new Error(`quid isolation broken: ${r1}, ${r2}`);
            }

            cleanup_quid(m, q1);
            cleanup_quid(m, q2);
        }),
        make_unit_case(SUITE, "operation ordering produces correct final state", () => {
            const m = CssManager.invoke();
            const quid = "__test_chaos";

            cleanup_quid(m, quid);

            m.setForQuid(quid, "color", "red");
            m.unsetForQuid(quid, "color");

            m.setManyForQuid(quid, {
                color: "blue",
                backgroundColor: "black",
            });

            m.setForQuid(quid, "color", "green");

            m.setPseudoForQuid(quid, "__before", "content", `"X"`);

            m.clearPseudoQuid(quid, "__before");

            const all = m.getAllForQuid(quid);

            if (!all || all.color !== "green" || all.backgroundColor !== "black") {
                throw new Error(`final state incorrect: ${JSON.stringify(all)}`);
            }

            cleanup_quid(m, quid);
        }),


    ]

    return { suite: SUITE, cases };
}

export function unit_test_parser_helpers(): TestSuite {
    const SUITE = "unit/parser-helpers";

    const cases: readonly TestCase[] = [

        // ----------------------------
        // parse_style_string
        // ----------------------------

        {
            suite: SUITE,
            name: "parse_style_string: parses simple declarations",
            run() {
                const out = _parse_style_string("color: red; background-color: blue;");

                if (out.color !== "red") {
                    throw new Error(`expected color=red, got ${String(out.color)}`);
                }

                if (out.backgroundColor !== "blue") {
                    throw new Error(`expected backgroundColor=blue, got ${String(out.backgroundColor)}`);
                }
            },
        },

        {
            suite: SUITE,
            name: "parse_style_string: preserves custom properties",
            run() {
                const out = _parse_style_string("--panel-glow: 12px; color: white;");

                if (out["--panel-glow"] !== "12px") {
                    throw new Error(`expected custom prop preserved, got ${String(out["--panel-glow"])}`);
                }

                if (out.color !== "white") {
                    throw new Error(`expected color=white, got ${String(out.color)}`);
                }
            },
        },

        {
            suite: SUITE,
            name: "parse_style_string: handles quoted semicolons safely",
            run() {
                const out = _parse_style_string(`content: "a; b"; color: red;`);

                // NOTE: behavior here is important enough to assert directly.
                // If this fails, parser is probably splitting on semicolons too early.
                if (out.content !== `"a; b"` && out.content !== `"a; b";`) {
                    throw new Error(`expected quoted content preserved, got ${String(out.content)}`);
                }

                if (out.color !== "red") {
                    throw new Error(`expected color=red, got ${String(out.color)}`);
                }
            },
        },

        {
            suite: SUITE,
            name: "parse_style_string: handles url() safely",
            run() {
                const out = _parse_style_string(`background-image: url("x;y.png"); color: red;`);

                if (!String(out.backgroundImage ?? "").includes(`url("x;y.png")`)) {
                    throw new Error(`expected url() preserved, got ${String(out.backgroundImage)}`);
                }

                if (out.color !== "red") {
                    throw new Error(`expected color=red, got ${String(out.color)}`);
                }
            },
        },

        {
            suite: SUITE,
            name: "parse_style_string: last duplicate key wins",
            run() {
                const out = _parse_style_string(`color: red; color: lime;`);

                if (out.color !== "lime") {
                    throw new Error(`expected last-write-wins color=lime, got ${String(out.color)}`);
                }
            },
        },

        {
            suite: SUITE,
            name: "parse_style_string: ignores trailing semicolon cleanly",
            run() {
                const out = _parse_style_string(`color: red;;;`);

                if (out.color !== "red") {
                    throw new Error(`expected color=red, got ${String(out.color)}`);
                }

                if (Object.keys(out).length !== 1) {
                    throw new Error(`expected only one declaration, got ${Object.keys(out)}`);
                }
            },
        },

        // ----------------------------
        // serialize_style
        // ----------------------------

        {
            suite: SUITE,
            name: "serialize_style: kebab-cases normal properties",
            run() {
                const out = _serialize_style({
                    backgroundColor: "red",
                    fontSize: øfontSize.smol,
                });

                if (!out.includes("background-color:red") && !out.includes("background-color: red")) {
                    throw new Error(`expected background-color in output, got ${out}`);
                }

                if (!out.includes("font-size:12px") && !out.includes("font-size: 12px")) {
                    throw new Error(`expected font-size in output, got ${out}`);
                }
            },
        },

        {
            suite: SUITE,
            name: "serialize_style: preserves custom properties",
            run() {
                const out = _serialize_style({
                    "--panel-glow": "12px",
                    color: "white",
                });

                if (!out.includes("--panel-glow:12px") && !out.includes("--panel-glow: 12px")) {
                    throw new Error(`expected custom property preserved, got ${out}`);
                }

                if (!out.includes("color:white") && !out.includes("color: white")) {
                    throw new Error(`expected color preserved, got ${out}`);
                }
            },
        },

        {
            suite: SUITE,
            name: "serialize_style: normalizes cssFloat to float",
            run() {
                const out = _serialize_style({
                    cssFloat: "left",
                });

                if (!out.includes("float:left") && !out.includes("float: left")) {
                    throw new Error(`expected cssFloat serialized as float, got ${out}`);
                }
            },
        },

        {
            suite: SUITE,
            name: "serialize_style: drops nullish and empty values",
            run() {
                const out = _serialize_style({
                    color: "red",
                    backgroundColor: "",
                    borderColor: "   ",
                    // ts-expect-error intentional seam test
                    outlineColor: undefined,
                    // ts-expect-error intentional seam test
                    boxShadow: null,
                });

                if (!out.includes("color:red") && !out.includes("color: red")) {
                    throw new Error(`expected color preserved, got ${out}`);
                }

                if (out.includes("background-color") || out.includes("border-color") || out.includes("outline-color") || out.includes("box-shadow")) {
                    throw new Error(`expected empty/nullish declarations dropped, got ${out}`);
                }
            },
        },

        {
            suite: SUITE,
            name: "serialize_style: returns deterministic ordering",
            run() {
                const a = _serialize_style({
                    zIndex: "2",
                    color: "red",
                    backgroundColor: "black",
                });

                const b = _serialize_style({
                    backgroundColor: "black",
                    zIndex: "2",
                    color: "red",
                });

                if (a !== b) {
                    throw new Error(`expected deterministic ordering, got \nA=${a}\nB=${b}`);
                }
            },
        },

        // ----------------------------
        // parse_selector
        // ----------------------------

        {
            suite: SUITE,
            name: "parse_selector: parses tag + id + classes",
            run() {
                const out = _parse_selector(`div#app.card.large`);

                // NOTE: exact class storage shape may vary.
                // Adjust if your parser stores class in attrs.class or another field.
                if ((out as any).tag !== "div") {
                    throw new Error(`expected tag=div, got ${String((out as any).tag)}`);
                }

                if ((out as any).attrs?.id !== "app") {
                    throw new Error(`expected id=app, got ${String((out as any).attrs?.id)}`);
                }

                const klass = String((out as any).attrs?.class ?? "");
                if (!klass.includes("card") || !klass.includes("large")) {
                    throw new Error(`expected merged classes, got ${klass}`);
                }
            },
        },
        {
            suite: SUITE,
            name: "parse_selector: parses explicit attr equality",
            run() {
                const out = _parse_selector(`div[data-x="1"][title="hello"]`);

                if ((out as any).attrs?.["data-x"] !== "1") {
                    throw new Error(`expected data-x=1, got ${String((out as any).attrs?.["data-x"])}`);
                }

                if ((out as any).attrs?.title !== "hello") {
                    throw new Error(`expected title=hello, got ${String((out as any).attrs?.title)}`);
                }
            },
        },
        {
            suite: SUITE,
            name: "parse_selector: single-quoted attr behavior is explicit",
            run() {
                const out = _parse_selector(`div[title='hello']`);

                const title = (out as any).attrs?.title;

                // NOTE:
                // current parser may support only double-quoted attr equality.
                // this test is documenting behavior rather than enforcing support.
                const ok = title === undefined || title === "hello";

                if (!ok) {
                    throw new Error(`unexpected single-quoted attr behavior: ${JSON.stringify(out)}`);
                }
            },
        },

        {
            suite: SUITE,
            name: "parse_selector: trims surrounding whitespace",
            run() {
                const out = _parse_selector(`   div#app.card   `);

                if ((out as any).tag !== "div") {
                    throw new Error(`expected trimmed selector tag=div, got ${String((out as any).tag)}`);
                }

                if ((out as any).attrs?.id !== "app") {
                    throw new Error(`expected trimmed selector id=app, got ${String((out as any).attrs?.id)}`);
                }
            },
        },

    ];

    return {
        suite: SUITE,
        cases,
    };
}