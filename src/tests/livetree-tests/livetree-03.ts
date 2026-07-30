import { CssManager } from "hson-live/livetree";
import type { TestSuite } from "../../app/demos/test/tests.types";
import type { LiveTreeCaseSpec } from "../../app/demos/test/livemap-tests.types";
import { make_livetree_suite } from "./make-livetree-suite";
import { hson_quid_selector } from "../test-data/hson-metadata-helpers";

export const tick = async (): Promise<void> => {
    await new Promise<void>((r) => setTimeout(() => r(), 0));
};
export function get_hson_css_rules(): string[] {
    const host = document.querySelector("#css-manager");
    const styleEl = host?.querySelector("#_hson") as HTMLStyleElement | null;
    const sheet = styleEl?.sheet as CSSStyleSheet | null;
    if (!sheet) return [];

    return Array.from(sheet.cssRules).map((r) => r.cssText);
}

export function get_hson_style_rule(selectorText: string): CSSStyleRule | undefined {
    const host = document.querySelector("#css-manager");
    const styleEl = host?.querySelector("#_hson") as HTMLStyleElement | null;
    const sheet = styleEl?.sheet as CSSStyleSheet | null;
    if (!sheet) return undefined;

    return Array.from(sheet.cssRules).find(
        (rule): rule is CSSStyleRule => "selectorText" in rule && rule.selectorText === selectorText,
    );
}

export function get_rule_for_quid(quid: string): string | undefined {
    const sel = hson_quid_selector(quid);
    return get_hson_style_rule(sel)?.cssText;
}

function count_occurrences(src: string, needle: string): number {
    if (!needle) return 0;
    return src.split(needle).length - 1;
}

export function get_hson_css_text(): string {
    const host = document.querySelector("#css-manager");
    const styleEl = host?.querySelector("#_hson") as HTMLStyleElement | null;
    return styleEl?.textContent ?? "";
}

const gcss = CssManager.invoke();

// jsdom parses and exposes `[hson\:quid="…"]` CSS rules, but does not apply
// them through getComputedStyle. Chromium application behavior is covered by
// tests/browser/quid-selector.spec.ts; these suites own CSSOM and lifecycle state.
function managed_value(tree: Parameters<LiveTreeCaseSpec["assert"]>[0], id: string, prop: string): string | undefined {
    const quid = tree.find.must.byId(id).dom.must.el().getAttribute("hson:quid") ?? "";
    return gcss.getForQuid(quid, prop);
}

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
                t.eq("final opacity wins in managed state", managed_value(tree, "box", "opacity"), "0.9");
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
                t.eq("opacity is merged", managed_value(tree, "box", "opacity"), "0.5");
                t.eq("position is merged", managed_value(tree, "box", "position"), "fixed");
                t.eq("top is merged", managed_value(tree, "box", "top"), "10px");
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
                t.eq("a opacity is flushed", managed_value(tree, "a", "opacity"), "0.3");
                t.eq("b opacity is flushed", managed_value(tree, "b", "opacity"), "0.7");
            },
        },
        {
            suite: SUITE,
            name: "CssManager scheduling: managed write remains absent from CSSOM before flush",
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
                const el = tree.find.must.byId("box").dom.el() as HTMLElement;
                const quid = el.getAttribute("hson:quid") ?? "";
                t.eq("managed opacity records the pending write", gcss.getForQuid(quid, "opacity"), "0.5");
                t.eq("no QUID rule is emitted before flush", get_rule_for_quid(quid), undefined);
            },
        },
        {
            suite: SUITE,
            name: "CssManager scheduling: flush boundary emits the exact managed rule",
            dom: true,
            fixture: "css/scheduling",
            sub: "emitted-after-flush",

            html: `<main><div id="box">x</div></main>`,

            async act(tree) {
                const box = tree.find.must.byId("box");
                box.css.setMany({ opacity: "0.5" });

                await tick();
                gcss.syncNow();
            },

            assert(tree, t) {
                const box = tree.find.must.byId("box");
                const quid = box.dom.must.el().getAttribute("hson:quid") ?? "";
                const rule = get_rule_for_quid(quid) ?? "";
                t.eq("opacity reaches managed state", gcss.getForQuid(quid, "opacity"), "0.5");
                t.ok("flush inserts the exact QUID rule", rule.includes(hson_quid_selector(quid)));
                t.ok("flush inserts the opacity declaration", rule.includes("opacity: 0.5;"));
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

                const el = box.dom.el() as HTMLElement;
                const quid = el.getAttribute("hson:quid") ?? "";
                (tree as any).__ruleBeforeSecondWrite = get_rule_for_quid(quid);

                box.css.setMany({ opacity: "0.8" });

                await tick();
                gcss.syncNow();
            },

            assert(tree, t) {
                t.eq("first pending write did not emit a CSSOM rule", (tree as any).__ruleBeforeSecondWrite, undefined);
                t.eq("final interleaved opacity wins in managed state", managed_value(tree, "box", "opacity"), "0.8");
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
                const cssText = get_hson_css_text();

                t.eq("managed opacity", managed_value(tree, "box", "opacity"), "0.8");
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
                const el = tree.find.must.byId("box").dom.el() as HTMLElement;
                const quid = el.getAttribute("hson:quid") ?? "";
                const cssText = get_hson_css_text();

                t.eq("managed opacity is removed", gcss.getForQuid(quid, "opacity"), undefined);
                t.eq("managed position is removed", gcss.getForQuid(quid, "position"), undefined);
                t.eq("managed background is removed", gcss.getForQuid(quid, "backgroundColor"), undefined);
                t.ok("no surviving rule for quid", !cssText.includes(hson_quid_selector(quid)));
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
                const el = tree.find.must.byId("box").dom.el() as HTMLElement;
                const quid = el.getAttribute("hson:quid") ?? "";
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
                const aEl = tree.find.must.byId("a").dom.el() as HTMLElement;
                const bEl = tree.find.must.byId("b").dom.el() as HTMLElement;
                const cssText = get_hson_css_text();

                const aQuid = aEl.getAttribute("hson:quid") ?? "";
                const bQuid = bEl.getAttribute("hson:quid") ?? "";

                t.eq("a managed declaration is removed", gcss.getForQuid(aQuid, "opacity"), undefined);
                t.eq("b managed declaration survives", gcss.getForQuid(bQuid, "opacity"), "0.8");

                t.ok("a rule removed", !cssText.includes(hson_quid_selector(aQuid)));
                t.ok("b rule remains", cssText.includes(hson_quid_selector(bQuid)));
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
                const el = tree.find.must.byId("box").dom.el() as HTMLElement;
                const quid = el.getAttribute("hson:quid") ?? "";

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
                const el = tree.find.must.byId("box").dom.el() as HTMLElement;
                const quid = el.getAttribute("hson:quid") ?? "";
                t.ok("box has quid", quid.length > 0);

                const ruleBlock = get_rule_for_quid(quid) ?? "";

                t.ok("rule block exists", !!ruleBlock);

                t.eq("opacity removed from managed state", gcss.getForQuid(quid, "opacity"), undefined);
                t.eq("position remains in managed state", gcss.getForQuid(quid, "position"), "fixed");
                t.eq("top remains in managed state", gcss.getForQuid(quid, "top"), "24px");

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
    const SUITE = "livetree/node-lifecycle";

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
                const el = box.dom.el() as HTMLElement;

                (tree as any).__removedQuid = el.getAttribute("hson:quid") ?? "";

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

                const aEl = a.dom.el() as HTMLElement;
                (tree as any).__aQuid = aEl.getAttribute("hson:quid") ?? "";

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
                const bEl = b.dom.el() as HTMLElement;
                const bQuid = bEl.getAttribute("hson:quid") ?? "";
                const bRule = get_rule_for_quid(bQuid) ?? "";

                const aQuid = (tree as any).__aQuid as string;
                const aRule = get_rule_for_quid(aQuid) ?? "";

                t.eq("a removed", a, undefined);
                t.eq("b managed opacity survives", gcss.getForQuid(bQuid, "opacity"), "0.8");
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

                const el = btn.dom.el() as HTMLElement;
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

                const oldEl = oldBtn.dom.el() as HTMLElement;
                oldEl.click();

                oldBtn.removeSelf();

                const host = tree.find.must.byTag("main");
                const newBtn = host.create.button().id.set("btn").text.set("new");
                newBtn.listen.onClick(() => { newHits += 1; });

                const newEl = newBtn.dom.el() as HTMLElement;
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

                const oldQuid = oldBox.dom.must.el().getAttribute("hson:quid") ?? "";
                oldBox.removeSelf();

                await tick();
                gcss.syncNow();

                const host = tree.find.must.byTag("main");
                const newBox = host.create.div().id.set("box").text.set("y");

                await tick();
                gcss.syncNow();

                const newEl = newBox.dom.el() as HTMLElement;
                (tree as any).__oldQuid = oldQuid;
                (tree as any).__newQuid = newEl.getAttribute("hson:quid") ?? "";
            },

            assert(tree, t) {
                const oldQuid = (tree as any).__oldQuid as string;
                const newQuid = (tree as any).__newQuid as string;

                t.ok("recreated node receives a distinct QUID", oldQuid !== newQuid);
                t.eq("old node rule is released", get_rule_for_quid(oldQuid), undefined);
                t.eq("new node has no managed opacity", gcss.getForQuid(newQuid, "opacity"), undefined);
                t.eq("new node has no managed position", gcss.getForQuid(newQuid, "position"), undefined);
                t.eq("new node has no inherited rule block", get_rule_for_quid(newQuid), undefined);
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
                const childEl = child.dom.el() as HTMLElement;

                (tree as any).__childQuid = childEl.getAttribute("hson:quid") ?? "";

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
