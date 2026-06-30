import { hson, LiveTree } from "hson-live";
import type { TestSuite } from "../../app/demos/test/tests.types";
import type { LiveTreeCaseSpec } from "../../app/demos/test/live-tests.types";
import { make_livetree_suite } from "./livetree-testkit";
import type { HsonNode } from "hson-live/types";
import { tick } from "./livetree-03";
import type {  DatasetValue } from "../../../../hson-live/dist/api/livetree/managers/data-manager";

export function legacy_suites_3(): readonly TestSuite[] {
  return [
    suite_attrs_flags_refresh(),
    suite_empty_append(),
    suite_dataset(),
    suite_identity_stability(),
    ...suite_final_legacy_css(),
    ...suite_more_contract_refresh(),
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
        const el = spanX.dom.el();

        t.ok("spanX DOM exists", !!el);
        t.eq("node data-test cleared", node.$_attrs?.["data-test"], undefined);
        t.eq("DOM data-test removed", el?.getAttribute("data-test") ?? null, null);
        t.eq("DOM hidden removed", el?.hasAttribute("hidden") ?? false, false);
      },

      preview(tree) {
        const el = tree.find.byId("x")?.dom.el?.();
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
        const el = spanX.dom.el();

        t.ok("spanX DOM exists", !!el);
        t.eq("node data-test set", node.$_attrs?.["data-test"], "ok");
        t.eq("DOM data-test set", el?.getAttribute("data-test") ?? "", "ok");
        t.eq("node hidden flag stored", String(node.$_attrs?.["hidden"] ?? ""), "hidden");
        t.eq("DOM hidden present", el?.hasAttribute("hidden") ?? false, true);
      },

      preview(tree) {
        const el = tree.find.byId("x")?.dom.el?.();
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
          .liveTree
          .fromTrustedHtml(`<p class="new">hello</p>`);

        root.append(branch);
      },

      assert(tree, t) {
        const root = tree.find.must.byId("root");
        const el = root.dom.el();

        t.ok("root DOM exists", !!el);

        const kids = root.content.all();
        t.eq("root has one direct child", kids.length, 1);

        const child = kids.at(0);
        t.eq("child tag is p", child?.node.$_tag ?? "", "p");
        t.eq("child class is new", String(child?.attr.get("class") ?? ""), "new");
        t.eq("child text is hello", child?.text.get() ?? "", "hello");

        const newEl = el?.querySelector("p.new");
        t.ok("DOM contains new paragraph", !!newEl);
        t.eq("new paragraph text", newEl?.textContent ?? "", "hello");
      },

      preview(tree) {
        const el = tree.find.byId("root")?.dom.el?.();
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
        const el = root.dom.el();

        t.ok("root DOM exists", !!el);
        t.eq("root content count is zero", root.content.all().length, 0);
        t.eq("DOM has no element children", el?.children.length ?? -1, 0);
        t.eq("DOM text content empty", (el?.textContent ?? "").trim(), "");
      },

      preview(tree) {
        const el = tree.find.byId("root")?.dom.el?.();
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
        const el = btn.dom.el();

        t.eq("manager get(state)", btn.data.get("state"), "closed");
        t.eq("node data-state", node.$_attrs?.["data-state"], "closed");
        t.eq("DOM data-state", el?.getAttribute("data-state") ?? "", "closed");

        t.eq("manager get(user-id) removed", btn.data.get("user-id"), undefined);
        t.ok("node data-user-id removed", !("data-user-id" in (node.$_attrs ?? {})));
        t.eq("DOM data-user-id removed", el?.hasAttribute("data-user-id") ?? false, false);

        t.eq("manager get(flag)", btn.data.get("flag"), "on");
        t.eq("node data-flag", node.$_attrs?.["data-flag"], "on");
        t.eq("DOM data-flag", el?.getAttribute("data-flag") ?? "", "on");
      },

      preview(tree) {
        const el = tree.find.byId("btn")?.dom.el?.();
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
        const el = btn.dom.el();

        t.eq("data-state present in manager", btn.data.get("state"), "open");
        t.eq("data-user-id present in manager", btn.data.get("user-id"), "42");

        t.eq("node data-state", node.$_attrs?.["data-state"], "open");
        t.eq("node data-user-id", node.$_attrs?.["data-user-id"], "42");

        t.eq("DOM data-state", el?.getAttribute("data-state") ?? "", "open");
        t.eq("DOM data-user-id", el?.getAttribute("data-user-id") ?? "", "42");

        t.eq("mode removed from manager", btn.data.get("mode"), undefined);
        t.eq("mode removed from DOM", el?.hasAttribute("data-mode") ?? false, false);
      },

      preview(tree) {
        const el = tree.find.byId("btn")?.dom.el?.();
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
      name: "dom.el is stable across repeated lookups on same handle",
      fixture: "identity/dom.el",
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

        const el1 = box.dom.el();
        const el2 = box.dom.el();

        t.ok("first DOM lookup exists", !!el1);
        t.ok("second DOM lookup exists", !!el2);
        t.ok("same handle returns same DOM element", el1 === el2);
      },

      preview(tree) {
        const el = tree.find.byId("box")?.dom.el?.();
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

        const elA = a.dom.el();
        const elB = b.dom.el();

        t.ok("first find has DOM", !!elA);
        t.ok("second find has DOM", !!elB);
        t.ok("re-finding points to same DOM element", elA === elB);

        // public-surface bonus: these should also be the same underlying node
        t.ok("re-finding points to same underlying node", a.node === b.node);
      },

      preview(tree) {
        const el = tree.find.byId("box")?.dom.el?.();
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

        const branch = hson.liveTree.fromTrustedHtml(`<div id="child">hello</div>`);

        root.append(branch);
      },

      assert(tree, t) {
        const child1 = tree.find.must.byId("child");
        const child2 = tree.find.must.byId("child");

        const el1 = child1.dom.el();
        const el2 = child2.dom.el();

        t.ok("child DOM exists after append", !!el1);
        t.ok("re-found child DOM exists", !!el2);
        t.ok("child DOM identity is stable", el1 === el2);
        t.ok("child node identity is stable", child1.node === child2.node);
      },

      preview(tree) {
        const el = tree.find.byId("root")?.dom.el?.();
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

        const first = hson.liveTree.queryDom("#identity-graft-host").graft();
        const second = hson.liveTree.queryDom("#identity-graft-host").graft();

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
            first.dom.el() === second.dom.el(),
          );
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
export function suite_more_contract_refresh(): readonly TestSuite[] {
  return [
    suite_dataset_more(),
    suite_css_more(),
    suite_find_more(),
  ] as const;
}
function suite_dataset_more(): TestSuite {
  const SUITE = "livetree/more-dataset";

  const cases: readonly LiveTreeCaseSpec[] = [
    {
      suite: SUITE,
      name: "data.setMany: multi-set, overwrite, preserve, and removal stay in sync",
      fixture: "dataset/setMany",
      sub: "mixed-types-removals",
      dom: true,
      html: `<button id="btn"></button>`,

      act(tree) {
        const btn = tree.find.must.byId("btn");

        // phase 1
        btn.data.setMany({
          state: "open",
          userId: "123",
          flag: "true",
        });

        // phase 2
        btn.data.setMany({
          state: "closed",
          userId: null,
          // flag omitted -> should remain
        });
      },

      assert(tree, t) {
        const btn = tree.find.must.byId("btn");
        const node = btn.node;
        const attrs = node.$_attrs ?? {};
        const el = btn.dom.el();

        t.eq("node data-state updated", attrs["data-state"], "closed");
        t.eq("node data-user-id removed", attrs["data-user-id"], undefined);
        t.eq("node data-flag preserved", attrs["data-flag"], "true");

        t.eq("DOM data-state updated", el?.getAttribute("data-state") ?? "", "closed");
        t.eq("DOM data-user-id removed", el?.getAttribute("data-user-id") ?? null, null);
        t.eq("DOM data-flag preserved", el?.getAttribute("data-flag") ?? "", "true");
      },

      preview(tree) {
        const el = tree.find.byId("btn")?.dom.el?.();
        return el && "outerHTML" in el ? (el as Element).outerHTML : "<no button dom>";
      },
    },
    {
      suite: SUITE,
      name: "dataset: camelCase keys serialize to kebab-case data-* attrs",
      dom: true,
      fixture: "dataset/normalize",
      sub: "camel-to-kebab",

      html: `<main><button id="btn"></button></main>`,

      async act(tree) {
        const btn = tree.find.must.byId("btn");

        btn.data.setMany({
          userId: 42,
          longThingName: "abc",
        });

        await tick();
      },

      assert(tree, t) {
        const btn = tree.find.must.byId("btn").dom.el() as HTMLElement;

        t.eq("data-user-id", btn.getAttribute("data-user-id"), "42");
        t.eq("data-long-thing-name", btn.getAttribute("data-long-thing-name"), "abc");
      },

      preview(tree) {
        const el = tree.find.byId("btn")?.dom.el?.();
        return el && "outerHTML" in el ? (el as Element).outerHTML : "<no btn dom>";
      },
    },

    {
      suite: SUITE,
      name: "dataset: null/undefined remove, false stringifies, empty string persists",
      dom: true,
      fixture: "dataset/semantics",
      sub: "nullish-bool-empty",

      html: `<main><button id="btn"></button></main>`,

      async act(tree) {
        const btn = tree.find.must.byId("btn");

        btn.data.setMany({
          state: "open",
          enabled: false,
          empty: "",
          killA: "x",
          killB: "y",
        });

        btn.data.setMany({
          killA: null,
          killB: undefined,
        } as unknown as Record<string, DatasetValue>);

        await tick();
      },

      assert(tree, t) {
        const btn = tree.find.must.byId("btn").dom.el() as HTMLElement;

        t.eq("data-state", btn.getAttribute("data-state"), "open");
        t.eq("false stringifies", btn.getAttribute("data-enabled"), "false");
        t.eq("empty string persists", btn.getAttribute("data-empty"), "");
        t.eq("null removes", btn.hasAttribute("data-kill-a"), false);
        t.eq("undefined removes", btn.hasAttribute("data-kill-b"), false);
      },

      preview(tree) {
        const el = tree.find.byId("btn")?.dom.el?.();
        return el && "outerHTML" in el ? (el as Element).outerHTML : "<no btn dom>";
      },
    },
    {
      suite: SUITE,
      name: "dataset: multi-selection setMany applies to all matched nodes",
      dom: true,
      fixture: "dataset/multi",
      sub: "setMany-all",

      html: `
    <main>
      <button class="item" id="a"></button>
      <button class="item" id="b"></button>
      <button class="item" id="c"></button>
    </main>
  `,

      async act(tree) {
        const items = tree.findAll.byAttribute("class", "item");

        items.data.setMany({
          state: "closed",
          flag: true,
        });

        await tick();
      },

      assert(tree, t) {
        for (const id of ["a", "b", "c"] as const) {
          const el = tree.find.must.byId(id).dom.el() as HTMLElement;
          t.eq(`${id}: data-state`, el.getAttribute("data-state"), "closed");
          t.eq(`${id}: data-flag`, el.getAttribute("data-flag"), "true");
        }
      },

      preview(tree) {
        return (["a", "b", "c"] as const)
          .map((id) => {
            const el = tree.find.byId(id)?.dom.el?.();
            return el && "outerHTML" in el ? (el as Element).outerHTML : `<missing ${id}>`;
          })
          .join("\n");
      },
    },
    {
      suite: SUITE,
      name: "dataset: multi-selection remove clears targeted key and preserves siblings",
      dom: true,
      fixture: "dataset/multi",
      sub: "remove-preserve-siblings",

      html: `
    <main>
      <button class="item" id="a"></button>
      <button class="item" id="b"></button>
    </main>
  `,

      async act(tree) {
        const items = tree.findAll.byAttribute("class", "item");

        items.data.setMany({
          state: "open",
          userId: 42,
        });

        items.data.set("state", null);

        await tick();
      },

      assert(tree, t) {
        for (const id of ["a", "b"] as const) {
          const el = tree.find.must.byId(id).dom.el() as HTMLElement;
          t.eq(`${id}: state removed`, el.hasAttribute("data-state"), false);
          t.eq(`${id}: user-id preserved`, el.getAttribute("data-user-id"), "42");
        }
      },

      preview(tree) {
        return (["a", "b"] as const)
          .map((id) => {
            const el = tree.find.byId(id)?.dom.el?.();
            return el && "outerHTML" in el ? (el as Element).outerHTML : `<missing ${id}>`;
          })
          .join("\n");
      },
    },
    {
      suite: SUITE,
      name: "dataset: existing DOM data-* attrs survive graft and targeted mutation",
      dom: true,
      fixture: "dataset/dom-origin",
      sub: "read-mutate-existing",

      html: `
    <main>
      <button
        id="btn"
        data-state="open"
        data-user-id="42"
        data-mode="alpha"
      ></button>
    </main>
  `,

      async act(tree) {
        const btn = tree.find.must.byId("btn");

        btn.data.set("state", "closed");
        btn.data.set("mode", null);

        await tick();
      },

      assert(tree, t) {
        const el = tree.find.must.byId("btn").dom.el() as HTMLElement;

        t.eq("state updated", el.getAttribute("data-state"), "closed");
        t.eq("user-id preserved", el.getAttribute("data-user-id"), "42");
        t.eq("mode removed", el.hasAttribute("data-mode"), false);
      },

      preview(tree) {
        const el = tree.find.byId("btn")?.dom.el?.();
        return el && "outerHTML" in el ? (el as Element).outerHTML : "<no btn dom>";
      },
    },

    {
      suite: SUITE,
      name: "dataset: values persist across refind",
      dom: true,
      fixture: "dataset/refind",
      sub: "persist-across-refind",

      html: `<main><button id="btn"></button></main>`,

      async act(tree) {
        const btn = tree.find.must.byId("btn");
        btn.data.setMany({
          state: "closed",
          userId: 42,
        });

        await tick();
      },

      assert(tree, t) {
        const btnA = tree.find.must.byId("btn").dom.el() as HTMLElement;
        const btnB = tree.find.must.byId("btn").dom.el() as HTMLElement;

        t.eq("same DOM node", btnA, btnB);
        t.eq("state persists", btnB.getAttribute("data-state"), "closed");
        t.eq("user-id persists", btnB.getAttribute("data-user-id"), "42");
      },

      preview(tree) {
        const el = tree.find.byId("btn")?.dom.el?.();
        return el && "outerHTML" in el ? (el as Element).outerHTML : "<no btn dom>";
      },
    },



  ];

  return make_livetree_suite(SUITE, cases);
}


function suite_css_more(): TestSuite {
  const SUITE = "livetree/more-css";

  const tick = async (): Promise<void> => {
    await new Promise<void>((r) => setTimeout(() => r(), 0));
  };

  const css_snapshot = (tree: LiveTree): string => {
    const snap = tree.css.devSnapshot;
    return snap ? snap() : "<no devsnapshot>";
  };

  const find_rule_slice = (cssText: string, quid: string): string => {
    const start = cssText.indexOf(`[data-_quid="${quid}"]`);
    return start >= 0 ? cssText.slice(start, start + 400) : "";
  };

  const cases: readonly LiveTreeCaseSpec[] = [
    {
      suite: SUITE,
      name: "css.setProp generates a QUID-scoped CSS rule",
      fixture: "css/setProp",
      sub: "single-quid-rule",
      dom: true,
      html: `
        <div id="root">
          <div id="box"></div>
        </div>
      `,

      async act(tree) {
        const box = tree.find.must.byId("box");
        box.css.setProp("background-color", "red");
        await tick();
      },

      assert(tree, t) {
        const box = tree.find.must.byId("box");
        const el = box.dom.el();

        t.ok("box DOM exists", !!el);

        const quid = el?.getAttribute("data-_quid") ?? "";
        t.ok("box has quid", quid.length > 0);

        const cssText = css_snapshot(tree);
        const rule = find_rule_slice(cssText, quid);

        t.ok("rule exists for box quid", rule.length > 0);
        t.ok("rule contains selector", rule.includes(`[data-_quid="${quid}"]`));
        t.ok("rule contains background-color red", rule.includes("background-color: red"));
      },

      preview(tree) {
        const box = tree.find.byId("box");
        const el = box?.dom.el?.();
        const quid = el?.getAttribute("data-_quid") ?? "";
        const cssText = css_snapshot(tree);
        return find_rule_slice(cssText, quid) || "<no scoped rule>";
      },
    },

    {
      suite: SUITE,
      name: "multi-selection css.setProp applies a scoped rule to each selected QUID",
      fixture: "css/multi",
      sub: "apply-all-selected",
      dom: true,
      html: `
        <section id="root">
          <p class="x">one</p>
          <p class="x">two</p>
          <p class="y">three</p>
        </section>
      `,

      async act(tree) {
        const multi = tree.findAll({ tag: "p", attrs: { class: "x" } });
        multi.css.setProp("color", "red");
        await tick();
      },

      assert(tree, t) {
        const multi = tree.findAll({ tag: "p", attrs: { class: "x" } });
        const arr = multi.array();

        t.eq("selected .x count", arr.length, 2);

        const cssText = css_snapshot(tree);

        for (let i = 0; i < arr.length; i += 1) {
          const el = arr[i]?.dom.el();
          const quid = el?.getAttribute("data-_quid") ?? "";

          t.ok(`.x[${i}] has quid`, quid.length > 0);

          const rule = find_rule_slice(cssText, quid);
          t.ok(`rule exists for quid ${quid}`, rule.length > 0);
          t.ok(`rule contains selector for quid ${quid}`, rule.includes(`[data-_quid="${quid}"]`));
          t.ok(`rule contains color red for quid ${quid}`, rule.includes("color: red"));
        }
      },

      preview(tree) {
        const cssText = css_snapshot(tree);
        return cssText || "<no css snapshot>";
      },
    },

    {
      suite: SUITE,
      name: "css.setProp supports object CssValue { value, unit }",
      fixture: "css/object-value",
      sub: "value-unit",
      dom: true,
      html: `
        <div id="root">
          <div id="box"></div>
        </div>
      `,

      async act(tree) {
        const box = tree.find.must.byId("box");
        box.css.setProp("margin-left", { value: 12, unit: "px" });
        await tick();
      },

      assert(tree, t) {
        const box = tree.find.must.byId("box");
        const el = box.dom.el();

        t.ok("box DOM exists", !!el);

        const quid = el?.getAttribute("data-_quid") ?? "";
        t.ok("box has quid", quid.length > 0);

        const cssText = css_snapshot(tree);
        const rule = find_rule_slice(cssText, quid);

        t.ok("rule exists for box quid", rule.length > 0);
        t.ok("rule contains margin-left 12px", rule.includes("margin-left: 12px"));
      },

      preview(tree) {
        const box = tree.find.byId("box");
        const el = box?.dom.el?.();
        const quid = el?.getAttribute("data-_quid") ?? "";
        const cssText = css_snapshot(tree);
        return find_rule_slice(cssText, quid) || "<no scoped rule>";
      },
    },
  ];

  return make_livetree_suite(SUITE, cases);
}
function suite_find_more(): TestSuite {
  const SUITE = "livetree/more-find";

  const cases: readonly LiveTreeCaseSpec[] = [
    {
      suite: SUITE,
      name: "find / findAll preserve hit-miss semantics and result order",
      fixture: "find/semantics",
      sub: "hits-misses-order",
      html: `
        <section id="root">
          <p class="a">one</p>
          <p class="b">two</p>
        </section>
      `,

      act(tree) {
        void tree;
      },

      assert(tree, t) {
        const root = tree.find.must.byId("root");

        const hit = root.find({ tag: "p", attrs: { class: "a" } });
        t.ok("find hit returns tree", !!hit);

        const miss = root.find({ tag: "p", attrs: { class: "nope" } });
        t.eq("find miss returns undefined", miss, undefined);

        const allMiss = root.findAll({ tag: "p", attrs: { class: "nope" } });
        t.eq("findAll miss count is zero", allMiss.length, 0);

        const allPs = root.findAll({ tag: "p" });
        t.eq("findAll count is two", allPs.length, 2);

        const texts: string[] = [];
        allPs.each((branch) => {
          texts.push(branch.text.get());
        });

        t.eq("findAll order preserved", texts.join(","), "one,two");
      },

      preview(tree) {
        const root = tree.find.byId("root")?.dom.el?.();
        return root && "outerHTML" in root ? (root as Element).outerHTML : "<no root dom>";
      },
    },

    {
      suite: SUITE,
      name: "must throws on miss while findAll stays empty-but-defined",
      fixture: "find/semantics",
      sub: "must-vs-findAll",
      html: `
        <div id="root">
          <span class="a"></span>
          <span class="b"></span>
        </div>
      `,

      act(tree) {
        void tree;
      },

      assert(tree, t) {
        const root = tree.find.must.byId("root");

        let threw = false;
        try {
          root.find.must(".nope");
        } catch {
          threw = true;
        }

        t.ok("find.must throws on miss", threw);

        const none = root.findAll(".nope");
        t.eq("findAll miss count is zero", none.length, 0);

        const allSpans = root.findAll("span");
        t.eq("findAll span count is two", allSpans.length, 2);

        const classes: string[] = [];
        allSpans.each((branch) => {
          classes.push(String(branch.attr.get("class") ?? ""));
        });

        t.eq("findAll preserves class order", classes.join(","), "a,b");
      },

      preview(tree) {
        const root = tree.find.byId("root")?.dom.el?.();
        return root && "outerHTML" in root ? (root as Element).outerHTML : "<no root dom>";
      },
    },

    {
      suite: SUITE,
      name: "tree.node is live while plain JSON snapshot is not",
      fixture: "node/live",
      sub: "live-vs-snapshot",
      html: `
        <div id="root">
          <span class="a"></span>
          <span class="b"></span>
        </div>
      `,

      act(tree) {
        const liveNode = tree.node;
        const snapshot = JSON.parse(JSON.stringify(liveNode));

        tree.attr.set("data-state", "mutated");

        (tree as unknown as {
          __liveNode?: HsonNode;
          __snapshot?: Record<string, unknown>;
        }).__liveNode = liveNode;

        (tree as unknown as {
          __liveNode?: HsonNode;
          __snapshot?: Record<string, unknown>;
        }).__snapshot = snapshot;
      },

      assert(tree, t) {
        const stash = tree as unknown as {
          __liveNode?: HsonNode;
          __snapshot?: { $_attrs?: Record<string, unknown>; };
        };

        t.ok("live node captured", !!stash.__liveNode);
        t.ok("snapshot captured", !!stash.__snapshot);

        t.eq(
          "live node sees mutation",
          stash.__liveNode?.$_attrs?.["data-state"],
          "mutated"
        );

        t.eq(
          "snapshot does not see mutation",
          stash.__snapshot?.$_attrs?.["data-state"],
          undefined
        );
      },

      preview(tree) {
        return JSON.stringify(tree.node.$_attrs ?? {});
      },
    },
  ];

  return make_livetree_suite(SUITE, cases);
}

export function suite_final_legacy_css(): readonly TestSuite[] {
  return [
    suite_css_value_and_selection(),
    suite_css_empty(),
  ] as const;
}

function suite_css_value_and_selection(): TestSuite {
  const SUITE = "livetree/legacy-css-value-selection";

  const tick = async (): Promise<void> => {
    await new Promise<void>((r) => setTimeout(() => r(), 0));
  };

  const snapshot_from = (tree: LiveTree, byId: string): string => {
    const node = tree.find.must.byId(byId);
    const snap = node.css.devSnapshot;
    return snap ? snap() : "<no devsnapshot>";
  };

  const rule_for_quid = (cssText: string, quid: string): string => {
    const start = cssText.indexOf(`[data-_quid="${quid}"]`);
    return start >= 0 ? cssText.slice(start, start + 400) : "";
  };

  const cases: readonly LiveTreeCaseSpec[] = [
    {
      suite: SUITE,
      name: "css.setProp supports object CssValue { value, unit } end-to-end",
      fixture: "css/object-value",
      sub: "value-unit",
      dom: true,
      html: `
        <div id="root">
          <div id="box"></div>
        </div>
      `,

      async act(tree) {
        const box = tree.find.must.byId("box");
        box.css.setProp("margin-left", { value: 12, unit: "px" });
        await tick();
      },

      assert(tree, t) {
        const box = tree.find.must.byId("box");
        const el = box.dom.el();

        t.ok("box DOM exists", !!el);

        const quid = el?.getAttribute("data-_quid") ?? "";
        t.ok("box has quid", quid.length > 0);

        const cssText = snapshot_from(tree, "box");
        const rule = rule_for_quid(cssText, quid);

        t.ok("rule exists for box quid", rule.length > 0);
        t.ok("rule contains margin-left 12px", rule.includes("margin-left: 12px"));
      },

      preview(tree) {
        const box = tree.find.byId("box");
        const el = box?.dom.el?.();
        const quid = el?.getAttribute("data-_quid") ?? "";
        const cssText = snapshot_from(tree, "box");
        return rule_for_quid(cssText, quid) || "<no scoped rule>";
      },
    },

    {
      suite: SUITE,
      name: "multi-selection css.setProp applies a scoped rule to each selected QUID",
      fixture: "css/multi",
      sub: "apply-all-selected",
      dom: true,
      html: `
        <section id="root">
          <p class="x">one</p>
          <p class="x">two</p>
          <p class="y">three</p>
        </section>
      `,

      async act(tree) {
        const multi = tree.findAll({ tag: "p", attrs: { class: "x" } });
        multi.css.setProp("color", "red");
        await tick();
      },

      assert(tree, t) {
        const multi = tree.findAll({ tag: "p", attrs: { class: "x" } });
        const arr = multi.array();

        t.eq("selected .x count", arr.length, 2);

        const first = arr[0];
        const snap = first?.css.devSnapshot;
        const cssText = snap ? snap() : "<no devsnapshot>";

        for (let i = 0; i < arr.length; i += 1) {
          const el = arr[i]?.dom.el();
          const quid = el?.getAttribute("data-_quid") ?? "";

          t.ok(`.x[${i}] has quid`, quid.length > 0);

          const rule = rule_for_quid(cssText, quid);
          t.ok(`rule exists for quid ${quid}`, rule.length > 0);
          t.ok(`rule contains selector for quid ${quid}`, rule.includes(`[data-_quid="${quid}"]`));
          t.ok(`rule contains color red for quid ${quid}`, rule.includes("color: red"));
        }
      },

      preview(tree) {
        const multi = tree.findAll({ tag: "p", attrs: { class: "x" } });
        const first = multi.array()[0];
        const snap = first?.css.devSnapshot;
        return snap ? snap() : "<no css snapshot>";
      },
    },

    {
      suite: SUITE,
      name: "multi-selection emits separate rule blocks per QUID",
      fixture: "css/multi",
      sub: "separate-blocks",
      dom: true,
      html: `
        <section id="root">
          <p class="x">one</p>
          <p class="x">two</p>
        </section>
      `,

      async act(tree) {
        const multi = tree.findAll({ tag: "p", attrs: { class: "x" } });
        multi.css.setProp("color", "red");
        await tick();
      },

      assert(tree, t) {
        const multi = tree.findAll({ tag: "p", attrs: { class: "x" } });
        const arr = multi.array();

        t.eq("selected .x count", arr.length, 2);

        const first = arr[0];
        const snap = first?.css.devSnapshot;
        const cssText = snap ? snap() : "<no devsnapshot>";
        const flat = cssText.replace(/\s+/g, " ");

        const quids = arr
          .map((n) => n.dom.el()?.getAttribute("data-_quid") ?? "")
          .filter(Boolean);

        for (const quid of quids) {
          const selector = `[data-_quid="${quid}"]`;
          const hits = flat.split(`${selector} {`).length - 1;
          t.eq(`exactly one block for ${selector}`, hits, 1);
        }

        t.eq(
          "no merged selector list emitted",
          flat.includes(`"], [`),
          false,
        );
      },

      preview(tree) {
        const multi = tree.findAll({ tag: "p", attrs: { class: "x" } });
        const first = multi.array()[0];
        const snap = first?.css.devSnapshot;
        return snap ? snap() : "<no css snapshot>";
      },
    },
  ];

  return make_livetree_suite(SUITE, cases);
}

function suite_css_empty(): TestSuite {
  const SUITE = "livetree/final-legacy-css-empty";

  const tick = async (): Promise<void> => {
    await new Promise<void>((r) => setTimeout(() => r(), 0));
  };

  const snapshot_from_first_real_node = (tree: LiveTree): string => {
    const root = tree.find.must.byId("root");
    const snap = root.css.devSnapshot;
    return snap ? snap() : "<no devsnapshot>";
  };

  const cases: readonly LiveTreeCaseSpec[] = [
    {
      suite: SUITE,
      name: "css operations on empty selection are a no-op",
      fixture: "css/empty-selection",
      sub: "noop",
      dom: true,
      html: `
        <div id="root">
          <p class="x">one</p>
        </div>
      `,

      async act(tree) {
        const root = tree.find.must.byId("root");
        const emptyMulti = root.findAll({ tag: "span", attrs: { class: "nope" } });

        (tree as unknown as { __before?: string }).__before = snapshot_from_first_real_node(tree);

        emptyMulti.css.setProp("color", "red");
        emptyMulti.css.setMany({ opacity: "0.5" });
        emptyMulti.css.clear();

        await tick();

        (tree as unknown as { __after?: string }).__after = snapshot_from_first_real_node(tree);
      },

      assert(tree, t) {
        const root = tree.find.must.byId("root");
        const emptyMulti = root.findAll({ tag: "span", attrs: { class: "nope" } });

        t.eq("empty selection count is zero", emptyMulti.length, 0);

        const stash = tree as unknown as { __before?: string; __after?: string };
        t.eq(
          "css snapshot unchanged after empty-selection ops",
          stash.__after ?? "",
          stash.__before ?? "",
        );
      },

      preview(tree) {
        const stash = tree as unknown as { __after?: string };
        return stash.__after ?? "<no snapshot>";
      },
    },
  ];

  return make_livetree_suite(SUITE, cases);
}