import { hson, LiveTree } from "hson-live";
import type { TestSuite, LiveTreeCaseSpec } from "../tests.types";
import { make_livetree_suite } from "./livetree-testkit";

export function legacy_suites_3(): readonly TestSuite[] {
  return [
    suite_attrs_flags_refresh(),
    suite_empty_append(),
      suite_dataset(),
      suite_identity_stability(),
    
  ] as const;
}

function suite_attrs_flags_refresh(): TestSuite {
  const SUITE = "livetree/legacy-attrs-flags";

  const cases: readonly LiveTreeCaseSpec[] = [
    {
      suite: SUITE,
      name: "attr + flag set/clear sync model and DOM",
      fixture: "attrs-flags",
      sub: "set-clear",
      dom: true,
      html: `
        <div id="root">
          <span id="x">hi</span>
          <span id="y">bye</span>
        </div>
      `,

      act(tree) {
        const spanX = tree.find.must.byId("x");

        // set
        spanX.attr.set("data-test", "ok");
        spanX.flag.set("hidden");

        // clear again
        spanX.attr.drop("data-test");
        spanX.flag.clear("hidden");
      },

      assert(tree, t) {
        const spanX = tree.find.must.byId("x");
        const node = spanX.node;
        const el = spanX.asDomElement();

        t.ok("spanX DOM exists", !!el);
        t.eq("node data-test cleared", node._attrs?.["data-test"], undefined);
        t.eq("DOM data-test removed", el?.getAttribute("data-test") ?? null, null);
        t.eq("DOM hidden removed", el?.hasAttribute("hidden") ?? false, false);
      },

      preview(tree) {
        const el = tree.find.byId("x")?.asDomElement?.();
        return el && "outerHTML" in el ? (el as Element).outerHTML : "<no span dom>";
      },
    },

    {
      suite: SUITE,
      name: "attr + flag set persist to model and DOM",
      fixture: "attrs-flags",
      sub: "set-persist",
      dom: true,
      html: `
        <div id="root">
          <span id="x">hi</span>
        </div>
      `,

      act(tree) {
        const spanX = tree.find.must.byId("x");
        spanX.attr.set("data-test", "ok");
        spanX.flag.set("hidden");
      },

      assert(tree, t) {
        const spanX = tree.find.must.byId("x");
        const node = spanX.node;
        const el = spanX.asDomElement();

        t.ok("spanX DOM exists", !!el);
        t.eq("node data-test set", node._attrs?.["data-test"], "ok");
        t.eq("DOM data-test set", el?.getAttribute("data-test") ?? "", "ok");
        t.eq("node hidden flag stored", String(node._attrs?.["hidden"] ?? ""), "hidden");
        t.eq("DOM hidden present", el?.hasAttribute("hidden") ?? false, true);
      },

      preview(tree) {
        const el = tree.find.byId("x")?.asDomElement?.();
        return el && "outerHTML" in el ? (el as Element).outerHTML : "<no span dom>";
      },
    },
  ];

  return make_livetree_suite(SUITE, cases);
}

function suite_empty_append(): TestSuite {
  const SUITE = "livetree/legacy-empty-append";

  const cases: readonly LiveTreeCaseSpec[] = [
    {
      suite: SUITE,
      name: "empty clears node and DOM, append restores both",
      fixture: "content/append",
      sub: "empty-append",
      dom: true,
      html: `
        <section id="root">
          <p class="orig">one</p>
        </section>
      `,

      act(tree) {
        const root = tree.find.must.byId("root");

        root.empty();

        const branch = hson
          .fromTrustedHtml(`<p class="new">hello</p>`)
          .liveTree
          .asBranch();

        root.append(branch);
      },

      assert(tree, t) {
        const root = tree.find.must.byId("root");
        const el = root.asDomElement();

        t.ok("root DOM exists", !!el);

        const kids = root.content.all();
        t.eq("root has one direct child", kids.length, 1);

        const child = kids[0];
        t.eq("child tag is p", child?.node._tag ?? "", "p");
        t.eq("child class is new", String(child?.attr.get("class") ?? ""), "new");
        t.eq("child text is hello", child?.text.get() ?? "", "hello");

        const newEl = el?.querySelector("p.new");
        t.ok("DOM contains new paragraph", !!newEl);
        t.eq("new paragraph text", newEl?.textContent ?? "", "hello");
      },

      preview(tree) {
        const el = tree.find.byId("root")?.asDomElement?.();
        return el && "outerHTML" in el ? (el as Element).outerHTML : "<no root dom>";
      },
    },

    {
      suite: SUITE,
      name: "empty removes all direct content from node and DOM",
      fixture: "content/append",
      sub: "empty-only",
      dom: true,
      html: `
        <section id="root">
          <p class="a">one</p>
          <p class="b">two</p>
        </section>
      `,

      act(tree) {
        const root = tree.find.must.byId("root");
        root.empty();
      },

      assert(tree, t) {
        const root = tree.find.must.byId("root");
        const el = root.asDomElement();

        t.ok("root DOM exists", !!el);
        t.eq("root content count is zero", root.content.all().length, 0);
        t.eq("DOM has no element children", el?.children.length ?? -1, 0);
        t.eq("DOM text content empty", (el?.textContent ?? "").trim(), "");
      },

      preview(tree) {
        const el = tree.find.byId("root")?.asDomElement?.();
        return el && "outerHTML" in el ? (el as Element).outerHTML : "<no root dom>";
      },
    },
  ];

  return make_livetree_suite(SUITE, cases);
}

function suite_dataset(): TestSuite {
  const SUITE = "livetree/legacy-dataset";

  const cases: readonly LiveTreeCaseSpec[] = [
    {
      suite: SUITE,
      name: "data.set/get mirrors data-* attrs in model and DOM",
      fixture: "dataset",
      sub: "set-overwrite-remove",
      dom: true,
      html: `
        <div id="root">
          <button id="btn">click</button>
        </div>
      `,

      act(tree) {
        const btn = tree.find.must.byId("btn");

        btn.data.set("state", "open");
        btn.data.set("user-id", "123");
        btn.data.set("flag", "on");

        btn.data.set("state", "closed");
        btn.data.set("user-id", null);
      },

      assert(tree, t) {
        const btn = tree.find.must.byId("btn");
        const node = btn.node;
        const el = btn.asDomElement();

        t.eq("manager get(state)", btn.data.get("state"), "closed");
        t.eq("node data-state", node._attrs?.["data-state"], "closed");
        t.eq("DOM data-state", el?.getAttribute("data-state") ?? "", "closed");

        t.eq("manager get(user-id) removed", btn.data.get("user-id"), undefined);
        t.ok("node data-user-id removed", !("data-user-id" in (node._attrs ?? {})));
        t.eq("DOM data-user-id removed", el?.hasAttribute("data-user-id") ?? false, false);

        t.eq("manager get(flag)", btn.data.get("flag"), "on");
        t.eq("node data-flag", node._attrs?.["data-flag"], "on");
        t.eq("DOM data-flag", el?.getAttribute("data-flag") ?? "", "on");
      },

      preview(tree) {
        const el = tree.find.byId("btn")?.asDomElement?.();
        return el && "outerHTML" in el ? (el as Element).outerHTML : "<no button dom>";
      },
    },

    {
      suite: SUITE,
      name: "data.setMany applies multiple data-* attrs and remove works",
      fixture: "dataset",
      sub: "setMany-remove",
      dom: true,
      html: `
        <div id="root">
          <button id="btn">click</button>
        </div>
      `,

      act(tree) {
        const btn = tree.find.must.byId("btn");

        btn.data.setMany({
          state: "open",
          mode: "edit",
          userId: "42",
        });

        btn.data.set("mode", null);
      },

      assert(tree, t) {
        const btn = tree.find.must.byId("btn");
        const node = btn.node;
        const el = btn.asDomElement();

        t.eq("data-state present in manager", btn.data.get("state"), "open");
        t.eq("data-user-id present in manager", btn.data.get("user-id"), "42");

        t.eq("node data-state", node._attrs?.["data-state"], "open");
        t.eq("node data-user-id", node._attrs?.["data-user-id"], "42");

        t.eq("DOM data-state", el?.getAttribute("data-state") ?? "", "open");
        t.eq("DOM data-user-id", el?.getAttribute("data-user-id") ?? "", "42");

        t.eq("mode removed from manager", btn.data.get("mode"), undefined);
        t.eq("mode removed from DOM", el?.hasAttribute("data-mode") ?? false, false);
      },

      preview(tree) {
        const el = tree.find.byId("btn")?.asDomElement?.();
        return el && "outerHTML" in el ? (el as Element).outerHTML : "<no button dom>";
      },
    },
  ];

  return make_livetree_suite(SUITE, cases);
}

export function suite_identity_stability(): TestSuite {
  const SUITE = "livetree/identity-stability";

  const cases: readonly LiveTreeCaseSpec[] = [
    {
      suite: SUITE,
      name: "asDomElement is stable across repeated lookups on same handle",
      fixture: "identity/asDomElement",
      sub: "same-handle-stable",
      dom: true,
      html: `
        <main>
          <div id="box">x</div>
        </main>
      `,

      act(tree) {
        void tree;
      },

      assert(tree, t) {
        const box = tree.find.must.byId("box");

        const el1 = box.asDomElement();
        const el2 = box.asDomElement();

        t.ok("first DOM lookup exists", !!el1);
        t.ok("second DOM lookup exists", !!el2);
        t.ok("same handle returns same DOM element", el1 === el2);
      },

      preview(tree) {
        const el = tree.find.byId("box")?.asDomElement?.();
        return el && "outerHTML" in el ? (el as Element).outerHTML : "<no box dom>";
      },
    },

    {
      suite: SUITE,
      name: "re-finding the same node yields the same DOM element",
      fixture: "identity/find",
      sub: "refind-same-dom",
      dom: true,
      html: `
        <main>
          <div id="box">x</div>
        </main>
      `,

      act(tree) {
        void tree;
      },

      assert(tree, t) {
        const a = tree.find.must.byId("box");
        const b = tree.find.must.byId("box");

        const elA = a.asDomElement();
        const elB = b.asDomElement();

        t.ok("first find has DOM", !!elA);
        t.ok("second find has DOM", !!elB);
        t.ok("re-finding points to same DOM element", elA === elB);

        // public-surface bonus: these should also be the same underlying node
        t.ok("re-finding points to same underlying node", a.node === b.node);
      },

      preview(tree) {
        const el = tree.find.byId("box")?.asDomElement?.();
        return el && "outerHTML" in el ? (el as Element).outerHTML : "<no box dom>";
      },
    },

    {
      suite: SUITE,
      name: "append preserves child DOM identity across subsequent finds",
      fixture: "identity/append",
      sub: "child-roundtrip",
      dom: true,
      html: `
        <main>
          <section id="root"></section>
        </main>
      `,

      act(tree) {
        const root = tree.find.must.byId("root");

        const branch = hson
          .fromTrustedHtml(`<div id="child">hello</div>`)
          .liveTree
          .asBranch();

        root.append(branch);
      },

      assert(tree, t) {
        const child1 = tree.find.must.byId("child");
        const child2 = tree.find.must.byId("child");

        const el1 = child1.asDomElement();
        const el2 = child2.asDomElement();

        t.ok("child DOM exists after append", !!el1);
        t.ok("re-found child DOM exists", !!el2);
        t.ok("child DOM identity is stable", el1 === el2);
        t.ok("child node identity is stable", child1.node === child2.node);
      },

      preview(tree) {
        const el = tree.find.byId("root")?.asDomElement?.();
        return el && "outerHTML" in el ? (el as Element).outerHTML : "<no root dom>";
      },
    },

    {
      suite: SUITE,
      name: "queryDOM.graft is idempotent on the same host element",
      fixture: "identity/graft",
      sub: "same-host-idempotent",
      html: `<div id="root"></div>`,

      act(tree) {
        const wrapper = document.createElement("div");
        wrapper.id = "identity-graft-wrapper";
        wrapper.style.position = "fixed";
        wrapper.style.left = "-10000px";
        wrapper.style.top = "0px";

        const host = document.createElement("div");
        host.id = "identity-graft-host";
        host.innerHTML = `<p id="inside">x</p>`;

        wrapper.appendChild(host);
        document.body.appendChild(wrapper);

        const first = hson.queryDOM("#identity-graft-host").liveTree.graft();
        const second = hson.queryDOM("#identity-graft-host").liveTree.graft();

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

          t.ok("same host re-graft returns same underlying node", first.node === second.node);
          t.ok(
            "same host re-graft returns same DOM element",
            first.asDomElement() === second.asDomElement(),
          );
        } finally {
          stash.__wrapper?.remove();
        }
      },

      preview(tree) {
        const stash = tree as unknown as { __first?: LiveTree };
        const el = stash.__first?.asDomElement?.();
        return el && "outerHTML" in el ? (el as Element).outerHTML : "<no grafted dom>";
      },
    },
  ];

  return make_livetree_suite(SUITE, cases);
}