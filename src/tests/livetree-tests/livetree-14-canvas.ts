import { flush_dom } from "../inspector/inspector.helpers";
import type { TestSuite } from "../../app/demos/test/tests.types";
import type { LiveTreeCaseSpec } from "../../app/demos/test/live-tests.types";
import { make_livetree_suite } from "./make-livetree-suite";

export function livetree_canvas(): TestSuite {
    const SUITE = "livetree/canvas";

    const cases: readonly LiveTreeCaseSpec[] = [
        {
            suite: SUITE,
            name: "canvas.inScope false on non-canvas node",
            fixture: "canvas/scope",
            sub: "div-false",

            html: `
        <main id="root">
          <div id="target">hello</div>
        </main>
      `,

            act(tree) {
                const target = tree.find.must.byId("target");

                (tree as any).__result = {
                    inScope: target.canvas.inScope(),
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;

                t.eq("div canvas.inScope false", r.inScope, false);
            },
        },

        {
            suite: SUITE,
            name: "canvas.inScope true on canvas node",
            fixture: "canvas/scope",
            sub: "canvas-true",

            html: `
        <main id="root">
          <canvas id="target"></canvas>
        </main>
      `,

            act(tree) {
                const target = tree.find.must.byId("target");

                (tree as any).__result = {
                    inScope: target.canvas.inScope(),
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;

                t.eq("canvas canvas.inScope true", r.inScope, true);
            },
        },

        {
            suite: SUITE,
            name: "create.canvas returns canvas-scoped tree",
            fixture: "canvas/create",
            sub: "create-canvas-scope",

            html: `
        <main id="root"></main>
      `,

            act(tree) {
                const canvas = tree.create.canvas();

                (tree as any).__result = {
                    inScope: canvas.canvas.inScope(),
                    tag: canvas.node.$_tag,
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;

                t.eq("created tag is canvas", r.tag, "canvas");
                t.eq("created canvas inScope true", r.inScope, true);
            },
        },

        {
            suite: SUITE,
            name: "canvas width set/get/clear uses width attr",
            fixture: "canvas/attrs",
            sub: "width-set-get-clear",

            html: `
        <main id="root">
          <canvas id="target"></canvas>
        </main>
      `,

            act(tree) {
                const target = tree.find.must.byId("target");

                target.canvas.width.set(320);

                const afterSet = {
                    value: target.canvas.width.get(),
                    attr: target.attr.get("width"),
                };

                target.canvas.width.clear();

                const afterClear = {
                    value: target.canvas.width.get(),
                    attr: target.attr.get("width"),
                };

                (tree as any).__result = {
                    afterSet,
                    afterClear,
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;

                t.eq("width get after set", r.afterSet.value, 320);
                t.eq("width attr after set", r.afterSet.attr, "320");

                t.eq("width get after clear", r.afterClear.value, undefined);
                t.eq("width attr after clear", r.afterClear.attr, undefined);
            },
        },

        {
            suite: SUITE,
            name: "canvas height set/get/clear uses height attr",
            fixture: "canvas/attrs",
            sub: "height-set-get-clear",

            html: `
        <main id="root">
          <canvas id="target"></canvas>
        </main>
      `,

            act(tree) {
                const target = tree.find.must.byId("target");

                target.canvas.height.set(180);

                const afterSet = {
                    value: target.canvas.height.get(),
                    attr: target.attr.get("height"),
                };

                target.canvas.height.clear();

                const afterClear = {
                    value: target.canvas.height.get(),
                    attr: target.attr.get("height"),
                };

                (tree as any).__result = {
                    afterSet,
                    afterClear,
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;

                t.eq("height get after set", r.afterSet.value, 180);
                t.eq("height attr after set", r.afterSet.attr, "180");

                t.eq("height get after clear", r.afterClear.value, undefined);
                t.eq("height attr after clear", r.afterClear.attr, undefined);
            },
        },

        {
            suite: SUITE,
            name: "canvas el returns mounted HTMLCanvasElement",
            dom: true,
            fixture: "canvas/dom",
            sub: "el-mounted",

            html: `
        <main id="root">
          <canvas id="target"></canvas>
        </main>
      `,

            async act(tree) {
                const target = tree.find.must.byId("target");

                await flush_dom();

                const el = target.canvas.el();

                (tree as any).__result = {
                    hasEl: el instanceof HTMLCanvasElement,
                    tagName: el?.tagName,
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;

                t.eq("canvas.el returns canvas element", r.hasEl, true);
                t.eq("canvas element tagName", r.tagName, "CANVAS");
            },
        },

        {
            suite: SUITE,
            name: "canvas el returns undefined on non-canvas node",
            dom: true,
            fixture: "canvas/dom",
            sub: "el-non-canvas",

            html: `
        <main id="root">
          <div id="target"></div>
        </main>
      `,

            async act(tree) {
                const target = tree.find.must.byId("target");

                await flush_dom();

                (tree as any).__result = {
                    el: target.canvas.el(),
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;

                t.eq("non-canvas canvas.el undefined", r.el, undefined);
            },
        },

        {
            suite: SUITE,
            name: "canvas ctx2d returns 2d context when mounted",
            dom: true,
            fixture: "canvas/context",
            sub: "ctx2d-mounted",

            html: `
        <main id="root">
          <canvas id="target" width="32" height="32"></canvas>
        </main>
      `,

            async act(tree) {
                const target = tree.find.must.byId("target");

                await flush_dom();

                const ctx = target.canvas.ctx2d();

                (tree as any).__result = {
                    hasCtx: ctx instanceof CanvasRenderingContext2D,
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;

                t.eq("canvas.ctx2d returns CanvasRenderingContext2D", r.hasCtx, true);
            },
        },

        {
            suite: SUITE,
            name: "canvas must.el returns mounted canvas",
            dom: true,
            fixture: "canvas/must",
            sub: "must-el-mounted",

            html: `
        <main id="root">
          <canvas id="target"></canvas>
        </main>
      `,

            async act(tree) {
                const target = tree.find.must.byId("target");

                await flush_dom();

                const el = target.canvas.must.el("test canvas");

                (tree as any).__result = {
                    hasEl: el instanceof HTMLCanvasElement,
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;

                t.eq("canvas.must.el returns mounted canvas", r.hasEl, true);
            },
        },

        {
            suite: SUITE,
            name: "canvas must.el throws on non-canvas node",
            dom: true,
            fixture: "canvas/must",
            sub: "must-el-throws",

            html: `
        <main id="root">
          <div id="target"></div>
        </main>
      `,

            async act(tree) {
                const target = tree.find.must.byId("target");

                await flush_dom();

                let threw = false;
                let message = "";

                try {
                    target.canvas.must.el("not a canvas");
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

                t.eq("canvas.must.el throws", r.threw, true);
                t.ok("canvas.must.el includes label", String(r.message).includes("not a canvas"));
            },
        },
    ];

    return make_livetree_suite(SUITE, cases);
}

export function livetree_canvas_stress(): TestSuite {
    const SUITE = "livetree/canvas-stress";

    const cases: readonly LiveTreeCaseSpec[] = [
        {
            suite: SUITE,
            name: "create.canvas supports source string content",
            fixture: "canvas/create",
            sub: "canvas-source-string",

            html: `
        <main id="root"></main>
      `,

            act(tree) {
                const canvas = tree.create.canvas(`<canvas id="made" width="40" height="20"></canvas>`);

                (tree as any).__result = {
                    tag: canvas.node.$_tag,
                    id: canvas.attr.get("id"),
                    width: canvas.canvas.width.get(),
                    height: canvas.canvas.height.get(),
                    inScope: canvas.canvas.inScope(),
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;

                t.eq("created tag", r.tag, "canvas");
                t.eq("created id", r.id, "made");
                t.eq("created width", r.width, 40);
                t.eq("created height", r.height, 20);
                t.eq("created canvas inScope", r.inScope, true);
            },
        },

        {
            suite: SUITE,
            name: "create.canvas participates in prepend insertion",
            fixture: "canvas/create",
            sub: "canvas-prepend",

            html: `
        <main id="root">
          <div id="first"></div>
        </main>
      `,

            act(tree) {
                const canvas = tree.create.prepend().canvas();
                canvas.attr.set("id", "canvas-first");

                const root = tree.find.must.byId("root");

                (tree as any).__result = {
                    firstTag: root.content.all().at(0)?.node.$_tag,
                    firstId: root.content.all().at(0)?.attr.get("id"),
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;

                t.eq("prepended first tag is canvas", r.firstTag, "canvas");
                t.eq("prepended first id", r.firstId, "canvas-first");
            },
        },

        {
            suite: SUITE,
            name: "create.canvas participates in indexed insertion",
            fixture: "canvas/create",
            sub: "canvas-at-index",

            html: `
        <main id="root">
          <div id="a"></div>
          <div id="b"></div>
        </main>
      `,

            act(tree) {
                const canvas = tree.create.at(1).canvas();
                canvas.attr.set("id", "middle");

                const root = tree.find.must.byId("root");
                const kids = root.content.all();

                (tree as any).__result = {
                    tags: kids.map(k => k.node.$_tag),
                    ids: kids.map(k => k.attr.get("id")),
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;

                t.eq("child count", r.tags.length, 3);
                t.eq("middle tag", r.tags[1], "canvas");
                t.eq("middle id", r.ids[1], "middle");
            },
        },

        {
            suite: SUITE,
            name: "canvas width and height setters are chainable",
            fixture: "canvas/attrs",
            sub: "width-height-chain",

            html: `
        <main id="root">
          <canvas id="target"></canvas>
        </main>
      `,

            act(tree) {
                const target = tree.find.must.byId("target");

                target.canvas.width
                    .set(640)
                    .canvas.height
                    .set(360)
                    .attr.set("data-after", "ok");

                (tree as any).__result = {
                    width: target.canvas.width.get(),
                    height: target.canvas.height.get(),
                    after: target.attr.get("data-after"),
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;

                t.eq("width set through chain", r.width, 640);
                t.eq("height set through chain", r.height, 360);
                t.eq("continued chain after canvas helper", r.after, "ok");
            },
        },

        {
            suite: SUITE,
            name: "canvas width get parses existing numeric string attr",
            fixture: "canvas/attrs",
            sub: "width-existing-string",

            html: `
        <main id="root">
          <canvas id="target" width="512"></canvas>
        </main>
      `,

            act(tree) {
                const target = tree.find.must.byId("target");

                (tree as any).__result = {
                    width: target.canvas.width.get(),
                    raw: target.attr.get("width"),
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;

                t.eq("width parsed as number", r.width, 512);
                t.eq("raw width attr remains string", r.raw, "512");
            },
        },

        {
            suite: SUITE,
            name: "canvas height get returns undefined for nonnumeric attr",
            fixture: "canvas/attrs",
            sub: "height-nonnumeric",

            html: `
        <main id="root">
          <canvas id="target" height="big"></canvas>
        </main>
      `,

            act(tree) {
                const target = tree.find.must.byId("target");

                (tree as any).__result = {
                    height: target.canvas.height.get(),
                    raw: target.attr.get("height"),
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;

                t.eq("nonnumeric height helper value", r.height, undefined);
                t.eq("raw height attr preserved", r.raw, "big");
            },
        },

        {
            suite: SUITE,
            name: "canvas el returns undefined before DOM mount",
            fixture: "canvas/dom",
            sub: "el-before-dom",

            html: `
        <main id="root">
          <canvas id="target"></canvas>
        </main>
      `,

            act(tree) {
                const target = tree.find.must.byId("target");

                (tree as any).__result = {
                    el: target.canvas.el(),
                    ctx: target.canvas.ctx2d(),
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;

                t.eq("canvas.el unavailable without dom", r.el, undefined);
                t.eq("canvas.ctx2d unavailable without dom", r.ctx, undefined);
            },
        },

        {
            suite: SUITE,
            name: "canvas must.ctx2d returns context when mounted",
            dom: true,
            fixture: "canvas/must",
            sub: "must-ctx2d-mounted",

            html: `
        <main id="root">
          <canvas id="target" width="32" height="32"></canvas>
        </main>
      `,

            async act(tree) {
                const target = tree.find.must.byId("target");

                await flush_dom();

                const ctx = target.canvas.must.ctx2d(undefined, "mounted ctx");

                (tree as any).__result = {
                    hasCtx: ctx instanceof CanvasRenderingContext2D,
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;

                t.eq("must.ctx2d returns context", r.hasCtx, true);
            },
        },

        {
            suite: SUITE,
            name: "canvas must.ctx2d throws on non-canvas node",
            dom: true,
            fixture: "canvas/must",
            sub: "must-ctx2d-throws",

            html: `
        <main id="root">
          <div id="target"></div>
        </main>
      `,

            async act(tree) {
                const target = tree.find.must.byId("target");

                await flush_dom();

                let threw = false;
                let message = "";

                try {
                    target.canvas.must.ctx2d(undefined, "not canvas ctx");
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

                t.eq("must.ctx2d throws", r.threw, true);
                t.ok("must.ctx2d includes label", String(r.message).includes("not canvas ctx"));
            },
        },

        {
            suite: SUITE,
            name: "canvas ctx2d accepts context settings",
            dom: true,
            fixture: "canvas/context",
            sub: "ctx2d-settings",

            html: `
        <main id="root">
          <canvas id="target" width="32" height="32"></canvas>
        </main>
      `,

            async act(tree) {
                const target = tree.find.must.byId("target");

                await flush_dom();

                const ctx = target.canvas.ctx2d({
                    alpha: false,
                    desynchronized: false,
                });

                (tree as any).__result = {
                    hasCtx: ctx instanceof CanvasRenderingContext2D,
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;

                t.eq("ctx2d with settings returns context", r.hasCtx, true);
            },
        },
        {
            suite: SUITE,
            name: "created canvas supports ordinary LiveTree APIs",
            fixture: "canvas/create",
            sub: "canvas-is-still-livetree",
            html: `
    <main id="root"></main>
  `,
            act(tree) {
                const canvas = tree.create.canvas();
                canvas
                    .attr.set("id", "c")
                    .classlist.add("drawing")
                    .data.set("role", "surface")
                    .text.set("fallback");
                (tree as any).__result = {
                    id: canvas.attr.get("id"),
                    cls: canvas.classlist.get(),
                    role: canvas.data.get("role"),
                    text: canvas.text.get(),
                    inScope: canvas.canvas.inScope(),
                };
            },
            assert(tree, t) {
                const r = (tree as any).__result;
                t.eq("id works", r.id, "c");
                t.eq("classlist works", r.cls, "drawing");
                t.eq("data works", r.role, "surface");
                t.eq("text fallback works", r.text, "fallback");
                t.eq("canvas scope still true", r.inScope, true);
            },
        },
        {
            suite: SUITE,
            name: "create.canvas source preserves canvas root content",
            fixture: "canvas/create",
            sub: "canvas-source-valid",

            html: `
    <main id="root"></main>
  `,

            act(tree) {
                const canvas = tree.create.canvas(`<canvas id="from-source">fallback</canvas>`);

                (tree as any).__result = {
                    tag: canvas.node.$_tag,
                    id: canvas.attr.get("id"),
                    text: canvas.text.get(),
                    inScope: canvas.canvas.inScope(),
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;

                t.eq("source root tag is canvas", r.tag, "canvas");
                t.eq("source id preserved", r.id, "from-source");
                t.eq("fallback text preserved", r.text, "fallback");
                t.eq("source canvas scope true", r.inScope, true);
            },
        },

    ];

    return make_livetree_suite(SUITE, cases);
}