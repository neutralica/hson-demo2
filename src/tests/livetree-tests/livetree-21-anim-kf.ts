import type { TestSuite, LiveTreeCaseSpec } from "../../app/phases/phase-3-demo/demo-test/tests.types";
import { make_livetree_suite } from "./livetree-testkit";

export function livetree_anim_key_preservation(): TestSuite {
    const SUITE = "livetree/animation-identifier-preservation";

    const cases: readonly LiveTreeCaseSpec[] = [
        {
            suite: SUITE,
            name: "keyframes manager preserves underscore names in rendered CSS",
            dom: true,
            fixture: "css/animation-identifiers",
            sub: "keyframes-underscore-name-preserved",

            html: `
    <main id="root">
      <div id="box">x</div>
    </main>
  `,

            async act(tree) {
                const box = tree.find.must.byId("box");

                box.css.keyframes.set({
                    name: "under_probe_7a3_loop",
                    steps: {
                        from: { opacity: "0" },
                        to: { opacity: "1" },
                    },
                });

                const rendered = box.css.keyframes.renderOne("under_probe_7a3_loop");
                const snapshot = box.css.devSnapshot();

                (tree as any).__result = {
                    rendered,
                    snapshot,
                    renderedHasUnderscoreName: rendered.includes("@keyframes under_probe_7a3_loop"),
                    renderedHasHyphenatedName: rendered.includes("@keyframes under-probe-7a3-loop"),
                    snapshotHasUnderscoreName: snapshot.includes("@keyframes under_probe_7a3_loop"),
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;

                t.eq("keyframes renderOne preserves underscore name", r.renderedHasUnderscoreName, true);
                t.eq("keyframes renderOne does not hyphenate name", r.renderedHasHyphenatedName, false);
                t.eq("keyframes snapshot includes underscore name", r.snapshotHasUnderscoreName, true);
            },
        },
        {
            suite: SUITE,
            name: "anim.beginName preserves underscore animation-name value",
            dom: true,
            fixture: "css/animation-identifiers",
            sub: "begin-name-underscore-preserved",

            html: `
        <main id="root">
          <div id="box">x</div>
        </main>
      `,

            async act(tree) {
                const box = tree.find.must.byId("box");

                box.css.anim.beginName("cloud_band_loop");

                (tree as any).__result = {
                    animationName: box.css.get.animationName(),
                    many: box.css.getMany(),
                    snapshot: box.css.devSnapshot(),
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;

                t.eq("animationName getter preserves underscore value", r.animationName, "cloud_band_loop");
                t.eq("getMany preserves underscore animationName value", r.many.animationName, "cloud_band_loop");
                t.eq("snapshot contains emitted animation-name with underscore value", r.snapshot.includes("animation-name: cloud_band_loop;"), true);
                t.eq("snapshot does not hyphenate animation-name value", r.snapshot.includes("animation-name: cloud-band-loop;"), false);
            },
        },
        {
            suite: SUITE,
            name: "anim.begin spec preserves underscore animation-name value",
            dom: true,
            fixture: "css/animation-identifiers",
            sub: "begin-spec-underscore-preserved",

            html: `
        <main id="root">
          <div id="box">x</div>
        </main>
      `,

            async act(tree) {
                const box = tree.find.must.byId("box");

                box.css.anim.begin({
                    name: "cloud_band_loop",
                    duration: "2s",
                    timingFunction: "ease-in-out",
                    iterationCount: "infinite",
                });

                const many = box.css.getMany();

                (tree as any).__result = {
                    animationName: box.css.get.animationName(),
                    animationDuration: box.css.get.animationDuration(),
                    animationTimingFunction: box.css.get.animationTimingFunction(),
                    animationIterationCount: box.css.get.animationIterationCount(),
                    many,
                    snapshot: box.css.devSnapshot(),
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;

                t.eq("begin spec preserves underscore animationName", r.animationName, "cloud_band_loop");
                t.eq("begin spec writes duration", r.animationDuration, "2s");
                t.eq("begin spec writes timing function", r.animationTimingFunction, "ease-in-out");
                t.eq("begin spec writes iteration count", r.animationIterationCount, "infinite");
                t.eq("getMany preserves underscore animationName", r.many.animationName, "cloud_band_loop");
                t.eq("snapshot contains animation-name with underscore value", r.snapshot.includes("animation-name: cloud_band_loop;"), true);
                t.eq("snapshot does not hyphenate animation-name value", r.snapshot.includes("animation-name: cloud-band-loop;"), false);
            },
        },
        {
            suite: SUITE,
            name: "anim.restartName preserves underscore animation-name value",
            dom: true,
            fixture: "css/animation-identifiers",
            sub: "restart-name-underscore-preserved",

            html: `
        <main id="root">
          <div id="box">x</div>
        </main>
      `,

            async act(tree) {
                const box = tree.find.must.byId("box");

                box.css.anim.beginName("old_loop");
                box.css.anim.restartName("cloud_band_loop");

                (tree as any).__result = {
                    animationName: box.css.get.animationName(),
                    snapshot: box.css.devSnapshot(),
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;

                t.eq("restartName preserves final underscore animationName", r.animationName, "cloud_band_loop");
                t.eq("snapshot contains final underscore animation-name", r.snapshot.includes("animation-name: cloud_band_loop;"), true);
                t.eq("snapshot does not contain hyphenated final animation-name", r.snapshot.includes("animation-name: cloud-band-loop;"), false);
            },
        },
        {
            suite: SUITE,
            name: "animation identifier trimming preserves internal underscores",
            dom: true,
            fixture: "css/animation-identifiers",
            sub: "animation-name-trim-only",

            html: `
        <main id="root">
          <div id="box">x</div>
        </main>
      `,

            async act(tree) {
                const box = tree.find.must.byId("box");

                box.css.anim.beginName("  cloud_band_loop  ");

                (tree as any).__result = {
                    animationName: box.css.get.animationName(),
                    snapshot: box.css.devSnapshot(),
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;

                t.eq("animation name is trimmed", r.animationName, "cloud_band_loop");
                t.eq("animation name internal underscores are preserved", r.snapshot.includes("animation-name: cloud_band_loop;"), true);
            },
        },
        {
            suite: SUITE,
            name: "hyphenated animation identifiers remain hyphenated",
            dom: true,
            fixture: "css/animation-identifiers",
            sub: "hyphen-name-preserved",

            html: `
        <main id="root">
          <div id="box">x</div>
        </main>
      `,

            async act(tree) {
                const box = tree.find.must.byId("box");

                box.css.keyframes.set({
                    name: "cloud-band-loop",
                    steps: {
                        from: { opacity: "0" },
                        to: { opacity: "1" },
                    },
                });

                box.css.anim.beginName("cloud-band-loop");

                const snapshot = box.css.devSnapshot();

                (tree as any).__result = {
                    animationName: box.css.get.animationName(),
                    hasHyphenKeyframes: snapshot.includes("@keyframes cloud-band-loop"),
                    hasHyphenAnimationName: snapshot.includes("animation-name: cloud-band-loop;"),
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;

                t.eq("hyphen animation name remains hyphenated", r.animationName, "cloud-band-loop");
                t.eq("hyphen keyframes name remains hyphenated", r.hasHyphenKeyframes, true);
                t.eq("hyphen animation-name value remains hyphenated", r.hasHyphenAnimationName, true);
            },
        },
        {
            suite: SUITE,
            name: "animation property key normalizes but animation name value is untouched",
            dom: true,
            fixture: "css/animation-identifiers",
            sub: "property-key-normalizes-value-untouched",

            html: `
        <main id="root">
          <div id="box">x</div>
        </main>
      `,

            async act(tree) {
                const box = tree.find.must.byId("box");

                box.css.set.animationName("manual_loop_name");

                const snapshot = box.css.devSnapshot();

                (tree as any).__result = {
                    animationName: box.css.get.animationName(),
                    hasCssProperty: snapshot.includes("animation-name: manual_loop_name;"),
                    hasCamelProperty: snapshot.includes("animationName: manual_loop_name;"),
                    hasHyphenatedValue: snapshot.includes("animation-name: manual-loop-name;"),
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;

                t.eq("getter preserves manually set underscore animationName value", r.animationName, "manual_loop_name");
                t.eq("snapshot emits normalized CSS property key", r.hasCssProperty, true);
                t.eq("snapshot does not emit camelCase CSS property key", r.hasCamelProperty, false);
                t.eq("snapshot does not hyphenate animation name value", r.hasHyphenatedValue, false);
            },
        },
    ];

    return make_livetree_suite(SUITE, cases);
}