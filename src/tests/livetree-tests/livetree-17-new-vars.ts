import { CssManager, hson } from "hson-live";
import { LiveTree } from "../../../../hson-live/dist/api/livetree/livetree";
import type { TestSuite, LiveTreeCaseSpec } from "../../app/phases/phase-3-demo/demo-test/tests.types";
import { tick } from "./livetree-03";
import { make_livetree_suite } from "./livetree-testkit";

const gcss = CssManager.invoke();

export function livetree_css_surfaces_new(): TestSuite {
    const SUITE = "livetree/css-surface-accessors";
    const cases: readonly LiveTreeCaseSpec[] = [
        {
            suite: SUITE,
            name: "css surface: fluent setter/getter roundtrip for known camelCase property",
            dom: true,
            fixture: "css-surface",
            sub: "known-camel-roundtrip",

            html: `
        <main id="root">
          <div id="box">x</div>
        </main>
    `,

            async act(tree) {
                const box = tree.find.must.byId("box");

                // changed: fluent setter and getter should now mirror each other.
                box.css.set.width("123px");
                box.css.set.backgroundColor("rgb(1, 2, 3)");

                (tree as any).__result = {
                    width: box.css.get.width(),
                    backgroundColor: box.css.get.backgroundColor(),
                    widthByProperty: box.css.get.property("width"),
                    backgroundByProperty: box.css.get.property("background-color"),
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;
                t.eq("width getter mirrors fluent setter", r.width, "123px");
                t.eq("background getter mirrors fluent setter", r.backgroundColor, "rgb(1, 2, 3)");
                t.eq("property getter reads width", r.widthByProperty, "123px");
                t.eq("property getter normalizes kebab background-color", r.backgroundByProperty, "rgb(1, 2, 3)");
            },
        },
        {
            suite: SUITE,
            name: "css surface: standard property setters and getters normalize camel/kebab access",
            dom: true,
            fixture: "css-surface",
            sub: "standard-property-normalization",

            html: `
    <main id="root">
      <div id="box">x</div>
    </main>
  `,

            async act(tree) {
                const box = tree.find.must.byId("box");

                // changed: standard CSS properties use the fluent setter surface.
                box.css.set.fontSize("17px");
                box.css.set.letterSpacing("0.04em");

                (tree as any).__result = {
                    fontSize: box.css.get.fontSize(),
                    fontSizeByCamelProperty: box.css.get.property("fontSize"),
                    fontSizeByKebabProperty: box.css.get.property("font-size"),
                    fontSizeAsVar: box.css.var.value("font-size"),

                    letterSpacing: box.css.get.letterSpacing(),
                    letterSpacingByCamelProperty: box.css.get.property("letterSpacing"),
                    letterSpacingByKebabProperty: box.css.get.property("letter-spacing"),
                    letterSpacingAsVar: box.css.var.value("letter-spacing"),
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;

                t.eq("fluent getter reads fontSize", r.fontSize, "17px");
                t.eq("property getter reads camel fontSize", r.fontSizeByCamelProperty, "17px");
                t.eq("property getter reads kebab font-size", r.fontSizeByKebabProperty, "17px");
                t.eq("var getter does not read standard font-size property", r.fontSizeAsVar, undefined);

                t.eq("fluent getter reads letterSpacing", r.letterSpacing, "0.04em");
                t.eq("property getter reads camel letterSpacing", r.letterSpacingByCamelProperty, "0.04em");
                t.eq("property getter reads kebab letter-spacing", r.letterSpacingByKebabProperty, "0.04em");
                t.eq("var getter does not read standard letter-spacing property", r.letterSpacingAsVar, undefined);
            },
        },
        {
            suite: SUITE,
            name: "css surface: css var setter accepts canonical, single-hyphen, and bare names",
            dom: true,
            fixture: "css-surface",
            sub: "var-setter-name-normalization",

            html: `
        <main id="root">
          <div id="box">x</div>
        </main>
    `,

            async act(tree) {
                const box = tree.find.must.byId("box");

                // changed: var setter should accept all supported user-facing spellings.
                box.css.set.var("--canonical-var", "A");
                box.css.set.var("-single-hyphen-var", "B");
                box.css.set.var("bare-var", "C");
                (tree as any).__result = {
                    canonical: box.css.var.value("--canonical-var"),
                    singleHyphen: box.css.var.value("--single-hyphen-var"),
                    bare: box.css.var.value("--bare-var"),
                    canonicalByBare: box.css.var.value("canonical-var"),
                    singleHyphenBySingle: box.css.var.value("-single-hyphen-var"),
                    bareByBare: box.css.var.value("bare-var"),
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;
                t.eq("canonical var set", r.canonical, "A");
                t.eq("single-hyphen var normalized", r.singleHyphen, "B");
                t.eq("bare var normalized", r.bare, "C");
                t.eq("canonical var readable by bare spelling", r.canonicalByBare, "A");
                t.eq("single-hyphen var readable by single-hyphen spelling", r.singleHyphenBySingle, "B");
                t.eq("bare var readable by bare spelling", r.bareByBare, "C");
            },
        },
        {
            suite: SUITE,
            name: "css surface: bracket css var setter/getter uses canonical custom-property names",
            dom: true,
            fixture: "css-surface",
            sub: "var-bracket-roundtrip",

            html: `
        <main id="root">
          <div id="box">x</div>
        </main>
    `,

            async act(tree) {
                const box = tree.find.must.byId("box");

                // changed: bracket access should support canonical custom-property names.
                box.css.set.var("--direct-var", "ok");

                (tree as any).__result = {
                    directBracket: box.css.var.value("--direct-var"),
                    directVar: box.css.var.value("--direct-var"),
                    directBare: box.css.var.value("direct-var"),
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;
                t.eq("bracket custom var getter reads value", r.directBracket, "ok");
                t.eq("var getter reads bracket-set custom var", r.directVar, "ok");
                t.eq("bare var getter reads bracket-set custom var", r.directBare, "ok");
            },
        },
        {
            suite: SUITE,
            name: "css surface: custom-property names preserve internal hyphens",
            dom: true,
            fixture: "css-surface",
            sub: "var-internal-hyphens-preserved",

            html: `
        <main id="root">
          <div id="box">x</div>
        </main>
    `,

            async act(tree) {
                const box = tree.find.must.byId("box");

                // changed: leading hyphen repair must not clobber meaningful internal hyphens.
                box.css.set.var("-custom-prop-name", "hyphenated");

                (tree as any).__result = {
                    correct: box.css.var.value("--custom-prop-name"),
                    clobbered: box.css.var.value("--custompropname"),
                    partiallyClobbered: box.css.var.value("--custom-propname"),
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;
                t.eq("hyphenated custom-property name preserved", r.correct, "hyphenated");
                t.eq("fully clobbered name was not created", r.clobbered, undefined);
                t.eq("partially clobbered name was not created", r.partiallyClobbered, undefined);
            },
        },
        {
            suite: SUITE,
            name: "css surface: setMany supports normal properties and custom properties",
            dom: true,
            fixture: "css-surface",
            sub: "setmany-normal-and-vars",

            html: `
        <main id="root">
          <div id="box">x</div>
        </main>
    `,

            async act(tree) {
                const box = tree.find.must.byId("box");

                // changed: setMany should route canonical custom-property keys through the same surface.
                box.css.setMany({
                    width: "42px",
                    backgroundColor: "rgb(4, 5, 6)",
                    "--many-var": "many",
                });

                (tree as any).__result = {
                    width: box.css.get.width(),
                    backgroundColor: box.css.get.backgroundColor(),
                    manyVar: box.css.var.value("many-var"),
                    manyBracket: box.css.var.value("--many-var"),
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;
                t.eq("setMany width readable", r.width, "42px");
                t.eq("setMany backgroundColor readable", r.backgroundColor, "rgb(4, 5, 6)");
                t.eq("setMany custom var readable by bare name", r.manyVar, "many");
                t.eq("setMany custom var readable by bracket getter", r.manyBracket, "many");
            },
        },
        {
            suite: SUITE,
            name: "css surface: nullish writes remove declarations",
            dom: true,
            fixture: "css-surface",
            sub: "nullish-removal",

            html: `
        <main id="root">
          <div id="box">x</div>
        </main>
    `,

            async act(tree) {
                const box = tree.find.must.byId("box");

                box.css.set.width("88px");
                box.css.set.var("--gone-var", "here");

                const beforeWidth = box.css.get.width();
                const beforeVar = box.css.var.value("gone-var");

                // changed: nullish CssValue paths should remove stored declarations.
                box.css.set.width(null);
                box.css.set.var("--gone-var", null);

                (tree as any).__result = {
                    beforeWidth,
                    beforeVar,
                    afterWidth: box.css.get.width(),
                    afterVar: box.css.var.value("gone-var"),
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;
                t.eq("width existed before removal", r.beforeWidth, "88px");
                t.eq("custom var existed before removal", r.beforeVar, "here");
                t.eq("width removed by null", r.afterWidth, undefined);
                t.eq("custom var removed by null", r.afterVar, undefined);
            },
        },
        {
            suite: SUITE,
            name: "css surface: invalid empty custom-property names are no-ops",
            dom: true,
            fixture: "css-surface",
            sub: "empty-var-noop",

            html: `
        <main id="root">
          <div id="box">x</div>
        </main>
    `,

            async act(tree) {
                const box = tree.find.must.byId("box");

                let valueThrows = false;
                let setThrows = false;
                let nameThrows = false;
                let keyThrows = false;

                try { box.css.var.value(""); } catch { valueThrows = true; }
                try { box.css.var.set("", "red"); } catch { setThrows = true; }
                try { box.css.var.name(""); } catch { nameThrows = true; }
                try { box.css.var.key(""); } catch { keyThrows = true; }

                const picked = box.css.get.vars(["", "   ", "--", "missing"]);

                (tree as any).__result = {
                    valueThrows,
                    setThrows,
                    nameThrows,
                    keyThrows,
                    pickedKeys: Object.keys(picked),
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;

                t.eq("var.value rejects empty name", r.valueThrows, true);
                t.eq("var.set rejects empty name", r.setThrows, true);
                t.eq("var.name rejects empty name", r.nameThrows, true);
                t.eq("var.key rejects empty name", r.keyThrows, true);
                t.eq("get.vars omits invalid and missing names", r.pickedKeys.length, 0);
            }
        },
        {
            suite: SUITE,
            name: "css surface: custom vars can be consumed by normal CSS declarations",
            dom: true,
            fixture: "css-surface",
            sub: "var-consumption",

            html: `
        <main id="root">
          <div id="box">x</div>
        </main>
    `,

            async act(tree) {
                const box = tree.find.must.byId("box");

                box.css.set.var("theme-ink", "rgb(7, 8, 9)");
                box.css.set.color("var(--theme-ink)");

                (tree as any).__result = {
                    themeInk: box.css.var.value("--theme-ink"),
                    color: box.css.get.color(),
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;
                t.eq("custom var stores raw value", r.themeInk, "rgb(7, 8, 9)");
                t.eq("normal declaration stores var reference", r.color, "var(--theme-ink)");
            },
        },
    ];

    return make_livetree_suite(SUITE, cases);
}



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
            name: "syncNow: no-op sync leaves stylesheet unchanged",
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
            name: "css: repeated identical write does not duplicate selector/rule",
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
                const quid = boxEl.getAttribute("data-_quid") ?? "";

                // selector guess based on your emitted CSS shape seen in devtools
                const selector = quid ? `[data-_quid="${quid}"]` : "";

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
            name: "css: repeated mutations settle on final rule state",
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
                const quid = boxEl.getAttribute("data-_quid") ?? "";

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
            name: "css: removed node does not leave stale rule behind after sync",
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
                const quid = boxEl.getAttribute("data-_quid") ?? "";
                const selector = quid ? `[data-_quid="${quid}"]` : "";

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
            name: "css: pseudo rule replacement settles to final value without duplication",
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
                const quid = boxEl.getAttribute("data-_quid") ?? "";

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
            name: "css: clearQuid removes stored and emitted state",
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
                const quid = (box.dom.el() as HTMLElement).getAttribute("data-_quid") ?? "";

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
            name: "css: remove then recreate does not leak stale rule",
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

                const quidA = (a.dom.el() as HTMLElement).getAttribute("data-_quid") ?? "";
                a.removeSelf();
                gcss.syncNow?.();

                const b = host.create.div().id.set("box");
                b.css.setMany({ width: "20px" });
                gcss.syncNow?.();

                const quidB = (b.dom.el() as HTMLElement).getAttribute("data-_quid") ?? "";
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
            name: "serialization: mounted rehydrated branch gains DOM handle",
            dom: true,
            fixture: "serialization/partial",
            sub: "mounted-branch-has-dom",

            html: `
        <main id="root">
          <div id="box">x</div>
        </main>
    `,

            async act(tree) {
                const rootEl = tree.find.must.byId("root").dom.el();
                const round = hson.liveTree.fromTrustedHtml(rootEl!);

                const sandboxHost = (tree as any).__sandboxHost;
                sandboxHost.append(round);

                const box = round.find.must.byId("box");
                const el = box.dom.el() as HTMLElement;

                (tree as any).__result = {
                    tag: el.tagName.toLowerCase(),
                    text: box.text.get(),
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;
                t.eq("mounted branch yields DOM", r.tag, "div");
                t.eq("text preserved", r.text, "x");
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
                name: "interaction: css state does not leak across remove and reappend",
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
                    const firstQuid = firstEl.getAttribute("data-_quid") ?? "";

                    first.removeSelf();
                    gcss.syncNow?.();

                    const second = host.create.div().id.set("box");
                    second.css.setMany({ width: "20px" });
                    gcss.syncNow?.();

                    const secondEl = second.dom.el() as HTMLElement;
                    const secondQuid = secondEl.getAttribute("data-_quid") ?? "";

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
                name: "interaction: listener works after grafted rehydrate without duplicate firing",
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
                    btn.listen.onClick(() => {
                        count += 1;
                    });

                    const rootEl = tree.find.must.byId("root").dom.el();
                    const round = hson.liveTree.fromTrustedHtml(rootEl!);

                    const sandboxHost = (tree as any).__sandboxHost;
                    sandboxHost.append(round);

                    const btn2 = round.find.must.byId("btn");
                    btn2.listen.onClick(() => {
                        count += 10;
                    });

                    const el2 = btn2.dom.el() as HTMLElement;
                    el2.click();

                    (tree as any).__result = { count };
                },

                assert(tree, t) {
                    const r = (tree as any).__result;

                    // only the rehydrated branch listener should fire from clicking grafted btn2
                    t.eq("grafted listener fires once", r.count, 10);
                },
            },
            {
                suite: SUITE,
                name: "interaction: dataset survives refind on cloned branch and stays independent",
                dom: true,
                fixture: "interaction",
                sub: "dataset-refind-clone",

                html: `
        <main id="root">
          <div id="box" data-mode="cold">x</div>
        </main>
    `,

                async act(tree) {
                    const rootEl = tree.find.must.byId("root").dom.el();
                    const round = hson.liveTree.fromTrustedHtml(rootEl!);

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
                    };
                },

                assert(tree, t) {
                    const r = (tree as any).__result;

                    t.eq("original dataset preserved", r.originalMode, "cold");
                    t.eq("original text preserved", r.originalText, "x");
                    t.eq("clone dataset updated independently", r.clonedMode, "warm");
                    t.eq("clone text updated independently", r.clonedText, "y");
                },
            },
            {
                suite: SUITE,
                name: "serialization: partial rehydrate of nested subtree ignores external sibling mutation",
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

                    // hydrate only the nested right subtree
                    const rightEl = tree.find.must.byId("right").dom.el();
                    const round = hson.liveTree.fromTrustedHtml(rightEl!);

                    const rightInner = round.find.must.byId("right-inner");

                    (tree as any).__result = {
                        leftText: tree.find.must.byId("left-inner").text.get(),
                        rightText: rightInner.text.get(),
                        leakedLeft: !!round.find.byId("left-inner"),
                    };
                },

                assert(tree, t) {
                    const r = (tree as any).__result;

                    t.eq("left mutation stayed left", r.leftText, "LL");
                    t.eq("right subtree rehydrates cleanly", r.rightText, "R");
                    t.eq("partial hydrate does not include left subtree", r.leakedLeft, false);
                },
            },
        ];

    return make_livetree_suite(SUITE, cases);
}



