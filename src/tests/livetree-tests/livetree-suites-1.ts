import type { TestSuite } from "../tests.types";
import { make_livetree_suite } from "./livetree-testkit";



export function build_livetree_suites(): readonly TestSuite[] {
  return [
    suite_find(),
    suite_attrs_and_flags(),
    suite_append_and_create(),
  ] as const;
}

function suite_find(): TestSuite {
  return make_livetree_suite("livetree/find", [
    {
      suite: "livetree/find",
      name: "find.byId hit/miss + must throws",
      html: `<div id="root"><button id="btn">click</button></div>`,
      fixture: "find/byId",
      sub: "hit-miss-must",
      act(tree) {
        // no-op
        void tree;
      },
      assert(tree, t) {
        const hit = tree.find.byId("btn");
        t.ok("find.byId('btn') returns tree", !!hit);

        const miss = tree.find.byId("nope");
        t.eq("find.byId('nope') returns undefined", miss, undefined);

        let threw = false;
        try {
          tree.find.must.byId("nope");
        } catch {
          threw = true;
        }
        t.ok("find.must.byId throws on miss", threw);
      },
      preview(tree) {
        const btn = tree.find.byId("btn");
        const el = btn?.asDomElement?.();
        return el && "outerHTML" in el ? (el as Element).outerHTML : "<no btn dom>";
      },
    },

    {
      suite: "livetree/find",
      name: "findAll('.item') count + must throws when empty",
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
        void tree;
      },
      assert(tree, t) {
        const items = tree.findAll(".item");
        t.eq("findAll('.item').count() === 3", items.count(), 3);

        let threw = false;
        try {
          tree.findAll.must(".nope");
        } catch {
          threw = true;
        }
        t.ok("findAll.must throws when empty", threw);
      },
    },
  ]);
}

function suite_attrs_and_flags(): TestSuite {
  return make_livetree_suite("livetree/attrs-and-flags", [
    {
      suite: "livetree/attrs-and-flags",
      name: "setAttrs string / boolean / remove mirrors DOM + node",
      html: `<div id="root"><button id="btn"></button></div>`,
      fixture: "attrs/set-remove",
      sub: "string-boolean-null",
      act(tree) {
        const btn = tree.find.must.byId("btn");

        btn.setAttrs("data-state", "open");
        btn.setAttrs("disabled", true);

        // remove via null
        btn.setAttrs("data-temp", "x");
        btn.setAttrs("data-temp", null);

        // remove via false
        btn.setAttrs("aria-busy", true);
        btn.setAttrs("aria-busy", false);
      },
      assert(tree, t) {
        const btn = tree.find.must.byId("btn");
        const el = btn.asDomElement?.() as Element | undefined;

        // Node-side (may differ depending on your node model, but node._attrs is in your old examples)
        const node = btn.node as any;
        const attrs = (node._attrs ?? {}) as Record<string, unknown>;

        t.eq("node attr data-state", attrs["data-state"], "open");
        t.ok("node attr disabled present", "disabled" in attrs);

        t.ok("node attr data-temp removed", !("data-temp" in attrs));
        t.ok("node attr aria-busy removed", !("aria-busy" in attrs));

        // DOM-side
        t.attrEq("DOM data-state", el ?? null, "data-state", "open");
        t.hasAttr("DOM disabled present", el ?? null, "disabled");
        t.attrEq("DOM data-temp removed", el ?? null, "data-temp", null);
        t.attrEq("DOM aria-busy removed", el ?? null, "aria-busy", null);
      },
    },

    {
      suite: "livetree/attrs-and-flags",
      name: "setFlags/removeFlags boolean-present attrs",
      html: `<div id="root"><input id="i"/></div>`,
      fixture: "flags/set-remove",
      sub: "present-absent",
      act(tree) {
        const i = tree.find.must.byId("i");
        i.setFlags("disabled", "readonly");
        i.removeFlags("readonly");
      },
      assert(tree, t) {
        const i = tree.find.must.byId("i");
        const el = i.asDomElement?.() as Element | undefined;

        const node = i.node as any;
        const attrs = (node._attrs ?? {}) as Record<string, unknown>;

        t.ok("node disabled present", "disabled" in attrs);
        t.ok("node readonly removed", !("readonly" in attrs));

        t.hasAttr("DOM disabled present", el ?? null, "disabled");
        t.attrEq("DOM readonly removed", el ?? null, "readonly", null);
      },
    },
  ]);
}

function suite_append_and_create(): TestSuite {
  return make_livetree_suite("livetree/append-and-create", [
    {
      suite: "livetree/append-and-create",
      name: "append(branch) + create.at(index) preserves order",
      html: `<section id="root"><p class="orig">one</p></section>`,
      fixture: "append/create",
      sub: "order",
      act(tree) {
        const root = tree.find.must.byId("root");

        // append a branch
        const midBranch = (globalThis as any).hson
          ? (globalThis as any).hson.fromTrustedHtml(`<p class="mid">two</p>`).liveTree().asBranch()
          : null;

        // CHANGED: avoid relying on global hson if not present; fallback by constructing via DOM
        // If your hson import is accessible here, replace this block with:
        // const midBranch = hson.fromTrustedHtml(`<p class="mid">two</p>`).liveTree().asBranch();

        if (midBranch) {
          root.append(midBranch);
        } else {
          // fallback: create and set attrs/text (still tests ordering)
          const mid = root.create.p();
          mid.setAttrs("class", "mid");
          mid.text.overwrite("two");
        }

        // insert at index 1
        const insert = root.create.at(1).p();
        insert.setAttrs("class", "insert");
        insert.text.overwrite("between");
      },
      assert(tree, t) {
        const root = tree.find.must.byId("root");
        const el = root.asDomElement?.() as Element | undefined;

        const ps = el ? Array.from(el.querySelectorAll("p")) : [];
        const classes = ps.map((p) => p.getAttribute("class"));
        const texts = ps.map((p) => p.textContent ?? "");

        t.eq("p count", ps.length, 3);
        t.eq("classes[0]", classes[0], "orig");
        t.eq("classes[1]", classes[1], "insert");
        t.eq("classes[2]", classes[2], "mid");

        t.eq("texts[0]", texts[0], "one");
        t.eq("texts[1]", texts[1], "between");
        t.eq("texts[2]", texts[2], "two");
      },
    },

    {
      suite: "livetree/append-and-create",
      name: "removeChildren count and empty clears",
      html: `<div id="root"><div id="a"></div><div id="b"></div></div>`,
      fixture: "remove/empty",
      sub: "counts",
      act(tree) {
        const root = tree.find.must.byId("root");
        const removed = root.removeChildren();
        // put the count somewhere we can preview/assert later by encoding as attr
        root.setAttrs("data-removed", String(removed));
        root.create.div().id.set("c");
        root.empty(); // should remove all children (including c)
      },
      assert(tree, t) {
        const root = tree.find.must.byId("root");
        const removed = root.getAttr("data-removed");
        t.eq("removeChildren removed 2", removed, "2");

        const el = root.asDomElement?.() as Element | undefined;
        const childCount = el ? el.children.length : -1;
        t.eq("empty() leaves no DOM children", childCount, 0);
      },
    },
  ]);
}