import { flush_dom } from "../inspector/inspector.helpers";
import type { TestSuite, LiveTreeCaseSpec } from "../tests.types";
import { make_livetree_suite } from "./livetree-testkit";

export function livetree_canvas_display(): TestSuite {
  const SUITE = "livetree/canvas-display";

  const cases: readonly LiveTreeCaseSpec[] = [
    {
      suite: SUITE,
      name: "canvas.size get reads width and height attrs",
      fixture: "canvas/size",
      sub: "size-get",

      html: `
        <main id="root">
          <canvas id="target" width="320" height="180"></canvas>
        </main>
      `,

      act(tree) {
        const target = tree.find.must.byId("target");

        (tree as any).__result = {
          size: target.canvas.size.get(),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("size width", r.size.width, 320);
        t.eq("size height", r.size.height, 180);
      },
    },

    {
      suite: SUITE,
      name: "canvas.size set writes width and height attrs",
      fixture: "canvas/size",
      sub: "size-set",

      html: `
        <main id="root">
          <canvas id="target"></canvas>
        </main>
      `,

      act(tree) {
        const target = tree.find.must.byId("target");

        target.canvas.size.set(640, 360);

        (tree as any).__result = {
          size: target.canvas.size.get(),
          widthAttr: target.attr.get("width"),
          heightAttr: target.attr.get("height"),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("size width after set", r.size.width, 640);
        t.eq("size height after set", r.size.height, 360);
        t.eq("width attr after set", r.widthAttr, "640");
        t.eq("height attr after set", r.heightAttr, "360");
      },
    },

    {
      suite: SUITE,
      name: "canvas.size set returns tree for chaining",
      fixture: "canvas/size",
      sub: "size-chain",

      html: `
        <main id="root">
          <canvas id="target"></canvas>
        </main>
      `,

      act(tree) {
        const target = tree.find.must.byId("target");

        target.canvas.size
          .set(200, 100)
          .attr.set("data-after", "ok");

        (tree as any).__result = {
          size: target.canvas.size.get(),
          after: target.attr.get("data-after"),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("size width through chain", r.size.width, 200);
        t.eq("size height through chain", r.size.height, 100);
        t.eq("chain continued after size.set", r.after, "ok");
      },
    },

    {
      suite: SUITE,
      name: "canvas.size clear removes width and height attrs",
      fixture: "canvas/size",
      sub: "size-clear",

      html: `
        <main id="root">
          <canvas id="target" width="320" height="180"></canvas>
        </main>
      `,

      act(tree) {
        const target = tree.find.must.byId("target");

        target.canvas.size.clear();

        (tree as any).__result = {
          size: target.canvas.size.get(),
          widthAttr: target.attr.get("width"),
          heightAttr: target.attr.get("height"),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("size width after clear", r.size.width, undefined);
        t.eq("size height after clear", r.size.height, undefined);
        t.eq("width attr after clear", r.widthAttr, undefined);
        t.eq("height attr after clear", r.heightAttr, undefined);
      },
    },

    {
      suite: SUITE,
      name: "canvas.display.size returns undefined before mount",
      fixture: "canvas/display",
      sub: "display-size-unmounted",

      html: `
        <main id="root">
          <canvas id="target"></canvas>
        </main>
      `,

      act(tree) {
        const target = tree.find.must.byId("target");

        (tree as any).__result = {
          display: target.canvas.display.size(),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("display size unavailable before mount", r.display, undefined);
      },
    },

    {
      suite: SUITE,
      name: "canvas.display.size reads mounted layout size",
      dom: true,
      fixture: "canvas/display",
      sub: "display-size-mounted",

      html: `
        <main id="root">
          <canvas id="target"></canvas>
        </main>
      `,

      async act(tree) {
        const target = tree.find.must.byId("target");

        target.css.setMany({
          width: "120px",
          height: "80px",
          display: "block",
        });

        await flush_dom();

        (tree as any).__result = {
          display: target.canvas.display.size({ dpr: 2 }),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("display width", r.display.width, 120);
        t.eq("display height", r.display.height, 80);
        t.eq("display dpr", r.display.dpr, 2);
        t.eq("display bitmap width", r.display.bitmapWidth, 240);
        t.eq("display bitmap height", r.display.bitmapHeight, 160);
      },
    },

    {
      suite: SUITE,
      name: "canvas.display.match sets bitmap attrs from display size",
      dom: true,
      fixture: "canvas/display",
      sub: "display-match",

      html: `
        <main id="root">
          <canvas id="target"></canvas>
        </main>
      `,

      async act(tree) {
        const target = tree.find.must.byId("target");

        target.css.setMany({
          width: "150px",
          height: "90px",
          display: "block",
        });

        await flush_dom();

        target.canvas.display.match({
          dpr: 2,
          scaleContext: false,
        });

        (tree as any).__result = {
          size: target.canvas.size.get(),
          widthAttr: target.attr.get("width"),
          heightAttr: target.attr.get("height"),
          elWidth: target.canvas.must.el().width,
          elHeight: target.canvas.must.el().height,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("matched backing width", r.size.width, 300);
        t.eq("matched backing height", r.size.height, 180);
        t.eq("matched width attr", r.widthAttr, "300");
        t.eq("matched height attr", r.heightAttr, "180");
        t.eq("mounted canvas width property", r.elWidth, 300);
        t.eq("mounted canvas height property", r.elHeight, 180);
      },
    },

    {
      suite: SUITE,
      name: "canvas.display.match returns tree for chaining",
      dom: true,
      fixture: "canvas/display",
      sub: "display-match-chain",

      html: `
        <main id="root">
          <canvas id="target"></canvas>
        </main>
      `,

      async act(tree) {
        const target = tree.find.must.byId("target");

        target.css.setMany({
          width: "50px",
          height: "40px",
          display: "block",
        });

        await flush_dom();

        target.canvas.display
          .match({ dpr: 1, scaleContext: false })
          .attr.set("data-after", "ok");

        (tree as any).__result = {
          size: target.canvas.size.get(),
          after: target.attr.get("data-after"),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("matched width", r.size.width, 50);
        t.eq("matched height", r.size.height, 40);
        t.eq("chain continued after display.match", r.after, "ok");
      },
    },

    {
      suite: SUITE,
      name: "canvas.display.match is harmless before mount",
      fixture: "canvas/display",
      sub: "display-match-unmounted",

      html: `
        <main id="root">
          <canvas id="target" width="10" height="20"></canvas>
        </main>
      `,

      act(tree) {
        const target = tree.find.must.byId("target");

        target.canvas.display.match({
          dpr: 2,
          scaleContext: false,
        });

        (tree as any).__result = {
          size: target.canvas.size.get(),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("unmounted match leaves width alone", r.size.width, 10);
        t.eq("unmounted match leaves height alone", r.size.height, 20);
      },
    },
  ];

  return make_livetree_suite(SUITE, cases);
}

export function livetree_canvas_clear(): TestSuite {
  const SUITE = "livetree/canvas-clear";

  const cases: readonly LiveTreeCaseSpec[] = [
    {
      suite: SUITE,
      name: "canvas.clear clears full backing bitmap",
      dom: true,
      fixture: "canvas/clear",
      sub: "full-clear",

      html: `
        <main id="root">
          <canvas id="target" width="20" height="20"></canvas>
        </main>
      `,

      async act(tree) {
        const target = tree.find.must.byId("target");

        await flush_dom();

        const ctx = target.canvas.must.ctx2d();

        ctx.fillStyle = "rgb(255, 0, 0)";
        ctx.fillRect(0, 0, 20, 20);

        target.canvas.clear();

        const pixel = ctx.getImageData(10, 10, 1, 1).data;

        (tree as any).__result = {
          r: pixel[0],
          g: pixel[1],
          b: pixel[2],
          a: pixel[3],
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("red channel cleared", r.r, 0);
        t.eq("green channel cleared", r.g, 0);
        t.eq("blue channel cleared", r.b, 0);
        t.eq("alpha channel cleared", r.a, 0);
      },
    },

    {
      suite: SUITE,
      name: "canvas.clear rectangle clears only requested region",
      dom: true,
      fixture: "canvas/clear",
      sub: "rect-clear",

      html: `
        <main id="root">
          <canvas id="target" width="20" height="20"></canvas>
        </main>
      `,

      async act(tree) {
        const target = tree.find.must.byId("target");

        await flush_dom();

        const ctx = target.canvas.must.ctx2d();

        ctx.fillStyle = "rgb(255, 0, 0)";
        ctx.fillRect(0, 0, 20, 20);

        target.canvas.clear(0, 0, 10, 10);

        const cleared = ctx.getImageData(5, 5, 1, 1).data;
        const untouched = ctx.getImageData(15, 15, 1, 1).data;

        (tree as any).__result = {
          cleared: {
            r: cleared[0],
            g: cleared[1],
            b: cleared[2],
            a: cleared[3],
          },
          untouched: {
            r: untouched[0],
            g: untouched[1],
            b: untouched[2],
            a: untouched[3],
          },
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("cleared alpha", r.cleared.a, 0);

        t.eq("untouched red", r.untouched.r, 255);
        t.eq("untouched green", r.untouched.g, 0);
        t.eq("untouched blue", r.untouched.b, 0);
        t.eq("untouched alpha", r.untouched.a, 255);
      },
    },

    {
      suite: SUITE,
      name: "canvas.clear returns tree for chaining",
      dom: true,
      fixture: "canvas/clear",
      sub: "clear-chain",

      html: `
        <main id="root">
          <canvas id="target" width="20" height="20"></canvas>
        </main>
      `,

      async act(tree) {
        const target = tree.find.must.byId("target");

        await flush_dom();

        target.canvas
          .clear()
          .attr.set("data-after", "ok");

        (tree as any).__result = {
          after: target.attr.get("data-after"),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("chain continued after clear", r.after, "ok");
      },
    },

    {
      suite: SUITE,
      name: "canvas.clear is harmless before mount",
      fixture: "canvas/clear",
      sub: "clear-unmounted",

      html: `
        <main id="root">
          <canvas id="target" width="20" height="20"></canvas>
        </main>
      `,

      act(tree) {
        const target = tree.find.must.byId("target");

        target.canvas.clear();

        (tree as any).__result = {
          width: target.canvas.width.get(),
          height: target.canvas.height.get(),
          inScope: target.canvas.inScope(),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("width unchanged", r.width, 20);
        t.eq("height unchanged", r.height, 20);
        t.eq("still canvas-scoped", r.inScope, true);
      },
    },

    {
      suite: SUITE,
      name: "canvas.clear is harmless on non-canvas node",
      dom: true,
      fixture: "canvas/clear",
      sub: "clear-non-canvas",

      html: `
        <main id="root">
          <div id="target"></div>
        </main>
      `,

      async act(tree) {
        const target = tree.find.must.byId("target");

        await flush_dom();

        target.canvas
          .clear()
          .attr.set("data-after", "ok");

        (tree as any).__result = {
          after: target.attr.get("data-after"),
          inScope: target.canvas.inScope(),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("chain continued after no-op clear", r.after, "ok");
        t.eq("non-canvas still not in scope", r.inScope, false);
      },
    },
  ];

  return make_livetree_suite(SUITE, cases);
}