
import type { LiveTree } from "hson-live";
import { default_preview, make_livetree_suite } from "../livetree-tests/livetree-testkit";
import type { LiveTreeCaseSpec, TestSuite } from "../tests.types";
import { tick } from "../livetree-tests/livetree-fixtures-3";
import { flush_dom, next_frame } from "../inspector/inspector.helpers";
import { make_case } from "./make-unit-case";
import  { normalize_css_value, canon_to_css_prop, normalize_css_key, pseudo_to_suffix } from "hson-live/_tests";


export function unit_test_pseudo_els(): TestSuite {
    const SUITE = "unit/pseudo-elements";
    const cases: readonly LiveTreeCaseSpec[] = [

        {
            suite: SUITE,
            name: "css pseudos: auto-quoted content matches manually quoted content",
            dom: true,
            fixture: "css/pseudos",
            sub: "before-manual-vs-auto",

            html: `
      <main id="root">
        <div id="manual">hello</div>
        <div id="auto">hello</div>
      </main>
    `,

            async act(tree) {
                const manual = tree.find.must.byId("manual");
                const auto = tree.find.must.byId("auto");

                manual.css.setMany({
                    __before: {
                        content: `"M"`, // removed escapes
                        color: "rgb(255, 0, 255)",
                    },
                });

                auto.css.setMany({
                    __before: {
                        content: "A",
                        color: "rgb(0, 255, 255)",
                    },
                });

                await flush_dom();

                const manualEl = manual.dom.el() as HTMLElement;
                const autoEl = auto.dom.el() as HTMLElement;

                const autoBefore = getComputedStyle(autoEl, "::before");
                const manualBefore = getComputedStyle(manualEl, "::before");
                const manualBase = manual.dom.computed() ?? {content: ""};
                const autoBase = auto.dom.computed() ?? {content: ""};

                console.log("manual: before content", manualBefore.content);
                console.log("manual: base content", manualBase.content);
                console.log("manual: before content", autoBefore.content);
                console.log("manual: base content", autoBase.content);
                (tree as any).__result = {
                    manualContent: manualBefore.content,
                    autoContent: autoBefore.content,
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;
                t.eq("manual quoted content rendered", r.manualContent, `"M"`); // removed escapes
                t.eq("auto quoted content rendered", r.autoContent, `"A"`); // removed escapes
            },
        },
    ];

    return make_livetree_suite(SUITE, cases);


};


export function unit_test_css(): TestSuite {
  const suite = "unit/css";

  return {
    suite,
    cases: [
      // --- normalize_css_value: content ---
      make_case(suite, "normalize_css_value: content wraps plain text", () => {
        const out = normalize_css_value("content", "X");
        if (out !== `"X"`) {
          throw new Error(`expected "X", got ${out}`);
        }
      }),

      make_case(suite, "normalize_css_value: content preserves double-quoted string", () => {
        const out = normalize_css_value("content", `"X"`);
        if (out !== `"X"`) {
          throw new Error(`expected "X", got ${out}`);
        }
      }),

      make_case(suite, "normalize_css_value: content preserves single-quoted string", () => {
        const out = normalize_css_value("content", `'X'`);
        if (out !== `'X'`) {
          throw new Error(`expected 'X', got ${out}`);
        }
      }),

      make_case(suite, "normalize_css_value: content preserves attr()", () => {
        const out = normalize_css_value("content", "attr(data-label)");
        if (out !== "attr(data-label)") {
          throw new Error(`expected attr(data-label), got ${out}`);
        }
      }),

      make_case(suite, "normalize_css_value: content preserves counter()", () => {
        const out = normalize_css_value("content", "counter(item)");
        if (out !== "counter(item)") {
          throw new Error(`expected counter(item), got ${out}`);
        }
      }),

      make_case(suite, "normalize_css_value: content preserves counters()", () => {
        const out = normalize_css_value("content", `counters(item, ".")`);
        if (out !== `counters(item, ".")`) {
          throw new Error(`expected counters(item, "."), got ${out}`);
        }
      }),

      make_case(suite, "normalize_css_value: content preserves url()", () => {
        const out = normalize_css_value("content", "url(icon.svg)");
        if (out !== "url(icon.svg)") {
          throw new Error(`expected url(icon.svg), got ${out}`);
        }
      }),

      make_case(suite, "normalize_css_value: content preserves keyword none", () => {
        const out = normalize_css_value("content", "none");
        if (out !== "none") {
          throw new Error(`expected none, got ${out}`);
        }
      }),

      make_case(suite, "normalize_css_value: content preserves keyword normal", () => {
        const out = normalize_css_value("content", "normal");
        if (out !== "normal") {
          throw new Error(`expected normal, got ${out}`);
        }
      }),

      make_case(suite, "normalize_css_value: content escapes embedded double quotes", () => {
        const out = normalize_css_value("content", `say "hi"`);
        if (out !== `"say \\"hi\\""`) {
          throw new Error(`expected "say \\"hi\\"", got ${out}`);
        }
      }),

      make_case(suite, "normalize_css_value: content escapes backslashes", () => {
        const out = normalize_css_value("content", String.raw`C:\temp\file`);
        if (out !== String.raw`"C:\\temp\\file"`) {
          throw new Error(`expected "C:\\\\temp\\\\file", got ${out}`);
        }
      }),

      make_case(suite, "normalize_css_value: non-content prop passes through unchanged", () => {
        const out = normalize_css_value("color", "rgb(255, 0, 255)");
        if (out !== "rgb(255, 0, 255)") {
          throw new Error(`expected rgb(255, 0, 255), got ${out}`);
        }
      }),

      // --- canon_to_css_prop ---
      make_case(suite, "canon_to_css_prop: camelCase becomes kebab-case", () => {
        const out = canon_to_css_prop("backgroundColor");
        if (out !== "background-color") {
          throw new Error(`expected background-color, got ${out}`);
        }
      }),

      make_case(suite, "canon_to_css_prop: cssFloat becomes float", () => {
        const out = canon_to_css_prop("cssFloat");
        if (out !== "float") {
          throw new Error(`expected float, got ${out}`);
        }
      }),

      make_case(suite, "canon_to_css_prop: custom property passes through", () => {
        const out = canon_to_css_prop("--my-token");
        if (out !== "--my-token") {
          throw new Error(`expected --my-token, got ${out}`);
        }
      }),

      // --- normalize_css_key ---
      make_case(suite, "normalize_css_key: trims whitespace", () => {
        const out = normalize_css_key("  background-color  ");
        if (out !== "backgroundColor") {
          throw new Error(`expected backgroundColor, got ${out}`);
        }
      }),

      make_case(suite, "normalize_css_key: custom property passes through", () => {
        const out = normalize_css_key(" --my-token ");
        if (out !== "--my-token") {
          throw new Error(`expected --my-token, got ${out}`);
        }
      }),

      make_case(suite, "normalize_css_key: css-float alias becomes cssFloat", () => {
        const out = normalize_css_key("css-float");
        if (out !== "cssFloat") {
          throw new Error(`expected cssFloat, got ${out}`);
        }
      }),

      make_case(suite, "normalize_css_key: kebab becomes camel", () => {
        const out = normalize_css_key("border-top-left-radius");
        if (out !== "borderTopLeftRadius") {
          throw new Error(`expected borderTopLeftRadius, got ${out}`);
        }
      }),

      make_case(suite, "normalize_css_key: already-camel key stays unchanged", () => {
        const out = normalize_css_key("backgroundColor");
        if (out !== "backgroundColor") {
          throw new Error(`expected backgroundColor, got ${out}`);
        }
      }),

      make_case(suite, "normalize_css_key: empty string returns empty string", () => {
        const out = normalize_css_key("   ");
        if (out !== "") {
          throw new Error(`expected empty string, got ${out}`);
        }
      }),

      // --- pseudo_to_suffix ---
      make_case(suite, "pseudo_to_suffix: __before maps to ::before", () => {
        const out = pseudo_to_suffix("__before");
        if (out !== "::before") {
          throw new Error(`expected ::before, got ${out}`);
        }
      }),

      make_case(suite, "pseudo_to_suffix: __after maps to ::after", () => {
        const out = pseudo_to_suffix("__after");
        if (out !== "::after") {
          throw new Error(`expected ::after, got ${out}`);
        }
      }),

      make_case(suite, "pseudo_to_suffix: _hover maps to :hover", () => {
        const out = pseudo_to_suffix("_hover");
        if (out !== ":hover") {
          throw new Error(`expected :hover, got ${out}`);
        }
      }),

      make_case(suite, "pseudo_to_suffix: _focusVisible maps to :focus-visible", () => {
        const out = pseudo_to_suffix("_focusVisible");
        if (out !== ":focus-visible") {
          throw new Error(`expected :focus-visible, got ${out}`);
        }
      }),
    ],
  };
}