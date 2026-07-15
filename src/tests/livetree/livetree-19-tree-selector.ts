import type { TestSuite } from "../../app/demos/test/tests.types";
import type { LiveTreeCaseSpec } from "../../app/demos/test/livemap-tests.types";
import { flush_dom } from "../inspector/inspector.helpers";
import { make_livetree_suite } from "./make-livetree-suite";

export function livetree_tree_selector_surface(): TestSuite {
  const SUITE = "livetree-18/treeselector-surface";
  const cases: readonly LiveTreeCaseSpec[] =
    [
      {
        suite: SUITE,
        name: "TreeSelector surface: length, first, last, at, and array preserve order",
        dom: true,
        fixture: "treeselector-surface",
        sub: "basic-indexing-and-order",

        html: `
      <main id="root">
        <div id="one" data-kind="item"></div>
        <div id="two" data-kind="item"></div>
        <div id="three" data-kind="item"></div>
      </main>
    `,

        async act(tree) {
          const items = tree.findAll.byData("kind", "item");
          const arr = items.array();

          (tree as any).__result = {
            length: items.length,

            firstId: items.first()?.node.$_attrs?.id,
            lastId: items.last()?.node.$_attrs?.id,

            atZeroId: items.at(0)?.node.$_attrs?.id,
            atOneId: items.at(1)?.node.$_attrs?.id,
            atTwoId: items.at(2)?.node.$_attrs?.id,
            atMiss: items.at(3),

            arrayIsArray: Array.isArray(arr),
            arrayLength: arr.length,
            arrayIds: arr.map((item) => item.node.$_attrs?.id),
          };
        },

        assert(tree, t) {
          const r = (tree as any).__result;

          t.eq("TreeSelector.length reflects match count", r.length, 3);

          t.eq("TreeSelector.first returns first match", r.firstId, "one");
          t.eq("TreeSelector.last returns last match", r.lastId, "three");

          t.eq("TreeSelector.at(0) returns first match", r.atZeroId, "one");
          t.eq("TreeSelector.at(1) returns second match", r.atOneId, "two");
          t.eq("TreeSelector.at(2) returns third match", r.atTwoId, "three");
          t.eq("TreeSelector.at(out of range) returns undefined", r.atMiss, undefined);

          t.eq("TreeSelector.array returns an array", r.arrayIsArray, true);
          t.eq("TreeSelector.array length matches selector length", r.arrayLength, 3);
          t.eq("TreeSelector.array preserves first id", r.arrayIds[0], "one");
          t.eq("TreeSelector.array preserves second id", r.arrayIds[1], "two");
          t.eq("TreeSelector.array preserves third id", r.arrayIds[2], "three");
        },
      },

      {
        suite: SUITE,
        name: "TreeSelector surface: empty selector has stable empty semantics",
        dom: true,
        fixture: "treeselector-surface",
        sub: "empty-selector-semantics",

        html: `
      <main id="root">
        <div id="one" data-kind="item"></div>
      </main>
    `,

        async act(tree) {
          const missing = tree.findAll.byData("kind", "missing");
          const arr = missing.array();

          (tree as any).__result = {
            length: missing.length,
            first: missing.first(),
            last: missing.last(),
            atZero: missing.at(0),
            arrayIsArray: Array.isArray(arr),
            arrayLength: arr.length,
            mappedLength: missing.map((item) => item.node.$_attrs?.id).length,
          };
        },

        assert(tree, t) {
          const r = (tree as any).__result;

          t.eq("empty TreeSelector length is 0", r.length, 0);
          t.eq("empty TreeSelector first() is undefined", r.first, undefined);
          t.eq("empty TreeSelector last() is undefined", r.last, undefined);
          t.eq("empty TreeSelector at(0) is undefined", r.atZero, undefined);
          t.eq("empty TreeSelector array() returns array", r.arrayIsArray, true);
          t.eq("empty TreeSelector array() is empty", r.arrayLength, 0);
          t.eq("empty TreeSelector map() is empty", r.mappedLength, 0);
        },
      },

      {
        suite: SUITE,
        name: "TreeSelector surface: map and each preserve traversal order",
        dom: true,
        fixture: "treeselector-surface",
        sub: "map-and-each-order",

        html: `
      <main id="root">
        <div id="one" data-kind="item"></div>
        <div id="two" data-kind="item"></div>
        <div id="three" data-kind="item"></div>
      </main>
    `,

        async act(tree) {
          const items = tree.findAll.byData("kind", "item");

          const eachIds: string[] = [];
          const eachIndexes: number[] = [];

          items.each((item, index) => {
            const id = item.node.$_attrs?.id;
            const idd = typeof id === "string" ? id : `${id}` || "";
            eachIds.push(idd);
            eachIndexes.push(index);
          });

          (tree as any).__result = {
            mapIds: items.map((item) => item.node.$_attrs?.id),
            eachIds,
            eachIndexes,
          };
        },

        assert(tree, t) {
          const r = (tree as any).__result;

          t.eq("TreeSelector.map preserves first id", r.mapIds[0], "one");
          t.eq("TreeSelector.map preserves second id", r.mapIds[1], "two");
          t.eq("TreeSelector.map preserves third id", r.mapIds[2], "three");

          t.eq("TreeSelector.each preserves first id", r.eachIds[0], "one");
          t.eq("TreeSelector.each preserves second id", r.eachIds[1], "two");
          t.eq("TreeSelector.each preserves third id", r.eachIds[2], "three");

          t.eq("TreeSelector.each passes first index", r.eachIndexes[0], 0);
          t.eq("TreeSelector.each passes second index", r.eachIndexes[1], 1);
          t.eq("TreeSelector.each passes third index", r.eachIndexes[2], 2);
        },
      },

      {
        suite: SUITE,
        name: "TreeSelector surface: filter returns a new TreeSelector preserving order",
        dom: true,
        fixture: "treeselector-surface",
        sub: "filter-selector",

        html: `
      <main id="root">
        <div id="one" data-kind="item" data-keep="yes"></div>
        <div id="two" data-kind="item" data-keep="no"></div>
        <div id="three" data-kind="item" data-keep="yes"></div>
      </main>
    `,

        async act(tree) {
          const items = tree.findAll.byData("kind", "item");

          const kept = items.filter((item) => item.node.$_attrs?.["data-keep"] === "yes");
          const rejected = items.filter((item) => item.node.$_attrs?.["data-keep"] === "never");

          (tree as any).__result = {
            originalLength: items.length,

            keptLength: kept.length,
            keptFirstId: kept.first()?.node.$_attrs?.id,
            keptLastId: kept.last()?.node.$_attrs?.id,
            keptIds: kept.map((item) => item.node.$_attrs?.id),

            rejectedLength: rejected.length,
            rejectedFirst: rejected.first(),
          };
        },

        assert(tree, t) {
          const r = (tree as any).__result;

          t.eq("filter does not mutate original selector", r.originalLength, 3);

          t.eq("filtered selector has matching length", r.keptLength, 2);
          t.eq("filtered selector first() preserves first kept match", r.keptFirstId, "one");
          t.eq("filtered selector last() preserves last kept match", r.keptLastId, "three");
          t.eq("filtered selector preserves first kept id", r.keptIds[0], "one");
          t.eq("filtered selector preserves second kept id", r.keptIds[1], "three");

          t.eq("filter with no matches returns empty selector", r.rejectedLength, 0);
          t.eq("empty filtered selector first() is undefined", r.rejectedFirst, undefined);
        },
      },

      {
        suite: SUITE,
        name: "TreeSelector surface: array snapshot is defensive",
        dom: true,
        fixture: "treeselector-surface",
        sub: "array-snapshot-defensive",

        html: `
      <main id="root">
        <div id="one" data-kind="item"></div>
        <div id="two" data-kind="item"></div>
      </main>
    `,

        async act(tree) {
          const items = tree.findAll.byData("kind", "item");
          const arr = items.array();

          arr.pop();

          (tree as any).__result = {
            mutatedArrayLength: arr.length,
            selectorLengthAfterArrayMutation: items.length,
            selectorLastIdAfterArrayMutation: items.last()?.node.$_attrs?.id,
          };
        },

        assert(tree, t) {
          const r = (tree as any).__result;

          t.eq("local array snapshot can be mutated", r.mutatedArrayLength, 1);
          t.eq("mutating array snapshot does not mutate selector length", r.selectorLengthAfterArrayMutation, 2);
          t.eq("mutating array snapshot does not mutate selector contents", r.selectorLastIdAfterArrayMutation, "two");
        },
      },

      {
        suite: SUITE,
        name: "TreeSelector surface: css broadcast writes to all selected nodes",
        dom: true,
        fixture: "treeselector-surface",
        sub: "css-broadcast",

        html: `
      <main id="root">
        <div id="one" data-kind="item"></div>
        <div id="two" data-kind="item"></div>
      </main>
    `,

        async act(tree) {
          const items = tree.findAll.byData("kind", "item");

          items.css.setMany({
            background: "red",
            borderRadius: "0",
          });

          (tree as any).__result = {
            selectorLength: items.length,

            oneBackground: tree.find.must.byId("one").css.get.background(),
            oneBorderRadius: tree.find.must.byId("one").css.get.borderRadius(),

            twoBackground: tree.find.must.byId("two").css.get.background(),
            twoBorderRadius: tree.find.must.byId("two").css.get.borderRadius(),
          };
        },

        assert(tree, t) {
          const r = (tree as any).__result;

          t.eq("selector has both targets", r.selectorLength, 2);

          t.eq("css broadcast writes background to first node", r.oneBackground, "red");
          t.eq("css broadcast writes borderRadius to first node", r.oneBorderRadius, "0");

          t.eq("css broadcast writes background to second node", r.twoBackground, "red");
          t.eq("css broadcast writes borderRadius to second node", r.twoBorderRadius, "0");
        },
      },

      {
        suite: SUITE,
        name: "TreeSelector surface: data broadcast writes dataset values to all selected nodes",
        dom: true,
        fixture: "treeselector-surface",
        sub: "data-broadcast",

        html: `
      <main id="root">
        <div id="one" data-kind="item"></div>
        <div id="two" data-kind="item"></div>
      </main>
    `,

        async act(tree) {
          const items = tree.findAll.byData("kind", "item");

          items.data.set("state", "ready");

          (tree as any).__result = {
            oneState: tree.find.must.byId("one").data.get("state"),
            twoState: tree.find.must.byId("two").data.get("state"),
          };
        },

        assert(tree, t) {
          const r = (tree as any).__result;

          t.eq("data broadcast writes to first node", r.oneState, "ready");
          t.eq("data broadcast writes to second node", r.twoState, "ready");
        },
      },

      {
        suite: SUITE,
        name: "TreeSelector surface: removeAt removes one selected node",
        dom: true,
        fixture: "treeselector-surface",
        sub: "remove-at",

        html: `
      <main id="root">
        <div id="one" data-kind="item"></div>
        <div id="two" data-kind="item"></div>
        <div id="three" data-kind="item"></div>
      </main>
    `,

        async act(tree) {
          const items = tree.findAll.byData("kind", "item");

          const beforeLength = items.length;
          const removed = items.removeAt(1);

          (tree as any).__result = {
            beforeLength,
            removed,
            afterLength: tree.findAll.byData("kind", "item").length,
            oneStillExists: tree.find.byId("one") !== undefined,
            twoStillExists: tree.find.byId("two") !== undefined,
            threeStillExists: tree.find.byId("three") !== undefined,
          };
        },

        assert(tree, t) {
          const r = (tree as any).__result;

          t.eq("removeAt starts with three selected nodes", r.beforeLength, 3);
          t.eq("removeAt reports successful removal", r.removed, true);
          t.eq("removeAt removes one node from document", r.afterLength, 2);
          t.eq("removeAt preserves first node", r.oneStillExists, true);
          t.eq("removeAt removes indexed node", r.twoStillExists, false);
          t.eq("removeAt preserves third node", r.threeStillExists, true);
        },
      },

      {
        suite: SUITE,
        name: "TreeSelector surface: removeAt out of range is safe",
        dom: true,
        fixture: "treeselector-surface",
        sub: "remove-at-out-of-range",

        html: `
      <main id="root">
        <div id="one" data-kind="item"></div>
      </main>
    `,

        async act(tree) {
          const items = tree.findAll.byData("kind", "item");

          const removedNegative = items.removeAt(-1);
          const removedHigh = items.removeAt(10);

          (tree as any).__result = {
            removedNegative,
            removedHigh,
            finalLength: tree.findAll.byData("kind", "item").length,
            oneStillExists: tree.find.byId("one") !== undefined,
          };
        },

        assert(tree, t) {
          const r = (tree as any).__result;

          t.eq("removeAt negative index returns false", r.removedNegative, false);
          t.eq("removeAt high index returns false", r.removedHigh, false);
          t.eq("removeAt out of range preserves document length", r.finalLength, 1);
          t.eq("removeAt out of range preserves node", r.oneStillExists, true);
        },
      },

      {
        suite: SUITE,
        name: "TreeSelector surface: removeAll removes every selected node",
        dom: true,
        fixture: "treeselector-surface",
        sub: "remove-all",

        html: `
      <main id="root">
        <div id="one" data-kind="item"></div>
        <div id="two" data-kind="item"></div>
        <p id="keep" data-kind="other"></p>
      </main>
    `,

        async act(tree) {
          const items = tree.findAll.byData("kind", "item");

          const beforeLength = items.length;
          const removedCount = items.removeAll();

          (tree as any).__result = {
            beforeLength,
            removedCount,
            itemLengthAfter: tree.findAll.byData("kind", "item").length,
            keepStillExists: tree.find.byId("keep") !== undefined,
          };
        },

        assert(tree, t) {
          const r = (tree as any).__result;

          t.eq("removeAll starts with selected nodes", r.beforeLength, 2);
          t.eq("removeAll reports removed count", r.removedCount, 2);
          t.eq("removeAll removes all selected item nodes", r.itemLengthAfter, 0);
          t.eq("removeAll preserves unselected nodes", r.keepStillExists, true);
        },
      },

      {
        suite: SUITE,
        name: "TreeSelector surface: empty selector broadcast operations are safe",
        dom: true,
        fixture: "treeselector-surface",
        sub: "empty-selector-broadcast-safe",

        html: `
      <main id="root">
        <div id="one" data-kind="item"></div>
      </main>
    `,

        async act(tree) {
          const missing = tree.findAll.byData("kind", "missing");

          missing.css.setMany({
            background: "red",
          });

          missing.data.set("state", "ready");

          const removedCount = missing.removeAll();

          (tree as any).__result = {
            missingLength: missing.length,
            removedCount,
            oneBackground: tree.find.must.byId("one").css.get.background(),
            oneState: tree.find.must.byId("one").data.get("state"),
            oneStillExists: tree.find.byId("one") !== undefined,
          };
        },

        assert(tree, t) {
          const r = (tree as any).__result;

          t.eq("empty selector length is 0", r.missingLength, 0);
          t.eq("empty selector removeAll removes nothing", r.removedCount, 0);
          t.eq("empty selector css broadcast writes nothing", r.oneBackground, undefined);
          t.eq("empty selector data broadcast writes nothing", r.oneState, undefined);
          t.eq("empty selector operations preserve unrelated node", r.oneStillExists, true);
        },
      },
      {
        suite: SUITE,
        name: "css pseudos: attr() content browser readback is accepted",
        dom: true,
        fixture: "css/pseudos",
        sub: "before-attr-content-browser-readback",

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

          const accepted =
            r.content === "attr(data-label)"
            || r.content === `"HELLO"`;

          t.eq("browser exposes attr() pseudo content in an accepted form", accepted, true);
        },
      },
    ];

  return make_livetree_suite(SUITE, cases);
}


export function livetree_css_pseudo_selector_unification(): TestSuite {
  const SUITE = "livetree/css-pseudo-selector-unification";

  const cases: readonly LiveTreeCaseSpec[] = [
    {
      suite: SUITE,
      name: "pseudo shorthand write is readable through selector handle",
      dom: true,
      fixture: "css/pseudos",
      sub: "shorthand-before-selector-read",

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
            color: "red",
          },
        });

        const before = target.css.selector("&::before");

        (tree as any).__result = {
          content: before.get.property("content"),
          color: before.get.color(),
          all: before.getMany(),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("selector getter reads shorthand pseudo content", r.content, "attr(data-label)");
        t.eq("selector getter reads shorthand pseudo color", r.color, "red");
        t.eq("getMany includes pseudo content", r.all.content, "attr(data-label)");
        t.eq("getMany includes pseudo color", r.all.color, "red");
      },
    },

    {
      suite: SUITE,
      name: "selector pseudo write round-trips through selector getter",
      dom: true,
      fixture: "css/pseudos",
      sub: "selector-before-roundtrip",

      html: `
        <main id="root">
          <div id="target">world</div>
        </main>
      `,

      async act(tree) {
        const target = tree.find.must.byId("target");
        const before = target.css.selector("&::before");

        before.setMany({
          content: `"A"`,
          backgroundColor: "black",
          color: "white",
        });

        const all = before.getMany();

        (tree as any).__result = {
          content: before.get.property("content"),
          backgroundColor: before.get.backgroundColor(),
          color: before.get.color(),
          all,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("selector pseudo content round-trips", r.content, `"A"`);
        t.eq("selector pseudo backgroundColor round-trips", r.backgroundColor, "black");
        t.eq("selector pseudo color round-trips", r.color, "white");
        t.eq("getMany content matches", r.all.content, `"A"`);
      },
    },

    {
      suite: SUITE,
      name: "pseudo shorthand and selector writes merge into one rule",
      dom: true,
      fixture: "css/pseudos",
      sub: "shorthand-selector-merge",

      html: `
        <main id="root">
          <div id="target">world</div>
        </main>
      `,

      async act(tree) {
        const target = tree.find.must.byId("target");

        target.css.setMany({
          __before: {
            content: `"A"`,
            color: "red",
          },
        });

        target.css.selector("&::before").setMany({
          color: "blue",
          background: "black",
        });

        const before = target.css.selector("&::before");

        (tree as any).__result = {
          content: before.get.property("content"),
          color: before.get.color(),
          background: before.get.background(),
          all: before.getMany(),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("content from shorthand remains", r.content, `"A"`);
        t.eq("selector write overrides shared property", r.color, "blue");
        t.eq("selector write adds new property", r.background, "black");
        t.eq("getMany sees merged content", r.all.content, `"A"`);
        t.eq("getMany sees merged background", r.all.background, "black");
      },
    },

    {
      suite: SUITE,
      name: "pseudo shorthand supports pseudo-class suffixes through selector getter",
      dom: true,
      fixture: "css/pseudos",
      sub: "shorthand-hover-selector-read",

      html: `
        <main id="root">
          <button id="target">press</button>
        </main>
      `,

      async act(tree) {
        const target = tree.find.must.byId("target");

        target.css.setMany({
          _hover: {
            color: "lime",
            background: "black",
          },
        });

        const hover = target.css.selector("&:hover");

        (tree as any).__result = {
          color: hover.get.color(),
          background: hover.get.background(),
          all: hover.getMany(),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("hover shorthand is readable through selector getter", r.color, "lime");
        t.eq("hover shorthand background is readable through selector getter", r.background, "black");
        t.eq("hover getMany includes color", r.all.color, "lime");
      },
    },

    {
      suite: SUITE,
      name: "selector clear removes pseudo selector rule only",
      dom: true,
      fixture: "css/pseudos",
      sub: "selector-clear-pseudo-only",

      html: `
        <main id="root">
          <div id="target">world</div>
        </main>
      `,

      async act(tree) {
        const target = tree.find.must.byId("target");
        const before = target.css.selector("&::before");

        target.css.setMany({
          color: "red",
          __before: {
            content: `"A"`,
            color: "blue",
          },
        });

        before.clear();

        (tree as any).__result = {
          baseColor: target.css.get.color(),
          beforeContent: before.get.property("content"),
          beforeColor: before.get.color(),
          beforeAll: before.getMany(),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("base color remains after selector clear", r.baseColor, "red");
        t.eq("before content cleared", r.beforeContent, undefined);
        t.eq("before color cleared", r.beforeColor, undefined);
        t.eq("before getMany is empty", Object.keys(r.beforeAll).length, 0);
      },
    },

    {
      suite: SUITE,
      name: "base css clear should clear owned pseudo selector rules",
      dom: true,
      fixture: "css/pseudos",
      sub: "base-clear-clears-owned-pseudos",

      html: `
        <main id="root">
          <div id="target">world</div>
          <div id="child">child</div>
        </main>
      `,

      async act(tree) {
        const target = tree.find.must.byId("target");
        const child = tree.find.must.byId("child");

        target.css.setMany({
          color: "red",
          __before: {
            content: `"A"`,
            color: "blue",
          },
        });

        child.css.setMany({
          color: "green",
          __before: {
            content: `"child"`,
          },
        });

        target.css.clear();

        const targetBefore = target.css.selector("&::before");
        const childBefore = child.css.selector("&::before");

        (tree as any).__result = {
          targetColor: target.css.get.color(),
          targetBeforeContent: targetBefore.get.property("content"),
          targetBeforeColor: targetBefore.get.color(),
          childColor: child.css.get.color(),
          childBeforeContent: childBefore.get.property("content"),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("target base color cleared", r.targetColor, undefined);
        t.eq("target owned pseudo content cleared", r.targetBeforeContent, undefined);
        t.eq("target owned pseudo color cleared", r.targetBeforeColor, undefined);
        t.eq("child base color remains", r.childColor, "green");
        t.eq("child owned pseudo remains", r.childBeforeContent, `"child"`);
      },
    },

    {
      suite: SUITE,
      name: "pseudo shorthand auto-content is selector-readable",
      dom: true,
      fixture: "css/pseudos",
      sub: "auto-content-selector-readable",

      html: `
        <main id="root">
          <div id="target">world</div>
        </main>
      `,

      async act(tree) {
        const target = tree.find.must.byId("target");

        target.css.setMany({
          __before: {
            color: "red",
          },
        });

        const before = target.css.selector("&::before");

        (tree as any).__result = {
          content: before.get.property("content"),
          color: before.get.color(),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("auto-content is written for before shorthand", r.content, `""`);
        t.eq("other pseudo declaration is preserved", r.color, "red");
      },
    },
    {
      suite: SUITE,
      name: "base css clear should clear owned explicit pseudo selector rules",
      dom: true,
      fixture: "css/pseudos",
      sub: "base-clear-clears-owned-explicit-pseudo-selector",

      html: `
    <main id="root">
      <div id="target">world</div>
      <div id="child">child</div>
    </main>
  `,

      async act(tree) {
        const target = tree.find.must.byId("target");
        const child = tree.find.must.byId("child");

        target.css.setMany({
          color: "red",
        });

        target.css.selector("&::before").setMany({
          content: `"A"`,
          color: "blue",
        });

        child.css.selector("&::before").setMany({
          content: `"child"`,
          color: "green",
        });

        target.css.clear();

        const targetBefore = target.css.selector("&::before");
        const childBefore = child.css.selector("&::before");

        (tree as any).__result = {
          targetColor: target.css.get.color(),
          targetBeforeContent: targetBefore.get.property("content"),
          targetBeforeColor: targetBefore.get.color(),
          childBeforeContent: childBefore.get.property("content"),
          childBeforeColor: childBefore.get.color(),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("target base color cleared", r.targetColor, undefined);
        t.eq("target explicit pseudo content cleared", r.targetBeforeContent, undefined);
        t.eq("target explicit pseudo color cleared", r.targetBeforeColor, undefined);
        t.eq("child explicit pseudo content remains", r.childBeforeContent, `"child"`);
        t.eq("child explicit pseudo color remains", r.childBeforeColor, "green");
      },
    },
    {
  suite: SUITE,
  name: "base css clear should clear owned nested selector rules",
  dom: true,
  fixture: "css/pseudos",
  sub: "base-clear-clears-owned-nested-selector",

  html: `
    <main id="root">
      <section id="target">
        <span class="inner" id="target-inner">target</span>
      </section>
      <section id="child">
        <span class="inner" id="child-inner">child</span>
      </section>
    </main>
  `,

  async act(tree) {
    const target = tree.find.must.byId("target");
    const child = tree.find.must.byId("child");

    target.css.selector("& .inner").setMany({
      color: "red",
      background: "black",
    });

    child.css.selector("& .inner").setMany({
      color: "green",
    });

    target.css.clear();

    const targetInner = target.css.selector("& .inner");
    const childInner = child.css.selector("& .inner");

    (tree as any).__result = {
      targetInnerColor: targetInner.get.color(),
      targetInnerBackground: targetInner.get.background(),
      childInnerColor: childInner.get.color(),
    };
  },

  assert(tree, t) {
    const r = (tree as any).__result;

    t.eq("target owned nested selector color cleared", r.targetInnerColor, undefined);
    t.eq("target owned nested selector background cleared", r.targetInnerBackground, undefined);
    t.eq("child owned nested selector color remains", r.childInnerColor, "green");
  },
    },
    


  ];

  return make_livetree_suite(SUITE, cases);
}
