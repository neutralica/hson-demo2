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

export function livetree_dom_contains_surface(): TestSuite {
  const SUITE = "livetree/dom-contains-surface";

  const cases: readonly LiveTreeCaseSpec[] = [
    {
      suite: SUITE,
      name: "dom.contains supports callable, tree, node, and target for descendants",
      dom: true,
      fixture: "dom/contains",
      sub: "contains-descendant-surfaces",

      html: `
        <main id="root">
          <section id="panel">
            <button id="button">
              <span id="label">Click</span>
            </button>
          </section>
          <aside id="outside">Outside</aside>
        </main>
      `,

      async act(tree) {
        const root = tree.find.must.byId("root");
        const panel = tree.find.must.byId("panel");
        const button = tree.find.must.byId("button");
        const label = tree.find.must.byId("label");
        const outside = tree.find.must.byId("outside");

        const panelEl = panel.dom.must.el();
        const buttonEl = button.dom.must.el();
        const labelEl = label.dom.must.el();
        const outsideEl = outside.dom.must.el();

        (tree as any).__result = {
          legacyPanel: root.dom.contains(panel),
          explicitPanel: root.dom.contains.tree(panel),
          nodePanel: root.dom.contains.node(panelEl),
          targetPanel: root.dom.contains.target(panelEl),

          legacyButton: panel.dom.contains(button),
          explicitButton: panel.dom.contains.tree(button),
          nodeButton: panel.dom.contains.node(buttonEl),
          targetButton: panel.dom.contains.target(buttonEl),

          legacyLabel: panel.dom.contains(label),
          explicitLabel: panel.dom.contains.tree(label),
          nodeLabel: panel.dom.contains.node(labelEl),
          targetLabel: panel.dom.contains.target(labelEl),

          panelContainsOutsideTree: panel.dom.contains(outside),
          panelContainsOutsideTreeExplicit: panel.dom.contains.tree(outside),
          panelContainsOutsideNode: panel.dom.contains.node(outsideEl),
          panelContainsOutsideTarget: panel.dom.contains.target(outsideEl),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("legacy callable contains descendant tree", r.legacyPanel, true);
        t.eq("explicit tree contains descendant tree", r.explicitPanel, true);
        t.eq("node contains descendant element", r.nodePanel, true);
        t.eq("target contains descendant EventTarget element", r.targetPanel, true);

        t.eq("panel legacy contains button tree", r.legacyButton, true);
        t.eq("panel explicit contains button tree", r.explicitButton, true);
        t.eq("panel node contains button element", r.nodeButton, true);
        t.eq("panel target contains button EventTarget", r.targetButton, true);

        t.eq("panel legacy contains nested label tree", r.legacyLabel, true);
        t.eq("panel explicit contains nested label tree", r.explicitLabel, true);
        t.eq("panel node contains nested label element", r.nodeLabel, true);
        t.eq("panel target contains nested label EventTarget", r.targetLabel, true);

        t.eq("panel legacy does not contain sibling tree", r.panelContainsOutsideTree, false);
        t.eq("panel explicit tree does not contain sibling tree", r.panelContainsOutsideTreeExplicit, false);
        t.eq("panel node does not contain sibling element", r.panelContainsOutsideNode, false);
        t.eq("panel target does not contain sibling EventTarget", r.panelContainsOutsideTarget, false);
      },
    },

    {
      suite: SUITE,
      name: "dom.contains treats self containment consistently",
      dom: true,
      fixture: "dom/contains",
      sub: "contains-self",

      html: `
        <main id="root">
          <section id="panel">
            <button id="button">Click</button>
          </section>
        </main>
      `,

      async act(tree) {
        const panel = tree.find.must.byId("panel");
        const panelEl = panel.dom.must.el();

        (tree as any).__result = {
          legacySelf: panel.dom.contains(panel),
          explicitSelf: panel.dom.contains.tree(panel),
          nodeSelf: panel.dom.contains.node(panelEl),
          targetSelf: panel.dom.contains.target(panelEl),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("legacy callable contains self", r.legacySelf, true);
        t.eq("explicit tree contains self", r.explicitSelf, true);
        t.eq("node contains self element", r.nodeSelf, true);
        t.eq("target contains self EventTarget", r.targetSelf, true);
      },
    },

    {
      suite: SUITE,
      name: "dom.contains.target safely rejects null and non-Node EventTargets",
      dom: true,
      fixture: "dom/contains",
      sub: "contains-target-invalid",

      html: `
        <main id="root">
          <section id="panel">Panel</section>
        </main>
      `,

      async act(tree) {
        const panel = tree.find.must.byId("panel");

        const abort = new AbortController();
        const signal = abort.signal;

        (tree as any).__result = {
          nullTarget: panel.dom.contains.target(null),
          signalTarget: panel.dom.contains.target(signal),
          windowTarget: panel.dom.contains.target(window),
          documentTarget: panel.dom.contains.target(document),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("target rejects null", r.nullTarget, false);
        t.eq("target rejects AbortSignal EventTarget", r.signalTarget, false);
        t.eq("target rejects window EventTarget", r.windowTarget, false);
        t.eq("target rejects document when it is not a Node in this context", r.documentTarget, false);
      },
    },

    {
      suite: SUITE,
      name: "dom.contains.node handles text nodes and detached nodes",
      dom: true,
      fixture: "dom/contains",
      sub: "contains-node-edge-cases",

      html: `
        <main id="root">
          <section id="panel"><span id="label">hello</span></section>
        </main>
      `,

      async act(tree) {
        const panel = tree.find.must.byId("panel");
        const label = tree.find.must.byId("label");

        const labelEl = label.dom.must.el();
        const textNode = labelEl.firstChild;
        const detached = document.createElement("div");
        const detachedText = document.createTextNode("detached");

        (tree as any).__result = {
          textNodeIsNode: textNode instanceof Node,
          containsTextNode: textNode ? panel.dom.contains.node(textNode) : false,
          containsTextTarget: textNode ? panel.dom.contains.target(textNode) : false,

          containsDetachedElement: panel.dom.contains.node(detached),
          containsDetachedTarget: panel.dom.contains.target(detached),

          containsDetachedText: panel.dom.contains.node(detachedText),
          containsDetachedTextTarget: panel.dom.contains.target(detachedText),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("fixture text child is a Node", r.textNodeIsNode, true);
        t.eq("node contains descendant text node", r.containsTextNode, true);
        t.eq("target contains descendant text EventTarget", r.containsTextTarget, true);

        t.eq("node rejects detached element", r.containsDetachedElement, false);
        t.eq("target rejects detached element EventTarget", r.containsDetachedTarget, false);
        t.eq("node rejects detached text node", r.containsDetachedText, false);
        t.eq("target rejects detached text EventTarget", r.containsDetachedTextTarget, false);
      },
    },

    {
      suite: SUITE,
      name: "dom.contains works for document-level outside-click style checks",
      dom: true,
      fixture: "dom/contains",
      sub: "contains-outside-click-shape",

      html: `
        <main id="root">
          <section id="dialog">
            <button id="inside-button">Inside</button>
          </section>
          <button id="outside-button">Outside</button>
        </main>
      `,

      async act(tree) {
        const dialog = tree.find.must.byId("dialog");
        const inside = tree.find.must.byId("inside-button");
        const outside = tree.find.must.byId("outside-button");

        const insideEl = inside.dom.must.el();
        const outsideEl = outside.dom.must.el();

        const insideEvent = new PointerEvent("pointerdown", { bubbles: true });
        const outsideEvent = new PointerEvent("pointerdown", { bubbles: true });

        insideEl.dispatchEvent(insideEvent);
        outsideEl.dispatchEvent(outsideEvent);

        (tree as any).__result = {
          insideTargetCheck: dialog.dom.contains.target(insideEvent.target),
          outsideTargetCheck: dialog.dom.contains.target(outsideEvent.target),

          insideNodeCheck: insideEvent.target instanceof Node
            ? dialog.dom.contains.node(insideEvent.target)
            : false,

          outsideNodeCheck: outsideEvent.target instanceof Node
            ? dialog.dom.contains.node(outsideEvent.target)
            : false,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("dialog contains inside event target", r.insideTargetCheck, true);
        t.eq("dialog does not contain outside event target", r.outsideTargetCheck, false);
        t.eq("dialog contains inside event target after Node narrowing", r.insideNodeCheck, true);
        t.eq("dialog rejects outside event target after Node narrowing", r.outsideNodeCheck, false);
      },
    },

    {
      suite: SUITE,
      name: "dom.contains.tree returns false for tree handles without comparable DOM elements",
      dom: true,
      fixture: "dom/contains",
      sub: "contains-tree-no-dom",

      html: `
        <main id="root">
          <section id="panel">Panel</section>
        </main>
      `,

      async act(tree) {
        const panel = tree.find.must.byId("panel");

        const detachedEl = document.createElement("div");
        const detachedTree = panel.dom.must.treeFromEl(panel.dom.must.el());

        detachedEl.id = "detached";

        (tree as any).__result = {
          comparableCloneContains: panel.dom.contains.tree(detachedTree),
          legacyComparableCloneContains: panel.dom.contains(detachedTree),
          detachedNode: panel.dom.contains.node(detachedEl),
          detachedTarget: panel.dom.contains.target(detachedEl),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("explicit tree contains resolved comparable self tree", r.comparableCloneContains, true);
        t.eq("legacy callable contains resolved comparable self tree", r.legacyComparableCloneContains, true);
        t.eq("node rejects detached DOM element", r.detachedNode, false);
        t.eq("target rejects detached DOM element", r.detachedTarget, false);
      },
    },

    {
      suite: "##!!TEST FAIL STYLE TEST!!##",
      name: "this is a deliberately failing test to see how it is styled",
      dom: true,
      fixture: "dom/contains",
      sub: "INVALID/FAIL",

      html: `
        <main id="root">
          <section id="panel">Panel</section>
        </main>
      `,

      async act(tree) {


      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("this should fail", r.comparableCloneContains, true);
        t.eq("this should fail too", r.comparableCloneContains, true);
        t.eq("this should fail three", r.comparableCloneContains, true);
        t.eq("this should fail also", r.comparableCloneContains, true);
      },
    },
  ];

  return make_livetree_suite(SUITE, cases);
}