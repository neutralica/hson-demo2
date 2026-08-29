import {  hson } from "hson-live";
import { LiveTree } from "../../../../hson-live/dist/api/livetree/livetree";
import type { TestSuite } from "../../harness/core/test-contracts";
import type { LiveTreeCaseSpec } from "../livemap/livemap-tests.types";
import { tick } from "./livetree-03";
import { make_livetree_suite } from "./make-livetree-suite";
import { CssManager } from "hson-live/livetree";
import { hson_quid_selector } from "../../helpers/hson/hson-metadata-helpers";

const gcss = CssManager.invoke();

function reimport_current_markup_with_fresh_identity(tree: LiveTree) {
    const copied = tree.dom.must.el().cloneNode(true) as Element;
    [copied, ...copied.querySelectorAll("*")].forEach((element) => {
        element.removeAttribute("hson:quid");
    });
    const markup = copied.outerHTML;
    const sandboxHost = (tree as any).__sandboxHost;
    tree.removeSelf();
    const restored = hson.liveTree.fromTrustedHtml(markup);
    sandboxHost.append(restored);
    return restored;
}

export function roundtrip_projection_stability(): TestSuite {
    const SUITE = "livetree/roundtrip-projection";
    const cases: readonly LiveTreeCaseSpec[] =
        [
            {
                suite: SUITE,
                caseId: "serialization-terminal-reimport-preserves-basic-structure-with-fresh-identity", name: "serialization: terminal reimport preserves basic structure with fresh identity",
                dom: true,
                fixture: "serialization/roundtrip",
                sub: "basic-shape",
                preview: () => "<terminal-restoration>",

                html: `
                    <main id="root">
                    <section id="card" data-state="open">
                        <h1>Title</h1>
                        <p>Hello world</p>
                    </section>
                    </main>
                `,

                async act(tree) {
                    const rootQuid = tree.find.must.byId("root").quid;
                    const cardQuid = tree.find.must.byId("card").quid;
                    const round = reimport_current_markup_with_fresh_identity(tree);

                    const card = round.find.must.byId("card");
                    const cardEl = card.dom.el() as HTMLElement;

                    (tree as any).__result = {
                        tag: cardEl.tagName.toLowerCase(),
                        state: cardEl.getAttribute("data-state"),
                        h1Text: round.find.must.byTag("h1").text.get(),
                        pText: round.find.must.byTag("p").text.get(),
                        rootIdentityFresh: round.find.must.byId("root").quid !== rootQuid,
                        cardIdentityFresh: card.quid !== cardQuid,
                    };
                },

                assert(tree, t) {
                    const r = (tree as any).__result;
                    t.eq("tag preserved", r.tag, "section");
                    t.eq("data-state preserved", r.state, "open");
                    t.eq("h1 text preserved", r.h1Text, "Title");
                    t.eq("p text preserved", r.pText, "Hello world");
                    t.eq("root receives fresh identity after terminal destruction", r.rootIdentityFresh, true);
                    t.eq("card receives fresh identity after terminal destruction", r.cardIdentityFresh, true);
                },
            },
            {
                suite: SUITE,
                caseId: "serialization-terminal-reimport-preserves-dom-mutations-with-fresh-identity", name: "serialization: terminal reimport preserves DOM mutations with fresh identity",
                dom: true,
                fixture: "serialization/roundtrip",
                sub: "hydrate-mutate-rehydrate",
                preview: () => "<terminal-restoration>",

                html: `
                    <main id="root">
                    <div id="box" class="alpha" data-mode="cold">x</div>
                    </main>
                `,

                async act(tree) {
                    const box = tree.find.must.byId("box");
                    box.attrs.set("title", "greeting");
                    box.data.set("mode", "warm");
                    box.text.set("hello");
                    const boxQuid = box.quid;
                    const rootQuid = tree.find.must.byId("root").quid;

                    await tick();
                    const round = reimport_current_markup_with_fresh_identity(tree);

                    const box2 = round.find.must.byId("box");
                    const el2 = box2.dom.el() as HTMLElement;
                    (tree as any).__result = {
                        cls: el2.getAttribute("class"),
                        mode: el2.getAttribute("data-mode"),
                        title: el2.getAttribute("title"),
                        text: box2.text.get(),
                        rootIdentityFresh: round.find.must.byId("root").quid !== rootQuid,
                        boxIdentityFresh: box2.quid !== boxQuid,
                    };
                },

                assert(tree, t) {
                    const r = (tree as any).__result;
                    t.eq("class preserved", r.cls, "alpha");
                    t.eq("data-mode updated", r.mode, "warm");
                    t.eq("title added", r.title, "greeting");
                    t.eq("text updated", r.text, "hello");
                    t.eq("root identity is fresh", r.rootIdentityFresh, true);
                    t.eq("mutated box identity is fresh", r.boxIdentityFresh, true);
                },
            },
            {
                suite: SUITE,
                caseId: "serialization-ir-only-node-text-remains-readable-without-dom-lookup", name: "serialization: IR-only node text remains readable without DOM lookup",
                dom: true,
                fixture: "serialization/partial",
                sub: "ir-only-text",

                html: `<main id="root"></main>`,

                async act(tree) {
                    const root = tree.find.must.byId("root");

                    const ghost = root.create.div().id.set("ghost");
                    ghost.text.set("from-ir");

                    // identity-preserving detach keeps the handle useful while
                    // removing graph membership and DOM projection.
                    ghost.detach();

                    (tree as any).__text = ghost.text.get();
                    (tree as any).__found = tree.find.byId("ghost");
                },

                assert(tree, t) {
                    t.eq("stale handle still exposes IR text", (tree as any).__text, "from-ir");
                    t.eq("removed node not findable", (tree as any).__found, undefined);
                },
            },
            {
                suite: SUITE,
                caseId: "serialization-terminal-reimport-preserves-shape-with-fresh-identity", name: "serialization: terminal reimport preserves shape with fresh identity",
                dom: true,
                fixture: "serialization/roundtrip",
                sub: "shape-not-quid",
                preview: () => "<terminal-restoration>",

                html: `
                    <main id="root">
                        <div id="box">x</div>
                    </main>
                `,

                async act(tree) {
                    const box = tree.find.must.byId("box");
                    const oldEl = box.dom.el() as HTMLElement;
                    const oldQuid = oldEl.getAttribute("hson:quid") ?? "";

                    const round = reimport_current_markup_with_fresh_identity(tree);

                    const box2 = round.find.must.byId("box");
                    const newEl = box2.dom.el() as HTMLElement;
                    const newQuid = newEl.getAttribute("hson:quid") ?? "";

                    (tree as any).__result = {
                        oldQuid,
                        newQuid,
                        text: box2.text.get(),
                        tag: newEl.tagName.toLowerCase(),
                    };
                },

                assert(tree, t) {
                    const r = (tree as any).__result;
                    t.ok("old quid exists", r.oldQuid.length > 0);
                    t.ok("new quid exists", r.newQuid.length > 0);
                    t.eq("shape text preserved", r.text, "x");
                    t.eq("shape tag preserved", r.tag, "div");
                    t.eq("terminal reimport receives fresh quid", r.oldQuid === r.newQuid, false);
                },
            },
            {
                suite: SUITE,
                caseId: "serialization-explicit-subtree-clone-is-unaffected-by-sibling-mutation", name: "serialization: explicit subtree clone is unaffected by sibling mutation",
                dom: true,
                fixture: "serialization/partial",
                sub: "sibling-independence",

                html: `
                    <main id="root">
                    <section id="a"><div id="a1">A</div></section>
                    <section id="b"><div id="b1">B</div></section>
                    </main>
                `,

                async act(tree) {
                    tree.find.must.byId("a1").text.set("AA");
                    await tick();

                    // Explicitly copy only subtree B while the source remains active.
                    const sourceB = tree.find.must.byId("b");
                    const sourceBQuid = sourceB.quid;
                    const bTree = sourceB.cloneBranch();

                    const b1 = bTree.find.must.byId("b1");

                    (tree as any).__result = {
                        bText: b1.text.get(),
                        aText: tree.find.must.byId("a1").text.get(),
                        identityFresh: bTree.quid !== sourceBQuid,
                    };
                },

                assert(tree, t) {
                    const r = (tree as any).__result;
                    t.eq("A mutation stayed in A", r.aText, "AA");
                    t.eq("B subtree hydrates cleanly", r.bText, "B");
                    t.eq("explicit B clone receives fresh identity", r.identityFresh, true);
                },
            },
            {
                suite: SUITE,
                caseId: "serialization-terminal-reimport-does-not-resurrect-removed-sibling", name: "serialization: terminal reimport does not resurrect removed sibling",
                dom: true,
                fixture: "serialization/partial",
                sub: "no-resurrection",
                preview: () => "<terminal-restoration>",

                html: `
    <main id="root">
      <div id="keep">K</div>
      <div id="drop">D</div>
    </main>
  `,

                async act(tree) {
                    tree.find.must.byId("drop").removeSelf();
                    await tick();

                    const keepQuid = tree.find.must.byId("keep").quid;
                    const round = reimport_current_markup_with_fresh_identity(tree);


                    (tree as any).__result = {
                        keep: !!round.find.byId("keep"),
                        drop: round.find.byId("drop"),
                        keepIdentityFresh: round.find.must.byId("keep").quid !== keepQuid,
                    };
                },

                assert(tree, t) {
                    const r = (tree as any).__result;
                    t.eq("keep survives", r.keep, true);
                    t.eq("drop is not resurrected", r.drop, undefined);
                    t.eq("surviving content receives fresh identity", r.keepIdentityFresh, true);
                },
            },
            {
                suite: SUITE,
                caseId: "serialization-outerhtml-shape-remains-stable-after-terminal-reimport", name: "serialization: outerHTML shape remains stable after terminal reimport",
                dom: true,
                fixture: "serialization/roundtrip",
                sub: "html-shape-stable",
                preview: () => "<terminal-restoration>",

                html: `
    <main id="root">
      <div id="box">x</div>
    </main>
  `,

                async act(tree) {
                    const box = tree.find.must.byId("box");
                    box.data.set("state", "open");
                    box.attrs.set("title", "hello");
                    box.text.set("y");
                    const boxQuid = box.quid;

                    await tick();

                    const round = reimport_current_markup_with_fresh_identity(tree);

                    const out = round.find.must.byId("box").dom.el() as HTMLElement;

                    (tree as any).__html = out.outerHTML;
                    (tree as any).__identityFresh = round.find.must.byId("box").quid !== boxQuid;
                },

                assert(tree, t) {
                    const html = (tree as any).__html as string;
                    t.ok("id preserved", html.includes(`id="box"`));
                    t.ok("title preserved", html.includes(`title="hello"`));
                    t.ok("data-state preserved", html.includes(`data-state="open"`));
                    t.ok("text preserved", html.includes(`>y</`));
                    t.eq("box identity is fresh", (tree as any).__identityFresh, true);
                },
            },


        ];

    return make_livetree_suite(SUITE, cases);
}


// helper — adjust this to however Hson-Live exposes/injects its style text in tests.
function get_style_text_for_test(tree: LiveTree): string {
    const sandboxEl = (tree as any).__sandboxEl as HTMLElement | undefined;

    // OPTION A: styles live inside sandbox
    const sandboxStyles = Array.from(sandboxEl?.querySelectorAll("style") ?? []);
    if (sandboxStyles.length) {
        return sandboxStyles.map((el) => el.textContent ?? "").join("\n");
    }

    // OPTION B: styles live in document head (common)
    const headStyles = Array.from(document.head.querySelectorAll("style"));
    const joined = headStyles.map((el) => el.textContent ?? "").join("\n");

    return joined;
}

// helper — exact substring count, good enough for selector/rule duplication checks.
function count_occurrences(haystack: string, needle: string): number {
    if (!needle) return 0;

    let count = 0;
    let ix = 0;

    while (ix < haystack.length) {
        const found = haystack.indexOf(needle, ix);
        if (found === -1) break;
        count++;
        ix = found + needle.length;
    }

    return count;
}

export function livetree_sync_perf(): TestSuite {
    const SUITE = "livetree/sync-perf";
    const cases: readonly LiveTreeCaseSpec[] = [
        {
            suite: SUITE,
            caseId: "syncnow-no-op-sync-leaves-stylesheet-unchanged", name: "syncNow: no-op sync leaves stylesheet unchanged",
            dom: true,
            fixture: "performance-sensitive",
            sub: "sync-noop-stable",

            html: `
            <main id="root">
              <div id="box">x</div>
            </main>
        `,

            async act(tree) {
                const box = tree.find.must.byId("box");

                // establish one concrete style so there is something to sync
                box.css.setMany({
                    width: "10px",
                    height: "10px",
                });

                // first flush

                CssManager.invoke().syncNow?.();

                const before = get_style_text_for_test(tree);

                // second flush with no mutations
                gcss.syncNow?.();

                const after = get_style_text_for_test(tree);

                (tree as any).__result = { before, after };
            },

            assert(tree, t) {
                const r = (tree as any).__result;
                t.eq("second no-op sync does not change stylesheet text", r.after, r.before);
            },
        },

        {
            suite: SUITE,
            caseId: "css-repeated-identical-write-does-not-duplicate-selector-rule", name: "css: repeated identical write does not duplicate selector/rule",
            dom: true,
            fixture: "performance-sensitive",
            sub: "no-duplicate-rules",

            html: `
            <main id="root">
              <div id="box">x</div>
            </main>
        `,

            async act(tree) {
                const box = tree.find.must.byId("box");
                const boxEl = box.dom.el() as HTMLElement;
                const quid = boxEl.getAttribute("hson:quid") ?? "";

                // selector guess based on your emitted CSS shape seen in devtools
                const selector = quid ? hson_quid_selector(quid) : "";

                box.css.setMany({
                    width: "12px",
                    height: "12px",
                });
                gcss.syncNow?.();

                // repeat exact same write + flush
                box.css.setMany({
                    width: "12px",
                    height: "12px",
                });
                gcss.syncNow?.();

                const cssText = get_style_text_for_test(tree);

                (tree as any).__result = {
                    selector,
                    cssText,
                    selectorCount: selector ? count_occurrences(cssText, selector) : 0,
                    widthCount: count_occurrences(cssText, "width: 12px"),
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;

                t.ok("selector was discoverable", !!r.selector);
                t.eq("selector appears once", r.selectorCount, 1);

            },
        },

        {
            suite: SUITE,
            caseId: "css-repeated-mutations-settle-on-final-rule-state", name: "css: repeated mutations settle on final rule state",
            dom: true,
            fixture: "performance-sensitive",
            sub: "batched-final-state-only",

            html: `
        <main id="root">
          <div id="box">x</div>
        </main>
    `,

            async act(tree) {
                const box = tree.find.must.byId("box");
                const boxEl = box.dom.el() as HTMLElement;
                const quid = boxEl.getAttribute("hson:quid") ?? "";

                box.css.setMany({ width: "10px" });
                box.css.setMany({ width: "20px" });
                box.css.setMany({ width: "30px" });

                const gcss = CssManager.invoke();

                const before = gcss.getForQuid(quid, "width");

                gcss.syncNow?.();

                const after = gcss.getForQuid(quid, "width");

                (tree as any).__result = {
                    before,
                    after,
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;

                // don't assume deferred batching semantics before sync
                t.eq("final width is the settled rule value before/after sync", r.after, "30px");
            },
        },

        // bonus fixture; this belongs with the same family and catches append-only leaks.
        {
            suite: SUITE,
            caseId: "css-removed-node-does-not-leave-stale-rule-behind-after-sync", name: "css: removed node does not leave stale rule behind after sync",
            dom: true,
            fixture: "performance-sensitive",
            sub: "removed-node-rule-gone",

            html: `
            <main id="root">
              <div id="box">x</div>
            </main>
        `,

            async act(tree) {
                const box = tree.find.must.byId("box");
                const boxEl = box.dom.el() as HTMLElement;
                const quid = boxEl.getAttribute("hson:quid") ?? "";
                const selector = quid ? hson_quid_selector(quid) : "";

                box.css.setMany({
                    width: "44px",
                });
                gcss.syncNow?.();

                const beforeRemove = get_style_text_for_test(tree);

                box.removeSelf();
                gcss.syncNow?.();

                const afterRemove = get_style_text_for_test(tree);

                (tree as any).__result = {
                    selector,
                    beforeRemove,
                    afterRemove,
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;

                t.ok("selector was discoverable", !!r.selector);
                t.eq("selector exists before removal", r.beforeRemove.includes(r.selector), true);
                t.eq("selector gone after removal", r.afterRemove.includes(r.selector), false);
            },
        },
        {
            suite: SUITE,
            caseId: "css-pseudo-rule-replacement-settles-to-final-value-without-duplication", name: "css: pseudo rule replacement settles to final value without duplication",
            dom: true,
            fixture: "performance-sensitive",
            sub: "pseudo-final-state",

            html: `
        <main id="root">
          <div id="box">x</div>
        </main>
    `,

            async act(tree) {
                const box = tree.find.must.byId("box");
                const boxEl = box.dom.el() as HTMLElement;
                const quid = boxEl.getAttribute("hson:quid") ?? "";

                box.css.setMany({
                    __after: { content: `"A"` },
                });
                box.css.setMany({
                    __after: { content: `"B"` },
                });

                gcss.syncNow?.();
                const snap = gcss.snapshot?.() ?? "";
                const after = gcss.getForQuid?.(quid, "content");

                (tree as any).__result = { snap, after, quid };
            },

            assert(tree, t) {
                const r = (tree as any).__result;
                t.eq("final pseudo content wins", r.after === undefined || r.after === `"B"`, true);
                t.eq("old pseudo content absent from snapshot", String(r.snap).includes(`content: "A"`), false);
            },
        },
        {
            suite: SUITE,
            caseId: "css-clearquid-removes-stored-and-emitted-state", name: "css: clearQuid removes stored and emitted state",
            dom: true,
            fixture: "performance-sensitive",
            sub: "clear-quid",

            html: `
        <main id="root">
          <div id="box">x</div>
        </main>
    `,

            async act(tree) {
                const box = tree.find.must.byId("box");
                const quid = (box.dom.el() as HTMLElement).getAttribute("hson:quid") ?? "";

                box.css.setMany({ width: "33px", height: "11px" });
                gcss.syncNow();
                const before = gcss.hasAnyRules(quid);

                gcss.clearQuid?.(quid);
                gcss.syncNow?.();

                const after = gcss.getAllForQuid(quid);
                const snap = gcss.snapshot?.() ?? "";

                (tree as any).__result = { before, after, snap, quid };
            },

            assert(tree, t) {
                const r = (tree as any).__result;
                t.ok("rule existed before clear", !!r.before);
                t.eq("rule removed after clear", !r.after || Object.keys(r.after).length === 0, true);
                t.eq("selector no longer emitted", String(r.snap).includes(r.quid), false);
            },
        },
        {
            suite: SUITE,
            caseId: "css-remove-then-recreate-does-not-leak-stale-rule", name: "css: remove then recreate does not leak stale rule",
            dom: true,
            fixture: "performance-sensitive",
            sub: "remove-recreate-no-stale",

            html: `
        <main id="root">
          <div id="host"></div>
        </main>
    `,

            async act(tree) {
                const host = tree.find.must.byId("host");

                const a = host.create.div().id.set("box");
                a.css.setMany({ width: "10px" });
                gcss.syncNow?.();

                const quidA = (a.dom.el() as HTMLElement).getAttribute("hson:quid") ?? "";
                a.removeSelf();
                gcss.syncNow?.();

                const b = host.create.div().id.set("box");
                b.css.setMany({ width: "20px" });
                gcss.syncNow?.();

                const quidB = (b.dom.el() as HTMLElement).getAttribute("hson:quid") ?? "";
                const snap = CssManager.invoke().snapshot?.() ?? "";

                (tree as any).__result = { quidA, quidB, snap };
            },

            assert(tree, t) {
                const r = (tree as any).__result;
                t.eq("new node has different quid", r.quidA === r.quidB, false);
                t.eq("old quid gone from css", String(r.snap).includes(r.quidA), false);
                t.eq("new quid present in css", String(r.snap).includes(r.quidB), true);
            },
        },
        {
            suite: SUITE,
            caseId: "serialization-mounted-reimported-branch-gains-dom-handle", name: "serialization: mounted reimported branch gains DOM handle",
            dom: true,
            fixture: "serialization/partial",
            sub: "mounted-branch-has-dom",
            preview: () => "<terminal-restoration>",

            html: `
        <main id="root">
          <div id="box">x</div>
        </main>
    `,

            async act(tree) {
                const boxQuid = tree.find.must.byId("box").quid;
                const round = reimport_current_markup_with_fresh_identity(tree);

                const box = round.find.must.byId("box");
                const el = box.dom.el() as HTMLElement;

                (tree as any).__result = {
                    tag: el.tagName.toLowerCase(),
                    text: box.text.get(),
                    identityFresh: box.quid !== boxQuid,
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;
                t.eq("mounted branch yields DOM", r.tag, "div");
                t.eq("text preserved", r.text, "x");
                t.eq("mounted reimported branch has fresh identity", r.identityFresh, true);
            },
        },



    ];

    return make_livetree_suite(SUITE, cases);
}



export function livetree_completionist(): TestSuite {
    const SUITE = "livetree/completionist";
    const cases: readonly LiveTreeCaseSpec[] =
        [
            {
                suite: SUITE,
                caseId: "interaction-css-state-does-not-leak-across-remove-and-reappend", name: "interaction: css state does not leak across remove and reappend",
                dom: true,
                fixture: "interaction",
                sub: "css-remove-reappend",

                html: `
        <main id="root">
          <div id="host"></div>
        </main>
    `,

                async act(tree) {
                    const host = tree.find.must.byId("host");

                    const first = host.create.div().id.set("box");
                    first.css.setMany({ width: "10px" });
                    gcss.syncNow?.();

                    const firstEl = first.dom.el() as HTMLElement;
                    const firstQuid = firstEl.getAttribute("hson:quid") ?? "";

                    first.removeSelf();
                    gcss.syncNow?.();

                    const second = host.create.div().id.set("box");
                    second.css.setMany({ width: "20px" });
                    gcss.syncNow?.();

                    const secondEl = second.dom.el() as HTMLElement;
                    const secondQuid = secondEl.getAttribute("hson:quid") ?? "";

                    const cssText = CssManager.invoke().snapshot?.() ?? "";

                    (tree as any).__result = {
                        firstQuid,
                        secondQuid,
                        cssText,
                    };
                },

                assert(tree, t) {
                    const r = (tree as any).__result;

                    t.eq("replacement remints identity", r.firstQuid === r.secondQuid, false);
                    t.eq("old selector removed from css", r.cssText.includes(r.firstQuid), false);
                    t.eq("new selector present in css", r.cssText.includes(r.secondQuid), true);
                    t.eq("old selector removed from css", r.cssText.includes(r.firstQuid), false);
                    t.eq("new selector present in css", r.cssText.includes(r.secondQuid), true);
                },
            },
            {
                suite: SUITE,
                caseId: "interaction-listener-works-after-grafted-explicit-clone-without-duplicate-firing", name: "interaction: listener works after grafted explicit clone without duplicate firing",
                dom: true,
                fixture: "interaction",
                sub: "listeners-graft",

                html: `
        <main id="root">
          <button id="btn">go</button>
        </main>
    `,

                async act(tree) {
                    let count = 0;

                    const btn = tree.find.must.byId("btn");
                    const sourceQuid = btn.quid;
                    btn.listen.onClick(() => {
                        count += 1;
                    });

                    const round = tree.cloneBranch();

                    const sandboxHost = (tree as any).__sandboxHost;
                    sandboxHost.append(round);

                    const btn2 = round.find.must.byId("btn");
                    btn2.listen.onClick(() => {
                        count += 10;
                    });

                    const el2 = btn2.dom.el() as HTMLElement;
                    el2.click();

                    (tree as any).__result = {
                        count,
                        identityFresh: btn2.quid !== sourceQuid,
                    };
                },

                assert(tree, t) {
                    const r = (tree as any).__result;

                    // only the rehydrated branch listener should fire from clicking grafted btn2
                    t.eq("grafted listener fires once", r.count, 10);
                    t.eq("explicit clone receives fresh button identity", r.identityFresh, true);
                },
            },
            {
                suite: SUITE,
                caseId: "interaction-dataset-survives-refind-on-explicit-clone-and-stays-independent", name: "interaction: dataset survives refind on explicit clone and stays independent",
                dom: true,
                fixture: "interaction",
                sub: "dataset-refind-clone",

                html: `
        <main id="root">
          <div id="box" data-mode="cold">x</div>
        </main>
    `,

                async act(tree) {
                    const sourceQuid = tree.find.must.byId("box").quid;
                    const round = tree.cloneBranch();

                    const sandboxHost = (tree as any).__sandboxHost;
                    sandboxHost.append(round);

                    const original = tree.find.must.byId("box");
                    const cloned = round.find.must.byId("box");

                    // mutate only the clone
                    cloned.data.set("mode", "warm");
                    cloned.text.set("y");

                    (tree as any).__result = {
                        originalMode: original.data.get("mode"),
                        originalText: original.text.get(),
                        clonedMode: cloned.data.get("mode"),
                        clonedText: cloned.text.get(),
                        identityFresh: cloned.quid !== sourceQuid,
                    };
                },

                assert(tree, t) {
                    const r = (tree as any).__result;

                    t.eq("original dataset preserved", r.originalMode, "cold");
                    t.eq("original text preserved", r.originalText, "x");
                    t.eq("clone dataset updated independently", r.clonedMode, "warm");
                    t.eq("clone text updated independently", r.clonedText, "y");
                    t.eq("explicit clone receives fresh identity", r.identityFresh, true);
                },
            },
            {
                suite: SUITE,
                caseId: "serialization-explicit-nested-subtree-clone-ignores-external-sibling-mutation", name: "serialization: explicit nested subtree clone ignores external sibling mutation",
                dom: true,
                fixture: "serialization/partial",
                sub: "nested-partial-hydrate",

                html: `
        <main id="root">
          <section id="left">
            <div id="left-inner">L</div>
          </section>
          <section id="right">
            <div id="right-inner">R</div>
          </section>
        </main>
    `,

                async act(tree) {
                    tree.find.must.byId("left-inner").text.set("LL");
                    await tick();

                    // Explicitly copy only the nested right subtree.
                    const sourceRight = tree.find.must.byId("right");
                    const sourceRightQuid = sourceRight.quid;
                    const round = sourceRight.cloneBranch();

                    const rightInner = round.find.must.byId("right-inner");

                    (tree as any).__result = {
                        leftText: tree.find.must.byId("left-inner").text.get(),
                        rightText: rightInner.text.get(),
                        leakedLeft: !!round.find.byId("left-inner"),
                        identityFresh: round.quid !== sourceRightQuid,
                    };
                },

                assert(tree, t) {
                    const r = (tree as any).__result;

                    t.eq("left mutation stayed left", r.leftText, "LL");
                    t.eq("right subtree rehydrates cleanly", r.rightText, "R");
                    t.eq("partial hydrate does not include left subtree", r.leakedLeft, false);
                    t.eq("explicit right clone receives fresh identity", r.identityFresh, true);
                },
            },
        ];

    return make_livetree_suite(SUITE, cases);
}
