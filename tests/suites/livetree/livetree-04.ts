import { CssManager, hsonLiveTree} from "hson-live/livetree";
import type { TestSuite } from "../../harness/core/test-contracts";
import type { LiveTreeCaseSpec } from "../livemap/livemap-tests.types";
import { get_hson_css_rules, get_rule_for_quid, tick } from "./livetree-03";
import { make_livetree_suite } from "./make-livetree-suite";
import { hson_quid_selector } from "../../helpers/hson/hson-metadata-helpers";

const gcss = CssManager.invoke();


export function listeners_teardown(): TestSuite {
  const SUITE = "livetree/listeners-teardown";

  const cases: readonly LiveTreeCaseSpec[] = [
    {
      suite: SUITE,
      caseId: "events-removed-click-listener-no-longer-fires", name: "events: removed click listener no longer fires",
      dom: true,
      fixture: "events/remove",
      sub: "direct-click-off",

      html: `<main><button id="btn">go</button></main>`,

      async act(tree) {
        const btn = tree.find.must.byId("btn");

        let hits = 0;
        const handle = btn.listen.onClick(() => { hits += 1; });

        const el = btn.dom.el() as HTMLElement;
        el.click();
        handle.off(); // or off.dispose(), off.off(), etc
        el.click();

        (tree as any).__hits = hits;
      },

      assert(tree, t) {
        t.eq("listener fired only once before removal", (tree as any).__hits, 1);
      },
    },
    {
      suite: SUITE,
      caseId: "events-refind-same-node-does-not-duplicate-click-listener", name: "events: refind same node does not duplicate click listener",
      dom: true,
      fixture: "events/refind",
      sub: "no-dup-on-refind",

      html: `<main><button id="btn">go</button></main>`,

      async act(tree) {
        let hits = 0;

        const btnA = tree.find.must.byId("btn");
        btnA.listen.onClick(() => { hits += 1; });

        const btnB = tree.find.must.byId("btn");
        const el = btnB.dom.el() as HTMLElement;
        el.click();

        (tree as any).__hits = hits;
      },

      assert(tree, t) {
        t.eq("single click yields one hit", (tree as any).__hits, 1);
      },
    },
    {
      suite: SUITE,
      caseId: "events-attaching-same-callback-twice-registers-two-listeners", name: "events: attaching same callback twice registers two listeners",
      dom: true,
      fixture: "events/identity",
      sub: "two-distinct-listeners",

      html: `<main><button id="btn">go</button></main>`,

      async act(tree) {
        let hits = 0;

        const btn = tree.find.must.byId("btn");
        btn.listen.onClick(() => { hits += 1; });
        btn.listen.onClick(() => { hits += 1; });

        const el = btn.dom.el() as HTMLElement;
        el.click();

        (tree as any).__hits = hits;
      },

      assert(tree, t) {
        t.eq("two listeners both fire", (tree as any).__hits, 2);
      },
    },
    {
      suite: SUITE,
      caseId: "events-attaching-same-callback-twice-follows-listener-identity-contract", name: "events: attaching same callback twice follows listener identity contract",
      dom: true,
      fixture: "events/identity",
      sub: "same-callback-twice",

      html: `<main><button id="btn">go</button></main>`,

      async act(tree) {
        let hits = 0;
        const fn = () => { hits += 1; };

        const btn = tree.find.must.byId("btn");
        btn.listen.onClick(fn);
        btn.listen.onClick(fn);

        const el = btn.dom.el() as HTMLElement;
        el.click();

        (tree as any).__hits = hits;
      },

      assert(tree, t) {
        // choose the contract you want:
        // t.eq("same callback dedupes", (tree as any).__hits, 1);
        // OR:
        t.eq("same callback does not dedupe", (tree as any).__hits, 2);
      },
    },
    {
      suite: SUITE,
      caseId: "events-listener-attached-via-one-handle-fires-via-refound-handle-dom", name: "events: listener attached via one handle fires via refound handle DOM",
      dom: true,
      fixture: "events/refind",
      sub: "listener-survives-refind",

      html: `<main><button id="btn">go</button></main>`,

      async act(tree) {
        let hits = 0;

        const btnA = tree.find.must.byId("btn");
        btnA.listen.onClick(() => { hits += 1; });

        const btnB = tree.find.must.byId("btn");
        const el = btnB.dom.el() as HTMLElement;
        el.click();

        (tree as any).__hits = hits;
      },

      assert(tree, t) {
        t.eq("listener still active after refind", (tree as any).__hits, 1);
      },
    },
    {
      suite: SUITE,
      caseId: "events-parent-and-child-direct-listeners-both-fire-under-bubbling", name: "events: parent and child direct listeners both fire under bubbling",
      dom: true,
      fixture: "events/bubble",
      sub: "parent-child-direct",

      html: `
    <main>
      <div id="parent">
        <button id="child">go</button>
      </div>
    </main>
  `,

      async act(tree) {
        const parent = tree.find.must.byId("parent");
        const child = tree.find.must.byId("child");

        const seen: string[] = [];

        parent.listen.onClick(() => { seen.push("parent"); });
        child.listen.onClick(() => { seen.push("child"); });

        const el = child.dom.el() as HTMLElement;
        el.click();

        (tree as any).__seen = seen;
      },

      assert(tree, t) {
        const seen = (tree as any).__seen as string[];
        t.eq("child fired", seen[0], "child");
        t.eq("parent fired", seen[1], "parent");
      },
    },
    {
      suite: SUITE,
      caseId: "events-stoppropagation-prevents-parent-direct-listener", name: "events: stopPropagation prevents parent direct listener",
      dom: true,
      fixture: "events/bubble",
      sub: "stop-prop",

      html: `
    <main>
      <div id="parent">
        <button id="child">go</button>
      </div>
    </main>
  `,

      async act(tree) {
        const parent = tree.find.must.byId("parent");
        const child = tree.find.must.byId("child");

        const seen: string[] = [];

        parent.listen.onClick(() => { seen.push("parent"); });
        child.listen.stopProp().onClick(() => { seen.push("child"); });

        const el = child.dom.el() as HTMLElement;
        el.click();

        (tree as any).__seen = seen;
      },

      assert(tree, t) {
        const seen = (tree as any).__seen as string[];
        t.eq("only child fired", seen.join(","), "child");
      },
    },




  ];
  return make_livetree_suite(SUITE, cases);
}



export function root_multi_isolation(): TestSuite {
  const SUITE = "livetree/root-multi-isolation";

  const cases: readonly LiveTreeCaseSpec[] = [
    {
      suite: SUITE,
      caseId: "multi-root-two-trees-do-not-see-each-others-dom-nodes", name: "multi-root: two trees do not see each other's DOM nodes",
      dom: true,
      fixture: "multi-root/basic",
      sub: "dom-isolation",

      html: `
    <div id="fixture-root">
      <main id="rootA"></main>
      <main id="rootB"></main>
    </div>
  `,

      async act(tree) {
        const rootA = tree.find.must.byId("rootA");
        const rootB = tree.find.must.byId("rootB");

        const a = rootA.create.div().id.set("only-a");
        const b = rootB.create.div().id.set("only-b");

        (tree as any).__refs = { a, b };
      },

      assert(tree, t) {
        const rootA = tree.find.must.byId("rootA");
        const rootB = tree.find.must.byId("rootB");

        t.ok("rootA finds its node", !!rootA.find.byId("only-a"));
        t.eq("rootA does not find B node", rootA.find.byId("only-b"), undefined);

        t.ok("rootB finds its node", !!rootB.find.byId("only-b"));
        t.eq("rootB does not find A node", rootB.find.byId("only-a"), undefined);
      },
    },
    {
      suite: SUITE,
      caseId: "multi-root-quids-are-unique-across-trees", name: "multi-root: QUIDs are unique across trees",
      dom: true,
      fixture: "multi-root/identity",
      sub: "quid-uniqueness",

      html: `
    <div id="fixture-root">
      <main id="rootA"></main>
      <main id="rootB"></main>
    </div>
  `,

      async act(tree) {
        const rootA = tree.find.must.byId("rootA");
        const rootB = tree.find.must.byId("rootB");

        const a = rootA.create.div();
        const b = rootB.create.div();

        const elA = a.dom.el() as HTMLElement;
        const elB = b.dom.el() as HTMLElement;

        (tree as any).__quids = [
          elA.getAttribute("hson:quid"),
          elB.getAttribute("hson:quid"),
        ];
      },

      assert(tree, t) {
        const [a, b] = (tree as any).__quids as (string | null)[];
        t.ok("both quids exist", !!a && !!b);
        t.eq("quids differ across trees", a === b, false);
      },
    },
    {
      suite: SUITE,
      caseId: "multi-root-css-applied-in-one-tree-does-not-affect-another-tree", name: "multi-root: CSS applied in one tree does not affect another tree",
      dom: true,
      fixture: "multi-root/css",
      sub: "css-isolation",

      html: `
      <div id="fixture-root">
        <main id="rootA"><div class="box">A</div></main>
        <main id="rootB"><div class="box">B</div></main>
      </div>
  `,

      async act(tree) {
        const rootA = tree.find.must.byId("rootA");
        const rootB = tree.find.must.byId("rootB");

        const boxA = rootA.find.must.byAttribute("class", "box");
        const boxB = rootB.find.must.byAttribute("class", "box");

        boxA.css.setMany({ opacity: "0.25" });

        await tick();
        gcss.syncNow();

        const elA = boxA.dom.el() as HTMLElement;
        const elB = boxB.dom.el() as HTMLElement;

        (tree as any).__quids = [
          elA.getAttribute("hson:quid") ?? "",
          elB.getAttribute("hson:quid") ?? "",
        ];
      },

      assert(tree, t) {
        const [aQuid, bQuid] = (tree as any).__quids as [string, string];
        t.eq("A has managed opacity", gcss.getForQuid(aQuid, "opacity"), "0.25");
        t.eq("B has no managed opacity", gcss.getForQuid(bQuid, "opacity"), undefined);
        t.ok("A has one exact selector rule", (get_rule_for_quid(aQuid) ?? "").includes(hson_quid_selector(aQuid)));
        t.eq("B has no selector rule", get_rule_for_quid(bQuid), undefined);
      },
    },
    {
      suite: SUITE,
      caseId: "multi-root-same-selector-in-different-roots-does-not-cross-select", name: "multi-root: same selector in different roots does not cross-select",
      dom: true,
      fixture: "multi-root/selectors",
      sub: "selector-scope",

      html: `
      <div id="fixture-root">
        <main id="rootA"><div class="box" id="a"></div></main>
        <main id="rootB"><div class="box" id="b"></div></main>
      </div>
  `,

      async act(tree) {
        const rootA = tree.find.must.byId("rootA");

        const found = rootA.findAll.byAttribute("class", "box");

        (tree as any).__ids = found.map(n => {
          const el = n.dom.el() as HTMLElement;
          return el.id;
        });
      },

      assert(tree, t) {
        const ids = (tree as any).__ids as string[];
        t.eq("only A's node is selected", ids.join(","), "a");
      },
    },
    {
      suite: SUITE,
      caseId: "multi-root-removing-one-root-does-not-clear-css-of-another-root", name: "multi-root: removing one root does not clear CSS of another root",
      dom: true,
      fixture: "multi-root/css",
      sub: "remove-one-root",

      html: `
      <div id="fixture-root">
        <main id="rootA"><div id="a"></div></main>
        <main id="rootB"><div id="b"></div></main>
      </div>
  `,

      async act(tree) {
        const rootA = tree.find.must.byId("rootA");
        const rootB = tree.find.must.byId("rootB");

        const a = rootA.find.must.byId("a");
        const b = rootB.find.must.byId("b");

        b.css.setMany({ opacity: "0.4" });

        await tick();
        gcss.syncNow();

        rootA.remove();

        await tick();
        gcss.syncNow();

        const elB = tree.find.must.byId("b").dom.el() as HTMLElement;
        (tree as any).__bQuid = elB.getAttribute("hson:quid") ?? "";
      },

      assert(tree, t) {
        const bQuid = (tree as any).__bQuid as string;
        t.eq("B managed CSS survives A removal", gcss.getForQuid(bQuid, "opacity"), "0.4");
        t.ok("B stylesheet rule survives A removal", (get_rule_for_quid(bQuid) ?? "").includes("opacity: 0.4;"));
      },
    },
    {
      suite: SUITE,
      caseId: "multi-root-listeners-in-one-tree-do-not-fire-for-another-tree", name: "multi-root: listeners in one tree do not fire for another tree",
      dom: true,
      fixture: "multi-root/events",
      sub: "listener-isolation",

      html: `
      <div id="fixture-root">
        <main id="rootA"><button id="a"></button></main>
        <main id="rootB"><button id="b"></button></main>
      </div>
  `,

      async act(tree) {
        const a = tree.find.must.byId("a");
        const b = tree.find.must.byId("b");

        let hitsA = 0;
        let hitsB = 0;

        a.listen.onClick(() => { hitsA += 1; });
        b.listen.onClick(() => { hitsB += 1; });

        (a.dom.el() as HTMLElement).click();

        (tree as any).__hits = [hitsA, hitsB];
      },

      assert(tree, t) {
        const [a, b] = (tree as any).__hits as number[];
        t.eq("A fired", a, 1);
        t.eq("B did not fire", b, 0);
      },
    },

  ];
  return make_livetree_suite(SUITE, cases);
}


export function document_question(): TestSuite {
  const SUITE = "livetree/document-question";

  const cases: readonly LiveTreeCaseSpec[] = [
    {
      suite: SUITE,
      caseId: "multi-instance-two-livetree-instances-can-coexist-in-one-document", name: "multi-instance: two LiveTree instances can coexist in one document",
      dom: true,
      fixture: "instance/basic",
      sub: "construct-two",

      html: `
    <div id="fixture-root">
      <section id="host-a"><div id="a">A</div></section>
      <section id="host-b"><div id="b">B</div></section>
    </div>
  `,

      async act(tree) {
        const hostA = tree.find.must.byId("host-a").node;
        const hostB = tree.find.must.byId("host-b").node;

        // replace with your real constructor / branch API
        const treeA = hsonLiveTree.fromNode(hostA);
        const treeB = hsonLiveTree.fromNode(hostB);

        (tree as any).__trees = { treeA, treeB };
      },

      assert(tree, t) {
        const { treeA, treeB } = (tree as any).__trees;

        t.ok("treeA exists", !!treeA);
        t.ok("treeB exists", !!treeB);
        t.eq("instances differ", treeA === treeB, false);
      },
    },
    {
      suite: SUITE,
      caseId: "multi-instance-find-is-scoped-to-instance-root-not-whole-document", name: "multi-instance: find is scoped to instance root, not whole document",
      dom: true,
      fixture: "instance/find",
      sub: "find-local",

      html: `
    <div id="fixture-root">
      <section id="host-a"><div id="only-a">A</div></section>
      <section id="host-b"><div id="only-b">B</div></section>
    </div>
  `,

      async act(tree) {
        const hostA = tree.find.must.byId("host-a").node;
        const hostB = tree.find.must.byId("host-b").node;

        const treeA = hsonLiveTree.fromNode(hostA);
        const treeB = hsonLiveTree.fromNode(hostB);

        (tree as any).__results = {
          aFindA: treeA.find.byId("only-a"),
          aFindB: treeA.find.byId("only-b"),
          bFindA: treeB.find.byId("only-a"),
          bFindB: treeB.find.byId("only-b"),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__results;

        t.ok("treeA finds only-a", !!r.aFindA);
        t.eq("treeA does not find only-b", r.aFindB, undefined);

        t.eq("treeB does not find only-a", r.bFindA, undefined);
        t.ok("treeB finds only-b", !!r.bFindB);
      },
    },
    {
      suite: SUITE,
      caseId: "multi-instance-find-is-scoped-to-instance-root-not-whole-document", name: "multi-instance: find is scoped to instance root, not whole document",
      dom: true,
      fixture: "instance/find",
      sub: "find-local",

      html: `
    <div id="fixture-root">
      <section id="host-a"><div id="only-a">A</div></section>
      <section id="host-b"><div id="only-b">B</div></section>
    </div>
  `,

      async act(tree) {
        const hostA = tree.find.must.byId("host-a").node;
        const hostB = tree.find.must.byId("host-b").node;

        const treeA = hsonLiveTree.fromNode(hostA);
        const treeB = hsonLiveTree.fromNode(hostB);

        (tree as any).__results = {
          aFindA: treeA.find.byId("only-a"),
          aFindB: treeA.find.byId("only-b"),
          bFindA: treeB.find.byId("only-a"),
          bFindB: treeB.find.byId("only-b"),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__results;

        t.ok("treeA finds only-a", !!r.aFindA);
        t.eq("treeA does not find only-b", r.aFindB, undefined);

        t.eq("treeB does not find only-a", r.bFindA, undefined);
        t.ok("treeB finds only-b", !!r.bFindB);
      },
    },
    {
      suite: SUITE,
      caseId: "multi-instance-quids-are-unique-across-independent-instances", name: "multi-instance: QUIDs are unique across independent instances",
      dom: true,
      fixture: "instance/identity",
      sub: "quid-global-unique",

      html: `
    <div id="fixture-root">
      <section id="host-a"><div class="box">A</div></section>
      <section id="host-b"><div class="box">B</div></section>
    </div>
  `,

      async act(tree) {
        const hostA = tree.find.must.byId("host-a").node;
        const hostB = tree.find.must.byId("host-b").node;

        const treeA = hsonLiveTree.fromNode(hostA);
        const treeB = hsonLiveTree.fromNode(hostB);

        const elA = treeA.find.must.byAttribute("class", "box").dom.el() as HTMLElement;
        const elB = treeB.find.must.byAttribute("class", "box").dom.el() as HTMLElement;

        (tree as any).__quids = [
          elA.getAttribute("hson:quid"),
          elB.getAttribute("hson:quid"),
        ];
      },

      assert(tree, t) {
        const [a, b] = (tree as any).__quids as (string | null)[];

        t.ok("quid A exists", !!a);
        t.ok("quid B exists", !!b);
        t.eq("quids differ", a === b, false);
      },
    },
    {
      suite: SUITE,
      caseId: "multi-instance-css-in-one-instance-does-not-affect-sibling-instance", name: "multi-instance: CSS in one instance does not affect sibling instance",
      dom: true,
      fixture: "instance/css",
      sub: "css-isolation",

      html: `
    <div id="fixture-root">
      <section id="host-a"><div class="box">A</div></section>
      <section id="host-b"><div class="box">B</div></section>
    </div>
  `,

      async act(tree) {
        const hostA = tree.find.must.byId("host-a").node;
        const hostB = tree.find.must.byId("host-b").node;

        const treeA = hsonLiveTree.fromNode(hostA);
        const treeB = hsonLiveTree.fromNode(hostB);

        const boxA = treeA.find.must.byAttribute("class", "box");
        const boxB = treeB.find.must.byAttribute("class", "box");

        boxA.css.setMany({
          opacity: "0.25",
          position: "fixed",
        });

        await tick();
        gcss.syncNow();

        const elA = boxA.dom.el() as HTMLElement;
        const elB = boxB.dom.el() as HTMLElement;

        (tree as any).__quids = {
          a: elA.getAttribute("hson:quid") ?? "",
          b: elB.getAttribute("hson:quid") ?? "",
        };
      },

      assert(tree, t) {
        const quids = (tree as any).__quids;
        t.eq("A managed opacity", gcss.getForQuid(quids.a, "opacity"), "0.25");
        t.eq("A managed position", gcss.getForQuid(quids.a, "position"), "fixed");
        t.eq("B has no managed opacity", gcss.getForQuid(quids.b, "opacity"), undefined);
        t.eq("B has no managed position", gcss.getForQuid(quids.b, "position"), undefined);
      },
    },
    {
      suite: SUITE,
      caseId: "multi-instance-removing-one-instance-does-not-clear-sibling-instance-css", name: "multi-instance: removing one instance does not clear sibling instance CSS",
      dom: true,
      fixture: "instance/css",
      sub: "teardown-isolated",

      html: `
    <div id="fixture-root">
      <section id="host-a"><div id="a">A</div></section>
      <section id="host-b"><div id="b">B</div></section>
    </div>
  `,

      async act(tree) {
        const hostA = tree.find.must.byId("host-a").node;
        const hostB = tree.find.must.byId("host-b").node;

        const treeA = hsonLiveTree.fromNode(hostA);
        const treeB = hsonLiveTree.fromNode(hostB);

        const b = treeB.find.must.byId("b");
        b.css.setMany({ opacity: "0.4" });

        await tick();
        gcss.syncNow();

        // replace with your actual instance teardown/removal path
        treeA.remove();

        await tick();
        gcss.syncNow();

        const bEl = b.dom.el() as HTMLElement;
        (tree as any).__bQuid = bEl.getAttribute("hson:quid") ?? "";
      },

      assert(tree, t) {
        const bQuid = (tree as any).__bQuid as string;
        t.eq("B managed CSS survives A teardown", gcss.getForQuid(bQuid, "opacity"), "0.4");
        t.ok("B stylesheet rule survives A teardown", (get_rule_for_quid(bQuid) ?? "").includes("opacity: 0.4;"));
      },
    },
    {
      suite: SUITE,
      caseId: "multi-instance-listeners-in-one-instance-do-not-fire-for-sibling-instance", name: "multi-instance: listeners in one instance do not fire for sibling instance",
      dom: true,
      fixture: "instance/events",
      sub: "listener-isolation",

      html: `
    <div id="fixture-root">
      <section id="host-a"><button id="a">A</button></section>
      <section id="host-b"><button id="b">B</button></section>
    </div>
  `,

      async act(tree) {
        const hostA = tree.find.must.byId("host-a").node;
        const hostB = tree.find.must.byId("host-b").node;

        const treeA = hsonLiveTree.fromNode(hostA);
        const treeB = hsonLiveTree.fromNode(hostB);

        let hitsA = 0;
        let hitsB = 0;

        treeA.find.must.byId("a").listen.onClick(() => { hitsA += 1; });
        treeB.find.must.byId("b").listen.onClick(() => { hitsB += 1; });

        (treeA.find.must.byId("a").dom.el() as HTMLElement).click();

        (tree as any).__hits = { hitsA, hitsB };
      },

      assert(tree, t) {
        const h = (tree as any).__hits;
        t.eq("A fires", h.hitsA, 1);
        t.eq("B does not fire", h.hitsB, 0);
      },
    },
    {
      suite: SUITE,
      caseId: "multi-instance-same-selector-text-in-both-instances-stays-instance-local", name: "multi-instance: same selector text in both instances stays instance-local",
      dom: true,
      fixture: "instance/selectors",
      sub: "same-class-both-instances",

      html: `
    <div id="fixture-root">
      <section id="host-a"><div class="box" id="box-a">A</div></section>
      <section id="host-b"><div class="box" id="box-b">B</div></section>
    </div>
  `,

      async act(tree) {
        const hostA = tree.find.must.byId("host-a").node;
        const hostB = tree.find.must.byId("host-b").node;

        const treeA = hsonLiveTree.fromNode(hostA);
        const treeB = hsonLiveTree.fromNode(hostB);

        const aIds = treeA.findAll.byAttribute("class", "box").map((n: any) => {
          const el = n.dom.el() as HTMLElement;
          return el.id;
        });

        const bIds = treeB.findAll.byAttribute("class", "box").map((n: any) => {
          const el = n.dom.el() as HTMLElement;
          return el.id;
        });

        (tree as any).__ids = { aIds, bIds };
      },

      assert(tree, t) {
        const ids = (tree as any).__ids;
        t.eq("A sees only its box", ids.aIds.join(","), "box-a");
        t.eq("B sees only its box", ids.bIds.join(","), "box-b");
      },
    },
    {
      suite: SUITE,
      caseId: "multi-instance-shared-document-and-shared-stylesheet-still-preserve-instance-isolation", name: "multi-instance: shared document and shared stylesheet still preserve instance isolation",
      dom: true,
      fixture: "instance/css",
      sub: "shared-document-shared-style-safe",

      html: `
    <div id="fixture-root">
      <section id="host-a"><div id="a">A</div></section>
      <section id="host-b"><div id="b">B</div></section>
    </div>
  `,

      async act(tree) {
        const hostA = tree.find.must.byId("host-a").node;
        const hostB = tree.find.must.byId("host-b").node;

        const treeA = hsonLiveTree.fromNode(hostA);
        const treeB = hsonLiveTree.fromNode(hostB);

        const a = treeA.find.must.byId("a");
        const b = treeB.find.must.byId("b");

        a.css.setMany({ opacity: "0.33" });

        await tick();
        gcss.syncNow();

        const cssRules = get_hson_css_rules().join("\n");
        const aEl = a.dom.el() as HTMLElement;
        const bEl = b.dom.el() as HTMLElement;

        (tree as any).__result = {
          cssRules,
          aQuid: aEl.getAttribute("hson:quid") ?? "",
          bQuid: bEl.getAttribute("hson:quid") ?? "",
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.ok("A quid appears in stylesheet", r.cssRules.includes(hson_quid_selector(r.aQuid)));
        t.ok("B quid does not get A's style block", !((get_rule_for_quid(r.bQuid) ?? "").includes("opacity: 0.33;")));
        t.eq("A managed opacity is isolated", gcss.getForQuid(r.aQuid, "opacity"), "0.33");
        t.eq("B has no managed opacity", gcss.getForQuid(r.bQuid, "opacity"), undefined);
      },
    },



  ];
  return make_livetree_suite(SUITE, cases);
}



export function error_handling(): TestSuite {
  const SUITE = "livetree/error-handling";

  const cases: readonly LiveTreeCaseSpec[] = [
    {
      suite: SUITE,
      caseId: "invalid-input-find.byid-with-empty-string-fails-softly", name: "invalid input: find.byId with empty string fails softly",
      dom: true,
      fixture: "invalid/find",
      sub: "byId-empty",

      html: `<main><div id="box"></div></main>`,

      async act(tree) {
        let threw = false;
        let out: unknown;

        try {
          out = (tree.find.byId as any)("");
        } catch {
          threw = true;
        }

        (tree as any).__result = { threw, out };
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq("does not throw", r.threw, false);
        t.eq("returns undefined", r.out, undefined);
      },
    },
    {
      suite: SUITE,
      caseId: "invalid-input-must.byid-with-empty-string-throws", name: "invalid input: must.byId with empty string throws",
      dom: true,
      fixture: "invalid/find",
      sub: "must-byId-empty",

      html: `<main><div id="box"></div></main>`,

      async act(tree) {
        let threw = false;

        try {
          (tree.find.must.byId as any)("");
        } catch {
          threw = true;
        }

        (tree as any).__threw = threw;
      },

      assert(tree, t) {
        t.eq("must path throws", (tree as any).__threw, true);
      },
    },
    {
      suite: SUITE,
      caseId: "invalid-input-findall.byclass-with-empty-string-fails-softly", name: "invalid input: findAll.byClass with empty string fails softly",
      dom: true,
      fixture: "invalid/find",
      sub: "byClass-empty",

      html: `<main><div class="box"></div></main>`,

      async act(tree) {
        let threw = false;
        let count = -1;

        try {
          const xs = tree.findAll.byAttribute("class", "");
          count = xs.length;
        } catch {
          threw = true;
        }

        (tree as any).__result = { threw, count };
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq("does not throw", r.threw, false);
        t.eq("returns empty result", r.count, 0);
      },
    },
    {
      suite: SUITE,
      caseId: "invalid-tree-op-removing-same-node-twice-is-safe", name: "invalid tree op: removing same node twice is safe",
      dom: true,
      fixture: "invalid/tree",
      sub: "remove-twice",

      html: `<main><div id="box">x</div></main>`,

      async act(tree) {
        const box = tree.find.must.byId("box");

        let threwSecond = false;

        box.remove();

        try {
          box.remove();
        } catch {
          threwSecond = true;
        }

        (tree as any).__threwSecond = threwSecond;
      },

      assert(tree, t) {
        t.eq("second remove does not throw", (tree as any).__threwSecond, false);
        t.eq("node remains absent", tree.find.byId("box"), undefined);
      },
    },
    {
      suite: SUITE,
      caseId: "invalid-tree-op-stale-removed-handle-settext-behavior-is-explicit", name: "invalid tree op: stale removed handle setText behavior is explicit",
      dom: true,
      fixture: "invalid/tree",
      sub: "stale-handle-setText",

      html: `<main><div id="box">x</div></main>`,

      async act(tree) {
        const box = tree.find.must.byId("box");
        box.remove();

        let threw = false;

        try {
          box.text.set("later");
        } catch {
          threw = true;
        }

        (tree as any).__threw = threw;
      },

      assert(tree, t) {
        t.eq("disposed handle setText throws", (tree as any).__threw, true);
      },
    },
    {
      suite: SUITE,
      caseId: "invalid-tree-op-cannot-append-node-into-itself", name: "invalid tree op: cannot append node into itself",
      dom: true,
      fixture: "invalid/tree",
      sub: "append-into-self",

      html: `<main><div id="box"></div></main>`,

      async act(tree) {
        const box = tree.find.must.byId("box");
        let threw = false;

        try {
          box.append?.(box);
        } catch {
          threw = true;
        }

        (tree as any).__threw = threw;
      },

      assert(tree, t) {
        t.eq("self-append throws", (tree as any).__threw, true);
      },
    },
    {
      suite: SUITE,
      caseId: "invalid-input-data.setmany-rejects-empty-key", name: "invalid input: data.setMany rejects empty key",
      dom: true,
      fixture: "invalid/api",
      sub: "dataset-empty-key",

      html: `<main><button id="btn"></button></main>`,

      async act(tree) {
        const btn = tree.find.must.byId("btn");
        let threw = false;

        try {
          btn.data.setMany({ "": "x" });
        } catch {
          threw = true;
        }

        (tree as any).__threw = threw;
      },

      assert(tree, t) {
        // choose contract
        t.eq("empty dataset key throws", (tree as any).__threw, true);
      },
    },
    {
      suite: SUITE,
      caseId: "invalid-input-css.setmany-rejects-non-object-runtime-input", name: "invalid input: css.setMany rejects non-object runtime input",
      dom: true,
      fixture: "invalid/api",
      sub: "css-setMany-non-object",

      html: `<main><div id="box"></div></main>`,

      async act(tree) {
        const box = tree.find.must.byId("box");
        let threw = false;

        try {
          (box.css.setMany as any)(null);
        } catch {
          threw = true;
        }

        (tree as any).__threw = threw;
      },

      assert(tree, t) {
        t.eq("non-object css input throws", (tree as any).__threw, true);
      },
    },
    {
      suite: SUITE,
      caseId: "invalid-input-attrs.setmany-rejects-invalid-attr-name", name: "invalid input: attrs.setMany rejects invalid attr name",
      dom: true,
      fixture: "invalid/api",
      sub: "attrs-invalid-name",

      html: `<main><div id="box"></div></main>`,

      async act(tree) {
        const box = tree.find.must.byId("box");
        let threw = false;

        try {
          box.attrs.setMany?.({ 'bad name': "x" });
        } catch {
          threw = true;
        }

        (tree as any).__threw = threw;
      },

      assert(tree, t) {
        // choose the contract you want
        t.eq("invalid attr name throws", (tree as any).__threw, true);
      },
    },

  ];
  return make_livetree_suite(SUITE, cases);
}
