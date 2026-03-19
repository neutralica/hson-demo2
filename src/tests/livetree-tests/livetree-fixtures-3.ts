import { CssManager } from "hson-live";
import type { LiveTreeCaseSpec, TestSuite } from "../tests.types";
import { make_livetree_suite } from "./livetree-testkit";

export const tick = async (): Promise<void> => {
    await new Promise<void>((r) => setTimeout(() => r(), 0));
};
function get_hson_css_rules(): string[] {
    const host = document.querySelector("#css-manager");
    const styleEl = host?.querySelector("#_hson") as HTMLStyleElement | null;
    const sheet = styleEl?.sheet as CSSStyleSheet | null;
    if (!sheet) return [];

    return Array.from(sheet.cssRules).map((r) => r.cssText);
}

function get_rule_for_quid(quid: string): string | undefined {
    const sel = `[data-_quid="${quid}"]`;
    return get_hson_css_rules().find((r) => r.includes(sel));
}

function count_occurrences(src: string, needle: string): number {
    if (!needle) return 0;
    return src.split(needle).length - 1;
}

function get_hson_css_text(): string {
    const host = document.querySelector("#css-manager");
    const styleEl = host?.querySelector("#_hson") as HTMLStyleElement | null;
    return styleEl?.textContent ?? "";
}

const gcss = CssManager.invoke();

export function suite_schedules_events(): TestSuite {
    const SUITE = "livetree/scheduling-and-events";

    const cases: readonly LiveTreeCaseSpec[] = [
        {
            suite: SUITE,
            name: "CssManager batching: multiple writes collapse to final state",
            dom: true,
            fixture: "css/scheduling",
            sub: "coalesce-same-node",

            html: `<main><div id="box">x</div></main>`,

            async act(tree) {
                const box = tree.find.must.byId("box");

                box.css.setMany({ opacity: "0.1" });
                box.css.setMany({ opacity: "0.5" });
                box.css.setMany({ opacity: "0.9" });

                await tick();
                gcss.syncNow(); // explicit flush
            },

            assert(tree, t) {
                const el = tree.find.must.byId("box").asDomElement() as HTMLElement;
                const cs = getComputedStyle(el);

                t.eq("final opacity wins", cs.opacity, "0.9");
            },
        },
        {
            suite: SUITE,
            name: "CssManager batching: successive writes merge properties",
            dom: true,
            fixture: "css/scheduling",
            sub: "merge-props",

            html: `<main><div id="box">x</div></main>`,

            async act(tree) {
                const box = tree.find.must.byId("box");

                box.css.setMany({ opacity: "0.5" });
                box.css.setMany({ position: "fixed" });
                box.css.setMany({ top: "10px" });

                await tick();
                gcss.syncNow();
            },

            assert(tree, t) {
                const el = tree.find.must.byId("box").asDomElement() as HTMLElement;
                const cs = getComputedStyle(el);

                t.eq("opacity", cs.opacity, "0.5");
                t.eq("position", cs.position, "fixed");
                t.eq("top", cs.top, "10px");
            },
        },
        {
            suite: SUITE,
            name: "CssManager batching: multiple nodes flush together",
            dom: true,
            fixture: "css/scheduling",
            sub: "multi-node",

            html: `
    <main>
      <div id="a">a</div>
      <div id="b">b</div>
    </main>
  `,

            async act(tree) {
                const a = tree.find.must.byId("a");
                const b = tree.find.must.byId("b");

                a.css.setMany({ opacity: "0.3" });
                b.css.setMany({ opacity: "0.7" });

                await tick();
                gcss.syncNow();
            },

            assert(tree, t) {
                const a = tree.find.must.byId("a").asDomElement() as HTMLElement;
                const b = tree.find.must.byId("b").asDomElement() as HTMLElement;

                const csA = getComputedStyle(a);
                const csB = getComputedStyle(b);

                t.eq("a opacity", csA.opacity, "0.3");
                t.eq("b opacity", csB.opacity, "0.7");
            },
        },
        {
            suite: SUITE,
            name: "CssManager scheduling: read before flush is stale",
            dom: true,
            fixture: "css/scheduling",
            sub: "stale-before-flush",

            html: `<main><div id="box">x</div></main>`,

            async act(tree) {
                const box = tree.find.must.byId("box");
                box.css.setMany({ opacity: "0.5" });
                // NO flush
            },

            assert(tree, t) {
                const el = tree.find.must.byId("box").asDomElement() as HTMLElement;
                const cs = getComputedStyle(el);

                // this is intentionally "wrong" from user POV but correct for system
                t.eq("opacity still default", cs.opacity, "1");
            },
        },
        {
            suite: SUITE,
            name: "CssManager scheduling: flush boundary applies styles",
            dom: true,
            fixture: "css/scheduling",
            sub: "visible-after-flush",

            html: `<main><div id="box">x</div></main>`,

            async act(tree) {
                const box = tree.find.must.byId("box");
                box.css.setMany({ opacity: "0.5" });

                await tick();
                gcss.syncNow();
            },

            assert(tree, t) {
                const el = tree.find.must.byId("box").asDomElement() as HTMLElement;
                const cs = getComputedStyle(el);

                t.eq("opacity applied", cs.opacity, "0.5");
            },
        },
        {
            suite: SUITE,
            name: "CssManager scheduling: interleaved writes resolve to final state",
            dom: true,
            fixture: "css/scheduling",
            sub: "interleaved",

            html: `<main><div id="box">x</div></main>`,

            async act(tree) {
                const box = tree.find.must.byId("box");

                box.css.setMany({ opacity: "0.2" });

                // read mid-cycle (should not force flush)
                const el = box.asDomElement() as HTMLElement;
                void getComputedStyle(el).opacity;

                box.css.setMany({ opacity: "0.8" });

                await tick();
                gcss.syncNow();
            },

            assert(tree, t) {
                const el = tree.find.must.byId("box").asDomElement() as HTMLElement;
                const cs = getComputedStyle(el);

                t.eq("final opacity wins", cs.opacity, "0.8");
            },
        },


    ];

    return make_livetree_suite(SUITE, cases);
}
export function css_manager_lifecycle(): TestSuite {
    const SUITE = "livetree/css-manager-lifecycle";

    const cases: readonly LiveTreeCaseSpec[] = [
        {
            suite: SUITE,
            name: "CssManager lifecycle: updating a prop overwrites prior value",
            dom: true,
            fixture: "css/lifecycle",
            sub: "overwrite-prop",

            html: `<main><div id="box">x</div></main>`,

            async act(tree) {
                const box = tree.find.must.byId("box");

                box.css.setMany({
                    opacity: "0.2",
                    position: "fixed",
                });

                box.css.setMany({
                    opacity: "0.8",
                });

                await tick();
                gcss.syncNow();
            },

            assert(tree, t) {
                const el = tree.find.must.byId("box").asDomElement() as HTMLElement;
                const cssText = get_hson_css_text();

                t.eq("computed opacity", getComputedStyle(el).opacity, "0.8");
                t.ok("css contains final opacity", cssText.includes("opacity: 0.8;"));
                t.ok("css does not contain old opacity", !cssText.includes("opacity: 0.2;"));
                t.ok("css still contains untouched prop", cssText.includes("position: fixed;"));
            },
        },
        {
            suite: SUITE,
            name: "CssManager lifecycle: clear() removes all declarations for node",
            dom: true,
            fixture: "css/lifecycle",
            sub: "clear-rule",

            html: `<main><div id="box">x</div></main>`,

            async act(tree) {
                const box = tree.find.must.byId("box");

                box.css.setMany({
                    opacity: "0.5",
                    position: "fixed",
                    backgroundColor: "rgb(255, 0, 0)",
                });

                box.css.clear();

                await tick();
                gcss.syncNow();
            },

            assert(tree, t) {
                const el = tree.find.must.byId("box").asDomElement() as HTMLElement;
                const cs = getComputedStyle(el);
                const quid = el.getAttribute("data-_quid") ?? "";
                const cssText = get_hson_css_text();

                t.eq("opacity reset", cs.opacity, "1");
                t.eq("position reset", cs.position, "static");
                t.eq("background reset", cs.backgroundColor, "rgba(0, 0, 0, 0)");

                t.ok("no surviving rule for quid", !cssText.includes(`[data-_quid="${quid}"]`));
            },
        },
        {
            suite: SUITE,
            name: "CssManager lifecycle: setting same value twice does not duplicate declaration",
            dom: true,
            fixture: "css/lifecycle",
            sub: "dedupe-same-value",

            html: `<main><div id="box">x</div></main>`,

            async act(tree) {
                const box = tree.find.must.byId("box");

                box.css.setMany({ opacity: "0.5" });
                box.css.setMany({ opacity: "0.5" });
                box.css.setMany({ opacity: "0.5" });

                await tick();
                gcss.syncNow();
            },

            assert(tree, t) {
                const el = tree.find.must.byId("box").asDomElement() as HTMLElement;
                const quid = el.getAttribute("data-_quid") ?? "";
                const cssText = get_hson_css_text();

                const ruleBlock = get_rule_for_quid(quid) ?? "";

                t.ok("rule block exists", !!ruleBlock);
                t.eq("opacity appears once", count_occurrences(ruleBlock ?? "", "opacity: 0.5;"), 1);
            },
        },
        {
            suite: SUITE,
            name: "CssManager lifecycle: clearing one node does not affect sibling rule",
            dom: true,
            fixture: "css/lifecycle",
            sub: "clear-isolated",

            html: `
    <main>
      <div id="a">a</div>
      <div id="b">b</div>
    </main>
  `,

            async act(tree) {
                const a = tree.find.must.byId("a");
                const b = tree.find.must.byId("b");

                a.css.setMany({ opacity: "0.2" });
                b.css.setMany({ opacity: "0.8" });

                a.css.clear();

                await tick();
                gcss.syncNow();
            },

            assert(tree, t) {
                const aEl = tree.find.must.byId("a").asDomElement() as HTMLElement;
                const bEl = tree.find.must.byId("b").asDomElement() as HTMLElement;
                const cssText = get_hson_css_text();

                const aQuid = aEl.getAttribute("data-_quid") ?? "";
                const bQuid = bEl.getAttribute("data-_quid") ?? "";

                t.eq("a reset", getComputedStyle(aEl).opacity, "1");
                t.eq("b survives", getComputedStyle(bEl).opacity, "0.8");

                t.ok("a rule removed", !cssText.includes(`[data-_quid="${aQuid}"]`));
                t.ok("b rule remains", cssText.includes(`[data-_quid="${bQuid}"]`));
            },
        },
        {
            suite: SUITE,
            name: "CssManager lifecycle: setting same value twice does not duplicate declaration",
            dom: true,
            fixture: "css/lifecycle",
            sub: "dedupe-same-value",

            html: `<main><div id="box">x</div></main>`,

            async act(tree) {
                const box = tree.find.must.byId("box");

                box.css.setMany({ opacity: "0.5" });
                box.css.setMany({ opacity: "0.5" });
                box.css.setMany({ opacity: "0.5" });

                await tick();
                gcss.syncNow();
            },

            assert(tree, t) {
                const el = tree.find.must.byId("box").asDomElement() as HTMLElement;
                const quid = el.getAttribute("data-_quid") ?? "";

                t.ok("box has quid", quid.length > 0);

                const ruleBlock = get_rule_for_quid(quid) ?? "";

                t.ok("rule block exists", !!ruleBlock);
                t.eq("opacity appears once", count_occurrences(ruleBlock, "opacity: 0.5;"), 1);
            },
        },
        {
            suite: SUITE,
            name: "CssManager lifecycle: remove(prop) preserves sibling declarations",
            dom: true,
            fixture: "css/lifecycle",
            sub: "remove-one-prop",

            html: `<main><div id="box">x</div></main>`,

            async act(tree) {
                const box = tree.find.must.byId("box");

                box.css.setMany({
                    opacity: "0.5",
                    position: "fixed",
                    top: "24px",
                });

                box.css.remove("opacity");

                await tick();
                gcss.syncNow();
            },

            assert(tree, t) {
                const el = tree.find.must.byId("box").asDomElement() as HTMLElement;
                const quid = el.getAttribute("data-_quid") ?? "";
                const cs = getComputedStyle(el);

                t.ok("box has quid", quid.length > 0);

                const ruleBlock = get_rule_for_quid(quid) ?? "";

                t.ok("rule block exists", !!ruleBlock);

                // computed style = behavior
                t.eq("opacity removed", cs.opacity, "1");
                t.eq("position remains", cs.position, "fixed");
                t.eq("top remains", cs.top, "24px");

                // rule block = serialization
                t.ok("css omits removed opacity", !ruleBlock.includes("opacity: 0.5;"));
                t.ok("css keeps position", ruleBlock.includes("position: fixed;"));
                t.ok("css keeps top", ruleBlock.includes("top: 24px;"));
            },
        },
    ];


    return make_livetree_suite(SUITE, cases);
}

export function node_lifecycle(): TestSuite {
    const SUITE = "livetree/css-manager-lifecycle";

    const cases: readonly LiveTreeCaseSpec[] = [
        {
            suite: SUITE,
            name: "node lifecycle: removing node drops its QUID CSS rule",
            dom: true,
            fixture: "lifecycle/node",
            sub: "remove-cleans-css",

            html: `<main><div id="box">x</div></main>`,

            async act(tree) {
                const box = tree.find.must.byId("box");
                const el = box.asDomElement() as HTMLElement;

                (tree as any).__removedQuid = el.getAttribute("data-_quid") ?? "";

                box.css.setMany({
                    opacity: "0.5",
                    position: "fixed",
                    top: "24px",
                });

                await tick();
                gcss.syncNow();

                box.removeSelf();

                await tick();
                gcss.syncNow();
            },

            assert(tree, t) {
                const box = tree.find.byId("box");
                t.eq("box no longer findable", box, undefined);

                const removedQuid = (tree as any).__removedQuid as string;
                t.ok("removed quid captured", removedQuid.length > 0);

                const removedRule = get_rule_for_quid(removedQuid) ?? "";
                t.eq("removed node rule block gone", removedRule, "");
            },
        },
        {
            suite: SUITE,
            name: "node lifecycle: removing one styled node preserves sibling CSS",
            dom: true,
            fixture: "lifecycle/node",
            sub: "remove-one-preserve-sibling-css",

            html: `
    <main>
      <div id="a">a</div>
      <div id="b">b</div>
    </main>
  `,

            async act(tree) {
                const a = tree.find.must.byId("a");
                const b = tree.find.must.byId("b");

                const aEl = a.asDomElement() as HTMLElement;
                (tree as any).__aQuid = aEl.getAttribute("data-_quid") ?? "";

                a.css.setMany({ opacity: "0.2" });
                b.css.setMany({ opacity: "0.8" });

                await tick();
                gcss.syncNow();

                a.removeSelf();

                await tick();
                gcss.syncNow();
            },

            assert(tree, t) {
                const a = tree.find.byId("a");
                const b = tree.find.must.byId("b");
                const bEl = b.asDomElement() as HTMLElement;
                const bQuid = bEl.getAttribute("data-_quid") ?? "";
                const bRule = get_rule_for_quid(bQuid) ?? "";

                const aQuid = (tree as any).__aQuid as string;
                const aRule = get_rule_for_quid(aQuid) ?? "";

                t.eq("a removed", a, undefined);
                t.eq("b opacity survives", getComputedStyle(bEl).opacity, "0.8");
                t.eq("a rule removed", aRule, "");
                t.ok("b rule still exists", !!bRule);
                t.ok("b rule contains opacity", bRule.includes("opacity: 0.8;"));
            },
        },
        {
            suite: SUITE,
            name: "node lifecycle: removing node detaches click listener",
            dom: true,
            fixture: "lifecycle/node",
            sub: "remove-cleans-listener",

            html: `<main><button id="btn">go</button></main>`,

            async act(tree) {
                const btn = tree.find.must.byId("btn");

                let hits = 0;
                btn.listen.onClick(() => { hits += 1; });

                const el = btn.asDomElement() as HTMLElement;
                el.click();       // should count
                btn.removeSelf();
                el.click();       // stale ref click after removal

                (tree as any).__hits = hits;
            },

            assert(tree, t) {
                const hits = (tree as any).__hits;
                const btn = tree.find.byId("btn");

                t.eq("button removed", btn, undefined);
                t.eq("listener only fired before removal", hits, 1);
            },
        },
        {
            suite: SUITE,
            name: "node lifecycle: recreated same-id node does not inherit old listener",
            dom: true,
            fixture: "lifecycle/node",
            sub: "recreate-same-id-no-old-listener",

            html: `<main><button id="btn">go</button></main>`,

            async act(tree) {
                let oldHits = 0;
                let newHits = 0;

                const oldBtn = tree.find.must.byId("btn");
                oldBtn.listen.onClick(() => { oldHits += 1; });

                const oldEl = oldBtn.asDomElement() as HTMLElement;
                oldEl.click();

                oldBtn.removeSelf();

                const host = tree.find.must.byTag("main");
                const newBtn = host.create.button().id.set("btn").text.set("new");
                newBtn.listen.onClick(() => { newHits += 1; });

                const newEl = newBtn.asDomElement() as HTMLElement;
                newEl.click();

                (tree as any).__oldHits = oldHits;
                (tree as any).__newHits = newHits;
            },

            assert(tree, t) {
                const oldHits = (tree as any).__oldHits;
                const newHits = (tree as any).__newHits;

                t.eq("old listener fired once", oldHits, 1);
                t.eq("new listener fired once", newHits, 1);
            },
        },
        {
            suite: SUITE,
            name: "node lifecycle: recreated same-id node does not inherit old CSS",
            dom: true,
            fixture: "lifecycle/node",
            sub: "recreate-same-id-no-old-css",

            html: `<main><div id="box">x</div></main>`,

            async act(tree) {
                const oldBox = tree.find.must.byId("box");
                oldBox.css.setMany({
                    opacity: "0.3",
                    position: "fixed",
                });

                await tick();
                gcss.syncNow();

                oldBox.removeSelf();

                await tick();
                gcss.syncNow();

                const host = tree.find.must.byTag("main");
                const newBox = host.create.div().id.set("box").text.set("y");

                await tick();
                gcss.syncNow();

                const newEl = newBox.asDomElement() as HTMLElement;
                (tree as any).__newQuid = newEl.getAttribute("data-_quid") ?? "";
            },

            assert(tree, t) {
                const box = tree.find.must.byId("box");
                const el = box.asDomElement() as HTMLElement;
                const cs = getComputedStyle(el);
                const quid = (tree as any).__newQuid as string;
                const rule = get_rule_for_quid(quid) ?? "";

                t.eq("new node opacity is default", cs.opacity, "1");
                t.eq("new node position is default", cs.position, "static");
                t.ok("new node has no inherited rule block", rule === "");
            },
        },
        {
            suite: SUITE,
            name: "node lifecycle: removing parent clears descendant CSS rules",
            dom: true,
            fixture: "lifecycle/node",
            sub: "remove-parent-cleans-descendant-css",

            html: `
    <main>
      <section id="parent">
        <div id="child">x</div>
      </section>
    </main>
  `,

            async act(tree) {
                const child = tree.find.must.byId("child");
                const childEl = child.asDomElement() as HTMLElement;

                (tree as any).__childQuid = childEl.getAttribute("data-_quid") ?? "";

                child.css.setMany({
                    opacity: "0.4",
                    backgroundColor: "rgb(255, 0, 0)",
                });

                await tick();
                gcss.syncNow();

                const parent = tree.find.must.byId("parent");
                parent.removeSelf();

                await tick();
                gcss.syncNow();
            },

            assert(tree, t) {
                const child = tree.find.byId("child");
                const parent = tree.find.byId("parent");
                const childQuid = (tree as any).__childQuid as string;

                t.eq("parent removed", parent, undefined);
                t.eq("child removed with parent", child, undefined);
                t.ok("child quid captured", childQuid.length > 0);

                const childRule = get_rule_for_quid(childQuid) ?? "";
                t.eq("child rule block removed", childRule, "");
            },
        }

    ];
    return make_livetree_suite(SUITE, cases);
}
