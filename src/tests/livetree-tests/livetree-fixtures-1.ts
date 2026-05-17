import { CssManager, hson, type LiveTree } from "hson-live";
import type { LiveTreeCaseSpec, LiveTreeFx, TestSuite, Asserter } from "../tests.types";
import { make_livetree_suite } from "./livetree-testkit";
import type { HsonNode, Primitive } from "hson-live/types";
import { is_Node } from "../../../../hson-live/dist/utils/node-utils/node-guards";
import { _CREATE_NODE } from "hson-live/diagnostics";
import { CREATE_NODE } from "../../../../hson-live/dist/consts/factories";
import { ELEM_TAG, STR_TAG } from "../../../../hson-live/dist/consts/constants";
import { get_node_text_content, set_node_text_content } from "../../../../hson-live/dist/api/livetree/managers/text-form-values";
import { suite_more_contract_refresh } from "./livetree-fixtures-2";
import { SYS_MONOfont } from "../../app/core/consts/ui-consts";
import { GlobalCss } from "../../../../hson-live/dist/api/livetree/managers/global-css";
import { flush_dom } from "../inspector/inspector.helpers";


function after_paint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

export function suite_find(): TestSuite {
  const SUITE = "livetree/find";

  const cases: readonly LiveTreeCaseSpec[] = [
    {
      suite: SUITE,
      name: "find.byId hit/miss + must throws",
      html: `<div id="root"><button id="btn">click</button></div>`,

      // inputLabel -> fixture/sub (these feed meta + metaPatch)
      fixture: "find/byId",
      sub: "hit-miss-must",

      // run -> act
      act(tree) {
        void tree; // no-op
      },

      // assert now receives (tree, t) and uses t.* instead of throwing
      assert(tree, t) {
        const hit = tree.find.byId("btn");
        t.ok(`find.byId("btn") returns a tree`, !!hit);

        const miss = tree.find.byId("nope");
        t.eq(`find.byId("nope") returns undefined`, miss, undefined);

        let threw = false;
        try {
          tree.find.must.byId("nope");
        } catch {
          threw = true;
        }
        t.ok(`find.must.byId("nope") throws on miss`, threw);
      },

      // preview should be a function, not a computed string
      preview(tree) {
        const btn = tree.find.byId("btn");
        const el = btn?.dom.el?.();
        return el && "outerHTML" in el ? (el as Element).outerHTML : "<no btn dom>";
      },
    },

    {
      suite: SUITE,

      name: `findAll(".item") count + must throws when empty`,
      html: `
      <section id="root">
      <button class="item" data-index="1">one</button>
      <button class="item" data-index="2">two</button>
      <button class="item" data-index="3">three</button>
      </section>
      `,

      fixture: "find/findAll",
      sub: "count-must",

      act(tree) {
        void tree; // no-op
      },

      assert(tree, t) {
        const items = tree.findAll(".item");
        t.eq(`findAll(".item").count() === 3`, items.count(), 3);

        let threw = false;
        try {
          tree.findAll.must(".nope");
        } catch {
          threw = true;
        }
        t.ok(`findAll.must(".nope") throws when empty`, threw);
      },

      preview(tree) {
        const items = tree.findAll(".item");
        const first = items.first();
        const el = first?.dom.el?.();
        return el && "outerHTML" in el ? (el as Element).outerHTML : "<no .item dom>";
      },
    },
  ];

  return make_livetree_suite(SUITE, cases);
}

export function suite_attrs_and_flags(): TestSuite {
  const SUITE = "livetree/attrs-and-flags";

  const cases: readonly LiveTreeCaseSpec[] = [
    {
      suite: SUITE,
      name: "setAttrs string / boolean / remove mirrors LiveTree attrs",
      html: `<div id="root"><button id="btn"></button></div>`,
      fixture: "attrs/set-remove",
      sub: "string-boolean-null",

      act(tree: LiveTree) {
        const btn = tree.find.must.byId("btn");

        btn.attr.set("data-state", "open");
        btn.attr.set("disabled", true);

        // remove via null
        btn.attr.set("data-temp", "x");
        btn.attr.set("data-temp", null);

        // remove via false
        btn.attr.set("aria-busy", true);
        btn.attr.set("aria-busy", false);
      },

      assert(tree: LiveTree, t) {
        const btn = tree.find.must.byId("btn");

        // String attr
        t.eq(`getAttr("data-state")`, btn.attr.get("data-state"), "open");

        // Boolean-present attrs: don't assume representation (true vs "" vs "disabled")
        t.ok(`getAttr("disabled") is present`, btn.attr.get("disabled") !== undefined);

        // Removals
        t.eq(`data-temp removed`, btn.attr.get("data-temp"), undefined);
        t.eq(`aria-busy removed`, btn.attr.get("aria-busy"), undefined);
      },
    },

    {
      suite: SUITE,
      name: "setFlags/removeFlags boolean-present attrs",
      html: `<div id="root"><input id="i"/></div>`,
      fixture: "flags/set-remove",
      sub: "present-absent",

      act(tree: LiveTree) {
        const i = tree.find.must.byId("i");
        i.flag.set("disabled");
        i.flag.set("readonly");
        i.flag.clear("readonly");
      },

      assert(tree: LiveTree, t) {
        const i = tree.find.must.byId("i");

        t.ok(`disabled present`, i.attr.get("disabled") !== undefined);
        t.eq(`readonly removed`, i.attr.get("readonly"), undefined);
      },
    },
  ];

  return make_livetree_suite(SUITE, cases);
}

export function suite_append_and_create(): TestSuite {
  const SUITE = "livetree/append-and-create";

  let removedCount = -1; // ok for now; runner is sequential per case.

  const cases: readonly LiveTreeCaseSpec[] = [
    {
      suite: SUITE,
      name: "create.at(index) inserts among element-children under _-elem (preserves order)",
      fixture: "append/create",
      sub: "order",
      html: `<section id="root"><p class="orig">one</p></section>`,

      act(tree: LiveTree) {
        const elem = tree.find.must.byId("root");

        // append at end: orig, mid
        const mid = elem.create.p();
        mid.classlist.add("mid");
        mid.text.overwrite("two");

        // insert at index 1: orig, insert, mid
        const insert = elem.create.at(1).p();
        insert.classlist.add("insert");
        insert.text.overwrite("between");
      },

      assert(tree: LiveTree, t: Asserter) {
        const kids = tree.content.all();
        t.eq("elem child count", kids.length, 3);

        const cls = kids.map((k) => String(k.attr.get("class") ?? ""));
        const txt = kids.map((k) => k.text.get());

        t.eq("class[0]", cls[0], "orig");
        t.eq("class[1]", cls[1], "insert");
        t.eq("class[2]", cls[2], "mid");

        t.eq("text[0]", txt[0], "one");
        t.eq("text[1]", txt[1], "between");
        t.eq("text[2]", txt[2], "two");
      },

      preview(tree: LiveTree) {
        const kids = tree.content.all();
        return kids
          .map((k, i) => {
            const cls = String(k.attr.get("class") ?? "");
            const txt = k.text.get();
            return `${i}: <${String(k.node?._tag ?? "node")}> class="${cls}" text="${txt}"`;
          })
          .join("\n") || "<no kids>";
      },
    },

    {
      suite: SUITE,
      name: "removeChildren returns direct element-child count removed; empty clears",
      fixture: "remove/empty",
      sub: "counts",
      html: `<div id="root"><div id="a"></div><div id="b"></div></div>`,

      act(tree: LiveTree) {
        const elem = tree.find.must.byId("root");

        // operate at the level where the children actually are.
        removedCount = elem.removeChildren();

        elem.create.div().id.set("c");
        elem.empty();
      },

      assert(tree: LiveTree, t: Asserter) {
        const elem = tree.find.must.byId("root");

        t.eq("removedCount", removedCount, 2);
        t.eq("elem child count after empty()", elem.content.all().length, 0);
      },
    },

    {
      suite: SUITE,
      name: "create.p appends distinct element-children under _-elem",
      fixture: "create.p",
      sub: "append",
      html: `<section id="root"><p class="orig">one</p></section>`,

      act(tree: LiveTree) {
        const elem = tree.find.must.byId("root");
        const a = elem.create.p();
        a.classlist.add("a");
        a.text.overwrite("A");

        const b = elem.create.p();
        b.classlist.add("b");
        b.text.overwrite("B");
      },

      assert(tree: LiveTree, t: Asserter) {
        const kids = tree.content.all();
        t.eq("count", kids.length, 3);

        const cls = kids.map((k) => String(k.attr.get("class") ?? ""));
        t.eq("cls", cls.join(","), "orig,a,b");
      },
    },
    {
      suite: SUITE,
      name: "removeChildren: removes only direct node-children; leaves primitives under _-elem; returns count",
      html: `<div id="root"></div>`,
      fixture: "remove/children",
      sub: "ignore-primitives-count",

      act(tree) {
        const root = tree.find.must.byId("root");

        root.append(hson.liveTree.fromTrustedHtml(`<div id="a"></div>`));
        root.append(hson.liveTree.fromTrustedHtml(`<div id="b"></div>`));

        // inject a primitive into the semantic content container (_-elem)
        // (works in no-dom mode; matches your “_-elem is invisible” rule)
        const raw = (root.node._content ?? []) as unknown[];
        const elem = raw.find((x): x is HsonNode =>
          is_Node(x) && x._tag === ELEM_TAG
        );

        if (elem) {
          const kids = (elem._content ?? []) as unknown[];
          kids.push("Z");
          elem._content = kids as unknown as (HsonNode | Primitive)[];
        } else {
          // if a root ever lacks _-elem, keep test honest rather than silently passing
          throw new Error(`test invariant: expected #root to have a single _-elem child`);
        }

        (tree as unknown as { __removed?: number }).__removed = root.removeChildren();
      },

      assert(tree, t) {
        const removed = (tree as unknown as { __removed?: number }).__removed ?? -1;
        t.eq("removedCount", removed, 2);

        const root = tree.find.must.byId("root");

        // node-children are gone
        t.eq("content.all().length (node children)", root.content.all().length, 0);

        // primitive survived under _-elem
        const raw = (root.node._content ?? []) as unknown[];
        const elem = raw.find((x): x is HsonNode => is_Node(x) && x._tag === ELEM_TAG);
        const elemKids = (elem?._content ?? []) as unknown[];
        t.ok(`primitive "Z" remains under _-elem`, elemKids.includes("Z"));
      },

      preview(tree) {
        const root = tree.find.byId("root");
        if (!root) return "<no root tree>";
        const raw = (root.node._content ?? []) as unknown[];
        const elem = raw.find((x): x is HsonNode => is_Node(x) && x._tag === ELEM_TAG);
        const kids = (elem?._content ?? []) as unknown[];
        return `<root _-elem kids=${kids.map(x => (is_Node(x) ? `<${x._tag}>` : JSON.stringify(x))).join(", ")}>`;
      },
    },
    {
      suite: SUITE,
      name: "create: html markup insertion rejects empty string",
      fixture: "create/markup-guards",
      sub: "html-empty-string",
      html: `<main id="root"></main>`,

      act: async (root) => {
        const host = root.find.must.byId("root");
        let msg = "";

        try {
          (host.create as any).div(``);
        } catch (err) {
          msg = err instanceof Error ? err.message : String(err);
        }

        (root as any).__result = { msg };
      },

      assert: async (root, t) => {
        const r = (root as any).__result;
        t.ok("empty string rejected", r.msg.includes(`expected non-empty markup string`));
      },
    },
    {
      suite: SUITE,
      name: "create: html markup insertion rejects whitespace string",
      fixture: "create/markup-guards",
      sub: "html-whitespace-string",
      html: `<main id="root"></main>`,

      act: async (root) => {
        const host = root.find.must.byId("root");
        let msg = "";

        try {
          (host.create as any).div(`   
                
                        `); /* ^^^ this space intentionally left blank */
        } catch (err) {
          msg = err instanceof Error ? err.message : String(err);
        }

        (root as any).__result = { msg };
      },

      assert: async (root, t) => {
        const r = (root as any).__result;
        t.ok("whitespace string rejected", r.msg.includes(`expected non-empty markup string`));
      },
    },
    {
      suite: SUITE,
      name: "create: html markup insertion rejects multiple roots",
      fixture: "create/markup-guards",
      sub: "html-multiple-roots",
      html: `<main id="root"></main>`,

      act: async (root) => {
        const host = root.find.must.byId("root");
        let msg = "";

        try {
          (host.create as any).div(`<div id="a"></div><div id="b"></div>`);
        } catch (err) {
          msg = err instanceof Error ? err.message : String(err);
        }

        (root as any).__result = { msg };
      },

      assert: async (root, t) => {
        const r = (root as any).__result;
        t.ok("multiple roots rejected", r.msg.includes(`expected exactly one <div> root`));
      },
    },
    {
      suite: SUITE,
      name: "create: html markup insertion rejects mismatched root tag",
      fixture: "create/markup-guards",
      sub: "html-mismatched-root",
      html: `<main id="root"></main>`,

      act: async (root) => {
        const host = root.find.must.byId("root");
        let msg = "";

        try {
          (host.create as any).div(`<section id="wrong"></section>`);
        } catch (err) {
          msg = err instanceof Error ? err.message : String(err);
        }

        (root as any).__result = { msg };
      },

      assert: async (root, t) => {
        const r = (root as any).__result;
        t.ok("mismatched root rejected", r.msg.includes(`expected exactly one <div> root`));
      },
    },
    {
      suite: SUITE,
      name: "create: html markup insertion rejects malformed markup",
      fixture: "create/markup-guards",
      sub: "html-malformed",
      html: `<main id="root"></main>`,

      act: async (root) => {
        const host = root.find.must.byId("root");
        let msg = "";

        try {
          (host.create as any).div(`<div><span></div>`);
        } catch (err) {
          msg = err instanceof Error ? err.message : String(err);
        }

        (root as any).__result = { msg };
      },

      assert: async (root, t) => {
        const r = (root as any).__result;
        t.ok("malformed markup rejected", r.msg.includes(`failed to parse markup`));
      },
    },

  ];


  return make_livetree_suite(SUITE, cases);
}

export function mixedRegression() {
  const SUITE = "livetree/mixed-regression";

  const cases: readonly LiveTreeCaseSpec[] = [
    // ------------------------------------------------------------
    // remove + reappend + refind keeps DOM/IR in sync
    // ------------------------------------------------------------
    {
      suite: SUITE,
      name: "removeSelf + reappend + refind keeps DOM/IR in sync",
      html: `<div id="root"></div>`,
      fixture: "remove/reappend",
      sub: "dom-ir-sync",

      act(tree) {
        const root = tree.find.must.byId("root");

        // 1) append a layer
        const layer1 = hson
          .liveTree
          .fromTrustedHtml(`<layer id="layer"></layer>`);

        root.append(layer1);

        // remove it (must exist as a node in IR regardless of DOM mode)
        const firstLayer = root.find.must.byId("layer");
        firstLayer.removeSelf();

        // 2) append a new one with same id
        const layer2 = hson
          .liveTree
          .fromTrustedHtml(`<layer id="layer"></layer>`);

        root.append(layer2);
      },

      assert(tree, t) {
        const root = tree.find.must.byId("root");
        const layer = root.find.byId("layer");
        t.ok("refind(#layer) returns a tree", !!layer);

        // IR sanity: exactly one node child with id=layer under root subtree
        const hits = root.findAll({ attrs: { id: "layer" } });
        t.eq("IR: exactly one #layer", hits.count(), 1);

        // DOM sanity (optional): only assert if mounted
        const rootEl = root.dom.el() as HTMLElement | null;
        if (!rootEl) {
          t.ok("DOM mode: root not mounted (skipping DOM assertions)", true);
          return;
        }

        const els = rootEl.querySelectorAll("#layer");
        t.eq("DOM: exactly one #layer element", els.length, 1);
      },

      preview(tree) {
        const root = tree.find.byId("root");
        const el = root?.dom.el?.() as Element | null;
        return el ? el.outerHTML : "<no root dom>";
      },
    },

    // ------------------------------------------------------------
    // setText + getText stay in sync
    // ------------------------------------------------------------
    {
      suite: SUITE,
      name: "setText + getText stay in sync",
      html: `<div id="root"><p id="msg"></p></div>`,
      fixture: "text/set-get",
      sub: "sync",

      act(tree) {
        const msg = tree.find.must.byId("msg");
        msg.text.set("hello");
        msg.text.set("goodbye");
      },

      assert(tree, t) {
        const msg = tree.find.must.byId("msg");

        // IR
        const txt: Primitive = msg.text.get();
        t.eq("IR text", txt, "goodbye");

        // DOM if mounted
        const el = msg.dom.el() as HTMLElement | null;
        if (!el) {
          t.ok("DOM mode: msg not mounted (skipping DOM text)", true);
          return;
        }

        t.eq("DOM textContent", el.textContent ?? "", "goodbye");
      },

      preview(tree) {
        const msg = tree.find.byId("msg");
        const el = msg?.dom.el?.() as Element | null;
        return el ? el.outerHTML : "<no msg dom>";
      },
    },

    // ------------------------------------------------------------
    // TreeSelector: style + dataset remain after refind
    // ------------------------------------------------------------
    {
      suite: SUITE,
      name: "TreeSelector: style + dataset remain after refind",
      html: `
      <ul id="root">
        <li class="item">one</li>
        <li class="item">two</li>
      </ul>
    `,
      fixture: "selector/style-data",
      sub: "persist-refind",

      act(tree) {
        const items = tree.findAll({ attrs: { class: "item" } });
        items.style.setMany({ opacity: "0.6" });
        items.data.set("row", "42");
      },

      assert(tree, t) {
        const items = tree.findAll({ attrs: { class: "item" } });
        t.eq("count", items.count(), 2);

        items.each((node, i) => {
          // IR attrs should include data-row
          const attrs = node.node._attrs ?? {};
          t.eq(`IR data-row [${i}]`, attrs["data-row"], "42");

          // DOM check if mounted
          const el = node.dom.el() as HTMLElement | null;
          if (!el) return;

          const styleText = el.getAttribute("style") ?? "";
          t.ok(`DOM style includes opacity [${i}]`, styleText.includes("opacity: 0.6"));
          t.eq(`DOM dataset row [${i}]`, el.dataset["row"] ?? "", "42");
        });
      },

      preview(tree) {
        const root = tree.find.byId("root");
        const el = root?.dom.el?.() as Element | null;
        return el ? el.outerHTML : "<no root dom>";
      },
    },

    // ------------------------------------------------------------
    // TreeSelector.listen: click handlers fire for all items
    // ------------------------------------------------------------
    {
      suite: SUITE,
      name: "TreeSelector listen: click handlers fire for all items",
      html: `
      <section id="root">
        <button class="item" data-index="1">one</button>
        <button class="item" data-index="2">two</button>
        <button class="item" data-index="3">three</button>
      </section>
    `,
      fixture: "selector/listen",
      sub: "click-broadcast",

      act(tree) {
        const selector = tree.findAll({ attrs: { class: "item" } });

        let clickCount = 0;
        selector.listen.onClick(() => { clickCount += 1; });

        // Only meaningful when DOM exists
        selector.each((btn) => {
          const el = btn.dom.el() as HTMLButtonElement | null;
          if (el) el.click();
        });

        (tree as unknown as { __clickCount?: number }).__clickCount = clickCount;
      },

      assert(tree, t) {
        const selector = tree.findAll({ attrs: { class: "item" } });
        t.eq("matched 3 items", selector.count(), 3);

        const anyDom = !!selector.first()?.dom.el?.();
        if (!anyDom) {
          t.ok("DOM mode: no button DOM (skipping click count assertion)", true);
          return;
        }

        const n = (tree as unknown as { __clickCount?: number }).__clickCount ?? 0;
        t.eq("clickCount", n, 3);
      },

      preview(tree) {
        const root = tree.find.byId("root");
        const el = root?.dom.el?.() as Element | null;
        return el ? el.outerHTML : "<no root dom>";
      },
    },

    // ------------------------------------------------------------
    // LiveTree.create.div() appends and returns mounted handle (when parent mounted)
    // ------------------------------------------------------------
    {
      suite: SUITE,
      name: "LiveTree.create.div: appends child and returns handle",
      html: `
      <section id="part">
        <p>one</p>
      </section>
    `,
      fixture: "create/div",
      sub: "append-handle",

      act(tree) {
        const part = tree.find.must.byId("part");
        const div = part.create.div();

        // stash quids or tags for debug
        (tree as unknown as { __createdTag?: string }).__createdTag = div.node._tag;

        div.attr.set("class", "created");
      },

      assert(tree, t) {
        const part = tree.find.must.byId("part");
        t.ok("created tag is div", (tree as unknown as { __createdTag?: string }).__createdTag === "div");

        // IR: should now have a div child somewhere under content
        const created = part.find.byAttrs("class", "created");
        t.ok("IR can refind .created", !!created);

        // DOM if mounted
        const partEl = part.dom.el() as HTMLElement | null;
        if (!partEl) {
          t.ok("DOM mode: section not mounted (skipping DOM child checks)", true);
          return;
        }

        const kids = Array.from(partEl.children) as HTMLElement[];
        const tags = kids.map(k => k.tagName.toLowerCase());
        const classes = kids.map(k => k.getAttribute("class"));

        t.eq("child count", kids.length, 2);
        t.eq("tags[0]", tags[0], "p");
        t.eq("tags[1]", tags[1], "div");
        t.eq("classes[1]", classes[1], "created");
      },

      preview(tree) {
        const part = tree.find.byId("part");
        const el = part?.dom.el?.() as Element | null;
        return el ? el.outerHTML : "<no part dom>";
      },
    },

    // ------------------------------------------------------------
    // css.setMany writes rule (DOM required)
    // ------------------------------------------------------------
    {
      suite: SUITE,
      name: "css.setMany: writes quid-scoped rule to #_hson stylesheet",
      html: `
    <main>
      <div id="box">x</div>
    </main>
  `,
      fixture: "css/setMany",
      sub: "writes-rule",

      // act is async and waits for flush
      async act(tree) {
        const box = tree.find.must.byId("box");
        box.css.setMany({ opacity: "0.5" });
        box.css.setMany({ transform: "translate(10px, 20px)" });

        // let batching flush
        await Promise.resolve();
        await new Promise<void>((r) => { setTimeout(() => r(), 0); });
      },

      assert(tree, t) {
        const host = document.querySelector("#css-manager") as HTMLElement | null;
        if (!host) {
          t.ok("DOM mode: no #css-manager host (skipping)", true);
          return;
        }
        CssManager.invoke().syncNow()
        const styleEl = host.querySelector("#_hson") as HTMLStyleElement | null;
        t.ok("style#_hson exists", !!styleEl);
        const cssText = styleEl?.textContent ?? "";
        t.ok("css includes opacity", cssText.includes("opacity: 0.5;"));
        t.ok("css includes transform", cssText.includes("transform: translate(10px, 20px);"));

        const box = tree.find.must.byId("box");
        const el = box.dom.el() as HTMLElement | null;
        if (!el) {
          t.ok("DOM mode: box not mounted (skipping quid selector assertion)", true);
          return;
        }

        const quid = el.getAttribute("data-_quid") ?? "";
        t.ok("quid exists", quid.length > 0);
        t.ok("css includes quid selector", cssText.includes(`[data-_quid="${quid}"]`));
      },

      preview(tree) {
        const host = document.querySelector("#css-manager") as HTMLElement | null;
        const styleEl = host?.querySelector("#_hson") as HTMLStyleElement | null;
        return styleEl?.textContent ? styleEl.textContent.slice(0, 220) : "<no css>";
      },
    },

    // ------------------------------------------------------------
    // CssManager batching: rule appears after a tick (async)
    // ------------------------------------------------------------
    {
      suite: SUITE,
      name: "CssManager batching: rule appears after a tick",
      html: `
      <main>
        <div id="box">x</div>
      </main>
    `,
      fixture: "css/batch",
      sub: "flushes-after-tick",

      async act(tree) {
        const box = tree.find.must.byId("box");
        box.css.setMany({ opacity: "0.5" });

        // Let schedulers flush (micro + macro)
        await Promise.resolve();
        await new Promise<void>((r) => { setTimeout(() => r(), 0); });
      },

      assert(tree, t) {
        const host = document.querySelector("#css-manager") as HTMLElement | null;
        if (!host) {
          t.ok("DOM mode: no #css-manager host (skipping)", true);
          return;
        }

        const styleEl = host.querySelector("#_hson") as HTMLStyleElement | null;
        t.ok("style#_hson exists", !!styleEl);

        const cssText = styleEl?.textContent ?? "";
        const box = tree.find.must.byId("box");
        const quid = box.dom.el()?.getAttribute("data-_quid") ?? "";

        if (!quid) {
          t.ok("DOM mode: no quid (skipping)", true);
          return;
        }

        t.ok("css includes quid selector", cssText.includes(`[data-_quid="${quid}"]`));
        t.ok("css includes opacity", cssText.includes("opacity: 0.5;"));
      },

      preview(tree) {
        const host = document.querySelector("#css-manager") as HTMLElement | null;
        const styleEl = host?.querySelector("#_hson") as HTMLStyleElement | null;
        return styleEl?.textContent ? styleEl.textContent.slice(0, 200) : "<no css>";
      },
    },
  ];

  return make_livetree_suite(SUITE, cases);
}

export function extraCases(): readonly TestSuite[] {
  const SUITE = 'livetree/extra cases';
  const cases: readonly LiveTreeCaseSpec[] = [
    // ------------------------------------------------------------
    // remove + reappend + refind (ID collision sanity)
    // ------------------------------------------------------------
    {
      suite: SUITE,
      name: "remove + reappend same-id node: refind returns new node only",
      html: `<div id="root"></div>`,
      fixture: "remove/reappend",
      sub: "same-id-refind",

      act(tree: LiveTree) {
        const root = tree.find.must.byId("root");

        root.append(
          hson.liveTree.fromTrustedHtml(`<layer id="layer"></layer>`)
        );

        const first = root.find.must.byId("layer");
        const firstNode = first.node;

        first.removeSelf();

        root.append(
          hson.liveTree.fromTrustedHtml(`<layer id="layer"></layer>`)
        );

        const second = root.find.must.byId("layer");

        (tree as any).__firstNode = firstNode;
        (tree as any).__secondNode = second.node;
      },

      assert(tree: LiveTree, t) {
        const firstNode = (tree as any).__firstNode;
        const secondNode = (tree as any).__secondNode;

        t.ok("new node exists", !!secondNode);
        t.ok("node identity changed", firstNode !== secondNode);

        const root = tree.find.must.byId("root");
        const hits = root.findAll({ attrs: { id: "layer" } });
        t.eq("exactly one #layer in IR", hits.count(), 1);
      },

      preview(tree) {
        const root = tree.find.byId("root");
        const el = root?.dom.el?.();
        return el ? el.outerHTML : "<no root dom>";
      },
    },

    // ------------------------------------------------------------
    // selector mutation persists across refind
    // ------------------------------------------------------------
    {
      suite: SUITE,
      name: "TreeSelector mutations persist across refind",
      html: `
      <ul id="root">
        <li class="item">one</li>
        <li class="item">two</li>
      </ul>
    `,
      fixture: "selector/persist",
      sub: "refind",

      act(tree) {
        const a = tree.findAll(".item");
        a.style.setMany({ opacity: "0.6" });
        a.data.set("row", "42");

        const b = tree.findAll(".item");
        (tree as any).__refind = b;
      },

      assert(tree, t) {
        const items = (tree as any).__refind;
        t.eq("selector count", items.count(), 2);

        items.each((node: LiveTree, i: number) => {
          const attrs = node.node._attrs ?? {};
          t.eq(`data-row persisted [${i}]`, attrs["data-row"], "42");

          const el = node.dom.el();
          if (el instanceof HTMLElement) {
            t.eq(`dataset persisted [${i}]`, el.dataset["row"], "42");
          }
        });
      },

      preview(tree) {
        const root = tree.find.byId("root");
        const el = root?.dom.el?.();
        return el ? el.outerHTML : "<no root dom>";
      },
    },

    // ------------------------------------------------------------
    // selector.listen off() actually detaches
    // ------------------------------------------------------------
    {
      suite: SUITE,
      name: "TreeSelector.listen off() detaches handlers",
      html: `
      <section id="root">
        <button class="item">a</button>
        <button class="item">b</button>
      </section>
    `,
      fixture: "selector/listen",
      sub: "off-detach",

      act(tree) {
        const items = tree.findAll(".item");

        let count = 0;
        const sub = items.listen.onClick(() => { count++; });

        items.each((btn: LiveTree) => {
          const el = btn.dom.el();
          if (el instanceof HTMLButtonElement) el.click();
        })

        sub.off();

        items.each((btn: LiveTree) => {
          const el = btn.dom.el();
          if (el instanceof HTMLButtonElement) el.click();
        });

        (tree as any).__clickCount = count;
      },

      assert(tree, t) {
        const n = (tree as any).__clickCount ?? 0;
        if (n === 0) {
          t.ok("DOM not mounted, skipping click assertion", true);
          return;
        }
        t.eq("click fired exactly once per button", n, 2);
      },

      preview(tree) {
        const root = tree.find.byId("root");
        const el = root?.dom.el?.();
        return el ? el.outerHTML : "<no root dom>";
      },
    },

    // ------------------------------------------------------------
    // create.div on detached branch (no DOM yet)
    // ------------------------------------------------------------
    {
      suite: SUITE,
      name: "create.div on detached branch creates IR node without DOM",
      html: `<div id="root"></div>`,
      fixture: "create/div",
      sub: "detached",

      act(tree) {
        const branch = hson
          .liveTree
          .fromTrustedHtml(`<section id="box"></section>`);

        const child = branch.create.div();
        child.attr.set("class", "child");

        (tree as any).__branch = branch;
      },

      assert(tree, t) {
        const branch = (tree as any).__branch as LiveTree;
        const found = branch.find.byAttrs("class", "child");

        t.ok("child exists in IR", !!found);

        const el = found?.dom.el?.();
        t.eq("child has no DOM element yet", el ?? null, null);
      },

      preview(tree) {
        const root = tree.find.byId("root");
        const el = root?.dom.el?.();
        return el ? el.outerHTML : "<no root dom>";
      },
    },

    // ------------------------------------------------------------
    // css overwrite same prop
    // ------------------------------------------------------------
    {
      suite: SUITE,
      name: "css.setMany overwrite replaces previous property value",
      html: `<main><div id="box"></div></main>`,
      fixture: "css/overwrite",
      sub: "prop",

      async act(tree) {
        const box = tree.find.must.byId("box");

        box.css.setMany({ opacity: "0.5" });
        box.css.setMany({ opacity: "0.6" });

        await flush_dom();
      },
      assert(tree, t) {
        const box = tree.find.must.byId("box");
        const quid = box.quid;

        t.ok("box has quid", typeof quid === "string" && quid.length > 0);

        // LiveTree-level assertion
        const opacity = box.css.get.property("opacity");

        t.eq("LiveTree css opacity is latest", opacity, "0.6");

        // DOM stylesheet assertion
        const host = document.querySelector("#css-manager") as HTMLElement | null;
        const styleEl = host?.querySelector("#_hson") as HTMLStyleElement | null;
        const css = styleEl?.textContent ?? "";

        console.log("quid:", box.quid);
        console.log("css state:", box.css.get.property("opacity"));
        console.log("node:", box.node);

        t.eq(
          "LiveTree opacity is latest",
          box.css.get.property("opacity"),
          "0.6"
        );

        t.ok(
          "stylesheet contains latest opacity",
          /opacity\s*:\s*0\.6\b/.test(css)
        );
      },

      preview() {
        const styleEl = document
          .querySelector("#css-manager")
          ?.querySelector("#_hson") as HTMLStyleElement | null;
        return styleEl?.textContent?.slice(0, 200) ?? "<no css>";
      },
    },

    // ------------------------------------------------------------
    // multiple nodes css scoping
    // ------------------------------------------------------------
    {
      suite: SUITE,
      name: "css manager writes separate rules per node",
      html: `
      <main>
        <div id="a"></div>
        <div id="b"></div>
      </main>
    `,
      fixture: "css/scoping",
      sub: "multiple-nodes",

      async act(tree) {
        const a = tree.find.must.byId("a");
        const b = tree.find.must.byId("b");

        a.css.setMany({ opacity: "0.3" });
        b.css.setMany({ opacity: "0.8" });

        await Promise.resolve();
        await new Promise(r => setTimeout(r, 0));
      },

      assert(tree, t) {
        const host = document.querySelector("#css-manager") as HTMLElement | null;
        if (!host) {
          t.ok("DOM not mounted, skipping css check", true);
          return;
        }

        const styleEl = host.querySelector("#_hson") as HTMLStyleElement | null;
        const css = styleEl?.textContent ?? "";

        t.ok("opacity 0.3 present", css.includes("0.3"));
        t.ok("opacity 0.8 present", css.includes("0.8"));
      },

      preview() {
        const styleEl = document.querySelector("#_hson") as HTMLStyleElement | null;
        return styleEl?.textContent?.slice(0, 200) ?? "<no css>";
      },
    },

  ]
  return [make_livetree_suite(SUITE, cases)];
};

// suite: livetree/coverage-css-and-content
export function suite_css_and_content(): TestSuite {
  const SUITE = "livetree/coverage-css-and-content";

  // Small helper: one macrotask tick (CssManager flush boundary)
  const tick = async (): Promise<void> => {
    await new Promise<void>((r) => setTimeout(r, 0));
  };

  const cases: readonly LiveTreeCaseSpec[] = [
    // -----------------------------------------------------------------------
    // CssManager batching: rule appears after a tick
    {
      suite: SUITE,
      name: "CssManager batching: rule appears after a tick",
      dom: true,
      fixture: "css/batching",
      sub: "after-tick",
      html: `
        <main>
          <div id="box">x</div>
        </main>
      `,
      async act(tree: LiveTree) {
        const box = tree.find.must.byId("box");
        box.css.setMany({ opacity: "0.5" });

        // optional debug snapshot (don’t assert; purely diagnostic)
        void box.css.devSnapshot();

        await tick();
        CssManager.invoke().syncNow();
      },
      assert(tree: LiveTree, t: Asserter) {

        const host = document.querySelector("#css-manager");
        t.ok("css-manager host exists", !!host);

        const styleEl = host?.querySelector("#_hson");
        t.ok("style#_hson exists", !!styleEl);

        const cssText = styleEl?.textContent ?? "";

        const box = tree.find.must.byId("box");
        const el = box.dom.el();
        t.ok("box dom exists", !!el);
        const snapFn = box.css.devSnapshot;
        const quid = el?.getAttribute("data-_quid") ?? "";
        t.ok("box has data-_quid", quid.length > 0);

        t.ok("css includes quid selector", cssText.includes(`[data-_quid="${quid}"]`));
        t.ok("css includes opacity", cssText.includes("opacity: 0.5;"));
      },
      preview(tree: LiveTree) {
        const el = tree.find.byId("box")?.dom.el?.();
        return el && "outerHTML" in el ? (el as Element).outerHTML : "<no box dom>";
      },
    },

    // // -----------------------------------------------------------------------
    // // CssManager: computed style reflects QUID CSS after flush
    // // NOTE: This requires DOM + layout. If your harness sometimes runs headless/no-dom,
    // //       the test will fail. This test *should* scream in that case.
    {
      suite: SUITE,
      name: "CssManager: computed style reflects QUID CSS after flush",
      dom: true,
      fixture: "css/computed-style",
      sub: "after-flush",
      html: `
        <main>
          <div id="box">x</div>
        </main>
      `,
      async act(tree: LiveTree) {
        const box = tree.find.must.byId("box");
        box.css.setMany({
          position: "fixed",
          top: "24px",
          left: "24px",
          width: "160px",
          height: "160px",
          backgroundColor: "rgb(0, 255, 0)",
          opacity: "0.5",
        });

        await tick();
        CssManager.invoke().syncNow();
      },
      assert(tree: LiveTree, t: Asserter) {
        after_paint();
        const el0 = tree.find.must.byId("box").dom.el();
        t.ok("box dom exists", !!el0);

        // getComputedStyle wants an Element, but you usually care about HTMLElement behavior.
        const el = el0 instanceof HTMLElement ? el0 : null;
        t.ok("box dom is HTMLElement", !!el);

        if (!el) return;

        const cs = getComputedStyle(el);
        t.eq("opacity", cs.opacity, "0.5");
        t.eq("position", cs.position, "fixed");
        t.eq("backgroundColor", cs.backgroundColor, "rgb(0, 255, 0)");
      },
      preview(tree: LiveTree) {
        const el = tree.find.byId("box")?.dom.el?.();
        return el && "outerHTML" in el ? (el as Element).outerHTML : "<no box dom>";
      },
    },

    // // -----------------------------------------------------------------------
    // // CssManager: element has non-zero rect after QUID CSS
    // // This one is “layout-ish”: if position/size didn’t apply, rect likely stays 0.
    {
      suite: SUITE,
      name: "CssManager: element has non-zero rect after QUID CSS",
      fixture: "css/rect",
      dom: true,
      sub: "non-zero",
      html: `
        <main>
          <div id="box">x</div>
        </main>
      `,
      async act(tree: LiveTree) {
        const box = tree.find.must.byId("box");
        box.css.setMany({
          position: "fixed",
          top: "24px",
          left: "24px",
          width: "160px",
          height: "160px",
          backgroundColor: "rgb(255, 0, 0)",
        });

        await tick();
        CssManager.invoke().syncNow();
      },
      assert(tree: LiveTree, t: Asserter) {
        after_paint();
        const box = tree.find.must.byId("box");
        const el0 = box.dom.el();
        t.ok("box dom exists", !!el0);

        const el = el0 instanceof HTMLElement ? el0 : null;
        t.ok("box dom is HTMLElement", !!el);

        if (!el) return;

        // stylesheet assertions (compile correctness)
        const host = document.querySelector("#css-manager");
        t.ok("css-manager host exists", !!host);

        const styleEl = host?.querySelector("#_hson");
        t.ok("style#_hson exists", !!styleEl);

        const cssText = styleEl?.textContent ?? "";

        const quid = el.getAttribute("data-_quid") ?? "";
        t.ok("box has data-_quid", quid.length > 0);

        t.ok("css includes quid selector", cssText.includes(`[data-_quid="${quid}"]`));
        t.ok("css includes position fixed", cssText.includes("position: fixed;"));
        t.ok("css includes top", cssText.includes("top: 24px;"));
        t.ok("css includes left", cssText.includes("left: 24px;"));
        t.ok("css includes width", cssText.includes("width: 160px;"));
        t.ok("css includes height", cssText.includes("height: 160px;"));
        t.ok("css includes background-color", cssText.includes("background-color: rgb(255, 0, 0);"));

        // layout assertion (application correctness)
        const r = el.getBoundingClientRect();
        t.ok("rect width > 0", r.width > 0);
        t.ok("rect height > 0", r.height > 0);
      },
      preview(tree: LiveTree) {
        const el = tree.find.byId("box")?.dom.el?.();
        return el && "outerHTML" in el ? (el as Element).outerHTML : "<no box dom>";
      },
    },

    // -----------------------------------------------------------------------
    // ContentManager / node content: set_node_content updates leaf + DOM textContent
    {
      suite: SUITE,
      name: "set_node_content updates node leaf + DOM textContent",
      dom: true,
      fixture: "content/set_node_content",
      sub: "dom-and-node",
      html: `
        <main>
          <div id="tgt">old</div>
        </main>
      `,
      act(tree: LiveTree) {
        const tgt = tree.find.must.byId("tgt");
        set_node_text_content(tgt.node, "new-text");
      },
      assert(tree: LiveTree, t: Asserter) {
        const tgt = tree.find.must.byId("tgt");
        const node = tgt.node;

        const el0 = tgt.dom.el();
        t.ok("tgt dom exists", !!el0);

        const el = el0 instanceof HTMLElement ? el0 : null;
        t.ok("tgt dom is HTMLElement", !!el);

        if (el) {
          t.eq("DOM textContent", el.textContent ?? "", "new-text");
        }

        t.ok("node._content is array", Array.isArray(node._content));
        t.eq("node._content length == 1", node._content?.length ?? 0, 1);

        // get_node_text prefers DOM when mounted
        t.eq("get_node_text", get_node_text_content(node), "new-text");
      },
      preview(tree: LiveTree) {
        const el = tree.find.byId("tgt")?.dom.el?.();
        return el && "outerHTML" in el ? (el as Element).outerHTML : "<no tgt dom>";
      },
    },

    // -----------------------------------------------------------------------
    // get_node_text fallback: no DOM => walk HSON content
    // We construct a minimal HsonNode tree with _-str leaves.
    {
      suite: SUITE,
      name: "get_node_text falls back to HSON when no DOM exists",
      dom: true,
      fixture: "content/get_node_text",
      sub: "no-dom-fallback",
      html: `<main></main>`,
      act(_tree: LiveTree) {
        // no-op
      },
      assert(_tree: LiveTree, t: Asserter) {
        // Minimal structure:
        // <div> "hello " <span>"world"</span> </div>
        const node: HsonNode = _CREATE_NODE({
          _tag: "div",
          _attrs: { id: "x" },
          _content: [_CREATE_NODE(
            {
              _tag: STR_TAG,
              _attrs: {},
              _content: ["hello "]
            }),
          _CREATE_NODE({
            _tag: "span",
            _attrs: {},
            _content: [
              _CREATE_NODE({
                _tag: STR_TAG,
                _attrs: {},
                _content: ["world"]
              })],
          }),
          ],
        });

        const got = get_node_text_content(node).replace(/\s+/g, " ").trim();
        t.eq("text fallback", got, "hello world");
      },
      preview(_tree: LiveTree) {
        return "<no-dom fallback node>";
      },
    },
  ];

  return make_livetree_suite(SUITE, cases);
}

// recent-regression-suites.ts

export function suite_recent_regressions(): readonly TestSuite[] {
  return [
    suite_graft_regressions(),
    suite_css_regressions(),
  ] as const;
}

function suite_graft_regressions(): TestSuite {
  const SUITE = "livetree/recent-graft-regressions";

  const cases: readonly LiveTreeCaseSpec[] = [
    {
      suite: SUITE,
      name: "liveTree.queryDom.graft returns the queried element itself as root",
      fixture: "graft/liveTree.queryDom",
      sub: "queried-element-is-root",
      html: `<div id="root"></div>`,

      act(tree) {
        const wrapper = document.createElement("div");
        wrapper.id = "graft-test-wrapper-1";
        wrapper.style.position = "fixed";
        wrapper.style.left = "-10000px";
        wrapper.style.top = "0px";

        const host = document.createElement("div");
        host.id = "graft-host-1";
        host.innerHTML = `<section id="child">hello</section>`;

        wrapper.appendChild(host);
        document.body.appendChild(wrapper);

        const grafted = hson.liveTree.queryDom("#graft-host-1").graft();

        (tree as unknown as {
          __wrapper?: HTMLElement;
          __grafted?: LiveTree;
        }).__wrapper = wrapper;

        (tree as unknown as {
          __wrapper?: HTMLElement;
          __grafted?: LiveTree;
        }).__grafted = grafted;
      },

      assert(tree, t) {
        const stash = tree as unknown as {
          __wrapper?: HTMLElement;
          __grafted?: LiveTree;
        };

        try {
          const grafted = stash.__grafted;
          t.ok("grafted tree exists", !!grafted);
          if (!grafted) return;

          t.eq("root tag is queried element tag", grafted.node._tag.toLowerCase(), "div");

          const el = grafted.dom.el();
          t.ok("root dom exists", !!el);

          if (el instanceof HTMLElement) {
            t.eq("root dom id preserved", el.id, "graft-host-1");
          }

          const child = grafted.find.byId("child");
          t.ok("existing child content was ingested", !!child);
        } finally {
          stash.__wrapper?.remove();
        }
      },

      preview(tree) {
        const stash = tree as unknown as { __grafted?: LiveTree };
        const el = stash.__grafted?.dom.el?.();
        return el && "outerHTML" in el ? (el as Element).outerHTML : "<no grafted dom>";
      },
    },

    {
      suite: SUITE,
      name: "liveTree.queryDom.graft succeeds on an empty queried element",
      fixture: "graft/liveTree.queryDom",
      sub: "empty-element-valid",
      html: `<div id="root"></div>`,

      act(tree) {
        const wrapper = document.createElement("div");
        wrapper.id = "graft-test-wrapper-2";
        wrapper.style.position = "fixed";
        wrapper.style.left = "-10000px";
        wrapper.style.top = "0px";

        const host = document.createElement("div");
        host.id = "graft-host-2";

        wrapper.appendChild(host);
        document.body.appendChild(wrapper);

        const grafted = hson.liveTree.queryDom("#graft-host-2").graft();

        (tree as unknown as {
          __wrapper?: HTMLElement;
          __grafted?: LiveTree;
        }).__wrapper = wrapper;

        (tree as unknown as {
          __wrapper?: HTMLElement;
          __grafted?: LiveTree;
        }).__grafted = grafted;
      },

      assert(tree, t) {
        const stash = tree as unknown as {
          __wrapper?: HTMLElement;
          __grafted?: LiveTree;
        };

        try {
          const grafted = stash.__grafted;
          t.ok("grafted tree exists", !!grafted);
          if (!grafted) return;

          t.eq("root tag is div", grafted.node._tag.toLowerCase(), "div");

          const el = grafted.dom.el();
          t.ok("root dom exists", !!el);

          if (el instanceof HTMLElement) {
            t.eq("root dom id preserved", el.id, "graft-host-2");
            t.eq("empty element remains empty", el.children.length, 0);
            t.eq("empty element text remains empty", el.textContent ?? "", "");
          }
        } finally {
          stash.__wrapper?.remove();
        }
      },

      preview(tree) {
        const stash = tree as unknown as { __grafted?: LiveTree };
        const el = stash.__grafted?.dom.el?.();
        return el && "outerHTML" in el ? (el as Element).outerHTML : "<no grafted dom>";
      },
    },

    {
      suite: SUITE,
      name: "liveTree.queryDom.graft is idempotent for an already-grafted element",
      fixture: "graft/liveTree.queryDom",
      sub: "double-graft-returns-same-node",
      html: `<div id="root"></div>`,

      act(tree) {
        const wrapper = document.createElement("div");
        wrapper.id = "graft-test-wrapper-3";
        wrapper.style.position = "fixed";
        wrapper.style.left = "-10000px";
        wrapper.style.top = "0px";

        const host = document.createElement("div");
        host.id = "graft-host-3";
        host.innerHTML = `<p id="child-3">x</p>`;

        wrapper.appendChild(host);
        document.body.appendChild(wrapper);

        const first = hson.liveTree.queryDom("#graft-host-3").graft();
        const second = hson.liveTree.queryDom("#graft-host-3").graft();

        (tree as unknown as {
          __wrapper?: HTMLElement;
          __first?: LiveTree;
          __second?: LiveTree;
        }).__wrapper = wrapper;

        (tree as unknown as {
          __wrapper?: HTMLElement;
          __first?: LiveTree;
          __second?: LiveTree;
        }).__first = first;

        (tree as unknown as {
          __wrapper?: HTMLElement;
          __first?: LiveTree;
          __second?: LiveTree;
        }).__second = second;
      },

      assert(tree, t) {
        const stash = tree as unknown as {
          __wrapper?: HTMLElement;
          __first?: LiveTree;
          __second?: LiveTree;
        };

        try {
          const first = stash.__first;
          const second = stash.__second;

          t.ok("first graft exists", !!first);
          t.ok("second graft exists", !!second);
          if (!first || !second) return;

          // harden the new element->node guard behavior
          t.ok("second graft reuses same underlying node", first.node === second.node);

          const firstEl = first.dom.el();
          const secondEl = second.dom.el();
          t.ok("dom element is stable across repeated graft", firstEl === secondEl);
        } finally {
          stash.__wrapper?.remove();
        }
      },

      preview(tree) {
        const stash = tree as unknown as { __first?: LiveTree };
        const el = stash.__first?.dom.el?.();
        return el && "outerHTML" in el ? (el as Element).outerHTML : "<no grafted dom>";
      },
    },
  ];

  return make_livetree_suite(SUITE, cases);
}

function suite_css_regressions(): TestSuite {
  const SUITE = "livetree/recent-css-regressions";

  const tick = async (): Promise<void> => {
    await new Promise<void>((r) => setTimeout(() => r(), 0));
  };

  const css_snapshot = (tree: LiveTree): string => {
    const box = tree.find.must.byId("box");
    const snap = box.css.devSnapshot;
    return snap ? snap() : "<no devsnapshot>";
  };

  const cases: readonly LiveTreeCaseSpec[] = [
    {
      suite: SUITE,
      name: "invalid CSS decl is skipped without poisoning valid sibling decls",
      dom: true,
      fixture: "css/validator",
      sub: "invalid-does-not-poison",
      html: `<main><div id="box">x</div></main>`,

      async act(tree) {
        const box = tree.find.must.byId("box");

        box.css.setMany({
          display: "grid",
          gap: "8px",
          background: "__INVALID_BG_SENTINEL__",
          width: "420px",
        });

        await tick();
        CssManager.invoke().syncNow();
      },
      assert(tree, t) {
        const cssText = css_snapshot(tree);
        const box = tree.find.must.byId("box");
        const el = box.dom.el();
        t.ok("box DOM exists", !!el);

        const quid = el?.getAttribute("data-_quid") ?? "";
        t.ok("box has quid", quid.length > 0);

        const ruleStart = cssText.indexOf(`[data-_quid="${quid}"]`);
        t.ok("box rule exists", ruleStart >= 0);

        const ruleSlice = ruleStart >= 0 ? cssText.slice(ruleStart, ruleStart + 300) : "";

        t.ok("display survived", ruleSlice.includes("display: grid;"));
        t.ok("gap survived", ruleSlice.includes("gap: 8px;"));
        t.ok("width survived", ruleSlice.includes("width: 420px;"));
        t.ok(
          "invalid background sentinel was skipped",
          !ruleSlice.includes("__INVALID_BG_SENTINEL__"),
        );
      },

      preview(tree) {
        const cssText = css_snapshot(tree);
        return cssText || "<no css snapshot>";
      },
    },

    {
      suite: SUITE,
      name: "valid camelCase CSS props still serialize after supports-validation",
      fixture: "css/validator",
      sub: "camelcase-valid-props-allowed",
      html: `<main><div id="box">x</div></main>`,

      async act(tree) {
        const box = tree.find.must.byId("box");

        box.css.setMany({
          backgroundColor: "rgba(12, 19, 26, 1)",
          fontFamily: "monospace",
          placeItems: "center",
          overflowX: "hidden",
        });

        await tick();
        CssManager.invoke().syncNow();
      },

      assert(tree, t) {
        const cssText = css_snapshot(tree);

        t.ok("background-color survived", cssText.includes("background-color: rgba(12, 19, 26, 1);"));
        t.ok("font-family survived", cssText.includes("font-family: monospace;"));
        t.ok("place-items survived", cssText.includes("place-items: center;"));
        t.ok("overflow-x survived", cssText.includes("overflow-x: hidden;"));
      },

      preview(tree) {
        const cssText = css_snapshot(tree);
        return cssText || "<no css snapshot>";
      },
    },

    {
      suite: SUITE,
      name: "known-invalid CSS values are rejected while valid siblings remain",
      fixture: "css/validator",
      sub: "reject-invalid-values-only",
      html: `<main><div id="box">x</div></main>`,

      async act(tree) {
        const box = tree.find.must.byId("box");

        box.css.setMany({
          color: "light-grey",              // invalid
          alignItems: "flex-stretch",       // invalid
          width: "160px",                   // valid
          height: "40px",                   // valid
        });

        await tick();
        CssManager.invoke().syncNow();
      },

      assert(tree, t) {
        const cssText = css_snapshot(tree);

        t.ok("valid width survived", cssText.includes("width: 160px;"));
        t.ok("valid height survived", cssText.includes("height: 40px;"));

        t.ok("invalid color was skipped", !cssText.includes("color: light-grey;"));
        t.ok("invalid align-items was skipped", !cssText.includes("align-items: flex-stretch;"));
      },

      preview(tree) {
        const cssText = css_snapshot(tree);
        return cssText || "<no css snapshot>";
      },
    },
    {
      suite: SUITE,
      name: "css.setMany readback returns latest property value",
      html: `<main><div id="box"></div></main>`,
      fixture: "css/setmany",
      sub: "readback",

      async act(tree) {
        const box = tree.find.must.byId("box");

        box.css.setMany({ opacity: "0.5" });
        box.css.setMany({ opacity: "0.6" });

        (tree as any).__result = {
          opacity: box.css.get.property("opacity"),
          quid: box.quid,
        };
      },

      assert(tree, t) {
        const result = (tree as any).__result;

        t.eq("readback opacity is latest", result.opacity, "0.6");
        t.ok("box has quid", typeof result.quid === "string" && result.quid.length > 0);
      },
    },
    {
      suite: SUITE,
      name: "css.setMany projects single property to stylesheet",
      html: `<main><div id="box"></div></main>`,
      fixture: "css/setmany",
      sub: "project-single",

      async act(tree) {
        const box = tree.find.must.byId("box");

        box.css.setMany({ opacity: "0.6" });

        await Promise.resolve();
        await new Promise(r => setTimeout(r, 0));

        (tree as any).__result = {
          quid: box.quid,
          opacity: box.css.get.property("opacity"),
        };
      },

      assert(tree, t) {
        const result = (tree as any).__result;
        const css = document
          .querySelector("#css-manager")
          ?.querySelector("#_hson")
          ?.textContent ?? "";

        t.eq("readback opacity is set", result.opacity, "0.6");
        t.ok("stylesheet contains opacity somewhere", /opacity\s*:\s*0\.6\b/.test(css));
      },
    },
    {
      suite: SUITE,
      name: "css.setMany writes multiple properties",
      html: `<main><div id="box"></div></main>`,
      fixture: "css/setmany",
      sub: "multi-prop",

      async act(tree) {
        const box = tree.find.must.byId("box");

        box.css.setMany({
          opacity: "0.6",
          color: "red",
        });

        (tree as any).__result = {
          opacity: box.css.get.property("opacity"),
          color: box.css.get.property("color"),
        };
      },

      assert(tree, t) {
        const result = (tree as any).__result;

        t.eq("opacity readback", result.opacity, "0.6");
        t.eq("color readback", result.color, "red");
      },
    },

  ];

  return make_livetree_suite(SUITE, cases);
}

