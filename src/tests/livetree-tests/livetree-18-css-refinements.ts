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

        const thumb = range.css.selector("::-webkit-slider-thumb");
        // changed: diagnostic instrumentation for selector rule rendering.
        const css = CssManager.api();
        const renderedAll = css.renderAll();
        const rules = css.list();
        console.log(">>> tree.css.get.all()");
        console.log(tree.css.get.all());

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
        // console.log("[selector diagnostics] rules:", r.rules);
        // console.log("[selector diagnostics] rendered css:\n", r.renderedAll);

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
      name: "css surface: get.all returns setMany-compatible base declarations",
      dom: true,
      fixture: "css-selectors",
      sub: "get-all-base-declarations",

      html: `
    <main id="root">
      <div id="box"></div>
    </main>
  `,

      async act(tree) {
        const box = tree.find.must.byId("box");

        box.css.setMany({
          appearance: "none",
          background: "red",
          borderRadius: "0",
        });

        const all = box.css.get.all();
        const stringAll = box.css.get.stringAll();

        box.css.clear();
        box.css.setMany(all);

        (tree as any).__result = {
          all,
          stringAll: stringAll,
          replayAppearance: box.css.get.appearance(),
          replayBackground: box.css.get.background(),
          replayBorderRadius: box.css.get.borderRadius(),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("get.all appearance is setMany-compatible", r.all.appearance, "none");
        t.eq("get.all background is setMany-compatible", r.all.background, "red");
        t.eq("get.all borderRadius is setMany-compatible", r.all.borderRadius, "0");
        t.eq("get.stringAll serializes base declarations", r.stringAll, "appearance: none; background: red; border-radius: 0;");

        t.eq("get.all round-trips appearance", r.replayAppearance, "none");
        t.eq("get.all round-trips background", r.replayBackground, "red");
        t.eq("get.all round-trips borderRadius", r.replayBorderRadius, "0");
      },
    },
    {
      suite: SUITE,
      name: "css surface: selector get.all returns setMany-compatible declarations",
      dom: true,
      fixture: "css-selectors",
      sub: "get-all-selector-declarations",

      html: `
    <main id="root">
      <input id="range" type="range" />
    </main>
  `,

      async act(tree) {
        const range = tree.find.must.byId("range");

        range.css.setMany({
          "&::-webkit-slider-thumb": {
            "-webkit-appearance": "none",
            appearance: "none",
            background: "red",
            border: "1px solid white",
            borderRadius: "0",
          },
        });

        const thumb = range.css.selector("::-webkit-slider-thumb");
        const all = thumb.get.all();
        const stringAll = thumb.get.stringAll();

        thumb.clear();
        thumb.setMany(all);

        (tree as any).__result = {
          all,
          stringAll,
          webkitAppearance: thumb.get.property("-webkit-appearance"),
          appearance: thumb.get.appearance(),
          background: thumb.get.background(),
          border: thumb.get.border(),
          borderRadius: thumb.get.borderRadius(),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("selector get.all includes webkitAppearance", r.all.webkitAppearance, "none");
        t.eq("selector get.all includes appearance", r.all.appearance, "none");
        t.eq("selector get.all includes background", r.all.background, "red");
        t.eq("selector get.all includes border", r.all.border, "1px solid white");
        t.eq("selector get.all includes borderRadius", r.all.borderRadius, "0");
        t.eq(
          "selector get.stringAll serializes declarations",
          r.stringAll,
          "-webkit-appearance: none; appearance: none; background: red; border: 1px solid white; border-radius: 0;",
        );

        t.eq("selector get.all round-trips webkit appearance", r.webkitAppearance, "none");
        t.eq("selector get.all round-trips appearance", r.appearance, "none");
        t.eq("selector get.all round-trips background", r.background, "red");
        t.eq("selector get.all round-trips border", r.border, "1px solid white");
        t.eq("selector get.all round-trips borderRadius", r.borderRadius, "0");
      },
    },
    {
  suite: SUITE,
  name: "css surface: get.all returns independent single-node snapshots",
  dom: true,
  fixture: "css-selectors",
  sub: "get-all-independent-single-node-snapshots",

  html: `
    <main id="root">
      <div class="shared" id="one"></div>
      <div class="shared" id="two"></div>
    </main>
  `,

  async act(tree) {
    const one = tree.find.must.byId("one");
    const two = tree.find.must.byId("two");

    // CHANGED: findAll returns an array of LiveTree handles, not one combined
    // multi-node handle. This verifies discovery without pretending the array
    // has a shared css surface.
    const shared = tree.findAll.byAttribute("class", "shared");

    one.css.setMany({
      background: "red",
      borderRadius: "0",
    });

    two.css.setMany({
      background: "red",
      borderRadius: "4px",
    });

    (tree as any).__result = {
      sharedCount: shared.count(),

      oneBackground: one.css.get.background(),
      oneBorderRadius: one.css.get.borderRadius(),
      oneAll: one.css.get.all(),
      oneStringAll: one.css.get.stringAll(),

      twoBackground: two.css.get.background(),
      twoBorderRadius: two.css.get.borderRadius(),
      twoAll: two.css.get.all(),
      twoStringAll: two.css.get.stringAll(),
    };
  },

  assert(tree, t) {
    const r = (tree as any).__result;

    t.eq("findAll.byAttrs discovers both shared nodes", r.sharedCount, 2);

    t.eq("first node point getter reads background", r.oneBackground, "red");
    t.eq("first node point getter reads borderRadius", r.oneBorderRadius, "0");
    t.eq("first node get.all includes background", r.oneAll.background, "red");
    t.eq("first node get.all includes borderRadius", r.oneAll.borderRadius, "0");
    t.eq("first node get.stringAll serializes declarations", r.oneStringAll, "background: red; border-radius: 0;");

    t.eq("second node point getter reads background", r.twoBackground, "red");
    t.eq("second node point getter reads borderRadius", r.twoBorderRadius, "4px");
    t.eq("second node get.all includes background", r.twoAll.background, "red");
    t.eq("second node get.all includes borderRadius", r.twoAll.borderRadius, "4px");
    t.eq("second node get.stringAll serializes declarations", r.twoStringAll, "background: red; border-radius: 4px;");
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





