import type { LiveTree } from "hson-live";
import type { LiveTreeCaseSpec, LiveTreeFx, TestSuite, Asserter } from "../tests.types";
import { make_livetree_suite } from "./livetree-testkit";

export function suite_find(): TestSuite {
  const SUITE = "livetree/find";

  const cases: readonly LiveTreeCaseSpec[] = [
    {
      suite: SUITE,
      name: "find.byId hit/miss + must throws",
      html: `<div id="root"><button id="btn">click</button></div>`,

      // CHANGED: inputLabel -> fixture/sub (these feed meta + metaPatch)
      fixture: "find/byId",
      sub: "hit-miss-must",

      // CHANGED: run -> act
      act(tree) {
        void tree; // no-op
      },

      // CHANGED: assert now receives (tree, t) and uses t.* instead of throwing
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

      // CHANGED: preview should be a function, not a computed string
      preview(tree) {
        const btn = tree.find.byId("btn");
        const el = btn?.asDomElement?.();
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

      // CHANGED
      fixture: "find/findAll",
      sub: "count-must",

      // CHANGED
      act(tree) {
        void tree; // no-op
      },

      // CHANGED
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
        const el = first?.asDomElement?.();
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
        i.flag.set( "readonly");
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
      name: "create.at(index) inserts among element-children under _elem (preserves order)",
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

        // CHANGED: operate at the level where the children actually are.
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
      name: "create.p appends distinct element-children under _elem",
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
  ];

  return make_livetree_suite(SUITE, cases);
}

export function all_livetree_suites(): readonly TestSuite[] {
  return [
    suite_find(),
    suite_attrs_and_flags(),
    suite_append_and_create(),
  ] as const;
}