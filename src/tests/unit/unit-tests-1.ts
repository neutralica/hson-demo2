
import type { TestCase, TestSuite } from "../../app/demos/test/tests.types";
import { cleanup_quid, make_unit_case } from "./all-unit-tests";
import { CssManager, pseudo_to_suffix } from "../../../../hson-live/dist/api/livetree/managers/css-manager";
import  { normalize_css_value, canon_to_css_prop, normalize_css_key, normalize_decls, render_rule } from "hson-live/diagnostics/test-exports";
import { hson_quid_selector } from "../test-data/hson-metadata-helpers";

const gcss = CssManager.api();

export function unit_test_css(): TestSuite {
  const suite = "unit/css";
  return {
    suite,
    cases: [
      // --- normalize_css_value: content ---
      make_unit_case(suite, "normalize_css_value: content wraps plain text", () => {
        const out = normalize_css_value("content", "X");
        if (out !== `"X"`) {
          throw new Error(`expected "X", got ${out}`);
        }
      }),

      make_unit_case(suite, "normalize_css_value: content preserves double-quoted string", () => {
        const out = normalize_css_value("content", `"X"`);
        if (out !== `"X"`) {
          throw new Error(`expected "X", got ${out}`);
        }
      }),

      make_unit_case(suite, "normalize_css_value: content preserves single-quoted string", () => {
        const out = normalize_css_value("content", `'X'`);
        if (out !== `'X'`) {
          throw new Error(`expected 'X', got ${out}`);
        }
      }),

      make_unit_case(suite, "normalize_css_value: content preserves attr()", () => {
        const out = normalize_css_value("content", "attr(data-label)");
        if (out !== "attr(data-label)") {
          throw new Error(`expected attr(data-label), got ${out}`);
        }
      }),

      make_unit_case(suite, "normalize_css_value: content preserves counter()", () => {
        const out = normalize_css_value("content", "counter(item)");
        if (out !== "counter(item)") {
          throw new Error(`expected counter(item), got ${out}`);
        }
      }),

      make_unit_case(suite, "normalize_css_value: content preserves counters()", () => {
        const out = normalize_css_value("content", `counters(item, ".")`);
        if (out !== `counters(item, ".")`) {
          throw new Error(`expected counters(item, "."), got ${out}`);
        }
      }),

      make_unit_case(suite, "normalize_css_value: content preserves url()", () => {
        const out = normalize_css_value("content", "url(icon.svg)");
        if (out !== "url(icon.svg)") {
          throw new Error(`expected url(icon.svg), got ${out}`);
        }
      }),

      make_unit_case(suite, "normalize_css_value: content preserves keyword none", () => {
        const out = normalize_css_value("content", "none");
        if (out !== "none") {
          throw new Error(`expected none, got ${out}`);
        }
      }),

      make_unit_case(suite, "normalize_css_value: content preserves keyword normal", () => {
        const out = normalize_css_value("content", "normal");
        if (out !== "normal") {
          throw new Error(`expected normal, got ${out}`);
        }
      }),

      make_unit_case(suite, "normalize_css_value: content escapes embedded double quotes", () => {
        const out = normalize_css_value("content", `say "hi"`);
        if (out !== `"say \\"hi\\""`) {
          throw new Error(`expected "say \\"hi\\"", got ${out}`);
        }
      }),

      make_unit_case(suite, "normalize_css_value: content escapes backslashes", () => {
        const out = normalize_css_value("content", String.raw`C:\temp\file`);
        if (out !== String.raw`"C:\\temp\\file"`) {
          throw new Error(`expected "C:\\\\temp\\\\file", got ${out}`);
        }
      }),

      make_unit_case(suite, "normalize_css_value: non-content prop passes through unchanged", () => {
        const out = normalize_css_value("color", "rgb(255, 0, 255)");
        if (out !== "rgb(255, 0, 255)") {
          throw new Error(`expected rgb(255, 0, 255), got ${out}`);
        }
      }),

      // --- canon_to_css_prop ---
      make_unit_case(suite, "canon_to_css_prop: camelCase becomes kebab-case", () => {
        const out = canon_to_css_prop("backgroundColor");
        if (out !== "background-color") {
          throw new Error(`expected background-color, got ${out}`);
        }
      }),

      make_unit_case(suite, "canon_to_css_prop: cssFloat becomes float", () => {
        const out = canon_to_css_prop("cssFloat");
        if (out !== "float") {
          throw new Error(`expected float, got ${out}`);
        }
      }),

      make_unit_case(suite, "canon_to_css_prop: custom property passes through", () => {
        const out = canon_to_css_prop("--my-token");
        if (out !== "--my-token") {
          throw new Error(`expected --my-token, got ${out}`);
        }
      }),

      // --- normalize_css_key ---
      make_unit_case(suite, "normalize_css_key: trims whitespace", () => {
        const out = normalize_css_key("  background-color  ");
        if (out !== "backgroundColor") {
          throw new Error(`expected backgroundColor, got ${out}`);
        }
      }),

      make_unit_case(suite, "normalize_css_key: custom property passes through", () => {
        const out = normalize_css_key(" --my-token ");
        if (out !== "--my-token") {
          throw new Error(`expected --my-token, got ${out}`);
        }
      }),

      make_unit_case(suite, "normalize_css_key: css-float alias becomes cssFloat", () => {
        const out = normalize_css_key("css-float");
        if (out !== "cssFloat") {
          throw new Error(`expected cssFloat, got ${out}`);
        }
      }),

      make_unit_case(suite, "normalize_css_key: kebab becomes camel", () => {
        const out = normalize_css_key("border-top-left-radius");
        if (out !== "borderTopLeftRadius") {
          throw new Error(`expected borderTopLeftRadius, got ${out}`);
        }
      }),

      make_unit_case(suite, "normalize_css_key: already-camel key stays unchanged", () => {
        const out = normalize_css_key("backgroundColor");
        if (out !== "backgroundColor") {
          throw new Error(`expected backgroundColor, got ${out}`);
        }
      }),

      make_unit_case(suite, "normalize_css_key: empty string returns empty string", () => {
        const out = normalize_css_key("   ");
        if (out !== "") {
          throw new Error(`expected empty string, got ${out}`);
        }
      }),

      // --- pseudo_to_suffix ---
      make_unit_case(suite, "pseudo_to_suffix: __before maps to ::before", () => {
        const out = pseudo_to_suffix("__before");
        if (out !== "::before") {
          throw new Error(`expected ::before, got ${out}`);
        }
      }),

      make_unit_case(suite, "pseudo_to_suffix: __after maps to ::after", () => {
        const out = pseudo_to_suffix("__after");
        if (out !== "::after") {
          throw new Error(`expected ::after, got ${out}`);
        }
      }),

      make_unit_case(suite, "pseudo_to_suffix: _hover maps to :hover", () => {
        const out = pseudo_to_suffix("_hover");
        if (out !== ":hover") {
          throw new Error(`expected :hover, got ${out}`);
        }
      }),

      make_unit_case(suite, "pseudo_to_suffix: _focusVisible maps to :focus-visible", () => {
        const out = pseudo_to_suffix("_focusVisible");
        if (out !== ":focus-visible") {
          throw new Error(`expected :focus-visible, got ${out}`);
        }
      }),
    ],
  };
}

export function unit_test_internals(): TestSuite {
  const SUITE = "unit/internals";

  const cases: readonly TestCase[] = [

    // ----------------------------
    // normalizeDecls
    // ----------------------------

    {
      suite: SUITE,
      name: "normalizeDecls: trims keys and values",
      run() {
        const out = normalize_decls({
          " color ": " red ",
        });

        if (out.color !== "red") {
          throw new Error(`expected trimmed value, got ${out.color}`);
        }
      },
    },

    {
      suite: SUITE,
      name: "normalizeDecls: drops empty values",
      run() {
        const out = normalize_decls({
          a: "",
          b: "   ",
          c: "ok",
        });

        if ("a" in out || "b" in out) {
          throw new Error(`expected empty values removed`);
        }

        if (out.c !== "ok") {
          throw new Error(`expected c=ok, got ${out.c}`);
        }
      },
    },

    {
      suite: SUITE,
      name: "normalizeDecls: drops empty keys",
      run() {
        const out = normalize_decls({
          "": "x",
          "   ": "y",
          good: "z",
        } as any);

        if ("good" in out === false || Object.keys(out).length !== 1) {
          throw new Error(`expected only 'good' key, got ${Object.keys(out)}`);
        }
      },
    },

    // ----------------------------
    // selectorForQuid
    // ----------------------------

    {
      suite: SUITE,
      name: "selectorForQuid: basic mapping",
      run() {
        const quid = "0123456789abcdfg";
        const out = hson_quid_selector(quid);

        if (!out.includes(`"${quid}"`)) {
          throw new Error(`selector missing quid: ${out}`);
        }

        if (!out.startsWith("[")) {
          throw new Error(`selector malformed: ${out}`);
        }
      },
    },

    // ----------------------------
    // render_rule
    // ----------------------------

    {
      suite: SUITE,
      name: "render_rule: emits sorted properties",
      run() {
        const out = render_rule(".x", {
          zIndex: "1",
          color: "red",
        });

        // sorted: color first, then z-index
        if (!out.includes("color:red;z-index:1;")) {
          throw new Error(`expected sorted props, got ${out}`);
        }
      },
    },

    {
      suite: SUITE,
      name: "render_rule: applies content normalization",
      run() {
        const out = render_rule(".x", {
          content: "X",
        });

        if (!out.includes(`content:"X";`)) {
          throw new Error(`expected quoted content, got ${out}`);
        }
      },
    },

    {
      suite: SUITE,
      name: "render_rule: respects already-quoted content",
      run() {
        const out = render_rule(".x", {
          content: `"X"`,
        });

        if (!out.includes(`content:"X";`)) {
          throw new Error(`expected preserved quotes, got ${out}`);
        }
      },
    },

    {
      suite: SUITE,
      name: "render_rule: preserves non-content values",
      run() {
        const out = render_rule(".x", {
          color: "rgb(255, 0, 255)",
        });

        if (!out.includes(`color:rgb(255, 0, 255);`)) {
          throw new Error(`unexpected normalization: ${out}`);
        }
      },
    },

    {
      suite: SUITE,
      name: "render_rule: handles custom properties",
      run() {
        const out = render_rule(".x", {
          "--token": "10px",
        });

        if (!out.includes(`--token:10px;`)) {
          throw new Error(`custom prop broken: ${out}`);
        }
      },
    },

    {
      suite: SUITE,
      name: "render_rule: empty decls returns empty string",
      run() {
        const out = render_rule(".x", {});

        if (out !== "") {
          throw new Error(`expected empty string, got ${out}`);
        }
      },
    },

    // ----------------------------
    // pseudo_to_suffix sanity
    // ----------------------------

    {
      suite: SUITE,
      name: "pseudo_to_suffix: before/after stable",
      run() {
        if (pseudo_to_suffix("__before") !== "::before") {
          throw new Error("before mapping broken");
        }

        if (pseudo_to_suffix("__after") !== "::after") {
          throw new Error("after mapping broken");
        }
      },
    },
    {
      suite: SUITE,
      name: "normalize_css_key: vendor prefix -webkit- converts correctly",
      run() {
        const out = normalize_css_key("-webkit-transform");
        if (out !== "WebkitTransform") {
          throw new Error(`expected WebkitTransform, got ${out}`);
        }
      },
    },

    {
      suite: SUITE,
      name: "normalize_css_key: vendor prefix -moz- converts correctly",
      run() {
        const out = normalize_css_key("-moz-user-select");
        if (out !== "MozUserSelect") {
          throw new Error(`expected MozUserSelect, got ${out}`);
        }
      },
    },

    {
      suite: SUITE,
      name: "normalize_css_key: alias is case-insensitive",
      run() {
        const out = normalize_css_key("CSS-FLOAT");
        if (out !== "cssFloat") {
          throw new Error(`expected cssFloat, got ${out}`);
        }
      },
    },

    {
      suite: SUITE,
      name: "normalize_css_key: preserves already camelCase",
      run() {
        const out = normalize_css_key("zIndex");
        if (out !== "zIndex") {
          throw new Error(`expected zIndex, got ${out}`);
        }
      },
    },

    {
      suite: SUITE,
      name: "normalize_css_key: trims and converts mixed input",
      run() {
        const out = normalize_css_key("  border-left-width ");
        if (out !== "borderLeftWidth") {
          throw new Error(`expected borderLeftWidth, got ${out}`);
        }
      },
    },

    {
      suite: SUITE,
      name: "normalize_css_key: handles multiple dashes cleanly",
      run() {
        const out = normalize_css_key("font---size");
        if (out !== "fontSize") {
          throw new Error(`expected fontSize, got ${out}`);
        }
      },
    },
  ];

  return { suite: SUITE, cases };
}



export function unit_test_internals_2(): TestSuite {
  const SUITE = "unit/internals-2";

  const cases: readonly TestCase[] = [
    // ----------------------------
    // normalize_decls
    // ----------------------------

    make_unit_case(SUITE, "normalize_decls: trims keys and values", () => {
      const out = normalize_decls({
        " color ": " red ",
        " fontSize ": " 1rem ",
      } as any);

      if (out.color !== "red") {
        throw new Error(`expected color=red, got ${out.color}`);
      }

      if (out.fontSize !== "1rem") {
        throw new Error(`expected fontSize=1rem, got ${out.fontSize}`);
      }
    }),

    make_unit_case(SUITE, "normalize_decls: drops empty string values", () => {
      const out = normalize_decls({
        color: "",
        background: "   ",
        border: "1px solid red",
      } as any);

      if ("color" in out) {
        throw new Error(`expected empty 'color' to be dropped`);
      }

      if ("background" in out) {
        throw new Error(`expected whitespace-only 'background' to be dropped`);
      }

      if (out.border !== "1px solid red") {
        throw new Error(`expected border preserved, got ${out.border}`);
      }
    }),

    make_unit_case(SUITE, "normalize_decls: drops empty keys", () => {
      const out = normalize_decls({
        "": "x",
        "   ": "y",
        good: "z",
      } as any);

      const keys = Object.keys(out);
      if (keys.length !== 1 || keys[0] !== "good") {
        throw new Error(`expected only 'good', got ${keys.join(", ")}`);
      }
    }),

    make_unit_case(SUITE, "normalize_decls: preserves custom properties", () => {
      const out = normalize_decls({
        " --token ": " 10px ",
      } as any);

      if (out["--token"] !== "10px") {
        throw new Error(`expected --token=10px, got ${out["--token"]}`);
      }
    }),

    make_unit_case(SUITE, "normalize_decls: coerces non-string values via String()", () => {
      const out = normalize_decls({
        zIndex: 10 as any,
        opacity: 0.75 as any,
      } as any);

      if (out.zIndex !== "10") {
        throw new Error(`expected zIndex='10', got ${out.zIndex}`);
      }

      if (out.opacity !== "0.75") {
        throw new Error(`expected opacity='0.75', got ${out.opacity}`);
      }
    }),

    make_unit_case(SUITE, "normalize_decls: returns empty object when all entries are dropped", () => {
      const out = normalize_decls({
        "": "",
        "   ": "   ",
      } as any);

      if (Object.keys(out).length !== 0) {
        throw new Error(`expected empty object, got keys: ${Object.keys(out).join(", ")}`);
      }
    }),

    // ----------------------------
    // selector_for_quid
    // ----------------------------

    make_unit_case(SUITE, "selector_for_quid: basic mapping", () => {
      const out = hson_quid_selector("0123456789abcdfg");

      if (out !== `[hson\\:quid="0123456789abcdfg"]`) {
        throw new Error(`expected canonical escaped QUID selector, got ${out}`);
      }
    }),

    make_unit_case(SUITE, "selector_for_quid: rejects hyphenated non-QUID", () => {
      let rejected = false;
      try { hson_quid_selector("abc-123-def"); } catch { rejected = true; }
      if (!rejected) throw new Error("expected hyphenated non-QUID rejection");
    }),

    make_unit_case(SUITE, "selector_for_quid: rejects underscore non-QUID", () => {
      let rejected = false;
      try { hson_quid_selector("abc_123"); } catch { rejected = true; }
      if (!rejected) throw new Error("expected underscore non-QUID rejection");
    }),

    make_unit_case(SUITE, "selector_for_quid: rejects mixed-case non-QUID", () => {
      let rejected = false;
      try { hson_quid_selector("AbC123xYz"); } catch { rejected = true; }
      if (!rejected) throw new Error("expected mixed-case non-QUID rejection");
    }),
  ];

  return { suite: SUITE, cases };
}


export function unit_test_css_manager(): TestSuite {
  const SUITE = "unit/css-manager";


  const cases: readonly TestCase[] = [
    make_unit_case(SUITE, "setForQuid stores a value", () => {
      const m = CssManager.invoke();
      const quid = "0000000000000001";

      cleanup_quid(m, quid);

      m.setForQuid(quid, "color", "red");

      const got = m.getForQuid(quid, "color");
      if (got !== "red") {
        cleanup_quid(m, quid);
        throw new Error(`expected red, got ${got}`);
      }

      cleanup_quid(m, quid);
    }),

    make_unit_case(SUITE, "setForQuid overwrites existing value", () => {
      const m = CssManager.invoke();
      const quid = "0000000000000002";

      cleanup_quid(m, quid);

      m.setForQuid(quid, "color", "red");
      m.setForQuid(quid, "color", "blue");

      const got = m.getForQuid(quid, "color");
      if (got !== "blue") {
        cleanup_quid(m, quid);
        throw new Error(`expected blue, got ${got}`);
      }

      cleanup_quid(m, quid);
    }),

    make_unit_case(SUITE, "setManyForQuid merges multiple values", () => {
      const m = CssManager.invoke();
      const quid = "0000000000000003";

      cleanup_quid(m, quid);

      m.setManyForQuid(quid, {
        color: "red",
        backgroundColor: "blue",
      });

      const got = m.getAllForQuid(quid);
      if (!got) {
        cleanup_quid(m, quid);
        throw new Error(`expected map for ${quid}, got undefined`);
      }

      if (got.color !== "red") {
        cleanup_quid(m, quid);
        throw new Error(`expected color=red, got ${got.color}`);
      }

      if (got.backgroundColor !== "blue") {
        cleanup_quid(m, quid);
        throw new Error(`expected backgroundColor=blue, got ${got.backgroundColor}`);
      }

      cleanup_quid(m, quid);
    }),

    make_unit_case(SUITE, "unsetForQuid removes one property", () => {
      const m = CssManager.invoke();
      const quid = "0000000000000004";

      cleanup_quid(m, quid);

      m.setManyForQuid(quid, {
        color: "red",
        backgroundColor: "blue",
      });

      m.unsetForQuid(quid, "color");

      const color = m.getForQuid(quid, "color");
      const bg = m.getForQuid(quid, "backgroundColor");

      if (color !== undefined) {
        cleanup_quid(m, quid);
        throw new Error(`expected color removed, got ${color}`);
      }

      if (bg !== "blue") {
        cleanup_quid(m, quid);
        throw new Error(`expected backgroundColor preserved as blue, got ${bg}`);
      }

      cleanup_quid(m, quid);
    }),

    make_unit_case(SUITE, "clearQuid removes all properties for a quid", () => {
      const m = CssManager.invoke();
      const quid = "0000000000000005";

      cleanup_quid(m, quid);

      m.setManyForQuid(quid, {
        color: "red",
        backgroundColor: "blue",
      });

      m.clearQuid(quid);

      const got = m.getAllForQuid(quid);
      if (got !== undefined) {
        cleanup_quid(m, quid);
        throw new Error(`expected undefined after clearQuid, got ${JSON.stringify(got)}`);
      }

      cleanup_quid(m, quid);
    }),

    make_unit_case(SUITE, "snapshot includes emitted rule for quid styles", () => {
      const m = CssManager.invoke();
      const quid = "0000000000000006";

      cleanup_quid(m, quid);

      m.setForQuid(quid, "color", "red");
      m.syncNow();
      const css = m.snapshot();
      const selector = hson_quid_selector(quid);

      // escape for regex
      const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      const re = new RegExp(
        `${esc}\\s*\\{[^}]*color\\s*:\\s*red\\s*;`,
        "s",
      );

      if (!re.test(css)) {
        cleanup_quid(m, quid);
        throw new Error(`snapshot missing scoped color:red rule:\n${css}`);
      }

      cleanup_quid(m, quid);
    }),

    make_unit_case(SUITE, "setting same prop twice does not duplicate storage", () => {
      const m = CssManager.invoke();
      const quid = "0000000000000007";

      cleanup_quid(m, quid);

      m.setForQuid(quid, "color", "red");
      m.setForQuid(quid, "color", "red");

      const all = m.getAllForQuid(quid);

      if (!all) {
        cleanup_quid(m, quid);
        throw new Error(`expected rule bucket for ${quid}`);
      }

      if (all.color !== "red") {
        cleanup_quid(m, quid);
        throw new Error(`expected color=red, got ${all.color}`);
      }

      const colorKeys = Object.keys(all).filter(k => k === "color");
      if (colorKeys.length !== 1) {
        cleanup_quid(m, quid);
        throw new Error(`expected one color entry, got ${JSON.stringify(all)}`);
      }

      cleanup_quid(m, quid);
    }),

    make_unit_case(SUITE, "selector rule stores pseudo rule under explicit rule key", () => {
      const m = CssManager.invoke();
      const quid = "0000000000000008";
      const key = `unit:${quid}:before`;

      cleanup_quid(m, quid);
      gcss.drop(key);

      // CHANGED: pseudos are selector rules now; this replaces the removed
      // setPseudoForQuid storage path.
      gcss
        .rule(key, `${hson_quid_selector(quid)}::before`)
        .setProp("content", `"X"`);
      const css = gcss.get(key);

      if (!css?.includes(`${hson_quid_selector(quid)}::before`)) {
        gcss.drop(key);
        cleanup_quid(m, quid);
        throw new Error(`rule missing ::before selector: ${String(css)}`);
      }

      if (!css.includes(`content:"X";`)) {
        gcss.drop(key);
        cleanup_quid(m, quid);
        throw new Error(`rule missing pseudo content:"X"; ${css}`);
      }

      gcss.drop(key);
      cleanup_quid(m, quid);
    }),

    make_unit_case(SUITE, "selector rule drop removes only one pseudo selector", () => {
      const m = CssManager.invoke();
      const quid = "0000000000000009";
      const beforeKey = `unit:${quid}:before`;
      const afterKey = `unit:${quid}:after`;

      cleanup_quid(m, quid);
      gcss.drop(beforeKey);
      gcss.drop(afterKey);

      gcss
        .rule(beforeKey, `${hson_quid_selector(quid)}::before`)
        .setProp("content", `"A"`);
      gcss
        .rule(afterKey, `${hson_quid_selector(quid)}::after`)
        .setProp("content", `"B"`);

      gcss.drop(beforeKey);

      const beforeCss = gcss.get(beforeKey);
      const afterCss = gcss.get(afterKey);

      if (beforeCss !== undefined) {
        gcss.drop(afterKey);
        cleanup_quid(m, quid);
        throw new Error(`expected ::before removed, css was:\n${beforeCss}`);
      }

      if (!afterCss?.includes(`${hson_quid_selector(quid)}::after`)) {
        gcss.drop(afterKey);
        cleanup_quid(m, quid);
        throw new Error(`expected ::after preserved, css was:\n${String(afterCss)}`);
      }

      gcss.drop(afterKey);
      cleanup_quid(m, quid);
    }),

    make_unit_case(SUITE, "selector rule drops remove all pseudo selectors for one quid", () => {
      const m = CssManager.invoke();
      const quid = "0000000000000010";
      const beforeKey = `unit:${quid}:before`;
      const afterKey = `unit:${quid}:after`;

      cleanup_quid(m, quid);
      gcss.drop(beforeKey);
      gcss.drop(afterKey);

      gcss
        .rule(beforeKey, `${hson_quid_selector(quid)}::before`)
        .setProp("content", `"A"`);
      gcss
        .rule(afterKey, `${hson_quid_selector(quid)}::after`)
        .setProp("content", `"B"`);

      gcss.drop(beforeKey);
      gcss.drop(afterKey);

      const beforeCss = gcss.get(beforeKey);
      const afterCss = gcss.get(afterKey);

      if (beforeCss !== undefined || afterCss !== undefined) {
        cleanup_quid(m, quid);
        throw new Error(`expected all selector pseudos removed for ${quid}, before=${String(beforeCss)} after=${String(afterCss)}`);
      }

      cleanup_quid(m, quid);
    }),
  ];

  return { suite: SUITE, cases };
}
