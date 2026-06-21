import { CssManager } from "hson-live";
import type { TestSuite, LiveTreeCaseSpec } from "../../app/demos/demo-test/tests.types";
import { make_livetree_suite } from "./livetree-testkit";




export function livetree_css_refinements(): TestSuite {
  const SUITE = "livetree/css-refinements";
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
          hasVarRef: typeof css.var.key === "function",
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
        console.log(">>> tree.css.getMany()");
        console.log(tree.css.getMany());

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
      name: "css surface: getMany returns setMany-compatible base declarations",
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

        const all = box.css.getMany();

        box.css.clear();
        box.css.setMany(all);

        (tree as any).__result = {
          all,
          replayAppearance: box.css.get.appearance(),
          replayBackground: box.css.get.background(),
          replayBorderRadius: box.css.get.borderRadius(),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("getMany appearance is setMany-compatible", r.all.appearance, "none");
        t.eq("getMany background is setMany-compatible", r.all.background, "red");
        t.eq("getMany borderRadius is setMany-compatible", r.all.borderRadius, "0");

        t.eq("getMany round-trips appearance", r.replayAppearance, "none");
        t.eq("getMany round-trips background", r.replayBackground, "red");
        t.eq("getMany round-trips borderRadius", r.replayBorderRadius, "0");
      },
    },
    {
      suite: SUITE,
      name: "css surface: selector getMany returns setMany-compatible declarations",
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
        const all = thumb.getMany();

        thumb.clear();
        thumb.setMany(all);

        (tree as any).__result = {
          all,
          webkitAppearance: thumb.get.property("-webkit-appearance"),
          appearance: thumb.get.appearance(),
          background: thumb.get.background(),
          border: thumb.get.border(),
          borderRadius: thumb.get.borderRadius(),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("selector getMany includes webkitAppearance", r.all.webkitAppearance, "none");
        t.eq("selector getMany includes appearance", r.all.appearance, "none");
        t.eq("selector getMany includes background", r.all.background, "red");
        t.eq("selector getMany includes border", r.all.border, "1px solid white");
        t.eq("selector getMany includes borderRadius", r.all.borderRadius, "0");

        t.eq("selector getMany round-trips webkit appearance", r.webkitAppearance, "none");
        t.eq("selector getMany round-trips appearance", r.appearance, "none");
        t.eq("selector getMany round-trips background", r.background, "red");
        t.eq("selector getMany round-trips border", r.border, "1px solid white");
        t.eq("selector getMany round-trips borderRadius", r.borderRadius, "0");
      },
    },
    {
      suite: SUITE,
      name: "css surface: getMany returns independent single-node snapshots",
      dom: true,
      fixture: "css-selectors",
      sub: "getmany-independent-single-node-snapshots",

      html: `
    <main id="root">
      <div class="shared" id="one"></div>
      <div class="shared" id="two"></div>
    </main>
  `,

      async act(tree) {
        const one = tree.find.must.byId("one");
        const two = tree.find.must.byId("two");

        const shared = tree.findAll.byAttribute("class", "shared");

        one.css.setMany({
          background: "red",
          borderRadius: "0",
        });

        two.css.setMany({
          background: "red",
          borderRadius: "4px",
        });

        const oneMany = one.css.getMany();
        const twoMany = two.css.getMany();

        (tree as any).__result = {
          sharedCount: shared.length,

          oneBackground: one.css.get.background(),
          oneBorderRadius: one.css.get.borderRadius(),
          oneMany,

          twoBackground: two.css.get.background(),
          twoBorderRadius: two.css.get.borderRadius(),
          twoMany,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("findAll.byAttrs discovers both shared nodes", r.sharedCount, 2);

        t.eq("first node point getter reads background", r.oneBackground, "red");
        t.eq("first node point getter reads borderRadius", r.oneBorderRadius, "0");
        t.eq("first node getMany includes background", r.oneMany.background, "red");
        t.eq("first node getMany includes borderRadius", r.oneMany.borderRadius, "0");

        t.eq("second node point getter reads background", r.twoBackground, "red");
        t.eq("second node point getter reads borderRadius", r.twoBorderRadius, "4px");
        t.eq("second node getMany includes background", r.twoMany.background, "red");
        t.eq("second node getMany includes borderRadius", r.twoMany.borderRadius, "4px");
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

export function livetree_css_new_getters(): TestSuite {
  const SUITE = "livetree/new-css-vars-get-sel";
  const cases: readonly LiveTreeCaseSpec[] = [
    {
      suite: SUITE,
      name: `css surface: get.property("all") reads actual CSS all property`,
      dom: true,
      fixture: "css-selectors",
      sub: "get-property-css-all",

      html: `
      <main id="root">
        <div id="box"></div>
      </main>
    `,

      async act(tree) {
        const box = tree.find.must.byId("box");

        box.css.setProp("all", "unset");

        (tree as any).__result = {
          cssAllProperty: box.css.get.property("all"),
          bulkAll: box.css.getMany(),
          bulkAllType: typeof box.css.getMany(),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("CSS all property is readable through property()", r.cssAllProperty, "unset");
        t.eq("bulk getMany remains object-returning", r.bulkAllType, "object");
        t.eq("bulk getMany does not collide with CSS all property", r.bulkAll.all, "unset");
      },
    },

    {
      suite: SUITE,
      name: "css surface: selector getMany preserves custom properties",
      dom: true,
      fixture: "css-selectors",
      sub: "selector-get-all-custom-properties",

      html: `
      <main id="root">
        <div id="test-div">target</div>
      </main>
    `,

      async act(tree) {
        const root = tree.find.must.byId("root");
        const selected = root.css.selector("& > #test-div");

        selected.setMany({
          "--tone": "red",
          background: "var(--tone)",
        });

        const all = selected.getMany();

        selected.clear();
        selected.setMany(all);

        (tree as any).__result = {
          all,
          tone: selected.var.value("tone"),
          background: selected.get.background(),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("custom property is preserved in getMany", r.all["--tone"], "red");
        t.eq("normal property is preserved in getMany", r.all.background, "var(--tone)");
        t.eq("custom property round-trips through setMany", r.tone, "red");
        t.eq("normal property round-trips through setMany", r.background, "var(--tone)");
      },
    },

    {
      suite: SUITE,
      name: "css surface: setMany object key without ampersand is ignored without throwing",
      dom: true,
      fixture: "css-selectors",
      sub: "setmany-dot-selector-without-ampersand-ignored",

      html: `
      <main id="root">
        <div class="child" id="child">target</div>
      </main>
    `,

      async act(tree) {
        const root = tree.find.must.byId("root");

        root.css.setMany({
          ".child": {
            color: "red",
          },
        });

        (tree as any).__result = {
          childColor: root.css.selector(" .child").get.color(),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("object-valued non-ampersand selector key is ignored", r.childColor, undefined);
      },
    },
    {
      suite: SUITE,
      name: "css surface: selector clear empties point and getMany reads",
      dom: true,
      fixture: "css-selectors",
      sub: "selector-clear-empties-getters",

      html: `
    <main id="root">
      <div id="test-div">target</div>
    </main>
  `,

      async act(tree) {
        const root = tree.find.must.byId("root");
        const selected = root.css.selector("& > #test-div");

        selected.setMany({
          color: "red",
          background: "black",
        });

        selected.clear();

        (tree as any).__result = {
          color: selected.get.color(),
          manyLength: Object.keys(selected.getMany()).length,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("selector point read is cleared", r.color, undefined);
        t.eq("selector getMany is cleared", r.manyLength, 0);
      },
    },
    {
      suite: SUITE,
      name: "css surface: getMany returns a defensive snapshot",
      dom: true,
      fixture: "css-selectors",
      sub: "get-all-defensive-snapshot",

      html: `
      <main id="root">
        <div id="box"></div>
      </main>
    `,

      async act(tree) {
        const box = tree.find.must.byId("box");

        box.css.setMany({
          background: "red",
          borderRadius: "0",
        });

        const all = box.css.getMany();
        const mutable: Record<string, string> = { ...all };
        mutable.background = "blue";
        mutable.borderRadius = "999px";

        (tree as any).__result = {
          mutatedBackground: mutable.background,
          mutatedBorderRadius: mutable.borderRadius,
          storedBackground: box.css.get.background(),
          storedBorderRadius: box.css.get.borderRadius(),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("local snapshot copy was mutated", r.mutatedBackground, "blue");
        t.eq("local snapshot copy borderRadius was mutated", r.mutatedBorderRadius, "999px");
        t.eq("stored background is unchanged", r.storedBackground, "red");
        t.eq("stored borderRadius is unchanged", r.storedBorderRadius, "0");
      },
    },



  ];
  return make_livetree_suite(SUITE, cases);
}



export function livetree_find_more(): TestSuite {
  const SUITE = "livetree/more-find-findall";
  const cases: readonly LiveTreeCaseSpec[] = [
    {
      suite: SUITE,
      name: "find surface: byId hit, miss, and must semantics",
      dom: true,
      fixture: "find-matrix",
      sub: "find-by-id-semantics",

      html: `
      <main id="root">
        <section id="alpha"></section>
        <section id="beta"></section>
      </main>
    `,

      async act(tree) {
        let mustMissThrows = false;

        try {
          tree.find.must.byId("missing");
        } catch {
          mustMissThrows = true;
        }

        (tree as any).__result = {
          alphaId: tree.find.byId("alpha")?.node.$_attrs.id,
          missing: tree.find.byId("missing"),
          mustAlphaId: tree.find.must.byId("alpha").node.$_attrs.id,
          mustMissThrows,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("find.byId hits existing node", r.alphaId, "alpha");
        t.eq("find.byId miss returns undefined", r.missing, undefined);
        t.eq("find.must.byId hits existing node", r.mustAlphaId, "alpha");
        t.eq("find.must.byId throws on miss", r.mustMissThrows, true);
      },
    },


    {
      suite: SUITE,
      name: "find surface: byAttrs hit, miss, and must semantics",
      dom: true,
      fixture: "find-matrix",
      sub: "find-by-attrs-semantics",

      html: `
      <main id="root">
        <article id="first" data-kind="card" data-rank="1"></article>
        <article id="second" data-kind="card" data-rank="2"></article>
        <aside id="third" data-kind="note" data-rank="3"></aside>
      </main>
    `,

      async act(tree) {
        let mustMissThrows = false;

        try {
          tree.find.must.byAttribute("data-kind", "missing");
        } catch {
          mustMissThrows = true;
        }

        (tree as any).__result = {
          firstCardId: tree.find.byAttribute("data-kind", "card")?.node.$_attrs.id,
          rankTwoId: tree.find.byAttribute("data-rank", "2")?.node.$_attrs.id,
          missing: tree.find.byAttribute("data-kind", "missing"),
          mustCardId: tree.find.must.byAttribute("data-kind", "card").node.$_attrs.id,
          mustMissThrows,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("find.byAttrs returns first matching attr value", r.firstCardId, "first");
        t.eq("find.byAttrs can match another attr", r.rankTwoId, "second");
        t.eq("find.byAttrs miss returns undefined", r.missing, undefined);
        t.eq("find.must.byAttrs hits first matching attr value", r.mustCardId, "first");
        t.eq("find.must.byAttrs throws on miss", r.mustMissThrows, true);
      },
    },

    {
      suite: SUITE,
      name: "find surface: byFlags hit, miss, and must semantics",
      dom: true,
      fixture: "find-matrix",
      sub: "find-by-flags-semantics",

      html: `
      <main id="root">
        <button id="save" disabled>save</button>
        <button id="cancel">cancel</button>
      </main>
    `,

      async act(tree) {
        let mustMissThrows = false;

        try {
          tree.find.must.byFlag("hidden");
        } catch {
          mustMissThrows = true;
        }

        (tree as any).__result = {
          disabledId: tree.find.byFlag("disabled")?.node.$_attrs.id,
          hidden: tree.find.byFlag("hidden"),
          mustDisabledId: tree.find.must.byFlag("disabled").node.$_attrs.id,
          mustMissThrows,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("find.byFlags hits boolean-present attr", r.disabledId, "save");
        t.eq("find.byFlags miss returns undefined", r.hidden, undefined);
        t.eq("find.must.byFlags hits boolean-present attr", r.mustDisabledId, "save");
        t.eq("find.must.byFlags throws on miss", r.mustMissThrows, true);
      },
    },
    {
      suite: SUITE,
      name: "findAll surface: byId returns TreeSelector and empty selector on miss",
      dom: true,
      fixture: "find-matrix",
      sub: "findall-by-id-semantics",

      html: `
      <main id="root">
        <section id="alpha"></section>
        <section id="beta"></section>
      </main>
    `,

      async act(tree) {
        const alpha = tree.findAll.byId("alpha");
        const missing = tree.findAll.byId("missing");

        (tree as any).__result = {
          alphaLength: alpha.length,
          alphaId: alpha.first()?.node.$_attrs.id,

          missingLength: missing.length,
          missingFirst: missing.first(),
          missingIsTreeSelector:
            typeof missing.length === "number"
            && typeof missing.first === "function"
            && typeof missing.at === "function",
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("findAll.byId returns one match for unique id", r.alphaLength, 1);
        t.eq("findAll.byId preserves hit identity", r.alphaId, "alpha");
        t.eq("findAll.byId miss returns empty TreeSelector", r.missingLength, 0);
        t.eq("findAll.byId miss first() is undefined", r.missingFirst, undefined);
        t.eq("findAll.byId miss is still a TreeSelector", r.missingIsTreeSelector, true);
      },
    },

    {
      suite: SUITE,
      name: "findAll surface: byAttribute preserves order and returns empty TreeSelector on miss",
      dom: true,
      fixture: "find-matrix",
      sub: "findall-by-attribute-semantics",

      html: `
      <main id="root">
        <article id="first" data-kind="card"></article>
        <article id="second" data-kind="card"></article>
        <aside id="third" data-kind="note"></aside>
      </main>
    `,

      async act(tree) {
        const cards = tree.findAll.byAttribute("data-kind", "card");
        const notes = tree.findAll.byAttribute("data-kind", "note");
        const missing = tree.findAll.byAttribute("data-kind", "missing");

        (tree as any).__result = {
          cardLength: cards.length,
          cardIds: cards.map((item) => item.node.$_attrs.id),

          noteLength: notes.length,
          noteIds: notes.map((item) => item.node.$_attrs.id),

          missingLength: missing.length,
          missingFirst: missing.first(),
          missingIsTreeSelector:
            typeof missing.length === "number"
            && typeof missing.first === "function"
            && typeof missing.at === "function",
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("findAll.byAttribute finds two card matches", r.cardLength, 2);
        t.eq("findAll.byAttribute preserves first match order", r.cardIds[0], "first");
        t.eq("findAll.byAttribute preserves second match order", r.cardIds[1], "second");

        t.eq("findAll.byAttribute finds singleton attr match", r.noteLength, 1);
        t.eq("findAll.byAttribute preserves singleton identity", r.noteIds[0], "third");

        t.eq("findAll.byAttribute miss returns empty TreeSelector", r.missingLength, 0);
        t.eq("findAll.byAttribute miss first() is undefined", r.missingFirst, undefined);
        t.eq("findAll.byAttribute miss is still a TreeSelector", r.missingIsTreeSelector, true);
      },
    },

    {
      suite: SUITE,
      name: "findAll surface: byFlag preserves order and returns empty TreeSelector on miss",
      dom: true,
      fixture: "find-matrix",
      sub: "findall-by-flag-semantics",

      html: `
      <main id="root">
        <button id="one" disabled>one</button>
        <button id="two" disabled>two</button>
        <button id="three">three</button>
      </main>
    `,

      async act(tree) {
        const disabled = tree.findAll.byFlag("disabled");
        const hidden = tree.findAll.byFlag("hidden");

        (tree as any).__result = {
          disabledLength: disabled.length,
          disabledIds: disabled.map((item) => item.node.$_attrs.id),

          hiddenLength: hidden.length,
          hiddenFirst: hidden.first(),
          hiddenIsTreeSelector:
            typeof hidden.length === "number"
            && typeof hidden.first === "function"
            && typeof hidden.at === "function",
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("findAll.byFlag finds two disabled matches", r.disabledLength, 2);
        t.eq("findAll.byFlag preserves first match order", r.disabledIds[0], "one");
        t.eq("findAll.byFlag preserves second match order", r.disabledIds[1], "two");

        t.eq("findAll.byFlag miss returns empty TreeSelector", r.hiddenLength, 0);
        t.eq("findAll.byFlag miss first() is undefined", r.hiddenFirst, undefined);
        t.eq("findAll.byFlag miss is still a TreeSelector", r.hiddenIsTreeSelector, true);
      },
    },

    {
      suite: SUITE,
      name: "findAll surface: TreeSelector items are independent LiveTree handles",
      dom: true,
      fixture: "find-matrix",
      sub: "findall-selector-items-are-livetrees",

      html: `
      <main id="root">
        <div id="one" data-kind="item"></div>
        <div id="two" data-kind="item"></div>
      </main>
    `,

      async act(tree) {
        const items = tree.findAll.must.byAttribute("data-kind", "item");

        items.first()?.css.setMany({
          background: "red",
        });

        items.at(1)?.css.setMany({
          background: "blue",
        });

        (tree as any).__result = {
          length: items.length,
          firstId: items.first()?.node.$_attrs.id,
          secondId: items.at(1)?.node.$_attrs.id,

          firstBackground: tree.find.must.byId("one").css.get.background(),
          secondBackground: tree.find.must.byId("two").css.get.background(),

          itemsIsTreeSelector:
            typeof items.length === "number"
            && typeof items.first === "function"
            && typeof items.at === "function"
            && typeof items.map === "function",
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("findAll returns a TreeSelector", r.itemsIsTreeSelector, true);
        t.eq("TreeSelector contains both items", r.length, 2);
        t.eq("TreeSelector first() returns first match", r.firstId, "one");
        t.eq("TreeSelector at(1) returns second match", r.secondId, "two");

        t.eq("first returned LiveTree handle can write css", r.firstBackground, "red");
        t.eq("second returned LiveTree handle can write css independently", r.secondBackground, "blue");
      },
    },


  ];
  return make_livetree_suite(SUITE, cases);
}
