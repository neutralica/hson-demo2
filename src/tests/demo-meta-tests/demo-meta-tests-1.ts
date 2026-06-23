// demo-meta-tests-1.ts

import { COLOR_VAR_SOURCES, _colors, color_var_name_for_path } from "../../app/core/consts/colors.consts";
import { parse_oklch } from "../../app/core/helpers/color-helpers";
import { OKLCH_COLOR_TARGETS } from "../../app/demos/oklch/link-colors";
import {
  apply_color_diff,
  create_demo_store,
  get_changed_color_tokens,
  get_color_diff,
  get_color_token,
  is_color_changed,
  make_initial_demo_state,
  reset_changed_color_values,
  reset_color_value,
  reset_color_values,
  set_color_value,
  type DemoColorDiff,
} from "../../app/state/store";
import { make_demo_meta_suite, type DemoMetaCaseSpec, type DemoMetaSuite } from "./make-demo-meta-test";

type StringLeaf = Readonly<{
  path: string;
  value: string;
}>;

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function cssVarRefPrefix(varName: string): string {
  return varName.startsWith("--") ? `var(${varName}` : `var(--${varName}`;
}
function collectStringLeaves(value: unknown, prefix = ""): StringLeaf[] {
  if (typeof value === "string") return [{ path: prefix, value }];
  if (!isRecord(value)) return [];

  const leaves: StringLeaf[] = [];

  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    leaves.push(...collectStringLeaves(child, path));
  }

  return leaves;
}

function sourceForPath(path: string) {
  return COLOR_VAR_SOURCES.find((source) => source.path === path);
}

export function demo_meta_colors(): DemoMetaSuite {
  const SUITE = "demo-meta/colors";

  const cases: readonly DemoMetaCaseSpec[] = [
    {
      name: "COLOR_VAR_SOURCES values are literal source colors",
      assert(_ctx, t) {
        t.ok("COLOR_VAR_SOURCES has entries", COLOR_VAR_SOURCES.length > 0);

        for (const source of COLOR_VAR_SOURCES) {
          t.ok(`${source.path} has a path`, source.path.length > 0);
          t.ok(`${source.path} has a varName`, source.varName.length > 0);
          t.ok(`${source.path} varName has no whitespace`, !/\s/.test(source.varName));
          t.ok(`${source.path} value is not var(...)`, !source.value.trim().startsWith("var("));
        }
      },
    },

    {
      name: "COLOR_VAR_SOURCES paths and var names are unique",
      assert(_ctx, t) {
        const paths = new Set<string>();
        const varNames = new Set<string>();

        for (const source of COLOR_VAR_SOURCES) {
          t.ok(`${source.path} path is unique`, !paths.has(source.path));
          t.ok(`${source.varName} varName is unique`, !varNames.has(source.varName));

          paths.add(source.path);
          varNames.add(source.varName);
        }
      },
    },

    {
      name: "color var names are derived from their source paths",
      assert(_ctx, t) {
        for (const source of COLOR_VAR_SOURCES) {
          t.eq(`${source.path} varName`, source.varName, color_var_name_for_path(source.path));
        }
      },
    },

    {
      name: "_cols string leaves are CSS var refs with fallbacks",
      assert(_ctx, t) {
        const leaves = collectStringLeaves(_colors);
        t.ok("_cols has string leaves", leaves.length > 0);

        for (const leaf of leaves) {
          const source = sourceForPath(leaf.path);
          t.ok(`${leaf.path} has source`, !!source);
          if (!source) continue;

          t.ok(`${leaf.path} is a var(...) ref`, leaf.value.trim().startsWith("var("));
          t.ok(`${leaf.path} includes CSS var ref`, leaf.value.includes(cssVarRefPrefix(source.varName)));
          t.ok(`${leaf.path} includes literal fallback`, leaf.value.includes(source.value));
        }
      },
    },

    {
      name: "OKLCH_COLOR_TARGETS are parseable literal OKLCH values",
      assert(_ctx, t) {
        t.ok("OKLCH_COLOR_TARGETS has entries", OKLCH_COLOR_TARGETS.length > 0);

        for (const target of OKLCH_COLOR_TARGETS) {
          t.ok(`${target.label} initial is literal`, !target.initial.trim().startsWith("var("));
          parse_oklch(target.initial);
        }
      },
    },

    {
      name: "OKLCH_COLOR_TARGETS correspond to known color var sources",
      assert(_ctx, t) {
        const sourcesByVar = new Map(COLOR_VAR_SOURCES.map((source) => [source.varName, source]));

        for (const target of OKLCH_COLOR_TARGETS) {
          const source = sourcesByVar.get(target.varName);
          t.ok(`${target.label} has backing source`, !!source);
          if (!source) continue;

          t.eq(`${target.label} target initial`, target.initial, source.value);
        }
      },
    },

    {
      name: "demo color state seeds tokens from COLOR_VAR_SOURCES",
      assert(_ctx, t) {
        const store = create_demo_store(make_initial_demo_state());
        const tokens = store.getColorTokens();

        t.eq("seeded token count", Object.keys(tokens).length, COLOR_VAR_SOURCES.length);

        for (const source of COLOR_VAR_SOURCES) {
          const token = tokens[source.path];
          t.ok(`${source.path} token exists`, !!token);
          if (!token) continue;

          const isOklch = source.value.trim().startsWith("oklch(");

          t.eq(`${source.path} token path`, token.path, source.path);
          t.eq(`${source.path} token label`, token.label, source.path.replace(/\./g, "-"));
          t.eq(`${source.path} token varName`, token.varName, source.varName);
          t.eq(`${source.path} token initial`, token.initial, source.value);
          t.eq(`${source.path} token value`, token.value, source.value);
          t.eq(`${source.path} token editable`, token.editable, isOklch);
          t.eq(`${source.path} token kind`, token.kind, isOklch ? "oklch" : "css");
        }
      },
    },

    {
      name: "demo color state tracks active color path",
      assert(_ctx, t) {
        const store = create_demo_store(make_initial_demo_state());
        const target = OKLCH_COLOR_TARGETS[0];
        t.ok("has first OKLCH target", !!target);
        if (!target) return;

        t.eq("initial active path", store.getColorActivePath(), null);

        store.setColorActivePath(target.path);
        t.eq("active path after set", store.getColorActivePath(), target.path);
        t.eq("active token after set", store.getColorActiveToken()?.path, target.path);

        store.setColorActivePath(null);
        t.eq("active path can clear", store.getColorActivePath(), null);
        t.eq("active token clears", store.getColorActiveToken(), undefined);
      },
    },

    {
      name: "demo color state sets and resets one token value",
      assert(_ctx, t) {
        const store = create_demo_store(make_initial_demo_state());
        const target = OKLCH_COLOR_TARGETS[0];
        t.ok("has first OKLCH target", !!target);
        if (!target) return;

        const next = "oklch(50% 0.1 30)";
        store.setColorValue(target.path, next);
        t.eq("token value after set", store.getColTkn(target.path)?.value, next);

        store.resetColVal(target.path);
        t.eq("token value after reset", store.getColTkn(target.path)?.value, target.initial);
      },
    },

    {
      name: "demo color state factory-resets all token values",
      assert(_ctx, t) {
        const store = create_demo_store(make_initial_demo_state());
        const first = OKLCH_COLOR_TARGETS[0];
        const second = OKLCH_COLOR_TARGETS[1];
        t.ok("has first OKLCH target", !!first);
        t.ok("has second OKLCH target", !!second);
        if (!first || !second) return;

        store.setColorValue(first.path, "oklch(10% 0.1 10)");
        store.setColorValue(second.path, "oklch(20% 0.2 20)");
        store.resetColorValues();

        for (const token of Object.values(store.getColorTokens())) {
          t.eq(`${token.path} reset value`, token.value, token.initial);
        }
      },
    },

    {
      name: "demo color state rejects unknown color paths",
      assert(_ctx, t) {
        const store = create_demo_store(make_initial_demo_state());

        t.throws("unknown active path throws", () => store.setColorActivePath("__missing__"));
        t.throws("unknown value path throws", () => store.setColorValue("__missing__", "oklch(50% 0.1 30)"));
        t.throws("unknown reset path throws", () => store.resetColVal("__missing__"));
      },
    },
  ];

  return make_demo_meta_suite(SUITE, cases);
}


export function demo_meta_diffing(): DemoMetaSuite {
  const SUITE = "demo-meta/color-diffing";

  const cases: readonly DemoMetaCaseSpec[] = [
    {
      name: "demo color diffing reports unchanged defaults",
      assert(_ctx, t) {
        const target = OKLCH_COLOR_TARGETS[0];
        t.ok("has first OKLCH target", !!target);
        if (!target) return;

        reset_color_values();

        t.eq("target initially unchanged", is_color_changed(target.path), false);
        t.eq("no changed tokens after reset", get_changed_color_tokens().length, 0);
        t.eq("empty diff after reset", Object.keys(get_color_diff()).length, 0);
      },
      cleanup() {
        reset_color_values();
      },
    },

    {
      name: "demo color diffing reports changed token values",
      assert(_ctx, t) {
        const target = OKLCH_COLOR_TARGETS[0];
        t.ok("has first OKLCH target", !!target);
        if (!target) return;

        reset_color_values();

        const next = "oklch(50% 0.1 30)";
        set_color_value(target.path, next);

        const changed = get_changed_color_tokens();
        const diff = get_color_diff();

        t.eq("target reports changed", is_color_changed(target.path), true);
        t.eq("one changed token", changed.length, 1);
        t.eq("changed token path", changed[0]?.path, target.path);
        t.eq("changed token value", changed[0]?.value, next);
        t.eq("diff contains changed value", diff[target.path], next);
      },
      cleanup() {
        reset_color_values();
      },
    },

    {
      name: "demo color diffing reset clears changed values",
      assert(_ctx, t) {
        const first = OKLCH_COLOR_TARGETS[0];
        const second = OKLCH_COLOR_TARGETS[1];
        t.ok("has first OKLCH target", !!first);
        t.ok("has second OKLCH target", !!second);
        if (!first || !second) return;

        reset_color_values();

        set_color_value(first.path, "oklch(10% 0.1 10)");
        set_color_value(second.path, "oklch(20% 0.2 20)");

        t.eq("two changed tokens before reset", get_changed_color_tokens().length, 2);

        reset_changed_color_values();

        t.eq("first reset to initial", get_color_token(first.path)?.value, first.initial);
        t.eq("second reset to initial", get_color_token(second.path)?.value, second.initial);
        t.eq("no changed tokens after reset", get_changed_color_tokens().length, 0);
        t.eq("empty diff after reset", Object.keys(get_color_diff()).length, 0);
      },
      cleanup() {
        reset_color_values();
      },
    },

    {
      name: "demo color diffing single reset removes token from diff",
      assert(_ctx, t) {
        const first = OKLCH_COLOR_TARGETS[0];
        const second = OKLCH_COLOR_TARGETS[1];
        t.ok("has first OKLCH target", !!first);
        t.ok("has second OKLCH target", !!second);
        if (!first || !second) return;

        reset_color_values();

        const firstNext = "oklch(10% 0.1 10)";
        const secondNext = "oklch(20% 0.2 20)";
        set_color_value(first.path, firstNext);
        set_color_value(second.path, secondNext);

        reset_color_value(first.path);

        const diff = get_color_diff();

        t.eq("first is no longer changed", is_color_changed(first.path), false);
        t.eq("second is still changed", is_color_changed(second.path), true);
        t.eq("diff omits reset token", diff[first.path], undefined);
        t.eq("diff keeps other changed token", diff[second.path], secondNext);
      },
      cleanup() {
        reset_color_values();
      },
    },

    {
      name: "demo color diffing treats setting initial value as unchanged",
      assert(_ctx, t) {
        const target = OKLCH_COLOR_TARGETS[0];
        t.ok("has first OKLCH target", !!target);
        if (!target) return;

        reset_color_values();
        set_color_value(target.path, target.initial);

        t.eq("target remains unchanged", is_color_changed(target.path), false);
        t.eq("no changed tokens", get_changed_color_tokens().length, 0);
        t.eq("empty diff", Object.keys(get_color_diff()).length, 0);
      },
      cleanup() {
        reset_color_values();
      },
    },

    {
      name: "demo color diffing clears when value returns to initial",
      assert(_ctx, t) {
        const target = OKLCH_COLOR_TARGETS[0];
        t.ok("has first OKLCH target", !!target);
        if (!target) return;

        reset_color_values();

        set_color_value(target.path, "oklch(50% 0.1 30)");
        t.eq("target reports changed after edit", is_color_changed(target.path), true);

        set_color_value(target.path, target.initial);

        t.eq("target clears changed after returning to initial", is_color_changed(target.path), false);
        t.eq("no changed tokens after returning to initial", get_changed_color_tokens().length, 0);
        t.eq("empty diff after returning to initial", Object.keys(get_color_diff()).length, 0);
      },
      cleanup() {
        reset_color_values();
      },
    },

    {
      name: "demo color diffing handles no-op changed reset",
      assert(_ctx, t) {
        reset_color_values();
        reset_changed_color_values();

        t.eq("no changed tokens after no-op reset", get_changed_color_tokens().length, 0);
        t.eq("empty diff after no-op reset", Object.keys(get_color_diff()).length, 0);
      },
      cleanup() {
        reset_color_values();
      },
    },

    {
      name: "demo color diffing reports unknown paths as unchanged",
      assert(_ctx, t) {
        reset_color_values();

        t.eq("missing path is unchanged", is_color_changed("__missing__"), false);
      },
      cleanup() {
        reset_color_values();
      },
    },

    {
      name: "demo color diffing applies color diffs as palette patches",
      assert(_ctx, t) {
        const first = OKLCH_COLOR_TARGETS[0];
        const second = OKLCH_COLOR_TARGETS[1];
        t.ok("has first OKLCH target", !!first);
        t.ok("has second OKLCH target", !!second);
        if (!first || !second) return;

        reset_color_values();

        const diff: DemoColorDiff = {
          [first.path]: "oklch(10% 0.1 10)",
          [second.path]: "oklch(20% 0.2 20)",
        };

        apply_color_diff(diff);

        t.eq("first value is patched", get_color_token(first.path)?.value, diff[first.path]);
        t.eq("second value is patched", get_color_token(second.path)?.value, diff[second.path]);
        t.eq("first reports changed", is_color_changed(first.path), true);
        t.eq("second reports changed", is_color_changed(second.path), true);
        t.eq("diff reports two patched values", Object.keys(get_color_diff()).length, 2);
      },
      cleanup() {
        reset_color_values();
      },
    },

    {
      name: "demo color diffing applies initial values as patch clears",
      assert(_ctx, t) {
        const target = OKLCH_COLOR_TARGETS[0];
        t.ok("has first OKLCH target", !!target);
        if (!target) return;

        reset_color_values();
        set_color_value(target.path, "oklch(50% 0.1 30)");

        t.eq("target changed before patch clear", is_color_changed(target.path), true);

        apply_color_diff({ [target.path]: target.initial });

        t.eq("target value returns to initial", get_color_token(target.path)?.value, target.initial);
        t.eq("target no longer changed", is_color_changed(target.path), false);
        t.eq("diff empty after patch clear", Object.keys(get_color_diff()).length, 0);
      },
      cleanup() {
        reset_color_values();
      },
    },

    {
      name: "demo color diffing treats empty color diff as no-op",
      assert(_ctx, t) {
        reset_color_values();
        apply_color_diff({});

        t.eq("no changed tokens after empty patch", get_changed_color_tokens().length, 0);
        t.eq("empty diff after empty patch", Object.keys(get_color_diff()).length, 0);
      },
      cleanup() {
        reset_color_values();
      },
    },

    {
      name: "demo color diffing validates patch before mutating",
      assert(_ctx, t) {
        const target = OKLCH_COLOR_TARGETS[0];
        t.ok("has first OKLCH target", !!target);
        if (!target) return;

        reset_color_values();

        const patch = {
          [target.path]: "oklch(10% 0.1 10)",
          __missing__: "oklch(20% 0.2 20)",
        } as DemoColorDiff;

        t.throws("unknown path throws", () => apply_color_diff(patch));
        t.eq("known path was not partially applied", get_color_token(target.path)?.value, target.initial);
        t.eq("no changed tokens after rejected patch", get_changed_color_tokens().length, 0);
      },
      cleanup() {
        reset_color_values();
      },
    },
  ];

  return make_demo_meta_suite(SUITE, cases);
}

