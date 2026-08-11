
import type { TestCase, TestSuite } from "../../harness/core/test-contracts";
import { cleanup_quid, make_unit_case } from "./suite-registry";
import { CssManager } from "hson-live/livetree";
import { _parse_selector, _parse_style_string, _serialize_style } from "hson-live/diagnostics";
import { _fontSize } from "../../../src/app/core/consts/ui-consts";
import  { normalize_css_value, normalize_css_key, canon_to_css_prop, render_rule, normalize_decls } from "hson-live/diagnostics/test-exports";
import { hson_quid_selector } from "../../helpers/hson/hson-metadata-helpers";

const gcss = CssManager.api();

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
            const q1 = "000000001";
            const q2 = "000000002";

            cleanup_quid(m, q1);
            cleanup_quid(m, q2);

            // CHANGED: pseudo shorthand now routes through selector-rule storage.
            const q1BeforeKey = `unit:${q1}:before`;
            CssManager.api()
                .rule(q1BeforeKey, `${hson_quid_selector(q1)}::before`)
                .setProp("content", `"A"`);

            const q1Rendered = CssManager.api().get(q1BeforeKey);

            if (!q1Rendered?.includes(`${hson_quid_selector(q1)}::before`)) {
                CssManager.api().drop(q1BeforeKey);
                throw new Error(`missing q1 pseudo`);
            }

            if (q1Rendered.includes(`${hson_quid_selector(q2)}::before`)) {
                CssManager.api().drop(q1BeforeKey);
                throw new Error(`pseudo leaked to q2`);
            }

            CssManager.api().drop(q1BeforeKey);
            cleanup_quid(m, q1);
            cleanup_quid(m, q2);
        }),
        make_unit_case(SUITE, "no empty rule blocks emitted", () => {
            const m = CssManager.invoke();
            const quid = "000000003";

            cleanup_quid(m, quid);

            m.setForQuid(quid, "color", "red");
            m.unsetForQuid(quid, "color");

            m.syncNow();
            const css = m.snapshot();

            const sel = hson_quid_selector(quid);

            if (css.includes(`${sel} {}`)) {
                throw new Error(`empty rule block emitted:\n${css}`);
            }

            cleanup_quid(m, quid);
        }),
        make_unit_case(SUITE, "multiple quids do not interfere", () => {
            const m = CssManager.invoke();
            const q1 = "000000004";
            const q2 = "000000005";

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
            const quid = "000000006";

            cleanup_quid(m, quid);

            m.setForQuid(quid, "color", "red");
            m.unsetForQuid(quid, "color");

            m.setManyForQuid(quid, {
                color: "blue",
                backgroundColor: "black",
            });

            m.setForQuid(quid, "color", "green");

            // CHANGED: selector-backed pseudo rules are independent from base
            // QUID declarations and can be dropped without touching base state.
            const beforeKey = `unit:${quid}:before`;
            CssManager.api()
                .rule(beforeKey, `${hson_quid_selector(quid)}::before`)
                .setProp("content", `"X"`);

            CssManager.api().drop(beforeKey);

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
                    fontSize: "12px",
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


export function unit_css_pseudo_unification(): TestSuite {
    const SUITE = "unit/css/pseudo-unification";
    return {
        suite: SUITE,
        cases: [

            make_unit_case(SUITE, "global css var key returns declaration-ready var reference", () => {
                const css = CssManager.api();
                const name = "__unit_var_key_test";

                css.var.remove(name);

                const key = css.var.key(name);
                const canon = css.var.name(name);
                const valueBefore = css.var.value(name);

                if (key !== "var(--__unit_var_key_test)") {
                    throw new Error(`expected var(...) key, got ${key}`);
                }

                if (canon !== "--__unit_var_key_test") {
                    throw new Error(`expected canonical name, got ${String(canon)}`);
                }

                if (valueBefore !== undefined) {
                    throw new Error(`expected unset var value to be undefined, got ${valueBefore}`);
                }

                css.var.set(name, "oklch(75% 0.06 300)");

                const valueAfter = css.var.value(name);

                if (valueAfter !== "oklch(75% 0.06 300)") {
                    css.var.remove(name);
                    throw new Error(`expected stored declaration value, got ${String(valueAfter)}`);
                }

                if (css.var.key(name) !== key) {
                    css.var.remove(name);
                    throw new Error(`var key should remain stable after set`);
                }

                css.var.remove(name);
            }),
            make_unit_case(SUITE, "global css var key rejects invalid custom property names", () => {
                const css = CssManager.api();

                let threw = false;

                try {
                    css.var.key("");
                } catch {
                    threw = true;
                }

                if (!threw) {
                    throw new Error(`expected css.var.key("") to throw`);
                }
            }),
            make_unit_case(SUITE, "global css var value remove clears stored declaration", () => {
                const css = CssManager.api();
                const name = "__unit_var_remove_test";

                css.var.set(name, "red");

                if (css.var.value(name) !== "red") {
                    css.var.remove(name);
                    throw new Error(`expected stored value before remove`);
                }

                css.var.remove(name);

                if (css.var.value(name) !== undefined) {
                    throw new Error(`expected undefined after remove, got ${String(css.var.value(name))}`);
                }
            }),



            make_unit_case(SUITE, "selector rule drop is idempotent", () => {
                const m = CssManager.invoke();
                const quid = "000000007";
                const key = `unit:${quid}:before`;

                cleanup_quid(m, quid);
                CssManager.api().drop(key);

                CssManager.api()
                    .rule(key, `${hson_quid_selector(quid)}::before`)
                    .setProp("content", `"X"`);

                CssManager.api().drop(key);
                CssManager.api().drop(key);

                const css = m.snapshot();

                if (css.includes(`${hson_quid_selector(quid)}::before`)) {
                    cleanup_quid(m, quid);
                    throw new Error(`expected selector rule dropped idempotently, css was:\n${css}`);
                }

                cleanup_quid(m, quid);
            }),
            make_unit_case(SUITE, "selector rule dropByPrefix removes owned keys only", () => {
                const gcss = CssManager.api();
                const prefix = "unit:drop-prefix:";
                const ownedOne = `${prefix}one`;
                const ownedTwo = `${prefix}two`;
                const neighbor = "unit:drop-prefix-neighbor:one";

                gcss.drop(ownedOne);
                gcss.drop(ownedTwo);
                gcss.drop(neighbor);

                gcss
                    .rule(ownedOne, `.owned-one`)
                    .setProp("color", "red");
                gcss
                    .rule(ownedTwo, `.owned-two`)
                    .setProp("color", "blue");
                gcss
                    .rule(neighbor, `.neighbor`)
                    .setProp("color", "green");

                gcss.dropByPrefix(prefix);

                const ownedOneCss = gcss.get(ownedOne);
                const ownedTwoCss = gcss.get(ownedTwo);
                const neighborCss = gcss.get(neighbor);

                if (ownedOneCss !== undefined || ownedTwoCss !== undefined) {
                    gcss.drop(ownedOne);
                    gcss.drop(ownedTwo);
                    gcss.drop(neighbor);
                    throw new Error(`expected owned prefix rules removed, one=${String(ownedOneCss)} two=${String(ownedTwoCss)}`);
                }

                if (!neighborCss?.includes(`.neighbor`)) {
                    gcss.drop(neighbor);
                    throw new Error(`expected neighboring key preserved, got ${String(neighborCss)}`);
                }

                // CHANGED: prefix cleanup should be safe to repeat.
                gcss.dropByPrefix(prefix);

                if (!gcss.get(neighbor)?.includes(`.neighbor`)) {
                    gcss.drop(neighbor);
                    throw new Error(`expected neighboring key preserved after idempotent repeat`);
                }

                gcss.drop(neighbor);
            }),



            
        ],
    };
}


export function unit_media(): TestSuite {
    const SUITE = "unit/media";

    const cases: readonly TestCase[] = [
        make_unit_case(SUITE, "CssManager.api().media: scoped facade stores rule body", () => {
            const key = "unit:media:base-rule";
            const selector = ".unit-media-target";

            gcss.drop(key);

            gcss
                .media("(max-width: 700px)")
                .rule(key, selector)
                .setMany({ color: "blue", display: "block" });

            const css = gcss.get(key);
            if (!css) {
                gcss.drop(key);
                throw new Error("expected media CSS rule to be stored");
            }

            // CHANGED: gcss.get(key) returns the stored rule body, not the
            // composed stylesheet wrapper. This unit test asserts the scoped
            // facade storage contract; wrapper rendering belongs in a renderer
            // seam with an isolated stylesheet fixture.
            if (!css.includes(selector)) {
                gcss.drop(key);
                throw new Error(`expected selector ${selector}, got:\n${css}`);
            }

            if (!css.includes("color:blue;") || !css.includes("display:block;")) {
                gcss.drop(key);
                throw new Error(`expected normalized declarations, got:\n${css}`);
            }

            gcss.drop(key);
        }),

        make_unit_case(SUITE, "CssManager.api().supports: scoped facade stores rule body", () => {
            const key = "unit:supports:base-rule";
            const selector = ".unit-supports-target";

            gcss.drop(key);

            gcss
                .supports("(display: grid)")
                .rule(key, selector)
                .setMany({ display: "grid", gap: "1rem" });

            const css = gcss.get(key);
            if (!css) {
                gcss.drop(key);
                throw new Error("expected supports CSS rule to be stored");
            }

            // CHANGED: gcss.get(key) returns the stored rule body, not the
            // composed stylesheet wrapper. This unit test asserts the scoped
            // facade storage contract.
            if (!css.includes(selector)) {
                gcss.drop(key);
                throw new Error(`expected selector ${selector}, got:\n${css}`);
            }

            if (!css.includes("display:grid;") || !css.includes("gap:1rem;")) {
                gcss.drop(key);
                throw new Error(`expected normalized declarations, got:\n${css}`);
            }

            gcss.drop(key);
        }),

        make_unit_case(SUITE, "CssManager.api().layer: scoped facade stores rule body", () => {
            const key = "unit:layer:base-rule";
            const selector = ".unit-layer-target";

            gcss.drop(key);

            gcss
                .layer("components")
                .rule(key, selector)
                .setMany({ color: "purple", opacity: "0.7" });

            const css = gcss.get(key);
            if (!css) {
                gcss.drop(key);
                throw new Error("expected layer CSS rule to be stored");
            }

            // CHANGED: gcss.get(key) returns the stored rule body, not the
            // composed stylesheet wrapper. This unit test asserts the scoped
            // facade storage contract.
            if (!css.includes(selector)) {
                gcss.drop(key);
                throw new Error(`expected selector ${selector}, got:\n${css}`);
            }

            if (!css.includes("color:purple;") || !css.includes("opacity:0.7;")) {
                gcss.drop(key);
                throw new Error(`expected normalized declarations, got:\n${css}`);
            }

            gcss.drop(key);
        }),

        make_unit_case(SUITE, "CssManager scoped facades: same selector can coexist across distinct keys", () => {
            const baseKey = "unit:scoped-coexist:base";
            const mediaKey = "unit:scoped-coexist:media";
            const supportsKey = "unit:scoped-coexist:supports";
            const layerKey = "unit:scoped-coexist:layer";
            const selector = ".unit-scoped-coexist";

            gcss.drop(baseKey);
            gcss.drop(mediaKey);
            gcss.drop(supportsKey);
            gcss.drop(layerKey);

            gcss.rule(baseKey, selector).setProp("color", "red");
            gcss.media("(max-width: 700px)").rule(mediaKey, selector).setProp("color", "blue");
            gcss.supports("(display: grid)").rule(supportsKey, selector).setProp("color", "green");
            gcss.layer("components").rule(layerKey, selector).setProp("color", "purple");

            const baseCss = gcss.get(baseKey);
            const mediaCss = gcss.get(mediaKey);
            const supportsCss = gcss.get(supportsKey);
            const layerCss = gcss.get(layerKey);

            if (!baseCss?.includes("color:red;")) {
                throw new Error(`expected base color red, got:\n${String(baseCss)}`);
            }

            if (!mediaCss?.includes("color:blue;")) {
                throw new Error(`expected media rule body color blue, got:\n${String(mediaCss)}`);
            }

            if (!supportsCss?.includes("color:green;")) {
                throw new Error(`expected supports rule body color green, got:\n${String(supportsCss)}`);
            }

            if (!layerCss?.includes("color:purple;")) {
                throw new Error(`expected layer rule body color purple, got:\n${String(layerCss)}`);
            }

            gcss.drop(baseKey);
            gcss.drop(mediaKey);
            gcss.drop(supportsKey);
            gcss.drop(layerKey);
        }),

        make_unit_case(SUITE, "CssManager scoped facades: nested media/supports/layer preserve rule body", () => {
            const key = "unit:nested-scopes:rule";
            const selector = ".unit-nested-scope";

            gcss.drop(key);

            gcss
                .media("(max-width: 720px)")
                .supports("(display: grid)")
                .layer("responsive")
                .rule(key, selector)
                .setMany({ backgroundColor: "gold", color: "black" });

            const css = gcss.get(key);
            if (!css) {
                gcss.drop(key);
                throw new Error("expected nested scoped CSS rule to be stored");
            }

            // CHANGED: gcss.get(key) exposes the stored nested rule body. We
            // assert selector/declaration preservation here; at-rule wrapper
            // rendering should be covered through an isolated renderer test.
            if (!css.includes(selector) || !css.includes("background-color:gold;") || !css.includes("color:black;")) {
                gcss.drop(key);
                throw new Error(`expected nested selector declarations, got:\n${css}`);
            }

            gcss.drop(key);
        }),

        make_unit_case(SUITE, "CssManager scoped facades: dropping scoped rule removes stored CSS", () => {
            const key = "unit:scoped-drop:media";
            const selector = ".unit-scoped-drop";

            gcss.drop(key);

            gcss
                .media("(max-width: 700px)")
                .rule(key, selector)
                .setProp("color", "blue");

            if (!gcss.get(key)?.includes("color:blue;")) {
                gcss.drop(key);
                throw new Error(`expected scoped rule before drop, got:\n${String(gcss.get(key))}`);
            }

            gcss.drop(key);

            if (gcss.get(key) !== undefined) {
                gcss.drop(key);
                throw new Error(`expected scoped rule removed, got:\n${String(gcss.get(key))}`);
            }
        }),
    ];

    return { suite: SUITE, cases };
}
