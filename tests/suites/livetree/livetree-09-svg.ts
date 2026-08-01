import {  hsonLiveTree, LiveTree } from "hson-live/livetree";
import type { TestSuite } from "../../harness/core/test-contracts";
import type { LiveTreeCaseSpec } from "../livemap/livemap-tests.types";
import { make_livetree_suite } from "./make-livetree-suite";

function restore_svg_fixture(tree: LiveTree): LiveTree {
  const markup = tree.dom.must.el().outerHTML;
  const sandboxHost = (tree as any).__sandboxHost;
  tree.removeSelf();
  const restored = hsonLiveTree.fromTrustedHtml(markup);
  sandboxHost.append(restored);
  return restored;
}

export function livetree_svg_basic(): TestSuite {
  const SUITE = "livetree/svg/basic";
  const cases: readonly LiveTreeCaseSpec[] = [
    {
      suite: SUITE,
      name: "create: svg() creates empty svg root",
      dom: true,
      fixture: "create/svg",
      sub: "empty-root",

      html: `<main id="root"></main>`,

      async act(tree) {
        const root = tree.find.must.byId("root");
        const svg = root.create.svg();

        (tree as any).__result = {
          tag: svg.dom.el()?.tagName.toLowerCase(),
          hasChildren: svg.dom.el()?.children.length,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq("tag is svg", r.tag, "svg");
        t.eq("no children", r.hasChildren, 0);
      },
    },
    {
      suite: SUITE,
      name: "create: svg children use svg tag creation",
      dom: true,
      fixture: "create/svg",
      sub: "child-tags",

      html: `<main id="root"></main>`,

      async act(tree) {
        const root = tree.find.must.byId("root");

        const svg = root.create.svg();
        const c = svg.create.circle();

        (tree as any).__result = {
          tag: c.dom.el()?.tagName.toLowerCase(),
          parent: c.dom.el()?.parentElement?.tagName.toLowerCase(),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq("child tag is circle", r.tag, "circle");
        t.eq("parent is svg", r.parent, "svg");
      },
    },
    {
      suite: SUITE,
      name: "create: svg(string) parses and mounts svg",
      dom: true,
      fixture: "create/svg",
      sub: "parse-basic",

      html: `<main id="root"></main>`,

      async act(tree) {
        const root = tree.find.must.byId("root");

        const svg = root.create.svg(`
      <svg viewBox="0 0 10 10">
        <circle cx="5" cy="5" r="4"></circle>
      </svg>
    `);

        const el = svg.dom.el() as SVGElement;

        (tree as any).__result = {
          tag: el.tagName.toLowerCase(),
          viewBox: el.getAttribute("viewBox"),
          childCount: el.children.length,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq("tag is svg", r.tag, "svg");
        t.eq("viewBox preserved", r.viewBox, "0 0 10 10");
        t.eq("child count", r.childCount, 1);
      },
    },
    {
      suite: SUITE,
      name: "create: svg(string) respects prepend()",
      dom: true,
      fixture: "create/svg",
      sub: "prepend",

      html: `<main id="root"><div id="a"></div></main>`,

      async act(tree) {
        const root = tree.find.must.byId("root");

        root.create.prepend().svg(`<svg id="s"></svg>`);

        const first = root.dom.el()?.firstElementChild;

        (tree as any).__result = {
          firstId: first?.id,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq("svg inserted first", r.firstId, "s");
      },
    },
    {
      suite: SUITE,
      name: "create: svg(string) returns svg root handle",
      dom: true,
      fixture: "create/svg",
      sub: "return-root",

      html: `<main id="root"></main>`,

      async act(tree) {
        const root = tree.find.must.byId("root");

        const svg = root.create.svg(`<svg id="s"></svg>`);

        (tree as any).__result = {
          found: tree.find.byId("s") !== undefined,
          same: svg.id.get() === "s",
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq("node exists", r.found, true);
        t.eq("returned handle matches", r.same, true);
      },
    },
    {
      suite: SUITE,
      name: "create: svg(string) rejects non-svg root",
      dom: false,
      fixture: "create/svg",
      sub: "invalid-root",

      html: `<main id="root"></main>`,

      async act(tree) {
        const root = tree.find.must.byId("root");

        try {
          root.create.svg(`<div></div>`);
          (tree as any).__threw = false;
        } catch {
          (tree as any).__threw = true;
        }
      },

      assert(tree, t) {
        t.eq("throws on non-svg root", (tree as any).__threw, true);
      },
    },
    {
      suite: SUITE,
      name: "create: svg(string) survives terminal identity restoration",
      dom: true,
      fixture: "create/svg",
      sub: "roundtrip",
      preview: () => "<terminal-svg-restoration>",

      html: `<main id="root"></main>`,

      async act(tree) {
        const root = tree.find.must.byId("root");

        root.create.svg(`<svg id="s"><circle cx="1" cy="2" r="3"></circle></svg>`);
        const sourceSvg = tree.find.must.byId("s");
        const svgQuid = sourceSvg.quid;

        const round = restore_svg_fixture(tree);

        const svg = round.find.must.byId("s");
        const el = svg.dom.el() as Element;

        (tree as any).__result = {
          tag: el.tagName.toLowerCase(),
          child: el.children[0]?.tagName.toLowerCase(),
          identityRestored: svg.quid === svgQuid,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq("tag preserved", r.tag, "svg");
        t.eq("child preserved", r.child, "circle");
        t.eq("SVG identity is reclaimed", r.identityRestored, true);
      },
    },
    {
      suite: SUITE,
      name: "svg: nested scope propagates",
      fixture: "svg/create-extended",
      sub: "nested-scope",
      dom: true,
      html: `<main id="root"></main>`,

      act: async (root) => {
        const svg = root.create.svg().id.set("s");

        const g = svg.create.g().id.set("g");
        const defs = svg.create.defs().id.set("defs");
        const clip = defs.create.clipPath().id.set("clip");
        const circle = g.create.circle().id.set("c");
        (root as any).__result = {
          tags: [
            svg.dom.el()?.tagName,
            g.dom.el()?.tagName,
            defs.dom.el()?.tagName,
            clip.dom.el()?.tagName,
            circle.dom.el()?.tagName,
          ],
        };
      },

      assert: async (root, t) => {
        const r = (root as any).__result;

        t.eq("svg tag", r.tags[0]?.toLowerCase(), "svg");
        t.eq("g tag", r.tags[1]?.toLowerCase(), "g");
        t.eq("defs tag", r.tags[2]?.toLowerCase(), "defs");
        t.eq("clipPath tag", r.tags[3]?.toLowerCase(), "clippath");
        t.eq("circle tag", r.tags[4]?.toLowerCase(), "circle");
      },
    },

    // ─────────────────────────────────────────────
    // 2. string root propagation
    // ─────────────────────────────────────────────
    {
      name: "svg: string root scope propagates",
      suite: SUITE,
      fixture: "svg/create-extended",
      sub: "string-root-scope",
      dom: true,
      html: `<main id="root"></main>`,

      act: async (root) => {
        const svg2 = root.create.svg().id.set("s")
        const g2 = svg2.create.g().id.set("g");
        const circle2 = g2.create.circle().id.set("c2");

        (root as any).__result = {
          parent: g2.dom.el()?.tagName,
          child: circle2.dom.el()?.tagName,
        };
      },

      assert: async (root, t) => {
        const r = (root as any).__result;

        t.eq("g preserved", r.parent?.toLowerCase(), "g");
        t.eq("circle created under g", r.child?.toLowerCase(), "circle");
      },
    },

    // ─────────────────────────────────────────────
    // 5. homogeneous svg selector
    // ─────────────────────────────────────────────
    {
      suite: SUITE,
      name: "svg: selector create homogeneous",
      fixture: "svg/create-extended",
      sub: "selector-homogeneous",
      html: `<main id="root"></main>`,

      act: async (root) => {
        const svg = root.create.svg();

        const g1 = svg.create.g();
        const g2 = svg.create.g();
        // was created = make_tree_selector([g1, g2]).create or soemthing along those lines
        const c1 = g1.create.circle();
        const c2 = g2.create.circle();
        const created = [c1, c2];
        (root as any).__result = {
          count: created.length,
        };
      },

      assert: async (root, t) => {
        const r = (root as any).__result;
        t.eq("two circles created", r.count, 2);
      },
    },
    // ─────────────────────────────────────────────
    // 7. g string creation
    // ─────────────────────────────────────────────
    {
      suite: SUITE,
      name: "svg: g(string) creates subtree",
      fixture: "svg/create-extended",
      sub: "g-string",
      html: `<main id="root"></main>`,
      dom: true,
      act: async (root) => {
        const svg = root.create.svg();

        const g = (svg.create as any).g(`
        <g id="g1">
          <circle id="c1" cx="1" cy="2" r="3"></circle>
        </g>
      `);

        const el = g.dom.el();

        (root as any).__result = {
          tag: el?.tagName,
          child: el?.children[0]?.tagName,
        };
      },

      assert: async (root, t) => {
        const r = (root as any).__result;

        t.eq("g root", r.tag?.toLowerCase(), "g");
        t.eq("circle child", r.child?.toLowerCase(), "circle");
      },
    },

    // ─────────────────────────────────────────────
    // 8. g string mismatch throws
    // ─────────────────────────────────────────────
    {
      suite: SUITE,
      name: "svg: g(string) rejects mismatched root",
      fixture: "svg/create-extended",
      sub: "g-mismatch",
      html: `<main id="root"></main>`,

      act: async (root) => {
        const svg = root.create.svg();

        let threw = false;

        try {
          (svg.create as any).g(`<circle></circle>`);
        } catch {
          threw = true;
        }

        (root as any).__result = { threw };
      },

      assert: async (root, t) => {
        const r = (root as any).__result;
        t.eq("mismatch throws", r.threw, true);
      },
    },

    {
      suite: SUITE,
      name: "svg: id/class/style/attr chaining preserves svg scope",
      fixture: "svg/create-extended",
      sub: "svg-scope-through-helpers",
      html: `<main id="root"></main>`,
      dom: true,

      act: async (root) => {
        const svg = root.create.svg()
          .id.set("s")
          .classlist.add("alpha")
          .style.setMany({
            width: "10px",
            height: "10px",
          })
          .attrs.set("viewBox", "0 0 10 10");

        const g = svg.create.g().id.set("g");
        const c = g.create.circle().id.set("c");

        (root as any).__result = {
          svgTag: svg.dom.el()?.tagName,
          gTag: g.dom.el()?.tagName,
          cTag: c.dom.el()?.tagName,
          viewBox: svg.dom.el()?.getAttribute("viewBox"),
          cls: svg.dom.el()?.getAttribute("class"),
        };
      },

      assert: async (root, t) => {
        const r = (root as any).__result;

        t.eq("svg tag", r.svgTag?.toLowerCase(), "svg");
        t.eq("g tag", r.gTag?.toLowerCase(), "g");
        t.eq("circle tag", r.cTag?.toLowerCase(), "circle");
        t.eq("viewBox preserved", r.viewBox, "0 0 10 10");
        t.eq("class preserved", r.cls, "alpha");
      },
    },
    {
      suite: SUITE,
      name: "svg: child chaining preserves svg scope",
      fixture: "svg/create-extended",
      sub: "child-scope-through-helpers",
      html: `<main id="root"></main>`,
      dom: true,

      act: async (root) => {
        const g = root.create.svg()
          .create.g()
          .id.set("g")
          .classlist.add("group");

        const c = g.create.circle().id.set("c");

        (root as any).__result = {
          gTag: g.dom.el()?.tagName,
          gClass: g.dom.el()?.getAttribute("class"),
          cTag: c.dom.el()?.tagName,
          cParent: c.dom.el()?.parentElement?.tagName,
        };
      },

      assert: async (root, t) => {
        const r = (root as any).__result;

        t.eq("g tag", r.gTag?.toLowerCase(), "g");
        t.eq("g class", r.gClass, "group");
        t.eq("circle tag", r.cTag?.toLowerCase(), "circle");
        t.eq("circle parent", r.cParent?.toLowerCase(), "g");
      },
    },
    {
      suite: SUITE,
      name: "svg: defs(string) creates subtree",
      fixture: "svg/create-extended",
      sub: "defs-string",
      html: `<main id="root"></main>`,
      dom: true,

      act: async (root) => {
        const svg = root.create.svg();

        const defs = (svg.create as any).defs(`
      <defs id="d1">
        <clipPath id="cp1"></clipPath>
      </defs>
    `);

        const el = defs.dom.el();

        (root as any).__result = {
          tag: el?.tagName,
          child: el?.children[0]?.tagName,
          childId: el?.children[0]?.getAttribute("id"),
        };
      },

      assert: async (root, t) => {
        const r = (root as any).__result;

        t.eq("defs tag", r.tag?.toLowerCase(), "defs");
        t.eq("clipPath child", r.child?.toLowerCase(), "clippath");
        t.eq("clipPath id preserved", r.childId, "cp1");
      },
    },
    {
      suite: SUITE,
      name: "svg: defs(string) rejects mismatched root",
      fixture: "svg/create-extended",
      sub: "defs-mismatch",
      html: `<main id="root"></main>`,

      act: async (root) => {
        const svg = root.create.svg();

        let msg = "";

        try {
          (svg.create as any).defs(`<g id="wrong"></g>`);
        } catch (err) {
          msg = err instanceof Error ? err.message : String(err);
        }

        (root as any).__result = { msg };
      },

      assert: async (root, t) => {
        const r = (root as any).__result;
        t.ok("defs mismatch message is specific", r.msg.includes(`expected exactly one <defs> root`));
      },
    },
    {
      suite: SUITE,
      name: "svg: circle(string) creates self-root leaf",
      fixture: "svg/create-extended",
      sub: "circle-string-leaf",
      html: `<main id="root"></main>`,
      dom: true,

      act: async (root) => {
        const svg = root.create.svg();

        const circle = (svg.create as any).circle(`
      <circle id="c1" cx="5" cy="5" r="4"></circle>
    `);

        const el = circle.dom.el();

        (root as any).__result = {
          tag: el?.tagName,
          id: el?.getAttribute("id"),
          cx: el?.getAttribute("cx"),
          cy: el?.getAttribute("cy"),
          r: el?.getAttribute("r"),
        };
      },

      assert: async (root, t) => {
        const r = (root as any).__result;

        t.eq("circle tag", r.tag?.toLowerCase(), "circle");
        t.eq("id preserved", r.id, "c1");
        t.eq("cx preserved", r.cx, "5");
        t.eq("cy preserved", r.cy, "5");
        t.eq("r preserved", r.r, "4");
      },
    },

    {
      suite: SUITE,
      name: "svg: g(string) survives terminal identity restoration",
      fixture: "svg/create-extended",
      sub: "g-string-roundtrip",
      preview: () => "<terminal-svg-restoration>",
      html: `<main id="root"></main>`,
      dom: true,

      act: async (root) => {
        const svg = root.create.svg().id.set("s");

        (svg.create as any).g(`
      <g id="g1">
        <circle id="c1" cx="1" cy="2" r="3"></circle>
      </g>
    `);
        const sourceGroup = root.find.must.byId("g1");
        const groupQuid = sourceGroup.quid;

        const round = restore_svg_fixture(root);

        const g = round.find.must.byId("g1");
        const el = g.dom.el();

        (root as any).__result = {
          gTag: el?.tagName,
          childTag: el?.children[0]?.tagName,
          childId: el?.children[0]?.getAttribute("id"),
          identityRestored: g.quid === groupQuid,
        };
      },

      assert: async (root, t) => {
        const r = (root as any).__result;

        t.eq("g survives roundtrip", r.gTag?.toLowerCase(), "g");
        t.eq("circle survives roundtrip", r.childTag?.toLowerCase(), "circle");
        t.eq("circle id survives roundtrip", r.childId, "c1");
        t.eq("group identity is reclaimed", r.identityRestored, true);
      },
    },
    {
      suite: SUITE,
      name: "svg: g(string) mismatch error message is specific",
      fixture: "svg/create-extended",
      sub: "g-mismatch-message",
      html: `<main id="root"></main>`,

      act: async (root) => {
        const svg = root.create.svg();

        let msg = "";

        try {
          (svg.create as any).g(`<circle></circle>`);
        } catch (err) {
          msg = err instanceof Error ? err.message : String(err);
        }

        (root as any).__result = { msg };
      },

      assert: async (root, t) => {
        const r = (root as any).__result;
        t.ok("g mismatch message is specific", r.msg.includes(`expected exactly one <g> root`));
      },
    },
    {
      suite: SUITE,
      name: "svg: non-svg root error message is specific",
      fixture: "svg/create-extended",
      sub: "svg-root-message",
      html: `<main id="root"></main>`,

      act: async (root) => {
        let msg = "";

        try {
          root.create.svg(`<div id="nope"></div>`);
        } catch (err) {
          msg = err instanceof Error ? err.message : String(err);
        }

        (root as any).__result = { msg };
      },

      assert: async (root, t) => {
        const r = (root as any).__result;
        t.ok("svg root message is specific", r.msg.includes(`expected exactly one <svg> root`));
      },
    },
    {
      suite: SUITE,
      name: "svg: selector create on nested g nodes preserves count and parentage",
      fixture: "svg/create-extended",
      sub: "selector-parentage",
      html: `<main id="root"></main>`,
      dom: true,

      act: async (root) => {
        const svg = root.create.svg();

        svg.create.g().id.set("g1");
        svg.create.g().id.set("g2");
        svg.create.g().id.set("g3");

        const sel = root.findAll.byTag("g");
        const created = sel.map((k) => (k.create as any).circle());

        const circles = created.map((tree: LiveTree) => {
          const el = tree.dom.el();
          return {
            tag: el?.tagName,
            parent: el?.parentElement?.tagName,
          };
        });

        (root as any).__result = {
          count: circles.length,
          parents: circles.map((x) => x.parent?.toLowerCase()),
          tags: circles.map((x) => x.tag?.toLowerCase()),
        };
      },

      assert: async (root, t) => {
        const r = (root as any).__result;

        t.eq("three circles created", r.count, 3);
        t.eq("all created tags are circles", JSON.stringify(r.tags), JSON.stringify(["circle", "circle", "circle"]));
        t.eq("all parents are g", JSON.stringify(r.parents), JSON.stringify(["g", "g", "g"]));
      },
    },
    {
      suite: SUITE,
      name: "svg: preserves common svg attrs",
      fixture: "svg/create-extended",
      sub: "svg-attrs-common",
      html: `<main id="root"></main>`,
      dom: true,

      act: async (root) => {
        const svg = root.create.svg().attrs.set("viewBox", "0 0 20 20");
        const circle = svg.create.circle()
          .attrs.set("cx", "7")
          .attrs.set("cy", "8")
          .attrs.set("r", "9");

        const svgEl = svg.dom.el();
        const cEl = circle.dom.el();

        (root as any).__result = {
          viewBox: svgEl?.getAttribute("viewBox"),
          cx: cEl?.getAttribute("cx"),
          cy: cEl?.getAttribute("cy"),
          r: cEl?.getAttribute("r"),
        };
      },

      assert: async (root, t) => {
        const r = (root as any).__result;

        t.eq("viewBox preserved", r.viewBox, "0 0 20 20");
        t.eq("cx preserved", r.cx, "7");
        t.eq("cy preserved", r.cy, "8");
        t.eq("r preserved", r.r, "9");
      },
    },

    {
      suite: SUITE,
      name: "svg: g(string) respects prepend",
      fixture: "svg/create-extended",
      sub: "g-string-prepend",
      html: `<main id="root"></main>`,
      dom: true,

      act: async (root) => {
        const svg = root.create.svg();

        svg.create.g().id.set("tail");

        const g = svg.create.prepend().g().id.set("first"); // removed string in g
        // really though the index should go in prepend, for everything, and then 'g' should accept a svg string
        const circle = g.create.circle().id.set("c1");
        /* 
        `
          <g id="first">
            <circle id="c1"></circle>
          </g>
        `
         */


        const svgEl = svg.dom.el();

        (root as any).__result = {
          firstId: svgEl?.children[0]?.getAttribute("id"),
          firstTag: svgEl?.children[0]?.tagName,
          childTag: g.dom.el()?.children[0]?.tagName,
        };
      },

      assert: async (root, t) => {
        const r = (root as any).__result;

        t.eq("prepended g is first", r.firstId, "first");
        t.eq("first child tag is g", r.firstTag?.toLowerCase(), "g");
        t.eq("nested child preserved", r.childTag?.toLowerCase(), "circle");
      },
    },
    {
      suite: SUITE,
      name: "svg: g(string) respects at(index)",
      fixture: "svg/create-extended",
      sub: "g-string-at-index",
      html: `<main id="root"></main>`,
      dom: true,

      act: async (root) => {
        const svg = root.create.svg();

        svg.create.g().id.set("a");
        svg.create.g().id.set("b");

        const mid = svg.create.at(1).g().id.set("mid");
        const circle = mid.create.circle().id.set("c1")
        /*    `
         <g id="mid">
           <circle id="c1"></circle>
         </g>
       ` */

        const svgEl = svg.dom.el();

        (root as any).__result = {
          ids: Array.from(svgEl?.children ?? []).map((el) => el.getAttribute("id")),
          midChild: mid.dom.el()?.children[0]?.tagName,
        };
      },

      assert: async (root, t) => {
        const r = (root as any).__result;

        t.eq("index 0 unchanged", r.ids[0], "a");
        t.eq("inserted at index 1", r.ids[1], "mid");
        t.eq("old second moved to index 2", r.ids[2], "b");
        t.eq("mid subtree preserved", r.midChild?.toLowerCase(), "circle");
      },
    },

  ];

  return make_livetree_suite(SUITE, cases);
}
