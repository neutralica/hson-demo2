import type { LiveTreeCaseSpec, TestSuite } from "../../app/phases/phase-3-demo/demo-test/tests.types";
import { make_livetree_suite } from "./livetree-testkit";

export function livetree_dom_helper_surface(): TestSuite {
  const SUITE = "livetree/dom-helper-surface";

  const cases: readonly LiveTreeCaseSpec[] = [
    {
      suite: SUITE,
      name: "dom surface: matches returns true, false, and detached false",
      fixture: "dom-helper/matches",
      sub: "mounted-detached",
      dom: true,
      html: `
        <main id="root">
          <section id="target" class="card active" data-kind="panel"></section>
        </main>
      `,

      act(tree) {
        const target = tree.find.must.byId("target");
        const detached = target.cloneBranch();

        (tree as any).__result = {
          matchesClass: target.dom.matches(".card"),
          matchesAttr: target.dom.matches('[data-kind="panel"]'),
          matchesCompound: target.dom.matches("section.card.active"),
          misses: target.dom.matches("article.card"),
          detachedMatches: detached.dom.matches(".card"),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("mounted element matches class selector", r.matchesClass, true);
        t.eq("mounted element matches attr selector", r.matchesAttr, true);
        t.eq("mounted element matches compound selector", r.matchesCompound, true);
        t.eq("mounted element false for non-match", r.misses, false);
        t.eq("detached element matches returns false", r.detachedMatches, false);
      },
    },

    {
      suite: SUITE,
      name: "dom surface: closest resolves ancestor LiveTree and miss returns undefined",
      fixture: "dom-helper/closest",
      sub: "soft-and-must",
      dom: true,
      html: `
        <main id="root">
          <section id="panel" class="panel">
            <div id="inner" class="inner">
              <button id="button">click</button>
            </div>
          </section>
        </main>
      `,

      act(tree) {
        const button = tree.find.must.byId("button");

        let mustMissThrows = false;
        try {
          button.dom.must.closest("aside");
        } catch {
          mustMissThrows = true;
        }

        (tree as any).__result = {
          closestPanelId: button.dom.closest(".panel")?.id.get(),
          closestInnerId: button.dom.closest("#inner")?.id.get(),
          closestSelfId: button.dom.closest("button")?.id.get(),
          missing: button.dom.closest("aside"),
          mustPanelId: button.dom.must.closest(".panel").id.get(),
          mustMissThrows,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("closest resolves ancestor panel", r.closestPanelId, "panel");
        t.eq("closest resolves nearer ancestor", r.closestInnerId, "inner");
        t.eq("closest can resolve self", r.closestSelfId, "button");
        t.eq("closest miss returns undefined", r.missing, undefined);
        t.eq("must.closest resolves ancestor", r.mustPanelId, "panel");
        t.eq("must.closest throws on miss", r.mustMissThrows, true);
      },
    },

    {
      suite: SUITE,
      name: "dom surface: parent resolves immediate LiveTree parent and must throws at detached root",
      fixture: "dom-helper/parent",
      sub: "soft-and-must",
      dom: true,
      html: `
        <main id="root">
          <section id="parent">
            <button id="child">child</button>
          </section>
        </main>
      `,

      act(tree) {
        const child = tree.find.must.byId("child");
        const parent = tree.find.must.byId("parent");
        const detached = parent.cloneBranch();

        let detachedMustThrows = false;
        try {
          detached.dom.must.parent();
        } catch {
          detachedMustThrows = true;
        }

        (tree as any).__result = {
          childParentId: child.dom.parent()?.id.get(),
          childMustParentId: child.dom.must.parent().id.get(),
          parentParentId: parent.dom.parent()?.id.get(),
          detachedParent: detached.dom.parent(),
          detachedMustThrows,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("dom.parent resolves immediate parent", r.childParentId, "parent");
        t.eq("dom.must.parent resolves immediate parent", r.childMustParentId, "parent");
        t.eq("parent's parent resolves root", r.parentParentId, "root");
        t.eq("detached parent soft path returns undefined", r.detachedParent, undefined);
        t.eq("detached must.parent throws", r.detachedMustThrows, true);
      },
    },

    {
      suite: SUITE,
      name: "dom surface: html and must.html distinguish HTML from SVG",
      fixture: "dom-helper/html",
      sub: "html-vs-svg",
      dom: true,
      html: `
        <main id="root">
          <div id="box"></div>
          <svg id="icon" viewBox="0 0 10 10">
            <circle id="dot" cx="5" cy="5" r="4"></circle>
          </svg>
        </main>
      `,

      act(tree) {
        const box = tree.find.must.byId("box");
        const svg = tree.find.must.byId("icon");
        const circle = tree.find.must.byId("dot");

        let svgMustHtmlThrows = false;
        let circleMustHtmlThrows = false;

        try {
          svg.dom.must.html();
        } catch {
          svgMustHtmlThrows = true;
        }

        try {
          circle.dom.must.html();
        } catch {
          circleMustHtmlThrows = true;
        }

        (tree as any).__result = {
          boxHtmlTag: box.dom.html()?.tagName.toLowerCase(),
          boxMustHtmlTag: box.dom.must.html().tagName.toLowerCase(),
          svgHtml: svg.dom.html(),
          circleHtml: circle.dom.html(),
          svgElNamespace: svg.dom.must.el().namespaceURI,
          circleElNamespace: circle.dom.must.el().namespaceURI,
          svgMustHtmlThrows,
          circleMustHtmlThrows,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("HTML element dom.html returns HTMLElement", r.boxHtmlTag, "div");
        t.eq("HTML element dom.must.html returns HTMLElement", r.boxMustHtmlTag, "div");
        t.eq("SVG root dom.html returns undefined", r.svgHtml, undefined);
        t.eq("SVG child dom.html returns undefined", r.circleHtml, undefined);
        t.eq("SVG root dom.el remains available", r.svgElNamespace, "http://www.w3.org/2000/svg");
        t.eq("SVG child dom.el remains available", r.circleElNamespace, "http://www.w3.org/2000/svg");
        t.eq("SVG root dom.must.html throws", r.svgMustHtmlThrows, true);
        t.eq("SVG child dom.must.html throws", r.circleMustHtmlThrows, true);
      },
    },

    {
      suite: SUITE,
      name: "dom surface: computed and computedProp read mounted styles",
      fixture: "dom-helper/computed",
      sub: "inline-style",
      dom: true,
      html: `
        <main id="root">
          <div id="target">styled</div>
        </main>
      `,

      act(tree) {
        const target = tree.find.must.byId("target");

        target.style.setMany({
          color: "rgb(12, 34, 56)",
          display: "block",
          marginTop: "7px",
        });

        let detachedComputedThrows = false;
        const detached = target.cloneBranch();

        try {
          detached.dom.must.computed();
        } catch {
          detachedComputedThrows = true;
        }

        (tree as any).__result = {
          hasComputed: !!target.dom.computed(),
          color: target.dom.computedProp("color"),
          marginTop: target.dom.computedProp("margin-top"),
          mustColor: target.dom.must.computedProp("color"),
          missingDetachedComputed: detached.dom.computed(),
          missingDetachedProp: detached.dom.computedProp("color"),
          detachedComputedThrows,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("dom.computed returns declaration object", r.hasComputed, true);
        t.eq("dom.computedProp reads color", r.color, "rgb(12, 34, 56)");
        t.eq("dom.computedProp reads kebab property", r.marginTop, "7px");
        t.eq("dom.must.computedProp reads color", r.mustColor, "rgb(12, 34, 56)");
        t.eq("detached dom.computed returns undefined", r.missingDetachedComputed, undefined);
        t.eq("detached dom.computedProp returns undefined", r.missingDetachedProp, undefined);
        t.eq("detached dom.must.computed throws", r.detachedComputedThrows, true);
      },
    },

    {
      suite: SUITE,
      name: "dom surface: computedProp must throws only when computed style is unavailable",
      fixture: "dom-helper/computed",
      sub: "must-computed-prop",
      dom: true,
      html: `
        <main id="root">
          <div id="target">styled</div>
        </main>
      `,

      act(tree) {
        const target = tree.find.must.byId("target");
        const detached = target.cloneBranch();

        target.style.setMany({
          paddingLeft: "11px",
        });

        let detachedMustPropThrows = false;
        try {
          detached.dom.must.computedProp("padding-left");
        } catch {
          detachedMustPropThrows = true;
        }

        (tree as any).__result = {
          paddingLeft: target.dom.computedProp("padding-left"),
          mustPaddingLeft: target.dom.must.computedProp("padding-left"),
          detachedMustPropThrows,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("computedProp reads mounted style", r.paddingLeft, "11px");
        t.eq("must.computedProp reads mounted style", r.mustPaddingLeft, "11px");
        t.eq("must.computedProp throws for detached node", r.detachedMustPropThrows, true);
      },
    },

    {
      suite: SUITE,
      name: "dom surface: contains supports tree, node, and target helpers",
      fixture: "dom-helper/contains",
      sub: "tree-node-target",
      dom: true,
      html: `
        <main id="root">
          <section id="outer">
            <button id="inner">inner</button>
          </section>
          <section id="sibling"></section>
        </main>
      `,

      act(tree) {
        const outer = tree.find.must.byId("outer");
        const inner = tree.find.must.byId("inner");
        const sibling = tree.find.must.byId("sibling");
        const innerEl = inner.dom.must.el();
        const siblingEl = sibling.dom.must.el();

        (tree as any).__result = {
          callableContainsInner: outer.dom.contains(inner),
          callableContainsSibling: outer.dom.contains(sibling),
          treeContainsInner: outer.dom.contains.tree(inner),
          treeContainsSibling: outer.dom.contains.tree(sibling),
          nodeContainsInner: outer.dom.contains.node(innerEl),
          nodeContainsSibling: outer.dom.contains.node(siblingEl),
          targetContainsInner: outer.dom.contains.target(innerEl),
          targetContainsNull: outer.dom.contains.target(null),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("callable contains returns true for descendant tree", r.callableContainsInner, true);
        t.eq("callable contains returns false for sibling tree", r.callableContainsSibling, false);
        t.eq("contains.tree returns true for descendant", r.treeContainsInner, true);
        t.eq("contains.tree returns false for sibling", r.treeContainsSibling, false);
        t.eq("contains.node returns true for descendant node", r.nodeContainsInner, true);
        t.eq("contains.node returns false for sibling node", r.nodeContainsSibling, false);
        t.eq("contains.target returns true for descendant EventTarget", r.targetContainsInner, true);
        t.eq("contains.target returns false for null target", r.targetContainsNull, false);
      },
    },

    {
      suite: SUITE,
      name: "dom surface: rect and clientRects soft and must behavior",
      fixture: "dom-helper/rects",
      sub: "mounted-detached",
      dom: true,
      html: `
        <main id="root">
          <div id="target" style="display:block; width:80px; height:20px;">box</div>
        </main>
      `,

      act(tree) {
        const target = tree.find.must.byId("target");
        const detached = target.cloneBranch();

        let detachedMustRectThrows = false;
        let detachedMustClientRectsThrows = false;

        try {
          detached.dom.must.rect();
        } catch {
          detachedMustRectThrows = true;
        }

        try {
          detached.dom.must.clientRects();
        } catch {
          detachedMustClientRectsThrows = true;
        }

        const rect = target.dom.rect();
        const clientRects = target.dom.clientRects();

        (tree as any).__result = {
          hasRect: !!rect,
          rectHasNumbers: typeof rect?.width === "number" && typeof rect?.height === "number",
          hasClientRects: !!clientRects,
          clientRectsLengthIsNumber: typeof clientRects?.length === "number",
          mustRectHasNumbers:
            typeof target.dom.must.rect().width === "number" &&
            typeof target.dom.must.rect().height === "number",
          mustClientRectsLengthIsNumber: typeof target.dom.must.clientRects().length === "number",
          detachedRect: detached.dom.rect(),
          detachedClientRects: detached.dom.clientRects(),
          detachedMustRectThrows,
          detachedMustClientRectsThrows,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("mounted dom.rect returns a DOMRect", r.hasRect, true);
        t.eq("mounted dom.rect has numeric dimensions", r.rectHasNumbers, true);
        t.eq("mounted dom.clientRects returns DOMRectList", r.hasClientRects, true);
        t.eq("mounted dom.clientRects has numeric length", r.clientRectsLengthIsNumber, true);
        t.eq("mounted dom.must.rect returns numeric dimensions", r.mustRectHasNumbers, true);
        t.eq("mounted dom.must.clientRects returns numeric length", r.mustClientRectsLengthIsNumber, true);
        t.eq("detached dom.rect returns undefined", r.detachedRect, undefined);
        t.eq("detached dom.clientRects returns undefined", r.detachedClientRects, undefined);
        t.eq("detached dom.must.rect throws", r.detachedMustRectThrows, true);
        t.eq("detached dom.must.clientRects throws", r.detachedMustClientRectsThrows, true);
      },
    },

    {
      suite: SUITE,
      name: "dom surface: clientSize and scrollSize soft and must behavior",
      fixture: "dom-helper/sizes",
      sub: "mounted-detached",
      dom: true,
      html: `
        <main id="root">
          <div id="target" style="display:block; width:80px; height:30px; overflow:auto;">
            <div id="wide" style="width:160px; height:60px;">wide</div>
          </div>
        </main>
      `,

      act(tree) {
        const target = tree.find.must.byId("target");
        const detached = target.cloneBranch();

        let detachedMustClientSizeThrows = false;
        let detachedMustScrollSizeThrows = false;

        try {
          detached.dom.must.clientSize();
        } catch {
          detachedMustClientSizeThrows = true;
        }

        try {
          detached.dom.must.scrollSize();
        } catch {
          detachedMustScrollSizeThrows = true;
        }

        const clientSize = target.dom.clientSize();
        const scrollSize = target.dom.scrollSize();

        (tree as any).__result = {
          clientSizeHasNumbers:
            typeof clientSize?.width === "number" &&
            typeof clientSize?.height === "number",
          scrollSizeHasNumbers:
            typeof scrollSize?.width === "number" &&
            typeof scrollSize?.height === "number",
          mustClientSizeHasNumbers:
            typeof target.dom.must.clientSize().width === "number" &&
            typeof target.dom.must.clientSize().height === "number",
          mustScrollSizeHasNumbers:
            typeof target.dom.must.scrollSize().width === "number" &&
            typeof target.dom.must.scrollSize().height === "number",
          detachedClientSize: detached.dom.clientSize(),
          detachedScrollSize: detached.dom.scrollSize(),
          detachedMustClientSizeThrows,
          detachedMustScrollSizeThrows,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("mounted dom.clientSize returns numeric dimensions", r.clientSizeHasNumbers, true);
        t.eq("mounted dom.scrollSize returns numeric dimensions", r.scrollSizeHasNumbers, true);
        t.eq("mounted dom.must.clientSize returns numeric dimensions", r.mustClientSizeHasNumbers, true);
        t.eq("mounted dom.must.scrollSize returns numeric dimensions", r.mustScrollSizeHasNumbers, true);
        t.eq("detached dom.clientSize returns undefined", r.detachedClientSize, undefined);
        t.eq("detached dom.scrollSize returns undefined", r.detachedScrollSize, undefined);
        t.eq("detached dom.must.clientSize throws", r.detachedMustClientSizeThrows, true);
        t.eq("detached dom.must.scrollSize throws", r.detachedMustScrollSizeThrows, true);
      },
    },

    {
      suite: SUITE,
      name: "dom surface: isConnected reflects mounted and detached state",
      fixture: "dom-helper/isConnected",
      sub: "mounted-detached-removed",
      dom: true,
      html: `
        <main id="root">
          <section id="target">target</section>
        </main>
      `,

      act(tree) {
        const target = tree.find.must.byId("target");
        const detached = target.cloneBranch();

        const beforeRemove = target.dom.isConnected();
        const detachedConnected = detached.dom.isConnected();

        target.removeSelf();

        (tree as any).__result = {
          beforeRemove,
          detachedConnected,
          afterRemove: target.dom.isConnected(),
          findAfterRemove: tree.find.byId("target"),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("mounted node is connected", r.beforeRemove, true);
        t.eq("detached clone is not connected", r.detachedConnected, false);
        t.eq("removed node is no longer connected", r.afterRemove, false);
        t.eq("removed node is not findable from root", r.findAfterRemove, undefined);
      },
    },
  ];

  return make_livetree_suite(SUITE, cases);
}