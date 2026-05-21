import { flush_dom } from "../inspector/inspector.helpers";
import type { TestSuite, LiveTreeCaseSpec } from "../tests.types";
import { make_livetree_suite } from "./livetree-testkit";

export function livetree_canvas_pointer(): TestSuite {
  const SUITE = "livetree/canvas-pointer";

  const cases: readonly LiveTreeCaseSpec[] = [
    {
      suite: SUITE,
      name: "canvas.pointer maps pointer event to canvas-local coordinates",
      dom: true,
      fixture: "canvas/pointer",
      sub: "pointer-local-coords",

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
      name: "canvas.pointer accepts MouseEvent coordinates",
      dom: true,
      fixture: "canvas/pointer",
      sub: "mouseevent-local-coords",

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
      name: "canvas.pointer returns undefined before mount",
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
      name: "canvas.pointer returns undefined on non-canvas node",
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
      name: "canvas.must.pointer maps pointer event to canvas-local coordinates",
      dom: true,
      fixture: "canvas/pointer",
      sub: "must-pointer-local-coords",

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
      name: "canvas.must.pointer throws before mount",
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
          target.canvas.must.pointer(ev, "unmounted pointer" );
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
      name: "canvas.must.pointer throws on non-canvas node",
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
          target.canvas.must.pointer(ev , "non-canvas pointer" );
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
      name: "canvas.pointer remains in CSS-pixel coordinates after display.match",
      dom: true,
      fixture: "canvas/pointer",
      sub: "pointer-after-display-match",

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
  ];

  return make_livetree_suite(SUITE, cases);
}