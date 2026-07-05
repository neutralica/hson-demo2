import type { TestSuite } from "../../app/demos/test/tests.types";
import type { LiveTreeCaseSpec } from "../../app/demos/test/livemap-tests.types";
import { make_livetree_suite } from "./make-livetree-suite";

export function livetree_text_content_surface(): TestSuite {
  const SUITE = "livetree/text-content-surface";

  const cases: readonly LiveTreeCaseSpec[] = [
    {
      suite: SUITE,
      name: "text surface: set replaces text leaves while preserving element children",
      fixture: "text-content/text",
      sub: "set-preserves-elements",
      dom: true,
      html: `
        <main id="root">
          <p id="target">hello <span id="child">child</span> world</p>
        </main>
      `,

      act(tree) {
        const target = tree.find.must.byId("target");

        target.text.set("updated");

        (tree as any).__result = {
          text: target.text.get(),
          childExists: !!target.find.byId("child"),
          childText: target.find.must.byId("child").text.get(),
          domText: target.dom.must.el().textContent,
          childCount: target.content.count(),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("text.set updates text leaves", r.text, "updatedchild");
        t.eq("text.set preserves child element", r.childExists, true);
        t.eq("text.set preserves child text", r.childText, "child");
        t.eq("text.set mirrors to DOM text content", r.domText, "updatedchild");
        t.eq("content manager still sees one child element", r.childCount, 1);
      },
    },

    {
      suite: SUITE,
      name: "text surface: overwrite replaces all content with one text leaf",
      fixture: "text-content/text",
      sub: "overwrite-clears-elements",
      dom: true,
      html: `
        <main id="root">
          <p id="target">hello <span id="child">child</span> world</p>
        </main>
      `,

      act(tree) {
        const target = tree.find.must.byId("target");

        target.text.overwrite("only text");

        (tree as any).__result = {
          text: target.text.get(),
          childExists: !!target.find.byId("child"),
          contentCount: target.content.count(),
          domText: target.dom.must.el().textContent,
          domChildElementCount: target.dom.must.el().children.length,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("text.overwrite replaces text value", r.text, "only text");
        t.eq("text.overwrite removes child element from tree", r.childExists, false);
        t.eq("text.overwrite leaves no element children", r.contentCount, 0);
        t.eq("text.overwrite mirrors to DOM text content", r.domText, "only text");
        t.eq("text.overwrite removes DOM element children", r.domChildElementCount, 0);
      },
    },

    {
      suite: SUITE,
      name: "text surface: add appends text after existing text and element children",
      fixture: "text-content/text",
      sub: "add-appends",
      dom: true,
      html: `
        <main id="root">
          <p id="target">a<span id="child">b</span></p>
        </main>
      `,

      act(tree) {
        const target = tree.find.must.byId("target");

        target.text.add("c");

        (tree as any).__result = {
          text: target.text.get(),
          childText: target.find.must.byId("child").text.get(),
          contentCount: target.content.count(),
          domText: target.dom.must.el().textContent,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("text.add appends new text leaf", r.text, "abc");
        t.eq("text.add preserves child element text", r.childText, "b");
        t.eq("text.add preserves one element child", r.contentCount, 1);
        t.eq("text.add mirrors appended text to DOM", r.domText, "abc");
      },
    },

    {
      suite: SUITE,
      name: "text surface: insert can place text before an existing text leaf",
      fixture: "text-content/text",
      sub: "insert-before-text",
      dom: true,
      html: `
        <main id="root">
          <p id="target">bc</p>
        </main>
      `,

      act(tree) {
        const target = tree.find.must.byId("target");

        target.text.insert(0, "a");

        (tree as any).__result = {
          text: target.text.get(),
          domText: target.dom.must.el().textContent,
          contentCount: target.content.count(),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("text.insert at zero prepends text leaf", r.text, "abc");
        t.eq("text.insert at zero mirrors to DOM", r.domText, "abc");
        t.eq("text.insert does not create element children", r.contentCount, 0);
      },
    },

    {
      suite: SUITE,
      name: "text surface: insert with mixed content keeps element children addressable",
      fixture: "text-content/text",
      sub: "insert-mixed-content",
      dom: true,
      html: `
        <main id="root">
          <p id="target">a<span id="child">b</span>c</p>
        </main>
      `,

      act(tree) {
        const target = tree.find.must.byId("target");

        target.text.insert(1, "-");

        (tree as any).__result = {
          text: target.text.get(),
          domText: target.dom.must.el().textContent,
          childExists: !!target.find.byId("child"),
          childText: target.find.must.byId("child").text.get(),
          contentCount: target.content.count(),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("text.insert participates in mixed text order", r.text, "a-bc");
        t.eq("text.insert mirrors mixed content to DOM", r.domText, "a-bc");
        t.eq("text.insert preserves child element", r.childExists, true);
        t.eq("text.insert preserves child text", r.childText, "b");
        t.eq("content manager still sees one element child", r.contentCount, 1);
      },
    },

    {
      suite: SUITE,
      name: "text surface: primitive values stringify through text APIs",
      fixture: "text-content/text",
      sub: "primitive-values",
      dom: true,
      html: `
        <main id="root">
          <p id="target"></p>
        </main>
      `,

      act(tree) {
        const target = tree.find.must.byId("target");

        target.text.set(12);
        const afterNumber = target.text.get();

        target.text.overwrite(false);
        const afterFalse = target.text.get();

        target.text.add(null);
        const afterNullAdd = target.text.get();

        (tree as any).__result = {
          afterNumber,
          afterFalse,
          afterNullAdd,
          domText: target.dom.must.el().textContent,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("text.set stringifies number", r.afterNumber, "12");
        t.eq("text.overwrite stringifies false", r.afterFalse, "false");
        t.eq("text.add handles null as empty text", r.afterNullAdd, "false");
        t.eq("primitive text changes mirror to DOM", r.domText, "false");
      },
    },

    {
      suite: SUITE,
      name: "text surface: detached text mutations survive later append",
      fixture: "text-content/text",
      sub: "detached-then-append",
      dom: true,
      html: `
        <main id="root"></main>
      `,

      act(tree) {
        const root = tree.find.must.byId("root");
        const branch = root.create.div().id.set("mounted-first");

        const detached = branch.cloneBranch();
        detached.id.set("detached-text");
        detached.text.overwrite("before append");
        detached.text.add(" + after");

        root.append(detached);

        const mounted = tree.find.must.byId("detached-text");

        (tree as any).__result = {
          text: mounted.text.get(),
          domText: mounted.dom.must.el().textContent,
          isConnected: mounted.dom.isConnected(),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("detached text mutations survive append", r.text, "before append + after");
        t.eq("detached text mutations project after append", r.domText, "before append + after");
        t.eq("appended detached text branch is connected", r.isConnected, true);
      },
    },

    {
      suite: SUITE,
      name: "content surface: count, first, at, and all expose element children only",
      fixture: "text-content/content",
      sub: "element-children-only",
      dom: true,
      html: `
        <main id="root">
          text before
          <section id="one"></section>
          middle text
          <section id="two"></section>
          text after
        </main>
      `,

      act(tree) {
        const root = tree.find.must.byId("root");
        const all = root.content.all();

        (tree as any).__result = {
          count: root.content.count(),
          firstId: root.content.first()?.id.get(),
          atZeroId: root.content.at(0)?.id.get(),
          atOneId: root.content.at(1)?.id.get(),
          atTwo: root.content.at(2),
          allLength: all.length,
          allIds: all.map((child) => child.id.get()),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("content.count ignores primitive text leaves", r.count, 2);
        t.eq("content.first returns first element child", r.firstId, "one");
        t.eq("content.at(0) returns first element child", r.atZeroId, "one");
        t.eq("content.at(1) returns second element child", r.atOneId, "two");
        t.eq("content.at out of range returns undefined", r.atTwo, undefined);
        t.eq("content.all returns two element children", r.allLength, 2);
        t.eq("content.all preserves first id", r.allIds[0], "one");
        t.eq("content.all preserves second id", r.allIds[1], "two");
      },
    },

    {
      suite: SUITE,
      name: "content surface: all returns a defensive readonly-style snapshot",
      fixture: "text-content/content",
      sub: "all-snapshot",
      dom: true,
      html: `
        <main id="root">
          <section id="one"></section>
          <section id="two"></section>
        </main>
      `,

      act(tree) {
        const root = tree.find.must.byId("root");
        const all = root.content.all().array();

        all.pop();

        (tree as any).__result = {
          mutatedSnapshotLength: all.length,
          liveCountAfterSnapshotMutation: root.content.count(),
          liveIdsAfterSnapshotMutation: root.content.all().map((child) => child.id.get()),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("local snapshot can be mutated without changing tree", r.mutatedSnapshotLength, 1);
        t.eq("tree content count remains unchanged", r.liveCountAfterSnapshotMutation, 2);
        t.eq("tree still has first child", r.liveIdsAfterSnapshotMutation[0], "one");
        t.eq("tree still has second child", r.liveIdsAfterSnapshotMutation[1], "two");
      },
    },

    {
      suite: SUITE,
      name: "content surface: mustOnly returns sole element child",
      fixture: "text-content/content",
      sub: "must-only-hit",
      dom: true,
      html: `
        <main id="root">
          text before
          <section id="only">only</section>
          text after
        </main>
      `,

      act(tree) {
        const root = tree.find.must.byId("root");
        const only = root.content.mustOnly();

        (tree as any).__result = {
          id: only.id.get(),
          text: only.text.get(),
          count: root.content.count(),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("content.mustOnly returns sole element child", r.id, "only");
        t.eq("content.mustOnly child remains usable", r.text, "only");
        t.eq("content.count sees one element child", r.count, 1);
      },
    },

    {
      suite: SUITE,
      name: "content surface: mustOnly throws for zero element children",
      fixture: "text-content/content",
      sub: "must-only-zero",
      dom: true,
      html: `
        <main id="root">
          text only
        </main>
      `,

      act(tree) {
        const root = tree.find.must.byId("root");
        let threw = false;

        try {
          root.content.mustOnly();
        } catch {
          threw = true;
        }

        (tree as any).__result = {
          count: root.content.count(),
          first: root.content.first(),
          threw,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("content.count is zero for text-only node", r.count, 0);
        t.eq("content.first is undefined for text-only node", r.first, undefined);
        t.eq("content.mustOnly throws for zero children", r.threw, true);
      },
    },

    {
      suite: SUITE,
      name: "content surface: mustOnly throws for multiple element children",
      fixture: "text-content/content",
      sub: "must-only-multiple",
      dom: true,
      html: `
        <main id="root">
          <section id="one"></section>
          <section id="two"></section>
        </main>
      `,

      act(tree) {
        const root = tree.find.must.byId("root");
        let threw = false;

        try {
          root.content.mustOnly();
        } catch {
          threw = true;
        }

        (tree as any).__result = {
          count: root.content.count(),
          firstId: root.content.first()?.id.get(),
          threw,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("content.count is two", r.count, 2);
        t.eq("content.first still returns first child", r.firstId, "one");
        t.eq("content.mustOnly throws for multiple children", r.threw, true);
      },
    },

    {
      suite: SUITE,
      name: "content surface: handles children created after reads",
      fixture: "text-content/content",
      sub: "fresh-after-create",
      dom: true,
      html: `
        <main id="root"></main>
      `,

      act(tree) {
        const root = tree.find.must.byId("root");

        const beforeCount = root.content.count();
        const beforeFirst = root.content.first();

        root.create.section().id.set("one");
        root.create.section().id.set("two");

        (tree as any).__result = {
          beforeCount,
          beforeFirst,
          afterCount: root.content.count(),
          afterIds: root.content.all().map((child) => child.id.get()),
          atOneId: root.content.at(1)?.id.get(),
          domChildCount: root.dom.must.el().children.length,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("content.count initially zero", r.beforeCount, 0);
        t.eq("content.first initially undefined", r.beforeFirst, undefined);
        t.eq("content.count updates after create", r.afterCount, 2);
        t.eq("content.all includes first created child", r.afterIds[0], "one");
        t.eq("content.all includes second created child", r.afterIds[1], "two");
        t.eq("content.at reads newly created child", r.atOneId, "two");
        t.eq("DOM child count matches created element children", r.domChildCount, 2);
      },
    },

    {
      suite: SUITE,
      name: "text and content surface: removeChildren leaves text APIs usable",
      fixture: "text-content/interactions",
      sub: "remove-children-then-text",
      dom: true,
      html: `
        <main id="root">
          before
          <section id="one">one</section>
          <section id="two">two</section>
          after
        </main>
      `,

      act(tree) {
        const root = tree.find.must.byId("root");

        const removed = root.removeChildren();
        const countAfterRemove = root.content.count();

        root.text.set("remaining text changed");
        root.text.add(" + added");

        (tree as any).__result = {
          removed,
          countAfterRemove,
          textAfter: root.text.get(),
          domTextAfter: root.dom.must.el().textContent,
          oneExists: !!tree.find.byId("one"),
          twoExists: !!tree.find.byId("two"),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("removeChildren removes two element children", r.removed, 2);
        t.eq("content.count is zero after removeChildren", r.countAfterRemove, 0);
        t.eq("text APIs remain usable after removeChildren", r.textAfter, "remaining text changed + added");
        t.eq("text APIs mirror after removeChildren", r.domTextAfter, "remaining text changed + added");
        t.eq("first removed child is no longer findable", r.oneExists, false);
        t.eq("second removed child is no longer findable", r.twoExists, false);
      },
    },
  ];

  return make_livetree_suite(SUITE, cases);
}


export function livetree_listener_builder_corners(): TestSuite {
  const SUITE = "livetree/listener-builder-corners";

  const cases: readonly LiveTreeCaseSpec[] = [
    {
      suite: SUITE,
      name: "listener builder: onCustom receives custom event",
      fixture: "listener-builder/custom",
      sub: "on-custom",
      dom: true,
      html: `
        <main id="root">
          <button id="button">go</button>
        </main>
      `,

      act(tree) {
        const button = tree.find.must.byId("button");
        const el = button.dom.must.el();

        let hits = 0;
        let seenType = "";

        const sub = button.listen.onCustom("hson-custom", (ev) => {
          hits += 1;
          seenType = ev.type;
        });

        el.dispatchEvent(new CustomEvent("hson-custom", { bubbles: true }));
        sub.off();
        el.dispatchEvent(new CustomEvent("hson-custom", { bubbles: true }));

        (tree as any).__result = {
          hits,
          seenType,
          subCountAfterOff: sub.count,
          subOkAfterOff: sub.ok,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("onCustom receives event once before off", r.hits, 1);
        t.eq("onCustom passes event type", r.seenType, "hson-custom");
        t.eq("onCustom off clears subscription count", r.subCountAfterOff, 0);
        t.eq("onCustom off marks subscription not ok", r.subOkAfterOff, false);
      },
    },

    {
      suite: SUITE,
      name: "listener builder: onCustomDetail receives typed CustomEvent detail",
      fixture: "listener-builder/custom",
      sub: "on-custom-detail",
      dom: true,
      html: `
        <main id="root">
          <button id="button">go</button>
        </main>
      `,

      act(tree) {
        const button = tree.find.must.byId("button");
        const el = button.dom.must.el();

        let hits = 0;
        let value = "";
        let count = 0;

        const sub = button.listen.onCustomDetail<{ value: string; count: number }>(
          "hson-detail",
          (ev) => {
            hits += 1;
            value = ev.detail.value;
            count = ev.detail.count;
          },
        );

        el.dispatchEvent(new CustomEvent("hson-detail", {
          bubbles: true,
          detail: { value: "ok", count: 7 },
        }));

        sub.off();

        (tree as any).__result = {
          hits,
          value,
          count,
          subCountAfterOff: sub.count,
          subOkAfterOff: sub.ok,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("onCustomDetail receives one event", r.hits, 1);
        t.eq("onCustomDetail reads detail value", r.value, "ok");
        t.eq("onCustomDetail reads detail count", r.count, 7);
        t.eq("onCustomDetail off clears subscription count", r.subCountAfterOff, 0);
        t.eq("onCustomDetail off marks subscription not ok", r.subOkAfterOff, false);
      },
    },

    {
      suite: SUITE,
      name: "listener builder: once works with custom events",
      fixture: "listener-builder/options",
      sub: "once-custom",
      dom: true,
      html: `
        <main id="root">
          <button id="button">go</button>
        </main>
      `,

      act(tree) {
        const button = tree.find.must.byId("button");
        const el = button.dom.must.el();

        let hits = 0;
        const sub = button.listen.once().onCustom("once-custom", () => {
          hits += 1;
        });

        el.dispatchEvent(new CustomEvent("once-custom", { bubbles: true }));
        el.dispatchEvent(new CustomEvent("once-custom", { bubbles: true }));
        sub.off();

        (tree as any).__result = {
          hits,
          subCountAfterOff: sub.count,
          subOkAfterOff: sub.ok,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("once custom listener fires once", r.hits, 1);
        t.eq("once custom off clears subscription count", r.subCountAfterOff, 0);
        t.eq("once custom off marks subscription not ok", r.subOkAfterOff, false);
      },
    },

    {
      suite: SUITE,
      name: "listener builder: toDocument alias targets document",
      fixture: "listener-builder/ambient",
      sub: "to-document",
      dom: true,
      html: `
        <main id="root">
          <button id="owner">owner</button>
        </main>
      `,

      act(tree) {
        const owner = tree.find.must.byId("owner");

        let hits = 0;
        let seenType = "";

        const sub = owner.listen.toDocument().onCustom("doc-alias-event", (ev) => {
          hits += 1;
          seenType = ev.type;
        });

        document.dispatchEvent(new CustomEvent("doc-alias-event"));
        sub.off();
        document.dispatchEvent(new CustomEvent("doc-alias-event"));

        (tree as any).__result = {
          hits,
          seenType,
          subCountAfterOff: sub.count,
          subOkAfterOff: sub.ok,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("toDocument listener receives document event", r.hits, 1);
        t.eq("toDocument listener sees event type", r.seenType, "doc-alias-event");
        t.eq("toDocument off clears subscription count", r.subCountAfterOff, 0);
        t.eq("toDocument off marks subscription not ok", r.subOkAfterOff, false);
      },
    },

    {
      suite: SUITE,
      name: "listener builder: toWindow alias targets window",
      fixture: "listener-builder/ambient",
      sub: "to-window",
      dom: true,
      html: `
        <main id="root">
          <button id="owner">owner</button>
        </main>
      `,

      act(tree) {
        const owner = tree.find.must.byId("owner");

        let hits = 0;
        let seenType = "";

        const sub = owner.listen.toWindow().onCustom("win-alias-event", (ev) => {
          hits += 1;
          seenType = ev.type;
        });

        window.dispatchEvent(new CustomEvent("win-alias-event"));
        sub.off();
        window.dispatchEvent(new CustomEvent("win-alias-event"));

        (tree as any).__result = {
          hits,
          seenType,
          subCountAfterOff: sub.count,
          subOkAfterOff: sub.ok,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("toWindow listener receives window event", r.hits, 1);
        t.eq("toWindow listener sees event type", r.seenType, "win-alias-event");
        t.eq("toWindow off clears subscription count", r.subCountAfterOff, 0);
        t.eq("toWindow off marks subscription not ok", r.subOkAfterOff, false);
      },
    },

    {
      suite: SUITE,
      name: "listener builder: ambient listeners auto-clean when owner is removed",
      fixture: "listener-builder/ambient",
      sub: "owner-removal-cleanup",
      dom: true,
      html: `
        <main id="root">
          <section id="owner">owner</section>
        </main>
      `,

      act(tree) {
        const owner = tree.find.must.byId("owner");

        let docHits = 0;
        let winHits = 0;

        owner.listen.toDocument().onCustom("ambient-clean-doc", () => {
          docHits += 1;
        });

        owner.listen.toWindow().onCustom("ambient-clean-win", () => {
          winHits += 1;
        });

        document.dispatchEvent(new CustomEvent("ambient-clean-doc"));
        window.dispatchEvent(new CustomEvent("ambient-clean-win"));

        owner.removeSelf();

        document.dispatchEvent(new CustomEvent("ambient-clean-doc"));
        window.dispatchEvent(new CustomEvent("ambient-clean-win"));

        (tree as any).__result = {
          docHits,
          winHits,
          ownerStillFindable: !!tree.find.byId("owner"),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("document ambient listener fires before owner removal only", r.docHits, 1);
        t.eq("window ambient listener fires before owner removal only", r.winHits, 1);
        t.eq("owner is removed from tree", r.ownerStillFindable, false);
      },
    },

    {
      suite: SUITE,
      name: "listener builder: strict ignore on detached target returns inactive subscription",
      fixture: "listener-builder/strict",
      sub: "ignore-detached",
      dom: true,
      html: `
        <main id="root">
          <button id="button">go</button>
        </main>
      `,

      act(tree) {
        const button = tree.find.must.byId("button");
        const detached = button.cloneBranch();

        let threw = false;
        let hits = 0;

        let sub: { count: number; ok: boolean; off: () => void } | undefined;

        try {
          sub = detached.listen.strict("ignore").onClick(() => {
            hits += 1;
          });
        } catch {
          threw = true;
        }

        sub?.off();

        (tree as any).__result = {
          threw,
          hits,
          subCount: sub?.count,
          subOk: sub?.ok,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("strict ignore does not throw on detached target", r.threw, false);
        t.eq("strict ignore listener never fires", r.hits, 0);
        t.eq("strict ignore subscription count is zero", r.subCount, 0);
        t.eq("strict ignore subscription ok is false", r.subOk, false);
      },
    },

    {
      suite: SUITE,
      name: "listener builder: strict throw on detached target throws",
      fixture: "listener-builder/strict",
      sub: "throw-detached",
      dom: true,
      html: `
        <main id="root">
          <button id="button">go</button>
        </main>
      `,

      act(tree) {
        const button = tree.find.must.byId("button");
        const detached = button.cloneBranch();

        let threw = false;

        try {
          detached.listen.strict("throw").onClick(() => undefined);
        } catch {
          threw = true;
        }

        (tree as any).__result = {
          threw,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("strict throw throws on detached target", r.threw, true);
      },
    },

    {
      suite: SUITE,
      name: "listener builder: preventDefault marks cancelable event before handler",
      fixture: "listener-builder/modifiers",
      sub: "prevent-default",
      dom: true,
      html: `
        <main id="root">
          <a id="link" href="#x">link</a>
        </main>
      `,

      act(tree) {
        const link = tree.find.must.byId("link");
        const el = link.dom.must.el();

        let hits = 0;
        let handlerSawPrevented = false;

        const sub = link.listen.preventDefault().onClick((ev) => {
          hits += 1;
          handlerSawPrevented = ev.defaultPrevented;
        });

        const ev = new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
        });

        const dispatchReturn = el.dispatchEvent(ev);
        sub.off();

        (tree as any).__result = {
          hits,
          handlerSawPrevented,
          eventDefaultPrevented: ev.defaultPrevented,
          dispatchReturn,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("preventDefault listener fires", r.hits, 1);
        t.eq("handler sees default already prevented", r.handlerSawPrevented, true);
        t.eq("event is defaultPrevented after dispatch", r.eventDefaultPrevented, true);
        t.eq("dispatchEvent returns false for canceled event", r.dispatchReturn, false);
      },
    },

    {
      suite: SUITE,
      name: "listener builder: passive prevents preventDefault modifier from canceling event",
      fixture: "listener-builder/modifiers",
      sub: "passive-prevent-default",
      dom: true,
      html: `
        <main id="root">
          <button id="button">go</button>
        </main>
      `,

      act(tree) {
        const button = tree.find.must.byId("button");
        const el = button.dom.must.el();

        let hits = 0;
        let handlerSawPrevented = true;

        const sub = button.listen.passive().preventDefault().onClick((ev) => {
          hits += 1;
          handlerSawPrevented = ev.defaultPrevented;
        });

        const ev = new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
        });

        const dispatchReturn = el.dispatchEvent(ev);
        sub.off();

        (tree as any).__result = {
          hits,
          handlerSawPrevented,
          eventDefaultPrevented: ev.defaultPrevented,
          dispatchReturn,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("passive preventDefault listener fires", r.hits, 1);
        t.eq("passive prevents defaultPrevented in handler", r.handlerSawPrevented, false);
        t.eq("passive prevents event default cancellation", r.eventDefaultPrevented, false);
        t.eq("dispatchEvent returns true when not canceled", r.dispatchReturn, true);
      },
    },

    {
      suite: SUITE,
      name: "listener builder: stopAll prevents same-target later listeners and ancestors",
      fixture: "listener-builder/modifiers",
      sub: "stop-all",
      dom: true,
      html: `
        <main id="root">
          <section id="parent">
            <button id="child">go</button>
          </section>
        </main>
      `,

      act(tree) {
        const parent = tree.find.must.byId("parent");
        const child = tree.find.must.byId("child");
        const childEl = child.dom.must.el();

        const seen: string[] = [];

        child.listen.stopAll().onClick((ev) => {
          seen.push(`stop:${ev.defaultPrevented ? "prevented" : "open"}`);
        });

        child.listen.onClick(() => {
          seen.push("late-child");
        });

        parent.listen.onClick(() => {
          seen.push("parent");
        });

        const ev = new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
        });

        const dispatchReturn = childEl.dispatchEvent(ev);

        (tree as any).__result = {
          seen,
          defaultPrevented: ev.defaultPrevented,
          dispatchReturn,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("stopAll first handler fires", r.seen[0], "stop:prevented");
        t.eq("stopAll prevents later same-target listener", r.seen.includes("late-child"), false);
        t.eq("stopAll prevents ancestor listener", r.seen.includes("parent"), false);
        t.eq("stopAll prevents default on cancelable event", r.defaultPrevented, true);
        t.eq("stopAll canceled event returns false", r.dispatchReturn, false);
      },
    },

    {
      suite: SUITE,
      name: "listener builder: clearStops resets stop and prevent modifiers before registration",
      fixture: "listener-builder/modifiers",
      sub: "clear-stops",
      dom: true,
      html: `
        <main id="root">
          <section id="parent">
            <button id="child">go</button>
          </section>
        </main>
      `,

      act(tree) {
        const parent = tree.find.must.byId("parent");
        const child = tree.find.must.byId("child");
        const childEl = child.dom.must.el();

        const seen: string[] = [];

        child.listen.stopAll().clearStops().onClick((ev) => {
          seen.push(`child:${ev.defaultPrevented ? "prevented" : "open"}`);
        });

        parent.listen.onClick(() => {
          seen.push("parent");
        });

        const ev = new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
        });

        const dispatchReturn = childEl.dispatchEvent(ev);

        (tree as any).__result = {
          seen,
          defaultPrevented: ev.defaultPrevented,
          dispatchReturn,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("clearStops allows child listener to fire", r.seen[0], "child:open");
        t.eq("clearStops allows event to bubble", r.seen[1], "parent");
        t.eq("clearStops leaves default unprevented", r.defaultPrevented, false);
        t.eq("clearStops leaves dispatch uncanceled", r.dispatchReturn, true);
      },
    },

    {
      suite: SUITE,
      name: "listener builder: capture listener runs before child bubble listener",
      fixture: "listener-builder/options",
      sub: "capture-order",
      dom: true,
      html: `
        <main id="root">
          <section id="parent">
            <button id="child">go</button>
          </section>
        </main>
      `,

      act(tree) {
        const parent = tree.find.must.byId("parent");
        const child = tree.find.must.byId("child");
        const childEl = child.dom.must.el();

        const seen: string[] = [];

        parent.listen.capture().onClick(() => {
          seen.push("parent-capture");
        });

        child.listen.onClick(() => {
          seen.push("child-bubble");
        });

        parent.listen.onClick(() => {
          seen.push("parent-bubble");
        });

        childEl.dispatchEvent(new MouseEvent("click", { bubbles: true }));

        (tree as any).__result = {
          seen,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("capture listener runs first", r.seen[0], "parent-capture");
        t.eq("target bubble listener runs second", r.seen[1], "child-bubble");
        t.eq("ancestor bubble listener runs third", r.seen[2], "parent-bubble");
      },
    },

    {
      suite: SUITE,
      name: "listener builder: element getter resets ambient target back to element",
      fixture: "listener-builder/target-reset",
      sub: "element-after-document",
      dom: true,
      html: `
        <main id="root">
          <button id="button">go</button>
        </main>
      `,

      act(tree) {
        const button = tree.find.must.byId("button");
        const el = button.dom.must.el();

        let docHits = 0;
        let elementHits = 0;

        const docSub = button.listen.document.onCustom("target-reset", () => {
          docHits += 1;
        });

        const elementSub = button.listen.document.element.onCustom("target-reset", () => {
          elementHits += 1;
        });

        document.dispatchEvent(new CustomEvent("target-reset"));
        el.dispatchEvent(new CustomEvent("target-reset", { bubbles: true }));

        docSub.off();
        elementSub.off();

        (tree as any).__result = {
          docHits,
          elementHits,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("document-targeted listener sees document and bubbled element event", r.docHits, 2);
        t.eq("element getter resets target to element only", r.elementHits, 1);
      },
    },
  ];

  return make_livetree_suite(SUITE, cases);
}