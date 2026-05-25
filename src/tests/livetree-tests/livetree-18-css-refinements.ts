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
                    hasVarRef: typeof css.var.ref === "function",
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



    ];
    return make_livetree_suite(SUITE, cases);
}





