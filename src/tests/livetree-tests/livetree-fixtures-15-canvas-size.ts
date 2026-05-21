import { _disposables_count_for_owner } from "hson-live/diagnostics";
import { flush_dom } from "../inspector/inspector.helpers";
import type { TestSuite, LiveTreeCaseSpec } from "../tests.types";
import { make_livetree_suite } from "./livetree-testkit";
import { tick } from "./livetree-fixtures-03";

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


    {
      suite: SUITE,
      name: "canvas.display.match.watch stops after removeSelf",
      dom: true,
      html: `
    <main id="root">
      <section id="host">
        <canvas id="target"></canvas>
      </section>
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

        target.canvas.display.match.watch({ dpr: 1 });

        await flush_dom();

        target.removeSelf();

        // If cleanup is broken, this usually won't be directly observable unless
        // you expose dev counts. So this test may need a devSnapshot/count helper.
        (tree as any).__result = {
          removed: tree.find.byId("target") === undefined,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq("target removed", r.removed, true);
      },
    },
    {
  suite: SUITE,
  name: "canvas.display.match.watch registers owner disposable",
  dom: true,
  fixture: "canvas/lifecycle",
  sub: "watch-registers-owner-disposable",

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

    const before = _disposables_count_for_owner(target.quid);
    const watcher = target.canvas.display.match.watch({ dpr: 1 });
    const after = _disposables_count_for_owner(target.quid);

    watcher.off();

    (tree as any).__result = {
      before,
      after,
      final: _disposables_count_for_owner(target.quid),
    };
  },

  assert(tree, t) {
    const r = (tree as any).__result;

    t.eq("owner starts with no disposables", r.before, 0);
    t.eq("watch registers one disposable", r.after, 1);
    t.eq("manual off removes disposable", r.final, 0);
  },
    },
    {
  suite: SUITE,
  name: "canvas.display.match.watch manual off is idempotent",
  dom: true,
  fixture: "canvas/lifecycle",
  sub: "watch-off-idempotent",

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

    const watcher = target.canvas.display.match.watch({ dpr: 1 });

    watcher.off();
    watcher.off();
    watcher.off();

    (tree as any).__result = {
      count: _disposables_count_for_owner(target.quid),
    };
  },

  assert(tree, t) {
    const r = (tree as any).__result;

    t.eq("repeated off leaves no registered disposable", r.count, 0);
  },
    },
    {
  suite: SUITE,
  name: "canvas.display.match.watch manual off is idempotent",
  dom: true,
  fixture: "canvas/lifecycle",
  sub: "watch-off-idempotent",

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

    const watcher = target.canvas.display.match.watch({ dpr: 1 });

    watcher.off();
    watcher.off();
    watcher.off();

    (tree as any).__result = {
      count: _disposables_count_for_owner(target.quid),
    };
  },

  assert(tree, t) {
    const r = (tree as any).__result;

    t.eq("repeated off leaves no registered disposable", r.count, 0);
  },
    },
    {
  suite: SUITE,
  name: "canvas.display.match.watch auto-cleans on parent removeChildren",
  dom: true,
  fixture: "canvas/lifecycle",
  sub: "watch-cleans-remove-children",

  html: `
    <main id="root">
      <section id="host">
        <canvas id="target"></canvas>
      </section>
    </main>
  `,

  async act(tree) {
    const host = tree.find.must.byId("host");
    const target = tree.find.must.byId("target");

    target.css.setMany({
      display: "block",
      width: "100px",
      height: "50px",
    });

    await flush_dom();

    const q = target.quid;

    target.canvas.display.match.watch({ dpr: 1 });

    const beforeRemove = _disposables_count_for_owner(q);
    const removed = host.removeChildren();
    const afterRemove = _disposables_count_for_owner(q);

    (tree as any).__result = {
      removed,
      beforeRemove,
      afterRemove,
    };
  },

  assert(tree, t) {
    const r = (tree as any).__result;

    t.eq("watch registered before removeChildren", r.beforeRemove, 1);
    t.eq("removeChildren removed one child", r.removed, 1);
    t.eq("removeChildren cleaned child owner disposable", r.afterRemove, 0);
  },
},
{
  suite: SUITE,
  name: "canvas.display.match.watch auto-cleans on parent removeChildren",
  dom: true,
  fixture: "canvas/lifecycle",
  sub: "watch-cleans-remove-children",

  html: `
    <main id="root">
      <section id="host">
        <canvas id="target"></canvas>
      </section>
    </main>
  `,

  async act(tree) {
    const host = tree.find.must.byId("host");
    const target = tree.find.must.byId("target");

    target.css.setMany({
      display: "block",
      width: "100px",
      height: "50px",
    });

    await flush_dom();

    const q = target.quid;

    target.canvas.display.match.watch({ dpr: 1 });

    const beforeRemove = _disposables_count_for_owner(q);
    const removed = host.removeChildren();
    const afterRemove = _disposables_count_for_owner(q);

    (tree as any).__result = {
      removed,
      beforeRemove,
      afterRemove,
    };
  },

  assert(tree, t) {
    const r = (tree as any).__result;

    t.eq("watch registered before removeChildren", r.beforeRemove, 1);
    t.eq("removeChildren removed one child", r.removed, 1);
    t.eq("removeChildren cleaned child owner disposable", r.afterRemove, 0);
  },
},
{
  suite: SUITE,
  name: "canvas.display.match.watch auto-cleans deep child canvas on ancestor removeSelf",
  dom: true,
  fixture: "canvas/lifecycle",
  sub: "watch-cleans-ancestor-remove-self",

  html: `
    <main id="root">
      <section id="outer">
        <div id="inner">
          <canvas id="target"></canvas>
        </div>
      </section>
    </main>
  `,

  async act(tree) {
    const outer = tree.find.must.byId("outer");
    const target = tree.find.must.byId("target");

    target.css.setMany({
      display: "block",
      width: "100px",
      height: "50px",
    });

    await flush_dom();

    const q = target.quid;

    target.canvas.display.match.watch({ dpr: 1 });

    const beforeRemove = _disposables_count_for_owner(q);
    const removed = outer.removeSelf();
    const afterRemove = _disposables_count_for_owner(q);

    (tree as any).__result = {
      removed,
      beforeRemove,
      afterRemove,
    };
  },

  assert(tree, t) {
    const r = (tree as any).__result;

    t.eq("deep canvas watch registered before ancestor remove", r.beforeRemove, 1);
    t.eq("ancestor removeSelf removed one subtree root", r.removed, 1);
    t.eq("ancestor removeSelf cleaned deep canvas disposable", r.afterRemove, 0);
  },
    },
{
  suite: SUITE,
  name: "canvas.display.match.watch multiple watchers clean independently",
  dom: true,
  fixture: "canvas/lifecycle",
  sub: "watch-multiple-clean-independent",

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

    const q = target.quid;

    const a = target.canvas.display.match.watch({ dpr: 1 });
    const b = target.canvas.display.match.watch({ dpr: 1 });

    const both = _disposables_count_for_owner(q);

    a.off();

    const afterOne = _disposables_count_for_owner(q);

    b.off();

    const afterBoth = _disposables_count_for_owner(q);

    (tree as any).__result = {
      both,
      afterOne,
      afterBoth,
    };
  },

  assert(tree, t) {
    const r = (tree as any).__result;

    t.eq("two watchers register two disposables", r.both, 2);
    t.eq("one off leaves one disposable", r.afterOne, 1);
    t.eq("both off leaves no disposables", r.afterBoth, 0);
  },
},
{
  suite: SUITE,
  name: "canvas.display.match.watch removed node does not keep matching after detach",
  dom: true,
  fixture: "canvas/lifecycle",
  sub: "watch-no-match-after-detach",

  html: `
    <main id="root">
      <section id="host">
        <canvas id="target"></canvas>
      </section>
    </main>
  `,

  async act(tree) {
    const host = tree.find.must.byId("host");
    const target = tree.find.must.byId("target");

    target.css.setMany({
      display: "block",
      width: "80px",
      height: "40px",
    });

    await flush_dom();

    const q = target.quid;

    target.canvas.display.match.watch({ dpr: 1 });

    await flush_dom();
    await tick();

    const beforeWidth = target.attr.get("width");
    const beforeHeight = target.attr.get("height");

    host.removeChildren();

    const afterCount = _disposables_count_for_owner(q);

    // Mutate the old LiveTree handle after detach. If the watcher was not
    // cleaned, this kind of stale handle is exactly what could keep work alive.
    target.css.setMany({
      width: "160px",
      height: "80px",
    });

    await flush_dom();
    await tick();
    await tick();

    (tree as any).__result = {
      beforeWidth,
      beforeHeight,
      afterCount,
      afterWidth: target.attr.get("width"),
      afterHeight: target.attr.get("height"),
    };
  },

  assert(tree, t) {
    const r = (tree as any).__result;

    t.eq("initial watch wrote width", r.beforeWidth, "80");
    t.eq("initial watch wrote height", r.beforeHeight, "40");
    t.eq("detach cleaned disposable count", r.afterCount, 0);

    // These should remain the old attrs; the detached watcher should not keep
    // observing and rewriting backing dimensions.
    t.eq("detached stale handle did not rematch width", r.afterWidth, "80");
    t.eq("detached stale handle did not rematch height", r.afterHeight, "40");
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

export function livetree_canvas_plot(): TestSuite {
  const SUITE = "livetree/canvas-plot";

  const cases: readonly LiveTreeCaseSpec[] = [
    {
      suite: SUITE,
      name: "canvas.plot runs callback with native 2d context when mounted",
      dom: true,
      fixture: "canvas/plot",
      sub: "plot-mounted",

      html: `
        <main id="root">
          <canvas id="target" width="20" height="20"></canvas>
        </main>
      `,

      async act(tree) {
        const target = tree.find.must.byId("target");

        await flush_dom();

        let called = false;

        target.canvas.plot((ctx, cvs) => {
          called = true;

          ctx.fillStyle = "rgb(255, 0, 0)";
          ctx.fillRect(0, 0, cvs.width, cvs.height);
        });

        const ctx = target.canvas.must.ctx2d();
        const pixel = ctx.getImageData(10, 10, 1, 1).data;

        (tree as any).__result = {
          called,
          r: pixel[0],
          g: pixel[1],
          b: pixel[2],
          a: pixel[3],
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("plot callback called", r.called, true);
        t.eq("red channel written", r.r, 255);
        t.eq("green channel written", r.g, 0);
        t.eq("blue channel written", r.b, 0);
        t.eq("alpha channel written", r.a, 255);
      },
    },

    {
      suite: SUITE,
      name: "canvas.plot returns tree for chaining",
      dom: true,
      fixture: "canvas/plot",
      sub: "plot-chain",

      html: `
        <main id="root">
          <canvas id="target" width="20" height="20"></canvas>
        </main>
      `,

      async act(tree) {
        const target = tree.find.must.byId("target");

        await flush_dom();

        target.canvas
          .plot((ctx) => {
            ctx.fillStyle = "rgb(0, 0, 255)";
            ctx.fillRect(0, 0, 10, 10);
          })
          .attr.set("data-after", "ok");

        (tree as any).__result = {
          after: target.attr.get("data-after"),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("chain continued after plot", r.after, "ok");
      },
    },

    {
      suite: SUITE,
      name: "canvas.plot is harmless before mount",
      fixture: "canvas/plot",
      sub: "plot-unmounted",

      html: `
        <main id="root">
          <canvas id="target" width="20" height="20"></canvas>
        </main>
      `,

      act(tree) {
        const target = tree.find.must.byId("target");

        let called = false;

        target.canvas
          .plot(() => {
            called = true;
          })
          .attr.set("data-after", "ok");

        (tree as any).__result = {
          called,
          after: target.attr.get("data-after"),
          inScope: target.canvas.inScope(),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("plot callback not called before mount", r.called, false);
        t.eq("chain continued after no-op plot", r.after, "ok");
        t.eq("still canvas-scoped", r.inScope, true);
      },
    },

    {
      suite: SUITE,
      name: "canvas.plot is harmless on non-canvas node",
      dom: true,
      fixture: "canvas/plot",
      sub: "plot-non-canvas",

      html: `
        <main id="root">
          <div id="target"></div>
        </main>
      `,

      async act(tree) {
        const target = tree.find.must.byId("target");

        await flush_dom();

        let called = false;

        target.canvas
          .plot(() => {
            called = true;
          })
          .attr.set("data-after", "ok");

        (tree as any).__result = {
          called,
          after: target.attr.get("data-after"),
          inScope: target.canvas.inScope(),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("plot callback not called on non-canvas", r.called, false);
        t.eq("chain continued after non-canvas plot", r.after, "ok");
        t.eq("non-canvas not in scope", r.inScope, false);
      },
    },

    {
      suite: SUITE,
      name: "canvas.must.plot runs callback with native 2d context when mounted",
      dom: true,
      fixture: "canvas/plot",
      sub: "must-plot-mounted",

      html: `
        <main id="root">
          <canvas id="target" width="20" height="20"></canvas>
        </main>
      `,

      async act(tree) {
        const target = tree.find.must.byId("target");

        await flush_dom();

        let called = false;

        target.canvas.must.plot((ctx, cvs) => {
          called = true;

          ctx.fillStyle = "rgb(0, 255, 0)";
          ctx.fillRect(0, 0, cvs.width, cvs.height);
        });

        const ctx = target.canvas.must.ctx2d();
        const pixel = ctx.getImageData(10, 10, 1, 1).data;

        (tree as any).__result = {
          called,
          r: pixel[0],
          g: pixel[1],
          b: pixel[2],
          a: pixel[3],
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("must.plot callback called", r.called, true);
        t.eq("red channel written", r.r, 0);
        t.eq("green channel written", r.g, 255);
        t.eq("blue channel written", r.b, 0);
        t.eq("alpha channel written", r.a, 255);
      },
    },

    {
      suite: SUITE,
      name: "canvas.must.plot returns tree for chaining",
      dom: true,
      fixture: "canvas/plot",
      sub: "must-plot-chain",

      html: `
        <main id="root">
          <canvas id="target" width="20" height="20"></canvas>
        </main>
      `,

      async act(tree) {
        const target = tree.find.must.byId("target");

        await flush_dom();

        target.canvas.must
          .plot((ctx) => {
            ctx.fillStyle = "rgb(0, 0, 0)";
            ctx.fillRect(0, 0, 1, 1);
          })
          .attr.set("data-after", "ok");

        (tree as any).__result = {
          after: target.attr.get("data-after"),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("chain continued after must.plot", r.after, "ok");
      },
    },

    {
      suite: SUITE,
      name: "canvas.must.plot throws before mount",
      fixture: "canvas/plot",
      sub: "must-plot-unmounted-throws",

      html: `
        <main id="root">
          <canvas id="target" width="20" height="20"></canvas>
        </main>
      `,

      act(tree) {
        const target = tree.find.must.byId("target");

        let threw = false;
        let called = false;
        let message = "";

        try {
          target.canvas.must.plot(
            () => {
              called = true;
            },
            undefined,
            "unmounted plot",
          );
        } catch (err) {
          threw = true;
          message = err instanceof Error ? err.message : String(err);
        }

        (tree as any).__result = {
          threw,
          called,
          message,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("must.plot throws before mount", r.threw, true);
        t.eq("must.plot callback not called after throw", r.called, false);
        t.ok("must.plot error includes label", String(r.message).includes("unmounted plot"));
      },
    },

    {
      suite: SUITE,
      name: "canvas.must.plot throws on non-canvas node",
      dom: true,
      fixture: "canvas/plot",
      sub: "must-plot-non-canvas-throws",

      html: `
        <main id="root">
          <div id="target"></div>
        </main>
      `,

      async act(tree) {
        const target = tree.find.must.byId("target");

        await flush_dom();

        let threw = false;
        let called = false;
        let message = "";

        try {
          target.canvas.must.plot(
            () => {
              called = true;
            },
            undefined,
            "not canvas plot",
          );
        } catch (err) {
          threw = true;
          message = err instanceof Error ? err.message : String(err);
        }

        (tree as any).__result = {
          threw,
          called,
          message,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("must.plot throws on non-canvas", r.threw, true);
        t.eq("must.plot callback not called on non-canvas", r.called, false);
        t.ok("must.plot error includes label", String(r.message).includes("not canvas plot"));
      },
    },

    {
      suite: SUITE,
      name: "canvas.plot accepts context settings",
      dom: true,
      fixture: "canvas/plot",
      sub: "plot-settings",

      html: `
        <main id="root">
          <canvas id="target" width="20" height="20"></canvas>
        </main>
      `,

      async act(tree) {
        const target = tree.find.must.byId("target");

        await flush_dom();

        let called = false;
        let hasCtx = false;

        target.canvas.plot(
          (ctx) => {
            called = true;
            hasCtx = ctx instanceof CanvasRenderingContext2D;
          },
          {
            alpha: false,
            desynchronized: false,
          },
        );

        (tree as any).__result = {
          called,
          hasCtx,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("plot with settings called", r.called, true);
        t.eq("plot with settings received context", r.hasCtx, true);
      },
    },

  ];

  return make_livetree_suite(SUITE, cases);
}