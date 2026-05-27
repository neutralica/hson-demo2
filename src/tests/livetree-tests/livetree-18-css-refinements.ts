import { CssManager } from "hson-live";
import type { TestSuite, LiveTreeCaseSpec } from "../../app/phases/phase-3-demo/demo-test/tests.types";
import { make_livetree_suite } from "./livetree-testkit";




export function livetree_css_refinements(): TestSuite {
    const SUITE = "livetree-18/css-refinements";
    const cases: readonly LiveTreeCaseSpec[] = [
        {
            suite: SUITE,
            name: "css surface: public api exposes global vars, keyframes, and atProperty",
            dom: true,
            fixture: "css-surface",
            sub: "css-api-exposes-global-managers",

            html: `
        <main id="root">
          <div id="box">x</div>
        </main>
    `,

            async act(tree) {
                const css = CssManager.api();

                (tree as any).__result = {
                    hasVarSet: typeof css.var.set === "function",
                    hasVarRef: typeof css.var.get === "function",
                    hasKeyframesSet: typeof css.keyframes.set === "function",
                    hasKeyframesRenderAll: typeof css.keyframes.renderAll === "function",
                    hasAtPropertyRegister: typeof css.atProperty.register === "function",
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;

                t.eq("CssManager.api exposes var.set", r.hasVarSet, true);
                t.eq("CssManager.api exposes var.ref", r.hasVarRef, true);
                t.eq("CssManager.api exposes keyframes.set", r.hasKeyframesSet, true);
                t.eq("CssManager.api exposes keyframes.renderAll", r.hasKeyframesRenderAll, true);
                t.eq("CssManager.api exposes atProperty.register", r.hasAtPropertyRegister, true);
            },
        },
        {
            suite: SUITE,
            name: "css surface: owned keyframes are released with owner quid",
            dom: true,
            fixture: "css-surface",
            sub: "owned-keyframes-release-by-quid",

            html: `
        <main id="root">
          <div id="box">x</div>
        </main>
    `,

            async act(tree) {
                const mgr = CssManager.invoke();
                const owner = "owned-kf-owner-a";
                const name = "owned_kf_release_a";

                mgr.keyframes.delete(name);
                mgr.releaseOwnedCssForQuid(owner);

                // changed: generated/node-owned keyframes are globally rendered but lifecycle-owned by this QUID.
                mgr.setOwnedKeyframesForQuid(owner, {
                    name,
                    steps: [
                        { selector: "from", decls: { opacity: "0" } },
                        { selector: "to", decls: { opacity: "1" } },
                    ],
                } as any);

                const beforeHas = mgr.keyframes.has(name);
                const beforeOwned = mgr.keyframes.listOwned(owner).includes(name);
                const beforeRender = mgr.keyframes.renderOne(name);

                mgr.releaseOwnedCssForQuid(owner);

                (tree as any).__result = {
                    beforeHas,
                    beforeOwned,
                    beforeRenderIncludesName: beforeRender.includes(`@keyframes ${name}`),
                    afterHas: mgr.keyframes.has(name),
                    afterOwnedLength: mgr.keyframes.listOwned(owner).length,
                    afterRender: mgr.keyframes.renderOne(name),
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;

                t.eq("owned keyframes exist before release", r.beforeHas, true);
                t.eq("owned keyframes are indexed by owner", r.beforeOwned, true);
                t.eq("owned keyframes render before release", r.beforeRenderIncludesName, true);
                t.eq("owned keyframes are removed after owner release", r.afterHas, false);
                t.eq("owner index is empty after release", r.afterOwnedLength, 0);
                t.eq("renderOne is empty after release", r.afterRender, "");
            },
        },
        {
            suite: SUITE,
            name: "css surface: durable api keyframes survive owner release",
            dom: true,
            fixture: "css-surface",
            sub: "durable-keyframes-survive-quid-release",

            html: `
        <main id="root">
          <div id="box">x</div>
        </main>
    `,

            async act(tree) {
                const css = CssManager.api();
                const mgr = CssManager.invoke();
                const owner = "durable-kf-owner-a";
                const name = "durable_kf_survives_a";

                css.keyframes.delete(name);
                mgr.releaseOwnedCssForQuid(owner);

                // changed: public API keyframes are durable/global unless explicitly deleted.
                css.keyframes.set({
                    name,
                    source: "global",
                    steps: [
                        { selector: "from", decls: { transform: "translateX(0px)" } },
                        { selector: "to", decls: { transform: "translateX(10px)" } },
                    ],
                } as any);

                mgr.releaseOwnedCssForQuid(owner);

                const afterReleaseHas = css.keyframes.has(name);
                const afterReleaseOwnedLength = css.keyframes.listOwned(owner).length;
                const afterReleaseRender = css.keyframes.renderOne(name);

                css.keyframes.delete(name);

                (tree as any).__result = {
                    afterReleaseHas,
                    afterReleaseOwnedLength,
                    afterReleaseRenderIncludesName: afterReleaseRender.includes(`@keyframes ${name}`),
                    afterExplicitDeleteHas: css.keyframes.has(name),
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;

                t.eq("durable api keyframes survive unrelated owner release", r.afterReleaseHas, true);
                t.eq("durable api keyframes are not indexed as owner-owned", r.afterReleaseOwnedLength, 0);
                t.eq("durable api keyframes still render after owner release", r.afterReleaseRenderIncludesName, true);
                t.eq("durable api keyframes delete explicitly", r.afterExplicitDeleteHas, false);
            },
        },
        {
            suite: SUITE,
            name: "css surface: durable keyframes set clears prior owned lifecycle",
            dom: true,
            fixture: "css-surface",
            sub: "durable-set-clears-owned-keyframes-lifecycle",

            html: `
        <main id="root">
          <div id="box">x</div>
        </main>
    `,

            async act(tree) {
                const css = CssManager.api();
                const mgr = CssManager.invoke();
                const owner = "owned-kf-owner-b";
                const name = "owned_then_global_kf_b";

                css.keyframes.delete(name);
                mgr.releaseOwnedCssForQuid(owner);

                mgr.setOwnedKeyframesForQuid(owner, {
                    name,
                    steps: [
                        { selector: "from", decls: { opacity: "0" } },
                        { selector: "to", decls: { opacity: "0.5" } },
                    ],
                } as any);

                const ownedBeforeGlobalSet = css.keyframes.listOwned(owner).includes(name);

                css.keyframes.set({
                    name,
                    source: "global",
                    steps: [
                        { selector: "from", decls: { opacity: "0.25" } },
                        { selector: "to", decls: { opacity: "1" } },
                    ],
                } as any);

                const ownedAfterGlobalSet = css.keyframes.listOwned(owner).includes(name);

                mgr.releaseOwnedCssForQuid(owner);

                const survivesOwnerRelease = css.keyframes.has(name);
                const def = css.keyframes.get(name);

                css.keyframes.delete(name);

                (tree as any).__result = {
                    ownedBeforeGlobalSet,
                    ownedAfterGlobalSet,
                    survivesOwnerRelease,
                    sourceAfterGlobalSet: def?.source,
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;
t.eq("keyframes initially owned by QUID", r.ownedBeforeGlobalSet, true);
t.eq("durable keyframes set clears owned index", r.ownedAfterGlobalSet, false);
t.eq("durable keyframes survive former owner release", r.survivesOwnerRelease, true);
t.eq("durable keyframes source is global", r.sourceAfterGlobalSet, "global");
            },
        },
{
  suite: SUITE,
  name: "css surface: setMany nested selector key with ampersand writes selector rule",
  dom: true,
  fixture: "css-selectors",
  sub: "setmany-nested-selector-ampersand",

  html: `
    <main id="root">
      <div id="test-div">target</div>
    </main>
  `,

  async act(tree) {
    const root = tree.find.must.byId("root");

    root.css.setMany({
      color: "white",

      "& > #test-div": {
        background: "red",
        color: "black",
      },
    });

    (tree as any).__result = {
      baseColor: root.css.get.color(),
      childBackground: root.css.selector("& > #test-div").get.background(),
      childColor: root.css.selector("& > #test-div").get.color(),
    };
  },

  assert(tree, t) {
    const r = (tree as any).__result;

    t.eq("base declaration still applies normally", r.baseColor, "white");
    t.eq("nested selector background is readable through selector getter", r.childBackground, "red");
    t.eq("nested selector color is readable through selector getter", r.childColor, "black");
  },
},
{
  suite: SUITE,
  name: "css surface: selector method works without ampersand using appended pattern",
  dom: true,
  fixture: "css-selectors",
  sub: "selector-method-no-ampersand",

  html: `
    <main id="root">
      <div id="test-div">target</div>
    </main>
  `,

  async act(tree) {
    const root = tree.find.must.byId("root");

    root.css.selector(" > #test-div").setMany({
      background: "blue",
      color: "yellow",
    });

    (tree as any).__result = {
      childBackground: root.css.selector(" > #test-div").get.background(),
      childColor: root.css.selector(" > #test-div").get.color(),
    };
  },

  assert(tree, t) {
    const r = (tree as any).__result;

    t.eq("selector getter reads no-ampersand background", r.childBackground, "blue");
    t.eq("selector getter reads no-ampersand color", r.childColor, "yellow");
  },
},
{
  suite: SUITE,
  name: "css surface: setMany nested selector key without ampersand is ignored",
  dom: true,
  fixture: "css-selectors",
  sub: "setmany-nested-selector-no-ampersand-ignored",

  html: `
    <main id="root">
      <div id="test-div">target</div>
    </main>
  `,

  async act(tree) {
    const root = tree.find.must.byId("root");

    root.css.setMany({
      " > #test-div": {
        background: "purple",
      },
    });

    (tree as any).__result = {
      childBackground: root.css.selector(" > #test-div").get.background(),
    };
  },

  assert(tree, t) {
    const r = (tree as any).__result;

    t.eq("setMany selector keys require ampersand", r.childBackground, undefined);
  },
},
{
  suite: SUITE,
  name: "css surface: setMany nested pseudo-element selector writes vendor range thumb rule",
  dom: true,
  fixture: "css-selectors",
  sub: "setmany-webkit-slider-thumb-selector",

  html: `
    <main id="root">
      <input id="range" type="range" />
    </main>
  `,

  async act(tree) {
    const range = tree.find.must.byId("range");

    range.css.setMany({
      appearance: "none",

      "&::-webkit-slider-thumb": {
        "-webkit-appearance": "none",
        appearance: "none",
        background: "red",
        border: "1px solid white",
        borderRadius: "0",
      },
    });

    const thumb = range.css.selector("&::-webkit-slider-thumb");
    // changed: diagnostic instrumentation for selector rule rendering.
    const css = CssManager.api();
    const renderedAll = css.renderAll();
    const rules = css.list();

    (tree as any).__result = {
      baseAppearance: range.css.get.appearance(),
      thumbWebkitAppearance: thumb.get.property("-webkit-appearance"),
      thumbAppearance: thumb.get.appearance(),
      thumbBackground: thumb.get.background(),
      thumbBorder: thumb.get.border(),
      thumbBorderRadius: thumb.get.borderRadius(),
      renderedAll,
      rules,
    };
  },

  assert(tree, t) {
    const r = (tree as any).__result;
    // changed: temporary diagnostic output.
    console.log("[selector diagnostics] rules:", r.rules);
    console.log("[selector diagnostics] rendered css:\n", r.renderedAll);

    t.eq("base range appearance is stored", r.baseAppearance, "none");
    t.eq("webkit thumb appearance is readable", r.thumbWebkitAppearance, "none");
    t.eq("thumb appearance is readable", r.thumbAppearance, "none");
    t.eq("thumb background is readable", r.thumbBackground, "red");
    t.eq("thumb border is readable", r.thumbBorder, "1px solid white");
    t.eq("thumb border radius is readable", r.thumbBorderRadius, "0");
  },
},
{
  suite: SUITE,
  name: "css surface: selector getter sees values written after getter creation",
  dom: true,
  fixture: "css-selectors",
  sub: "selector-getter-live-read",

  html: `
    <main id="root">
      <div id="test-div">target</div>
    </main>
  `,

  async act(tree) {
    const root = tree.find.must.byId("root");
    const selected = root.css.selector("& > #test-div");

    const before = selected.get.background();

    selected.setMany({
      background: "orange",
    });

    const afterFirstSet = selected.get.background();

    root.css.setMany({
      "& > #test-div": {
        background: "green",
      },
    });

    const afterSetMany = selected.get.background();

    (tree as any).__result = {
      before,
      afterFirstSet,
      afterSetMany,
    };
  },

  assert(tree, t) {
    const r = (tree as any).__result;

    t.eq("selector getter starts empty", r.before, undefined);
    t.eq("selector getter sees selector().setMany write", r.afterFirstSet, "orange");
    t.eq("selector getter sees later nested setMany overwrite", r.afterSetMany, "green");
  },
        },



    ];
    return make_livetree_suite(SUITE, cases);
}





