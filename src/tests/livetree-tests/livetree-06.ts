
import type { LiveTreeCaseSpec, TestSuite } from "../../app/phases/phase-3-demo/demo-test/tests.types";
import { make_livetree_suite } from "./livetree-testkit";
import { livetree_gnarly_svg } from "./livetree-11-svg-3";
import { tick } from "./livetree-03";
import { flush_dom, next_frame } from "../inspector/inspector.helpers";
import { hson } from "hson-live";

export function livetree_css_pseudo(): TestSuite {
  const SUITE = "livetree/css-pseudo";
  const cases: readonly LiveTreeCaseSpec[] =
    [
      {
        suite: SUITE,
        name: "css pseudos: before content auto-quotes plain text",
        dom: true,
        fixture: "css/pseudos",
        sub: "before-auto-quotes",

        html: `
    <main id="root">
      <div id="target">hello</div>
    </main>
  `,

        async act(tree) {
          const target = tree.find.must.byId("target");

          target.css.setMany({
            __before: {
              content: "X",
              color: "rgb(255, 0, 255)",
            },
          });

          await flush_dom();

          const el = target.dom.el() as HTMLElement;
          const before = getComputedStyle(el, "::before");

          (tree as any).__result = {
            content: before.content,
          };
        },

        assert(tree, t) {
          const r = (tree as any).__result;
          t.eq("before content rendered", r.content, `"X"`);
        },
      },
      {
        suite: SUITE,
        name: "css pseudos: before injects empty content when omitted",
        dom: true,
        fixture: "css/pseudos",
        sub: "before-empty-fallback",

        html: `
    <main id="root">
      <div id="target">hello</div>
    </main>
  `,

        async act(tree) {
          const target = tree.find.must.byId("target");

          target.css.setMany({
            __before: {
              color: "rgb(255, 0, 255)",
            },
          });

          await flush_dom();

          const el = target.dom.el() as HTMLElement;
          const before = getComputedStyle(el, "::before");

          (tree as any).__result = {
            content: before.content,
          };
        },

        assert(tree, t) {
          const r = (tree as any).__result;
          t.eq("empty content injected", r.content, `""`);
        },
      },
      {
        suite: SUITE,
        name: "css pseudos: raw attr() content is preserved",
        dom: true,
        fixture: "css/pseudos",
        sub: "before-attr-content",

        html: `
    <main id="root">
      <div id="target" data-label="HELLO">world</div>
    </main>
  `,

        async act(tree) {
          const target = tree.find.must.byId("target");

          target.css.setMany({
            __before: {
              content: "attr(data-label)",
            },
          });

          await flush_dom();

          const el = target.dom.el() as HTMLElement;
          const before = getComputedStyle(el, "::before");

          (tree as any).__result = {
            content: before.content,
          };
        },

        assert(tree, t) {
          const r = (tree as any).__result;
          t.eq("attr content rendered", r.content, `"HELLO"`);
        },
      },
      {
        suite: SUITE,
        name: "css pseudos: auto-quoted content matches manually quoted content",
        dom: true,
        fixture: "css/pseudos",
        sub: "before-manual-vs-auto",

        html: `
      <main id="root">
        <div id="manual">hello</div>
        <div id="auto">hello</div>
      </main>
    `,

        async act(tree) {
          const manual = tree.find.must.byId("manual");
          const auto = tree.find.must.byId("auto");

          manual.css.setMany({
            __before: {
              content: `"M"`, // removed escapes
              color: "rgb(255, 0, 255)",
            },
          });

          auto.css.setMany({
            __before: {
              content: "A",
              color: "rgb(0, 255, 255)",
            },
          });

          await flush_dom();

          const manualEl = manual.dom.el() as HTMLElement;
          const autoEl = auto.dom.el() as HTMLElement;

          const autoBefore = getComputedStyle(autoEl, "::before");
          const manualBefore = getComputedStyle(manualEl, "::before");
          const manualBase = manual.dom.computed() ?? { content: "" };
          const autoBase = auto.dom.computed() ?? { content: "" };

          console.log("manual: before content", manualBefore.content);
          console.log("manual: base content", manualBase.content);
          console.log("manual: before content", autoBefore.content);
          console.log("manual: base content", autoBase.content);
          (tree as any).__result = {
            manualContent: manualBefore.content,
            autoContent: autoBefore.content,
          };
        },

        assert(tree, t) {
          const r = (tree as any).__result;
          t.eq("manual quoted content rendered", r.manualContent, `"M"`); // removed escapes
          t.eq("auto quoted content rendered", r.autoContent, `"A"`); // removed escapes
        },
      },
    ];

  return make_livetree_suite(SUITE, cases);
}

export function livetree_recent_api(): TestSuite {
  const SUITE = "livetree/recent-api";

  const cases: readonly LiveTreeCaseSpec[] = [
    {
      suite: SUITE,
      name: "find.byQuid: resolves descendant by internal quid",
      dom: true,
      fixture: "find/quid",
      sub: "descendant-soft",

      html: `
        <main id="root">
          <section id="wrap">
            <div id="target">hello</div>
          </section>
        </main>
      `,

      async act(tree) {
        const target = tree.find.must.byId("target");
        const quid = target.dom.must.el().getAttribute("data-_quid") ?? "";

        const hit = tree.find.byQuid(quid);

        (tree as any).__result = {
          quid,
          hitId: hit?.dom.el()?.getAttribute("id"),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq("quid exists", r.quid.length > 0, true);
        t.eq("find.byQuid resolves descendant", r.hitId, "target");
      },
    },

    {
      suite: SUITE,
      name: "find.must.byQuid: resolves descendant by internal quid",
      dom: true,
      fixture: "find/quid",
      sub: "descendant-must",

      html: `
        <main id="root">
          <section id="wrap">
            <div id="target">hello</div>
          </section>
        </main>
      `,

      async act(tree) {
        const target = tree.find.must.byId("target");
        const quid = target.dom.must.el().getAttribute("data-_quid") ?? "";

        const hit = tree.find.must.byQuid(quid);

        (tree as any).__result = {
          hitId: hit.dom.el()?.getAttribute("id"),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq("find.must.byQuid resolves descendant", r.hitId, "target");
      },
    },

    {
      suite: SUITE,
      name: "find.byQuid: does not resolve quid outside current tree",
      dom: true,
      fixture: "find/quid",
      sub: "out-of-tree-soft",

      html: `
      <main>  
      <div id="rootA">
      <div id="targetA">A</div>
      </div>
      <div id="rootB">
      <div id="targetB">B</div>
      </div>
      </main>  
      `,

      async act(tree) {
        const rootA = tree.find.must.byId("rootA");
        const targetB = tree.find.must.byId("targetB");
        const quidB = targetB.dom.must.el().getAttribute("data-_quid") ?? "";

        const hit = rootA.find.byQuid(quidB);

        (tree as any).__result = {
          hitExists: !!hit,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq("foreign quid does not resolve", r.hitExists, false);
      },
    },

    {
      suite: SUITE,
      name: "dom.doc: detached tree exposes no soft document handle",
      dom: true,
      fixture: "dom/doc",
      sub: "detached-soft-none",

      html: `
        <main id="root">
          <div id="target">hello</div>
        </main>
      `,

      async act(tree) {
        const detached = hson.liveTree.create.div();
        (tree as any).__result = {
          hasDoc: detached.dom.doc !== undefined,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq("detached dom.doc is undefined", r.hasDoc, false);
      },
    },

    {
      suite: SUITE,
      name: "dom.must.doc: detached tree throws",
      dom: true,
      fixture: "dom/doc",
      sub: "detached-must-throws",

      html: `
        <main id="root">
          <div id="target">hello</div>
        </main>
      `,

      async act(tree) {
        const detached = hson.liveTree.create.div();

        let threw = false;
        try {
          void detached.dom.must.doc;
        } catch {
          threw = true;
        }

        (tree as any).__result = { threw };
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq("detached must.doc throws", r.threw, true);
      },
    },

    {
      suite: SUITE,
      name: "dom.must.treeFromEl: resolves mounted descendant element",
      dom: true,
      fixture: "dom/treeFromEl",
      sub: "mounted-descendant",

      html: `
        <main id="root">
          <section id="wrap">
            <div id="target">hello</div>
          </section>
        </main>
      `,

      async act(tree) {
        const target = tree.find.must.byId("target");
        const el = target.dom.must.el();
        const resolved = tree.dom.must.treeFromEl(el);

        (tree as any).__result = {
          resolvedId: resolved.dom.el()?.getAttribute("id"),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq("treeFromEl resolves target", r.resolvedId, "target");
      },
    },

    {
      suite: SUITE,
      name: "dom.treeFromEl soft path returns undefined for foreign element",
      dom: true,
      fixture: "dom/treeFromEl",
      sub: "foreign-soft-none",

      html: `
        <main id="root">
          <div id="target">hello</div>
        </main>
      `,

      async act(tree) {
        const foreign = document.createElement("div");
        foreign.id = "foreign";

        const resolved = tree.dom.treeFromEl?.(foreign);

        (tree as any).__result = {
          hitExists: !!resolved,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq("soft treeFromEl returns undefined for foreign element", r.hitExists, false);
      },
    },

    {
      suite: SUITE,
      name: "dom.must.treeFromEl throws for foreign element",
      dom: true,
      fixture: "dom/treeFromEl",
      sub: "foreign-must-throws",

      html: `
        <main id="root">
          <div id="target">hello</div>
        </main>
      `,

      async act(tree) {
        const foreign = document.createElement("div");
        foreign.id = "foreign";

        let threw = false;
        try {
          tree.dom.must.treeFromEl(foreign);
        } catch {
          threw = true;
        }

        (tree as any).__result = { threw };
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq("must treeFromEl throws for foreign element", r.threw, true);
      },
    },

    {
      suite: SUITE,
      name: "listen.document.once: fires once on document target",
      dom: true,
      fixture: "listen/document",
      sub: "document-once",

      html: `
        <main id="root">
          <div id="target">hello</div>
        </main>
      `,

      async act(tree) {
        const target = tree.find.must.byId("target");

        let count = 0;
        let keySeen = "";

        target.listen.document.once().onKeyDown((ev) => {
          count++;
          keySeen = ev.key;
        });

        document.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "b" }));

        await tick();

        (tree as any).__result = {
          count,
          keySeen,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq("document once fires once", r.count, 1);
        t.eq("document once keeps first key", r.keySeen, "a");
      },
    },

    {
      suite: SUITE,
      name: "listen.window.off: detaches window listener",
      dom: true,
      fixture: "listen/window",
      sub: "window-off-detaches",

      html: `
        <main id="root">
          <div id="target">hello</div>
        </main>
      `,
      async act(tree) {
        let count = 0;
        const target = tree.find.must.byId("target");
        const TEST_KEY = "__hson_window_off_sentinel__";
        const sub = target.listen.window.onKeyDown((ev) => {
          if (ev.key !== TEST_KEY) {
            return;
          }
          count++;
        });
        window.dispatchEvent(new KeyboardEvent("keydown", { key: TEST_KEY }));
        await tick();
        sub.off();
        window.dispatchEvent(new KeyboardEvent("keydown", { key: TEST_KEY }));
        await tick();
        (tree as any).__result = { count };
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq("window listener fires once then detaches", r.count, 1);
      },
    },
  ];

  return make_livetree_suite(SUITE, cases);
}

export function livetree_create_size(): TestSuite {
  const SUITE = "livetree/create-size";

  const cases: readonly LiveTreeCaseSpec[] = [
    {
      suite: SUITE,
      name: "dom.clientSize: mounted html element returns size",
      dom: true,
      fixture: "dom/clientSize",
      sub: "mounted-soft",

      html: `
        <main id="root">
          <div id="target" style="width: 120px; height: 60px;">hello</div>
        </main>
      `,

      async act(tree) {
        await flush_dom();

        const target = tree.find.must.byId("target");
        const size = target.dom.clientSize();

        (tree as any).__result = {
          width: size?.width,
          height: size?.height,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq("clientSize width", r.width, 120);
        t.eq("clientSize height", r.height, 60);
      },
    },

    {
      suite: SUITE,
      name: "dom.clientSize: detached tree returns undefined",
      dom: true,
      fixture: "dom/clientSize",
      sub: "detached-soft-none",

      html: `
        <main id="root">
          <div id="target">hello</div>
        </main>
      `,

      async act(tree) {
        const detached = hson.liveTree.create.div();
        const size = detached.dom.clientSize();

        (tree as any).__result = {
          hasSize: !!size,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq("detached clientSize is undefined", r.hasSize, false);
      },
    },

    {
      suite: SUITE,
      name: "dom.must.clientSize: detached tree throws",
      dom: true,
      fixture: "dom/clientSize",
      sub: "detached-must-throws",

      html: `
        <main id="root">
          <div id="target">hello</div>
        </main>
      `,

      async act(tree) {
        const detached = hson.liveTree.create.div();

        let threw = false;
        try {
          void detached.dom.must.clientSize();
        } catch {
          threw = true;
        }

        (tree as any).__result = { threw };
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq("detached must.clientSize throws", r.threw, true);
      },
    },

    {
      suite: SUITE,
      name: "detached create: div returns html namespace",
      dom: true,
      fixture: "create/detached",
      sub: "html-div-namespace",

      html: `
        <main id="root">
          <div id="target">hello</div>
        </main>
      `,

      async act(tree) {
        const root = tree.find.must.byId("root");

        const div = hson.liveTree.create.div();
        root.append(div);

        await flush_dom();

        (tree as any).__result = {
          tag: div.dom.el()?.tagName.toLowerCase(),
          ns: div.dom.el()?.namespaceURI,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq("detached div tag", r.tag, "div");
        t.eq("detached div namespace", r.ns, "http://www.w3.org/1999/xhtml");
      },
    },

    {
      suite: SUITE,
      name: "detached create: svg returns svg namespace",
      dom: true,
      fixture: "create/detached",
      sub: "svg-root-namespace",

      html: `
        <main id="root">
          <div id="target">hello</div>
        </main>
      `,

      async act(tree) {
        const root = tree.find.must.byId("root");

        const svg = hson.liveTree.create.svg();
        root.append(svg);

        await flush_dom();

        (tree as any).__result = {
          tag: svg.dom.el()?.tagName.toLowerCase(),
          ns: svg.dom.el()?.namespaceURI,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq("detached svg tag", r.tag, "svg");
        t.eq("detached svg namespace", r.ns, "http://www.w3.org/2000/svg");
      },
    },
    {
      suite: SUITE,
      name: "detached create: path returns svg namespace",
      dom: true,
      fixture: "create/detached",
      sub: "svg-path-namespace",

      html: `
    <main id="root"></main>
  `,

      async act(tree) {
        const root = tree.find.must.byId("root");

        const svg = hson.liveTree.create.svg();
        const path = hson.liveTree.create.path();

        root.append(svg);
        svg.append(path);

        await flush_dom();

        (tree as any).__result = {
          tag: path.dom.el()?.tagName.toLowerCase(),
          ns: path.dom.el()?.namespaceURI,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq("detached path tag", r.tag, "path");
        t.eq("detached path namespace", r.ns, "http://www.w3.org/2000/svg");
      },
    },
    {
      suite: SUITE,
      name: "detached create: path accepts d attribute",
      dom: true,
      fixture: "create/detached",
      sub: "svg-path-d-attr",

      html: `
    <main id="root"></main>
  `,

      async act(tree) {
        const root = tree.find.must.byId("root");

        const svg = hson.liveTree.create.svg();
        const path = hson.liveTree.create.path();

        path.attr.set("d", "M 0 0 L 10 10 Z");

        root.append(svg);
        svg.append(path);

        await flush_dom();

        (tree as any).__result = {
          d: path.dom.el()?.getAttribute("d"),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq("detached path d preserved", r.d, "M 0 0 L 10 10 Z");
      },
    },

    {
      suite: SUITE,
      name: "detached create: at() still works for html tags",
      dom: true,
      fixture: "create/detached",
      sub: "html-at-index",

      html: `
        <main id="root">
          <div id="target">hello</div>
        </main>
      `,

      async act(tree) {
        const ul = hson.liveTree.create.ul();
        const a = ul.create.li();
        a.text.set("a");
        ul.create.li().text.set("c");
        ul.create.at(1).li().text.set("b");

        const texts = ul.content.all().map(kid => kid.text.get());

        (tree as any).__result = {
          texts,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq("detached at inserts at index", JSON.stringify(r.texts), JSON.stringify(["a", "b", "c"]));
      },
    },

    {
      suite: SUITE,
      name: "svg tree create: path is available in svg scope",
      dom: true,
      fixture: "create/svg",
      sub: "svg-scope-path",

      html: `
        <main id="root"></main>
      `,

      async act(tree) {
        const root = tree.find.must.byId("root");
        const svg = root.create.svg();
        const path = svg.create.path();

        (tree as any).__result = {
          svgTag: svg.dom.el()?.tagName.toLowerCase(),
          pathTag: path.dom.el()?.tagName.toLowerCase(),
          pathNs: path.dom.el()?.namespaceURI,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq("svg scope svg tag", r.svgTag, "svg");
        t.eq("svg scope path tag", r.pathTag, "path");
        t.eq("svg scope path namespace", r.pathNs, "http://www.w3.org/2000/svg");
      },
    },

    {
      suite: SUITE,
      name: "svg tree create: rect is available in svg scope",
      dom: true,
      fixture: "create/svg",
      sub: "svg-scope-rect",

      html: `
        <main id="root"></main>
      `,

      async act(tree) {
        const root = tree.find.must.byId("root");
        const svg = root.create.svg();
        const rect = svg.create.rect();

        (tree as any).__result = {
          rectTag: rect.dom.el()?.tagName.toLowerCase(),
          rectNs: rect.dom.el()?.namespaceURI,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq("svg scope rect tag", r.rectTag, "rect");
        t.eq("svg scope rect namespace", r.rectNs, "http://www.w3.org/2000/svg");
      },
    },
  ];

  return make_livetree_suite(SUITE, cases);
}