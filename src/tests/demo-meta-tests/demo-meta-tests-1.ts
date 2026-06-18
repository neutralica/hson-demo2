// demo-meta-tests-1.ts

import { COLOR_VAR_SOURCES, _cols, color_var_name_for_path } from "../../app/core/consts/colors.consts";
import { parse_oklch } from "../../app/core/helpers/color-helpers";
import { OKLCH_COLOR_TARGETS } from "../../app/phases/phase-3-demo/demo-oklch/link-colors";
import { create_demo_store, make_initial_demo_state } from "../../app/state/store";
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

export function demo_meta_1_colors(): DemoMetaSuite {
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
        const leaves = collectStringLeaves(_cols);
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
        const tokens = store.get_color_tokens();

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

        t.eq("initial active path", store.get_color_active_path(), null);

        store.set_color_active_path(target.path);
        t.eq("active path after set", store.get_color_active_path(), target.path);
        t.eq("active token after set", store.get_active_color_token()?.path, target.path);

        store.set_color_active_path(null);
        t.eq("active path can clear", store.get_color_active_path(), null);
        t.eq("active token clears", store.get_active_color_token(), undefined);
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
        store.set_color_value(target.path, next);
        t.eq("token value after set", store.get_color_token(target.path)?.value, next);

        store.reset_color_value(target.path);
        t.eq("token value after reset", store.get_color_token(target.path)?.value, target.initial);
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

        store.set_color_value(first.path, "oklch(10% 0.1 10)");
        store.set_color_value(second.path, "oklch(20% 0.2 20)");
        store.reset_color_values();

        for (const token of Object.values(store.get_color_tokens())) {
          t.eq(`${token.path} reset value`, token.value, token.initial);
        }
      },
    },

    {
      name: "demo color state rejects unknown color paths",
      assert(_ctx, t) {
        const store = create_demo_store(make_initial_demo_state());

        t.throws("unknown active path throws", () => store.set_color_active_path("__missing__"));
        t.throws("unknown value path throws", () => store.set_color_value("__missing__", "oklch(50% 0.1 30)"));
        t.throws("unknown reset path throws", () => store.reset_color_value("__missing__"));
      },
    },
  ];

  return make_demo_meta_suite(SUITE, cases);
}