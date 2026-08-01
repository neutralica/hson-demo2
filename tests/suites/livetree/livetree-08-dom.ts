import { _listeners_debug_hard_reset } from "../../../../hson-live/dist/api/livetree/managers/listener-builder";
import { flush_dom } from "../inspector/inspector.helpers";
import type { TestSuite } from "../../harness/core/test-contracts";
import type { LiveTreeCaseSpec } from "../livemap/livemap-tests.types";
import { tick } from "./livetree-03";
import { make_livetree_suite } from "./make-livetree-suite";

export function livetree_new_dom_doc(): TestSuite {
  const SUITE = "livetree/document";

  const cases: readonly LiveTreeCaseSpec[] = [
    {
      suite: SUITE,
      name: "dom.doc: soft document handle is available on mounted tree",
      dom: true,
      fixture: "dom/doc",
      sub: "doc-soft-available",

      html: `
        <main id="root">
          <div id="target">hello</div>
        </main>
      `,

      async act(tree) {
        const target = tree.find.must.byId("target");
        const docApi = target.dom.doc;

        (tree as any).__result = {
          hasDoc: !!docApi,
          hasElementAtPoint: typeof docApi?.elementAtPoint === "function",
          hasElementsFromPoint: typeof docApi?.elementsFromPoint === "function",
          hasTreeAtPoint: typeof docApi?.treeAtPoint === "function",
          hasTreesFromPoint: typeof docApi?.treesFromPoint === "function",
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq("doc api exists", r.hasDoc, true);
        t.eq("elementAtPoint exists", r.hasElementAtPoint, true);
        t.eq("elementsFromPoint exists", r.hasElementsFromPoint, true);
        t.eq("treeAtPoint exists", r.hasTreeAtPoint, true);
        t.eq("treesFromPoint exists", r.hasTreesFromPoint, true);
      },
    },
    {
      suite: SUITE,
      name: "dom.doc: point queries resolve mounted target tree",
      dom: true,
      fixture: "dom/doc",
      sub: "doc-point-query-resolves-tree",
      hostedGeometry: [{ id: "target", rect: { x: 120, y: 120, width: 240, height: 140 } }],

      html: `
    <main id="root">
      <div id="target" style="
        position: fixed;
        left: 120px;
        top: 120px;
        width: 240px;
        height: 140px;
        z-index: 9999;
      ">hello</div>
    </main>
  `,

      async act(tree) {
        await flush_dom();

        const target = tree.find.must.byId("target");
        const docApi = target.dom.doc;

        const x = 120 + 120; // center x
        const y = 120 + 70;  // center y

        const hitEl = docApi?.elementAtPoint(x, y);
        const hitTree = docApi?.treeAtPoint(x, y);
        let hitTreeDirectId: string | undefined;

        try {
          const resolved = hitEl ? target.dom.must.treeFromEl(hitEl) : undefined;
          hitTreeDirectId = resolved?.dom.el()?.getAttribute("id") ?? undefined;
        } catch {
          hitTreeDirectId = "__throw__";
        }
        (tree as any).__result = {
          hitElId: hitEl instanceof Element ? hitEl.getAttribute("id") : undefined,
          hitTreeId: hitTree?.dom.el()?.getAttribute("id"),
          hitTreeDirectId,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq("elementAtPoint hits target", r.hitElId, "target");
        t.eq("treeAtPoint resolves target tree", r.hitTreeId, "target");
      },
    },
    {
      suite: SUITE,
      name: "dom.must.doc: mounted tree exposes hard document handle",
      dom: true,
      fixture: "dom/doc",
      sub: "doc-must-available",

      html: `
        <main id="root">
          <div id="target">hello</div>
        </main>
      `,

      async act(tree) {
        const target = tree.find.must.byId("target");
        const docApi = target.dom.must.doc;

        (tree as any).__result = {
          hasDoc: !!docApi,
          hasElementAtPoint: typeof docApi.elementAtPoint === "function",
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq("must.doc exists", r.hasDoc, true);
        t.eq("must.doc has elementAtPoint", r.hasElementAtPoint, true);
      },
    },

    {
      suite: SUITE,
      name: "listen.document: keydown attaches to document target",
      dom: true,
      fixture: "listen/document",
      sub: "document-keydown",

      html: `
        <main id="root">
          <div id="target">hello</div>
        </main>
      `,
      async act(tree) {
        _listeners_debug_hard_reset();

        const target = tree.find.must.byId("target");

        const TEST_KEY = "ƒ";

        let count = 0;
        let keySeen = "";

        const sub = target.listen.document.onKeyDown((ev) => {
          // CHANGED: ignore real keyboard events while test is running
          if (ev.key !== TEST_KEY) return;

          count++;
          keySeen = ev.key;
        });

        document.dispatchEvent(new KeyboardEvent("keydown", { key: TEST_KEY }));
        await flush_dom();

        sub.off();
        _listeners_debug_hard_reset();

        (tree as any).__result = { count, keySeen };
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq("document keydown fired once", r.count, 1);
        t.eq("document key value captured", r.keySeen, "ƒ");
      },
    },
    {
      suite: SUITE,
      name: "listen.window: keydown attaches to window target",
      dom: true,
      fixture: "listen/window",
      sub: "window-keydown",

      html: `
    <main id="root">
      <div id="target">hello</div>
    </main>
  `,

      async act(tree) {
        _listeners_debug_hard_reset();

        const target = tree.find.must.byId("target");

        const TEST_KEY = "ƒ";

        let count = 0;
        let keySeen = "";

        const sub = target.listen.window.onKeyDown((ev) => {
          // CHANGED: ignore real keyboard events while test is running
          if (ev.key !== TEST_KEY) return;

          count++;
          keySeen = ev.key;
        });

        window.dispatchEvent(new KeyboardEvent("keydown", { key: TEST_KEY }));
        await flush_dom();

        sub.off();
        _listeners_debug_hard_reset();

        (tree as any).__result = { count, keySeen };
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq("window keydown fired once", r.count, 1);
        t.eq("window key value captured", r.keySeen, "ƒ");
      },
    },
    {
      suite: SUITE,
      name: "listen.document: off detaches listener",
      dom: true,
      fixture: "listen/document",
      sub: "document-off-detaches",

      html: `
        <main id="root">
          <div id="target">hello</div>
        </main>
      `,

      async act(tree) {
        const target = tree.find.must.byId("target");

        let count = 0;

        const sub = target.listen.document.onKeyDown(() => {
          count++;
        });

        document.dispatchEvent(new KeyboardEvent("keydown", {
          key: "a",
          bubbles: true,
        }));

        sub.off();

        document.dispatchEvent(new KeyboardEvent("keydown", {
          key: "b",
          bubbles: true,
        }));

        (tree as any).__result = {
          count,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq("listener fires before off and not after", r.count, 1);
      },
    },
    {
      suite: SUITE,
      name: "find.byQuid: resolves mounted target by internal quid",
      dom: true,
      fixture: "find/quid",
      sub: "find-by-quid",

      html: `
    <main id="root">
      <div id="target">hello</div>
    </main>
  `,

      async act(tree) {
        const target = tree.find.must.byId("target");
        const el = target.dom.must.el();
        const quid = el.getAttribute("hson:quid");

        const hit = quid ? tree.find.byQuid?.(quid) : undefined;

        (tree as any).__result = {
          quid,
          hitId: hit?.dom.el()?.getAttribute("id"),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq("quid exists", typeof r.quid === "string", true);
        t.eq("find.byQuid resolves target", r.hitId, "target");
      },
    },
    {
      suite: SUITE,
      name: "find.must.byQuid: resolves mounted target by internal quid",
      dom: true,
      fixture: "find/quid",
      sub: "find-must-by-quid",

      html: `
    <main id="root">
      <div id="target">hello</div>
    </main>
  `,

      async act(tree) {
        const target = tree.find.must.byId("target");
        const quid = target.dom.must.el().getAttribute("hson:quid")!;

        const hit = tree.find.must.byQuid?.(quid);

        (tree as any).__result = {
          hitId: hit?.dom.el()?.getAttribute("id"),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq("find.must.byQuid resolves target", r.hitId, "target");
      },
    },
    {
      suite: SUITE,
      name: "dom.must.treeFromEl: resolves exact element back to tree handle",
      dom: true,
      fixture: "dom/treeFromEl",
      sub: "tree-from-el",

      html: `
    <main id="root">
      <div id="target">hello</div>
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
      name: "dom.doc: elementsFromPoint returns a stack",
      dom: true,
      fixture: "dom/doc",
      sub: "doc-elements-from-point",
      hostedGeometry: [{ id: "target", rect: { x: 120, y: 120, width: 240, height: 140 } }],

      html: `
    <main id="root">
      <div id="target" style="
        position: fixed;
        left: 120px;
        top: 120px;
        width: 240px;
        height: 140px;
        z-index: 9999;
      ">hello</div>
    </main>
  `,

      async act(tree) {
        await flush_dom();

        const target = tree.find.must.byId("target");
        const docApi = target.dom.doc;

        const xs = docApi?.elementsFromPoint(240, 190) ?? [];

        (tree as any).__result = {
          count: xs.length,
          firstId: xs[0]?.getAttribute("id"),
          containsTarget: xs.some(el => el.getAttribute("id") === "target"),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq("elementsFromPoint returns some elements", r.count > 0, true);
        t.eq("elementsFromPoint contains target", r.containsTarget, true);
      },
    },
    {
      suite: SUITE,
      name: "svg create: path is created in SVG namespace",
      dom: true,
      fixture: "svg/create",
      sub: "path-namespace",

      html: `<main id="root"></main>`,

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
        t.eq("svg tag", r.svgTag, "svg");
        t.eq("path tag", r.pathTag, "path");
        t.eq("path namespace", r.pathNs, "http://www.w3.org/2000/svg");
      },
    },
    {
      suite: SUITE,
      name: "svg create: path accepts d attribute",
      dom: true,
      fixture: "svg/create",
      sub: "path-d-attr",

      html: `<main id="root"></main>`,

      async act(tree) {
        const root = tree.find.must.byId("root");
        const svg = root.create.svg();
        const path = svg.create.path();

        path.attrs.set("d", "M 0 0 L 10 10 Z");

        (tree as any).__result = {
          d: path.dom.el()?.getAttribute("d"),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq("path d preserved", r.d, "M 0 0 L 10 10 Z");
      },
    },
  
  ];

  return make_livetree_suite(SUITE, cases);
}
