import { hson } from "hson-live";
import { flush_dom } from "../inspector/inspector.helpers";
import type { TestSuite } from "../../harness/core/test-contracts";
import type { LiveTreeCaseSpec } from "../livemap/livemap-tests.types";
import { tick } from "./livetree-03";
import { make_livetree_suite } from "./make-livetree-suite";
import { notify_hosted_test_resize } from "../../harness/runtimes/dom/hosted-test-geometry";

export function livetree_canvas_pointer(): TestSuite {
  const SUITE = "livetree/canvas-pointer";

  const cases: readonly LiveTreeCaseSpec[] = [
    {
      suite: SUITE,
      caseId: "canvas.pointer-maps-pointer-event-to-canvas-local-coordinates", name: "canvas.pointer maps pointer event to canvas-local coordinates",
      dom: true,
      fixture: "canvas/pointer",
      sub: "pointer-local-coords",
      hostedGeometry: [{ id: "target", rect: { x: 10, y: 20, width: 100, height: 50 } }],

      html: `
        <main id="root">
          <canvas id="target" width="100" height="50"></canvas>
        </main>
      `,

      async act(tree) {
        const target = tree.find.must.byId("target");

        target.css.setMany({
          display: "block",
          width: "100px",
          height: "50px",
        });

        await flush_dom();

        const cvs = target.canvas.must.el();
        const rect = cvs.getBoundingClientRect();

        const ev = new PointerEvent("pointermove", {
          clientX: rect.left + 25,
          clientY: rect.top + 10,
        });

        const pt = target.canvas.pointer(ev);

        (tree as any).__result = {
          hasPoint: pt !== undefined,
          x: pt?.x,
          y: pt?.y,
          width: pt?.width,
          height: pt?.height,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("pointer returned point", r.hasPoint, true);
        t.eq("pointer x is canvas-local", Math.round(r.x), 25);
        t.eq("pointer y is canvas-local", Math.round(r.y), 10);
        t.eq("pointer width reports display width", Math.round(r.width), 100);
        t.eq("pointer height reports display height", Math.round(r.height), 50);
      },
    },

    {
      suite: SUITE,
      caseId: "canvas.pointer-accepts-mouseevent-coordinates", name: "canvas.pointer accepts MouseEvent coordinates",
      dom: true,
      fixture: "canvas/pointer",
      sub: "mouseevent-local-coords",
      hostedGeometry: [{ id: "target", rect: { x: 10, y: 20, width: 80, height: 40 } }],

      html: `
        <main id="root">
          <canvas id="target" width="80" height="40"></canvas>
        </main>
      `,

      async act(tree) {
        const target = tree.find.must.byId("target");

        target.css.setMany({
          display: "block",
          width: "80px",
          height: "40px",
        });

        await flush_dom();

        const cvs = target.canvas.must.el();
        const rect = cvs.getBoundingClientRect();

        const ev = new MouseEvent("mousemove", {
          clientX: rect.left + 12,
          clientY: rect.top + 18,
        });

        const pt = target.canvas.pointer(ev);

        (tree as any).__result = {
          hasPoint: pt !== undefined,
          x: pt?.x,
          y: pt?.y,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("pointer returned point for MouseEvent", r.hasPoint, true);
        t.eq("mouse x is canvas-local", Math.round(r.x), 12);
        t.eq("mouse y is canvas-local", Math.round(r.y), 18);
      },
    },

    {
      suite: SUITE,
      caseId: "canvas.pointer-returns-undefined-before-mount", name: "canvas.pointer returns undefined before mount",
      fixture: "canvas/pointer",
      sub: "pointer-unmounted",

      html: `
        <main id="root">
          <canvas id="target" width="100" height="50"></canvas>
        </main>
      `,

      act(tree) {
        const target = tree.find.must.byId("target");

        const ev = new PointerEvent("pointermove", {
          clientX: 20,
          clientY: 30,
        });

        const pt = target.canvas.pointer(ev);

        (tree as any).__result = {
          point: pt,
          inScope: target.canvas.inScope(),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("pointer returns undefined before mount", r.point, undefined);
        t.eq("target is still canvas-scoped", r.inScope, true);
      },
    },

    {
      suite: SUITE,
      caseId: "canvas.pointer-returns-undefined-on-non-canvas-node", name: "canvas.pointer returns undefined on non-canvas node",
      dom: true,
      fixture: "canvas/pointer",
      sub: "pointer-non-canvas",

      html: `
        <main id="root">
          <div id="target"></div>
        </main>
      `,

      async act(tree) {
        const target = tree.find.must.byId("target");

        target.css.setMany({
          display: "block",
          width: "100px",
          height: "50px",
        });

        await flush_dom();

        const ev = new PointerEvent("pointermove", {
          clientX: 20,
          clientY: 30,
        });

        const pt = target.canvas.pointer(ev);

        (tree as any).__result = {
          point: pt,
          inScope: target.canvas.inScope(),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("pointer returns undefined on non-canvas", r.point, undefined);
        t.eq("target is not canvas-scoped", r.inScope, false);
      },
    },

    {
      suite: SUITE,
      caseId: "canvas.must.pointer-maps-pointer-event-to-canvas-local-coordinates", name: "canvas.must.pointer maps pointer event to canvas-local coordinates",
      dom: true,
      fixture: "canvas/pointer",
      sub: "must-pointer-local-coords",
      hostedGeometry: [{ id: "target", rect: { x: 10, y: 20, width: 120, height: 60 } }],

      html: `
        <main id="root">
          <canvas id="target" width="120" height="60"></canvas>
        </main>
      `,

      async act(tree) {
        const target = tree.find.must.byId("target");

        target.css.setMany({
          display: "block",
          width: "120px",
          height: "60px",
        });

        await flush_dom();

        const cvs = target.canvas.must.el();
        const rect = cvs.getBoundingClientRect();

        const ev = new PointerEvent("pointermove", {
          clientX: rect.left + 40,
          clientY: rect.top + 35,
        });

        const pt = target.canvas.must.pointer(ev);

        (tree as any).__result = {
          x: pt!.x,
          y: pt!.y,
          width: pt!.width,
          height: pt!.height,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("must.pointer x is canvas-local", Math.round(r.x), 40);
        t.eq("must.pointer y is canvas-local", Math.round(r.y), 35);
        t.eq("must.pointer width reports display width", Math.round(r.width), 120);
        t.eq("must.pointer height reports display height", Math.round(r.height), 60);
      },
    },

    {
      suite: SUITE,
      caseId: "canvas.must.pointer-throws-before-mount", name: "canvas.must.pointer throws before mount",
      fixture: "canvas/pointer",
      sub: "must-pointer-unmounted-throws",

      html: `
        <main id="root">
          <canvas id="target" width="100" height="50"></canvas>
        </main>
      `,

      act(tree) {
        const target = tree.find.must.byId("target");

        const ev = new PointerEvent("pointermove", {
          clientX: 20,
          clientY: 30,
        });

        let threw = false;
        let message = "";

        try {
          target.canvas.must.pointer(ev, "unmounted pointer");
        } catch (err) {
          threw = true;
          message = err instanceof Error ? err.message : String(err);
        }

        (tree as any).__result = {
          threw,
          message,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("must.pointer throws before mount", r.threw, true);
        t.ok("must.pointer error includes label", String(r.message).includes("unmounted pointer"));
      },
    },

    {
      suite: SUITE,
      caseId: "canvas.must.pointer-throws-on-non-canvas-node", name: "canvas.must.pointer throws on non-canvas node",
      dom: true,
      fixture: "canvas/pointer",
      sub: "must-pointer-non-canvas-throws",

      html: `
        <main id="root">
          <div id="target"></div>
        </main>
      `,

      async act(tree) {
        const target = tree.find.must.byId("target");

        await flush_dom();

        const ev = new PointerEvent("pointermove", {
          clientX: 20,
          clientY: 30,
        });

        let threw = false;
        let message = "";

        try {
          target.canvas.must.pointer(ev, "non-canvas pointer");
        } catch (err) {
          threw = true;
          message = err instanceof Error ? err.message : String(err);
        }

        (tree as any).__result = {
          threw,
          message,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("must.pointer throws on non-canvas", r.threw, true);
        t.ok("must.pointer error includes label", String(r.message).includes("non-canvas pointer"));
      },
    },

    {
      suite: SUITE,
      caseId: "canvas.pointer-remains-in-css-pixel-coordinates-after-display.match", name: "canvas.pointer remains in CSS-pixel coordinates after display.match",
      dom: true,
      fixture: "canvas/pointer",
      sub: "pointer-after-display-match",
      hostedGeometry: [{ id: "target", rect: { x: 10, y: 20, width: 160, height: 90 } }],

      html: `
        <main id="root">
          <canvas id="target"></canvas>
        </main>
      `,

      async act(tree) {
        const target = tree.find.must.byId("target");

        target.css.setMany({
          display: "block",
          width: "160px",
          height: "90px",
        });

        await flush_dom();

        target.canvas.display.match();

        const cvs = target.canvas.must.el();
        const rect = cvs.getBoundingClientRect();

        const ev = new PointerEvent("pointermove", {
          clientX: rect.left + 70,
          clientY: rect.top + 45,
        });

        const pt = target.canvas.must.pointer(ev);

        (tree as any).__result = {
          x: pt!.x,
          y: pt!.y,
          width: pt!.width,
          height: pt!.height,
          backingWidth: cvs.width,
          backingHeight: cvs.height,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("pointer x remains CSS-pixel local", Math.round(r.x), 70);
        t.eq("pointer y remains CSS-pixel local", Math.round(r.y), 45);
        t.eq("pointer width remains CSS-pixel display width", Math.round(r.width), 160);
        t.eq("pointer height remains CSS-pixel display height", Math.round(r.height), 90);

        t.ok("backing width is at least display width", r.backingWidth >= 160);
        t.ok("backing height is at least display height", r.backingHeight >= 90);
      },
    },
    {
      suite: SUITE,
      caseId: "canvas.display.match.watch-runs-initial-match-immediately", name: "canvas.display.match.watch runs initial match immediately",
      dom: true,
      fixture: "canvas/pointer",
      sub: "match-watch-initial",
      hostedGeometry: [{ id: "target", rect: { x: 10, y: 20, width: 111, height: 57 } }],

      html: `
    <main id="root">
      <canvas id="target"></canvas>
    </main>
  `,

      async act(tree) {
        const target = tree.find.must.byId("target");

        target.css.setMany({
          display: "block",
          width: "111px",
          height: "57px",
        });

        await flush_dom();

        const watcher = target.canvas.display.match.watch({
          dpr: 1,
        });

        const cvs = target.canvas.must.el();

        watcher.off();

        (tree as any).__result = {
          attrWidth: target.attrs.get("width"),
          attrHeight: target.attrs.get("height"),
          width: cvs.width,
          height: cvs.height,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("watch initial match writes width attr", r.attrWidth, "111");
        t.eq("watch initial match writes height attr", r.attrHeight, "57");
        t.eq("watch initial match writes canvas width", r.width, 111);
        t.eq("watch initial match writes canvas height", r.height, 57);
      },
    },

    {
      suite: SUITE,
      caseId: "canvas.display.match.watch-updates-backing-size-after-display-resize", name: "canvas.display.match.watch updates backing size after display resize",
      dom: true,
      fixture: "canvas/pointer",
      sub: "match-watch-resize",
      hostedGeometry: [{ id: "target", rect: { x: 10, y: 20, width: 80, height: 40 } }],

      html: `
    <main id="root">
      <canvas id="target"></canvas>
    </main>
  `,

      async act(tree) {
        const target = tree.find.must.byId("target");

        target.css.setMany({
          display: "block",
          width: "80px",
          height: "40px",
        });

        await flush_dom();

        const watcher = target.canvas.display.match.watch({
          dpr: 1,
        });

        await flush_dom();

        target.css.setMany({
          width: "140px",
          height: "70px",
        });
        notify_hosted_test_resize(target.canvas.must.el(), { x: 10, y: 20, width: 140, height: 70 });

        // ResizeObserver callbacks are async. Two turns makes this less brittle.
        await flush_dom();
        await tick();
        await tick();

        const cvs = target.canvas.must.el();

        watcher.off();

        (tree as any).__result = {
          attrWidth: target.attrs.get("width"),
          attrHeight: target.attrs.get("height"),
          width: cvs.width,
          height: cvs.height,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("watch resize writes width attr", r.attrWidth, "140");
        t.eq("watch resize writes height attr", r.attrHeight, "70");
        t.eq("watch resize writes canvas width", r.width, 140);
        t.eq("watch resize writes canvas height", r.height, 70);
      },
    },

    {
      suite: SUITE,
      caseId: "canvas.display.match.watch-updates-backing-size-after-display-resize", name: "canvas.display.match.watch updates backing size after display resize",
      dom: true,
      fixture: "canvas/pointer",
      sub: "match-watch-resize",
      hostedGeometry: [{ id: "target", rect: { x: 10, y: 20, width: 80, height: 40 } }],

      html: `
    <main id="root">
      <canvas id="target"></canvas>
    </main>
  `,

      async act(tree) {
        const target = tree.find.must.byId("target");

        target.css.setMany({
          display: "block",
          width: "80px",
          height: "40px",
        });

        await flush_dom();

        const watcher = target.canvas.display.match.watch({
          dpr: 1,
        });

        await flush_dom();

        target.css.setMany({
          width: "140px",
          height: "70px",
        });
        notify_hosted_test_resize(target.canvas.must.el(), { x: 10, y: 20, width: 140, height: 70 });

        // ResizeObserver callbacks are async. Two turns makes this less brittle.
        await flush_dom();
        await tick();
        await tick();

        const cvs = target.canvas.must.el();

        watcher.off();

        (tree as any).__result = {
          attrWidth: target.attrs.get("width"),
          attrHeight: target.attrs.get("height"),
          width: cvs.width,
          height: cvs.height,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("watch resize writes width attr", r.attrWidth, "140");
        t.eq("watch resize writes height attr", r.attrHeight, "70");
        t.eq("watch resize writes canvas width", r.width, 140);
        t.eq("watch resize writes canvas height", r.height, 70);
      },
    },

    {
      suite: SUITE,
      caseId: "canvas.display.match.watch-off-stops-further-resize-matching", name: "canvas.display.match.watch off stops further resize matching",
      dom: true,
      fixture: "canvas/pointer",
      sub: "match-watch-off",
      hostedGeometry: [{ id: "target", rect: { x: 10, y: 20, width: 90, height: 45 } }],

      html: `
    <main id="root">
      <canvas id="target"></canvas>
    </main>
  `,

      async act(tree) {
        const target = tree.find.must.byId("target");

        target.css.setMany({
          display: "block",
          width: "90px",
          height: "45px",
        });

        await flush_dom();

        const watcher = target.canvas.display.match.watch({
          dpr: 1,
        });

        await flush_dom();

        watcher.off();

        target.css.setMany({
          width: "160px",
          height: "80px",
        });
        notify_hosted_test_resize(target.canvas.must.el(), { x: 10, y: 20, width: 160, height: 80 });

        await flush_dom();
        await tick();
        await tick();

        const cvs = target.canvas.must.el();

        (tree as any).__result = {
          attrWidth: target.attrs.get("width"),
          attrHeight: target.attrs.get("height"),
          width: cvs.width,
          height: cvs.height,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("watch off preserves prior width attr", r.attrWidth, "90");
        t.eq("watch off preserves prior height attr", r.attrHeight, "45");
        t.eq("watch off preserves prior canvas width", r.width, 90);
        t.eq("watch off preserves prior canvas height", r.height, 45);
      },
    },

    {
      suite: SUITE,
      caseId: "canvas.display.match.watch-is-harmless-before-mount", name: "canvas.display.match.watch is harmless before mount",
      fixture: "canvas/pointer",
      sub: "match-watch-unmounted",

      html: `
    <main id="root">
      <canvas id="target"></canvas>
    </main>
  `,

      act(tree) {
        const target = tree.find.must.byId("target");

        const watcher = target.canvas.display.match.watch({
          dpr: 1,
        });

        watcher.off();

        (tree as any).__result = {
          width: target.attrs.get("width"),
          height: target.attrs.get("height"),
          inScope: target.canvas.inScope(),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("watch before mount does not write width", r.width, undefined);
        t.eq("watch before mount does not write height", r.height, undefined);
        t.eq("unmounted target is still canvas-scoped", r.inScope, true);
      },
    },

    {
      suite: SUITE,
      caseId: "canvas.display.match.watch-is-harmless-on-non-canvas-node", name: "canvas.display.match.watch is harmless on non-canvas node",
      dom: true,
      fixture: "canvas/pointer",
      sub: "match-watch-non-canvas",

      html: `
    <main id="root">
      <div id="target"></div>
    </main>
  `,

      async act(tree) {
        const target = tree.find.must.byId("target");

        target.css.setMany({
          display: "block",
          width: "100px",
          height: "50px",
        });

        await flush_dom();

        const watcher = target.canvas.display.match.watch({
          dpr: 1,
        });

        watcher.off();

        (tree as any).__result = {
          width: target.attrs.get("width"),
          height: target.attrs.get("height"),
          inScope: target.canvas.inScope(),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("watch on non-canvas does not write width", r.width, undefined);
        t.eq("watch on non-canvas does not write height", r.height, undefined);
        t.eq("target is not canvas-scoped", r.inScope, false);
      },
    },

    {
      suite: SUITE,
      caseId: "canvas.pointer-remains-display-local-after-match.watch-resize", name: "canvas.pointer remains display-local after match.watch resize",
      dom: true,
      fixture: "canvas/pointer",
      sub: "pointer-after-watch-resize",
      hostedGeometry: [{ id: "target", rect: { x: 10, y: 20, width: 100, height: 50 } }],

      html: `
    <main id="root">
      <canvas id="target"></canvas>
    </main>
  `,

      async act(tree) {
        const target = tree.find.must.byId("target");

        target.css.setMany({
          display: "block",
          width: "100px",
          height: "50px",
        });

        await flush_dom();

        const watcher = target.canvas.display.match.watch({
          dpr: 1,
        });

        target.css.setMany({
          width: "180px",
          height: "90px",
        });
        notify_hosted_test_resize(target.canvas.must.el(), { x: 10, y: 20, width: 180, height: 90 });

        await flush_dom();
        await tick();
        await tick();

        const cvs = target.canvas.must.el();
        const rect = cvs.getBoundingClientRect();

        const ev = new PointerEvent("pointermove", {
          clientX: rect.left + 72,
          clientY: rect.top + 33,
        });

        const pt = target.canvas.must.pointer(ev);

        watcher.off();

        (tree as any).__result = {
          x: pt.x,
          y: pt.y,
          width: pt.width,
          height: pt.height,
          backingWidth: cvs.width,
          backingHeight: cvs.height,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("pointer x remains local after watched resize", Math.round(r.x), 72);
        t.eq("pointer y remains local after watched resize", Math.round(r.y), 33);
        t.eq("pointer width reflects resized display width", Math.round(r.width), 180);
        t.eq("pointer height reflects resized display height", Math.round(r.height), 90);
        t.eq("backing width reflects watched resize", r.backingWidth, 180);
        t.eq("backing height reflects watched resize", r.backingHeight, 90);
      },
    },








  ];

  return make_livetree_suite(SUITE, cases);
}

export function livetree_document_ownership(): TestSuite {
  const SUITE = "livetree/document-ownership";

  const cases: readonly LiveTreeCaseSpec[] = [
    {
      suite: SUITE,
      caseId: "dom.doc-returns-mounted-element-ownerdocument", name: "dom.doc returns mounted element ownerDocument",
      dom: true,
      fixture: "document/ownership",
      sub: "dom-doc-owner-document",

      html: `
        <main id="root">
          <div id="target">hello</div>
        </main>
      `,

      async act(tree) {
        const target = tree.find.must.byId("target");

        await flush_dom();

        const el = target.dom.must.el();
        const nativeDoc = el.ownerDocument;

        (tree as any).__result = {
          hasDoc: nativeDoc !== undefined,
          sameDocument: nativeDoc === el.ownerDocument,
          sameAsGlobal: nativeDoc === document,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("dom.doc returned a document", r.hasDoc, true);
        t.eq("dom.doc matches element ownerDocument", r.sameDocument, true);
        t.eq("test-mounted doc is global document in normal DOM suite", r.sameAsGlobal, true);
      },
    },

    {
      suite: SUITE,
      caseId: "created-child-uses-same-ownerdocument-as-mounted-parent", name: "created child uses same ownerDocument as mounted parent",
      dom: true,
      fixture: "document/ownership",
      sub: "created-child-owner-document",

      html: `
        <main id="root">
          <section id="host"></section>
        </main>
      `,
      async act(tree) {
        const host = tree.find.must.byId("host");

        await flush_dom();

        const child = host.create.div()
          .attrs.set("id", "created-child")
          .text.set("created");

        await flush_dom();

        const hostEl = host.dom.must.el();
        const childEl = child.dom.must.el();

        (tree as any).__result = {
          childExists: childEl.id === "created-child",
          sameDocument: childEl.ownerDocument === hostEl.ownerDocument,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("created child exists", r.childExists, true);
        t.eq("created child shares parent ownerDocument", r.sameDocument, true);
      }
    },

    {
      suite: SUITE,
      caseId: "nested-created-descendants-keep-mounted-ownerdocument", name: "nested created descendants keep mounted ownerDocument",
      dom: true,
      fixture: "document/ownership",
      sub: "nested-created-owner-document",

      html: `
        <main id="root">
          <section id="host"></section>
        </main>
      `,

      async act(tree) {
        const host = tree.find.must.byId("host");

        await flush_dom();

        const outer = host.create.div().attrs.set("id", "outer-created");
        const inner = outer.create.div().attrs.set("id", "inner-created");
        const leaf = inner.create.span().attrs.set("id", "leaf-created").text.set("leaf");

        await flush_dom();

        const hostDoc = host.dom.must.el().ownerDocument;
        const outerDoc = outer.dom.must.el().ownerDocument;
        const innerDoc = inner.dom.must.el().ownerDocument;
        const leafDoc = leaf.dom.must.el().ownerDocument;

        (tree as any).__result = {
          outerSame: outerDoc === hostDoc,
          innerSame: innerDoc === hostDoc,
          leafSame: leafDoc === hostDoc,
          leafDomDocSame: leaf.dom.must.el().ownerDocument === hostDoc,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("outer created node shares host document", r.outerSame, true);
        t.eq("inner created node shares host document", r.innerSame, true);
        t.eq("leaf created node shares host document", r.leafSame, true);
        t.eq("leaf dom.doc shares host document", r.leafDomDocSame, true);
      },
    },

    {
      suite: SUITE,
      caseId: "detached-tree-has-no-resolved-dom-document-before-mount", name: "detached tree has no resolved DOM document before mount",
      fixture: "document/ownership",
      sub: "detached-no-doc-before-mount",

      html: `
        <main id="root">
          <section id="host"></section>
        </main>
      `,
      act(tree) {
        const host = tree.find.must.byId("host");

        const el = host.dom.el();

        (tree as any).__result = {
          hostEl: el,
          hostDoc: el?.ownerDocument,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("detached host has no DOM element", r.hostEl, undefined);
        t.eq("detached host has no DOM document", r.hostDoc, undefined);
      }
    },

    {
      suite: SUITE,
      caseId: "removed-node-drops-dom-element-and-document-access", name: "removed node drops DOM element and document access",
      dom: true,
      fixture: "document/ownership",
      sub: "removed-node-no-doc",

      html: `
        <main id="root">
          <section id="host">
            <div id="target">hello</div>
          </section>
        </main>
      `,
      async act(tree) {
        const target = tree.find.must.byId("target");

        await flush_dom();

        const beforeEl = target.dom.el();
        const beforeDoc = beforeEl?.ownerDocument;

        target.remove();

        let disposedError = false;
        try {
          target.dom.el();
        } catch (error: unknown) {
          disposedError = error instanceof Error
            && error.name === "LiveTreeDisposedError"
            && "code" in error
            && error.code === "LIVETREE_DISPOSED";
        }

        (tree as any).__result = {
          hadDoc: beforeDoc !== undefined,
          hadEl: beforeEl !== undefined,
          disposedError,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("target had document before removal", r.hadDoc, true);
        t.eq("target had element before removal", r.hadEl, true);
        t.eq("removed target rejects DOM and document access", r.disposedError, true);
      }
    },
    {
      suite: SUITE,
      caseId: "querybody-grafts-document.body-as-mounted-root", name: "queryBody grafts document.body as mounted root",
      // This case owns document.body itself. Mounting the harness sandbox first
      // would graft the same body descendants twice and test the harness rather
      // than queryBody's document ownership.
      dom: false,
      fixture: "document/ownership",
      sub: "query-body-root-is-body",

      html: `
    <main id="root"></main>
  `,

      async act(tree) {
        await flush_dom();

        const bodyTree = hson.liveTree.queryBody().graft();
        const bodyEl = bodyTree.dom.must.el();

        (tree as any).__result = {
          isBody: bodyEl === document.body,
          ownerIsGlobal: bodyEl.ownerDocument === document,
          tag: bodyEl.tagName.toLowerCase(),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("queryBody root element is document.body", r.isBody, true);
        t.eq("queryBody body owner is global document", r.ownerIsGlobal, true);
        t.eq("queryBody root tag is body", r.tag, "body");
      },
    },
    {
      suite: SUITE,
      caseId: "dom-lookup-stays-scoped-to-mounted-ownerdocument-after-creation", name: "DOM lookup stays scoped to mounted ownerDocument after creation",
      dom: true,
      fixture: "document/ownership",
      sub: "lookup-owner-document-after-create",

      html: `
        <main id="root">
          <section id="host"></section>
        </main>
      `,

      async act(tree) {
        const host = tree.find.must.byId("host");

        await flush_dom();

        const created = host.create.div()
          .attrs.set("id", "created-target")
          .text.set("created target");

        await flush_dom();

        const createdEl = created.dom.must.el();
        const foundAgain = tree.find.must.byId("created-target");
        const foundEl = foundAgain.dom.must.el();

        (tree as any).__result = {
          sameElement: createdEl === foundEl,
          sameDocument: createdEl.ownerDocument === foundEl.ownerDocument,
          foundText: foundEl.textContent,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("created element found again is same element", r.sameElement, true);
        t.eq("created/found element share document", r.sameDocument, true);
        t.eq("found created element text", r.foundText, "created target");
      },
    },
  ];

  return make_livetree_suite(SUITE, cases);
}
