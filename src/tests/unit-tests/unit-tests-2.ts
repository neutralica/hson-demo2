import { canon_to_css_prop, normalize_css_key, normalize_css_value, normalize_decls, render_rule } from "hson-live/_tests";
import type { TestCase, TestSuite } from "../tests.types";
import { cleanup_quid, make_unit_case } from "./all-unit-tests";
import { CssManager } from "hson-live";

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