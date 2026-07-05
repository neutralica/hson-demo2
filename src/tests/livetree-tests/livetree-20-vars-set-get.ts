import type { TestSuite } from "../../app/demos/test/tests.types";
import type { LiveTreeCaseSpec } from "../../app/demos/test/livemap-tests.types";
import { make_livetree_suite } from "./make-livetree-suite";

function did_throw(fn: () => unknown): boolean {
    try {
        fn();
        return false;
    } catch {
        return true;
    }
}

export function livetree_css_var_facade_surfaces(): TestSuite {
    const SUITE = "livetree/css-var-facade-surfaces";
    const cases: readonly LiveTreeCaseSpec[] = [
        {
            suite: SUITE,
            name: "css var facade: name and key normalize accepted spellings",
            dom: true,
            fixture: "css-var-facade",
            sub: "css-name-key-normalization",

            html: `
        <main id="root">
          <div id="box">x</div>
        </main>
    `,

            async act(tree) {
                const box = tree.find.must.byId("box");
                (tree as any).__result = {
                    bareName: box.css.var.name("theme-ink"),
                    singleName: box.css.var.name("-theme-ink"),
                    canonicalName: box.css.var.name("--theme-ink"),
                    bareKey: box.css.var.key("theme-ink"),
                    singleKey: box.css.var.key("-theme-ink"),
                    canonicalKey: box.css.var.key("--theme-ink"),
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;

                t.eq("bare name normalizes to canonical custom property", r.bareName, "--theme-ink");
                t.eq("single hyphen name normalizes to canonical custom property", r.singleName, "--theme-ink");
                t.eq("canonical name remains canonical", r.canonicalName, "--theme-ink");
                t.eq("bare key becomes var reference", r.bareKey, "var(--theme-ink)");
                t.eq("single hyphen key becomes var reference", r.singleKey, "var(--theme-ink)");
                t.eq("canonical key becomes var reference", r.canonicalKey, "var(--theme-ink)");
            },
        },
        {
            suite: SUITE,
            name: "style var facade: name and key normalize accepted spellings",
            dom: true,
            fixture: "css-var-facade",
            sub: "style-name-key-normalization",

            html: `
        <main id="root">
          <div id="box">x</div>
        </main>
    `,

            async act(tree) {
                const box = tree.find.must.byId("box");

                (tree as any).__result = {
                    bareName: box.style.var.name("runtime-x"),
                    singleName: box.style.var.name("-runtime-x"),
                    canonicalName: box.style.var.name("--runtime-x"),
                    bareKey: box.style.var.key("runtime-x"),
                    singleKey: box.style.var.key("-runtime-x"),
                    canonicalKey: box.style.var.key("--runtime-x"),
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;

                t.eq("bare inline name normalizes", r.bareName, "--runtime-x");
                t.eq("single hyphen inline name normalizes", r.singleName, "--runtime-x");
                t.eq("canonical inline name remains canonical", r.canonicalName, "--runtime-x");
                t.eq("bare inline key becomes var reference", r.bareKey, "var(--runtime-x)");
                t.eq("single hyphen inline key becomes var reference", r.singleKey, "var(--runtime-x)");
                t.eq("canonical inline key becomes var reference", r.canonicalKey, "var(--runtime-x)");
            },
        },
        {
            suite: SUITE,
            name: "css var facade: set and value roundtrip through QUID-scoped stylesheet",
            dom: true,
            fixture: "css-var-facade",
            sub: "css-set-value-roundtrip",

            html: `
        <main id="root">
          <div id="box">x</div>
        </main>
    `,

            async act(tree) {
                const box = tree.find.must.byId("box");

                const returned = box.css.var.set("theme-ink", "rgb(1, 2, 3)");
                box.css.set.color(box.css.var.key("theme-ink"));

                (tree as any).__result = {
                    returnedSameTree: returned === box,
                    valueByBare: box.css.var.value("theme-ink"),
                    valueByCanonical: box.css.var.value("--theme-ink"),
                    oldGetterStillWorks: box.css.var.value("theme-ink"),
                    consumedColor: box.css.get.color(),
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;

                t.eq("css var.set returns owner tree for chaining", r.returnedSameTree, true);
                t.eq("css var.value reads by bare name", r.valueByBare, "rgb(1, 2, 3)");
                t.eq("css var.value reads by canonical name", r.valueByCanonical, "rgb(1, 2, 3)");
                t.eq("existing css.var.value still reads same declaration", r.oldGetterStillWorks, "rgb(1, 2, 3)");
                t.eq("normal declaration can consume css.var.key output", r.consumedColor, "var(--theme-ink)");
            },
        },
        {
            suite: SUITE,
            name: "style var facade: set and value roundtrip through inline style",
            dom: true,
            fixture: "css-var-facade",
            sub: "style-set-value-roundtrip",

            html: `
        <main id="root">
          <div id="box">x</div>
        </main>
    `,

            async act(tree) {
                const box = tree.find.must.byId("box");

                const returned = box.style.var.set("runtime-x", "12px");
                box.style.set.transform(`translateX(${box.style.var.key("runtime-x")})`);

                const el = box.dom.el() as HTMLElement;

                (tree as any).__result = {
                    returnedSameTree: returned === box,
                    valueByBare: box.style.var.value("runtime-x"),
                    valueByCanonical: box.style.var.value("--runtime-x"),
                    oldGetterStillWorks: box.style.var.value("runtime-x"),
                    transform: box.style.get.transform(),
                    inlineVar: el.style.getPropertyValue("--runtime-x").trim(),
                    inlineTransform: el.style.getPropertyValue("transform").trim(),
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;

                t.eq("style var.set returns owner tree for chaining", r.returnedSameTree, true);
                t.eq("style var.value reads by bare name", r.valueByBare, "12px");
                t.eq("style var.value reads by canonical name", r.valueByCanonical, "12px");
                t.eq("existing style.var.value still reads same declaration", r.oldGetterStillWorks, "12px");
                t.eq("normal inline declaration can consume style.var.key output", r.transform, "translateX(var(--runtime-x))");
                t.eq("inline DOM custom property was written", r.inlineVar, "12px");
                t.eq("inline DOM transform was written", r.inlineTransform, "translateX(var(--runtime-x))");
            },
        },
        {
            suite: SUITE,
            name: "css and style var facades keep separate storage scopes",
            dom: true,
            fixture: "css-var-facade",
            sub: "css-style-scope-separation",

            html: `
        <main id="root">
          <div id="box">x</div>
        </main>
    `,

            async act(tree) {
                const box = tree.find.must.byId("box");

                box.css.var.set("shared-name", "stylesheet-value");
                box.style.var.set("shared-name", "inline-value");

                (tree as any).__result = {
                    cssValue: box.css.var.value("shared-name"),
                    styleValue: box.style.var.value("shared-name"),
                    cssOldGetter: box.css.var.value("shared-name"),
                    styleOldGetter: box.style.var.value("shared-name"),
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;

                t.eq("css var facade reads stylesheet-scoped value", r.cssValue, "stylesheet-value");
                t.eq("style var facade reads inline-scoped value", r.styleValue, "inline-value");
                t.eq("old css getter reads stylesheet-scoped value", r.cssOldGetter, "stylesheet-value");
                t.eq("old style getter reads inline-scoped value", r.styleOldGetter, "inline-value");
            },
        },
        {
            suite: SUITE,
            name: "css selector var facade: set and value roundtrip through selector handle",
            dom: true,
            fixture: "css-var-facade",
            sub: "selector-var-roundtrip",

            html: `
        <main id="root">
          <div id="box">x</div>
        </main>
    `,

            async act(tree) {
                const box = tree.find.must.byId("box");
                const before = box.css.selector("&::before");

                const returned = before.var.set("before-ink", "rgb(4, 5, 6)");
                before.setMany({
                    content: `""`,
                    color: before.var.key("before-ink"),
                });

                (tree as any).__result = {
                    returnedSameTree: returned === box,
                    value: before.var.value("before-ink"),
                    oldGetterStillWorks: before.var.value("before-ink"),
                    color: before.get.color(),
                    getMany: before.getMany(),
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;

                t.eq("selector var.set returns selector owner", r.returnedSameTree, true);
                t.eq("selector var.value reads stored custom property", r.value, "rgb(4, 5, 6)");
                t.eq("selector var.value still reads stored custom property", r.oldGetterStillWorks, "rgb(4, 5, 6)");
                t.eq("selector normal declaration consumes selector var key", r.color, "var(--before-ink)");
                t.eq("selector getMany includes custom property", r.getMany["--before-ink"], "rgb(4, 5, 6)");
            },
        },
        {
            suite: SUITE,
            name: "css var facade: nullish writes remove QUID-scoped custom properties",
            dom: true,
            fixture: "css-var-facade",
            sub: "css-nullish-var-removal",

            html: `
        <main id="root">
          <div id="box">x</div>
        </main>
    `,

            async act(tree) {
                const box = tree.find.must.byId("box");

                box.css.var.set("gone", "present");
                const before = box.css.var.value("gone");
                box.css.var.set("gone", null);

                (tree as any).__result = {
                    before,
                    after: box.css.var.value("gone"),
                    oldGetterAfter: box.css.var.value("gone"),
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;

                t.eq("css var existed before removal", r.before, "present");
                t.eq("css var.value returns undefined after null removal", r.after, undefined);
                t.eq("css var.value returns undefined after null removal", r.oldGetterAfter, undefined);
            },
        },
        {
            suite: SUITE,
            name: "style var facade: nullish writes remove inline custom properties",
            dom: true,
            fixture: "css-var-facade",
            sub: "style-nullish-var-removal",

            html: `
        <main id="root">
          <div id="box">x</div>
        </main>
    `,

            async act(tree) {
                const box = tree.find.must.byId("box");
                const el = box.dom.el() as HTMLElement;

                box.style.var.set("gone", "present");
                const before = box.style.var.value("gone");
                box.style.var.set("gone", null);

                (tree as any).__result = {
                    before,
                    after: box.style.var.value("gone"),
                    oldGetterAfter: box.style.var.value("gone"),
                    inlineAfter: el.style.getPropertyValue("--gone"),
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;

                t.eq("style var existed before removal", r.before, "present");
                t.eq("style var.value returns undefined after null removal", r.after, undefined);
                t.eq("style var.value returns undefined after null removal", r.oldGetterAfter, undefined);
                t.eq("inline DOM var removed", r.inlineAfter, "");
            },
        },
        {
            suite: SUITE,
            name: "var facades reject invalid custom-property names consistently",
            dom: true,
            fixture: "css-var-facade",
            sub: "invalid-var-names-throw",

            html: `
        <main id="root">
          <div id="box">x</div>
        </main>
    `,

            async act(tree) {
                const box = tree.find.must.byId("box");
                const badNames = ["", "   ", "-", "--"] as const;

                const cssThrows = badNames.map((name) => did_throw(() => box.css.var.name(name)));
                const styleThrows = badNames.map((name) => did_throw(() => box.style.var.key(name)));
                const selectorThrows = badNames.map((name) => did_throw(() => box.css.selector("&::after").var.set(name, "bad")));

                (tree as any).__result = {
                    cssThrows,
                    styleThrows,
                    selectorThrows,
                    cssAll: box.css.getMany() ?? {},
                    styleAll: box.style.getMany() ?? {},
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;

                t.eq("css facade rejects all invalid names", r.cssThrows.every(Boolean), true);
                t.eq("style facade rejects all invalid names", r.styleThrows.every(Boolean), true);
                t.eq("selector facade rejects all invalid names", r.selectorThrows.every(Boolean), true);
                t.eq("css invalid sentinel not stored", Object.prototype.hasOwnProperty.call(r.cssAll, "--"), false);
                t.eq("style invalid sentinel not stored", Object.prototype.hasOwnProperty.call(r.styleAll, "--"), false);
            },
        },
        {
            suite: SUITE,
            name: "style var facade: inline custom properties are suitable for runtime animation state",
            dom: true,
            fixture: "css-var-facade",
            sub: "style-runtime-var-update",

            html: `
        <main id="root">
          <div id="box">x</div>
        </main>
    `,

            async act(tree) {
                const box = tree.find.must.byId("box");
                const el = box.dom.el() as HTMLElement;

                box.style.var.set("mote-x", "10px");
                box.style.var.set("mote-push", "0px");
                box.style.set.transform(`translate3d(calc(${box.style.var.key("mote-x")} + ${box.style.var.key("mote-push")}), 0, 0)`);

                const beforePush = box.style.var.value("mote-push");
                const beforeStyleAttr = el.getAttribute("style") ?? "";

                box.style.var.set("mote-push", "24px");

                (tree as any).__result = {
                    beforePush,
                    afterPush: box.style.var.value("mote-push"),
                    transform: box.style.get.transform(),
                    beforeStyleAttr,
                    afterStyleAttr: el.getAttribute("style") ?? "",
                    cssScopedPush: box.css.var.value("mote-push"),
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;

                t.eq("runtime inline var starts at zero", r.beforePush, "0px");
                t.eq("runtime inline var updates locally", r.afterPush, "24px");
                t.eq("transform stores custom-property expression", r.transform, "translate3d(calc(var(--mote-x) + var(--mote-push)), 0, 0)");
                t.eq("style attribute changed after runtime update", r.afterStyleAttr === r.beforeStyleAttr, false);
                t.eq("runtime inline var does not create css-scoped var", r.cssScopedPush, undefined);
            },
        },
    ];

    return make_livetree_suite(SUITE, cases);
}

export function livetree_get_many_surface(): TestSuite {
    const SUITE = "livetree/get-many-surface";
    const cases: readonly LiveTreeCaseSpec[] = [
        {
            suite: SUITE,
            name: "style getMany reads inline declarations while getMany reads CSS all property",
            dom: true,
            fixture: "get-many-surface",
            sub: "style-getmany-and-all-property",

            html: `
        <main id="root">
          <div id="box">x</div>
        </main>
    `,

            async act(tree) {
                const box = tree.find.must.byId("box");

                box.style.setMany({
                    color: "red",
                    backgroundColor: "black",
                    all: "unset",
                });
                box.style.var.set("runtime-x", "12px");

                const many = box.style.getMany();

                (tree as any).__result = {
                    allPropertyDirect: box.style.get.all(),
                    allPropertyExplicit: box.style.get.property("all"),
                    manyColor: many.color,
                    manyBackgroundColor: many.backgroundColor,
                    manyAll: many.all,
                    manyVar: many["--runtime-x"],
                    oldPropertyGetter: box.style.get.color(),
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;

                t.eq("style get.all reads CSS all property", r.allPropertyDirect, "unset");
                t.eq("style get.property('all') reads same CSS all property", r.allPropertyExplicit, "unset");
                t.eq("style getMany includes color", r.manyColor, "red");
                t.eq("style getMany includes backgroundColor", r.manyBackgroundColor, "black");
                t.eq("style getMany includes all as a normal declaration", r.manyAll, "unset");
                t.eq("style getMany includes inline custom property", r.manyVar, "12px");
                t.eq("normal style getter still reads individual properties", r.oldPropertyGetter, "red");
            },
        },
        {
            suite: SUITE,
            name: "css getMany reads QUID declarations while getMany reads CSS all property",
            dom: true,
            fixture: "get-many-surface",
            sub: "css-getmany-and-all-property",

            html: `
        <main id="root">
          <div id="box">x</div>
        </main>
    `,

            async act(tree) {
                const box = tree.find.must.byId("box");

                box.css.setMany({
                    color: "blue",
                    backgroundColor: "white",
                    all: "initial",
                });
                box.css.var.set("theme-x", "24px");

                const many = box.css.getMany();

                (tree as any).__result = {
                    allPropertyDirect: box.css.get.all(),
                    allPropertyExplicit: box.css.get.property("all"),
                    manyColor: many.color,
                    manyBackgroundColor: many.backgroundColor,
                    manyAll: many.all,
                    manyVar: many["--theme-x"],
                    oldPropertyGetter: box.css.get.color(),
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;

                t.eq("css get.all reads CSS all property", r.allPropertyDirect, "initial");
                t.eq("css get.property('all') reads same CSS all property", r.allPropertyExplicit, "initial");
                t.eq("css getMany includes color", r.manyColor, "blue");
                t.eq("css getMany includes backgroundColor", r.manyBackgroundColor, "white");
                t.eq("css getMany includes all as a normal declaration", r.manyAll, "initial");
                t.eq("css getMany includes QUID custom property", r.manyVar, "24px");
                t.eq("normal css getter still reads individual properties", r.oldPropertyGetter, "blue");
            },
        },
        {
            suite: SUITE,
            name: "selector getMany reads selector declarations while getMany reads CSS all property",
            dom: true,
            fixture: "get-many-surface",
            sub: "selector-getmany-and-all-property",

            html: `
        <main id="root">
          <div id="box">x</div>
        </main>
    `,

            async act(tree) {
                const box = tree.find.must.byId("box");
                const before = box.css.selector("&::before");

                before.setMany({
                    content: `""`,
                    color: "green",
                    all: "revert",
                });
                before.var.set("before-x", "36px");

                const many = before.getMany();

                (tree as any).__result = {
                    allPropertyDirect: before.get.all(),
                    allPropertyExplicit: before.get.property("all"),
                    manyContent: many.content,
                    manyColor: many.color,
                    manyAll: many.all,
                    manyVar: many["--before-x"],
                    oldPropertyGetter: before.get.color(),
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;

                t.eq("selector get.all() reads CSS all property", r.allPropertyDirect, "revert");
                t.eq("selector get.property('all') reads same CSS all property", r.allPropertyExplicit, "revert");
                t.eq("selector getMany includes content", r.manyContent, `""`);
                t.eq("selector getMany includes color", r.manyColor, "green");
                t.eq("selector getMany includes all as a normal declaration", r.manyAll, "revert");
                t.eq("selector getMany includes selector custom property", r.manyVar, "36px");
                t.eq("normal selector getter still reads individual properties", r.oldPropertyGetter, "green");
            },
        },
        {
            suite: SUITE,
            name: "style getMany returns a setMany-compatible map",
            dom: true,
            fixture: "get-many-surface",
            sub: "style-getmany-setmany-roundtrip",

            html: `
        <main id="root">
          <div id="source">source</div>
          <div id="target">target</div>
        </main>
    `,

            async act(tree) {
                const source = tree.find.must.byId("source");
                const target = tree.find.must.byId("target");

                source.style.setMany({
                    color: "rgb(1, 2, 3)",
                    paddingLeft: "7px",
                    all: "unset",
                });
                source.style.var.set("copied-var", "copied-inline");

                target.style.setMany(source.style.getMany());

                (tree as any).__result = {
                    targetColor: target.style.get.color(),
                    targetPaddingLeft: target.style.get.paddingLeft(),
                    targetAll: target.style.get.all(),
                    targetVar: target.style.var.value("copied-var"),
                    sourceManyCount: Object.keys(source.style.getMany()).length,
                    targetManyCount: Object.keys(target.style.getMany()).length,
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;

                t.eq("style setMany accepts style getMany color", r.targetColor, "rgb(1, 2, 3)");
                t.eq("style setMany accepts style getMany paddingLeft", r.targetPaddingLeft, "7px");
                t.eq("style setMany accepts style getMany all property", r.targetAll, "unset");
                t.eq("style setMany accepts style getMany custom property", r.targetVar, "copied-inline");
                t.eq("source and target getMany have same key count", r.targetManyCount, r.sourceManyCount);
            },
        },
        {
            suite: SUITE,
            name: "css getMany returns a setMany-compatible map",
            dom: true,
            fixture: "get-many-surface",
            sub: "css-getmany-setmany-roundtrip",

            html: `
        <main id="root">
          <div id="source">source</div>
          <div id="target">target</div>
        </main>
    `,

            async act(tree) {
                const source = tree.find.must.byId("source");
                const target = tree.find.must.byId("target");

                source.css.setMany({
                    color: "rgb(4, 5, 6)",
                    marginTop: "9px",
                    all: "initial",
                });
                source.css.var.set("copied-var", "copied-css");

                target.css.setMany(source.css.getMany());

                (tree as any).__result = {
                    targetColor: target.css.get.color(),
                    targetMarginTop: target.css.get.marginTop(),
                    targetAll: target.css.get.all(),
                    targetVar: target.css.var.value("copied-var"),
                    sourceManyCount: Object.keys(source.css.getMany()).length,
                    targetManyCount: Object.keys(target.css.getMany()).length,
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;

                t.eq("css setMany accepts css getMany color", r.targetColor, "rgb(4, 5, 6)");
                t.eq("css setMany accepts css getMany marginTop", r.targetMarginTop, "9px");
                t.eq("css setMany accepts css getMany all property", r.targetAll, "initial");
                t.eq("css setMany accepts css getMany custom property", r.targetVar, "copied-css");
                t.eq("source and target css getMany have same key count", r.targetManyCount, r.sourceManyCount);
            },
        },
        {
            suite: SUITE,
            name: "selector getMany returns a setMany-compatible map",
            dom: true,
            fixture: "get-many-surface",
            sub: "selector-getmany-setmany-roundtrip",

            html: `
        <main id="root">
          <div id="source">source</div>
          <div id="target">target</div>
        </main>
    `,

            async act(tree) {
                const source = tree.find.must.byId("source").css.selector("&::before");
                const target = tree.find.must.byId("target").css.selector("&::before");

                source.setMany({
                    content: `"source"`,
                    color: "rgb(7, 8, 9)",
                    all: "revert",
                });
                source.var.set("copied-var", "copied-selector");

                target.setMany(source.getMany());

                (tree as any).__result = {
                    targetContent: target.get.property("content"),
                    targetColor: target.get.color(),
                    targetAll: target.get.all(),
                    targetVar: target.var.value("copied-var"),
                    sourceManyCount: Object.keys(source.getMany()).length,
                    targetManyCount: Object.keys(target.getMany()).length,
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;

                t.eq("selector setMany accepts selector getMany content", r.targetContent, `"source"`);
                t.eq("selector setMany accepts selector getMany color", r.targetColor, "rgb(7, 8, 9)");
                t.eq("selector setMany accepts selector getMany all property", r.targetAll, "revert");
                t.eq("selector setMany accepts selector getMany custom property", r.targetVar, "copied-selector");
                t.eq("source and target selector getMany have same key count", r.targetManyCount, r.sourceManyCount);
            },
        },
        {
            suite: SUITE,
            name: "getMany reflects removals and clear operations",
            dom: true,
            fixture: "get-many-surface",
            sub: "getmany-removal-clear",

            html: `
        <main id="root">
          <div id="box">x</div>
        </main>
    `,

            async act(tree) {
                const box = tree.find.must.byId("box");
                const before = box.css.selector("&::before");

                box.style.setMany({ color: "red", backgroundColor: "black" });
                box.style.var.set("runtime", "inline");
                box.style.remove("color");

                box.css.setMany({ color: "blue", backgroundColor: "white" });
                box.css.var.set("theme", "sheet");
                box.css.remove("backgroundColor");

                before.setMany({ content: `""`, color: "green" });
                before.var.set("sel", "selector");
                before.clear();

                const styleBeforeClear = box.style.getMany();
                const cssBeforeClear = box.css.getMany();
                const selectorAfterClear = before.getMany();

                box.style.clear();
                box.css.clear();

                (tree as any).__result = {
                    styleBeforeClear,
                    cssBeforeClear,
                    selectorAfterClear,
                    styleAfterClear: box.style.getMany(),
                    cssAfterClear: box.css.getMany(),
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;

                t.eq("removed style color absent from getMany", Object.prototype.hasOwnProperty.call(r.styleBeforeClear, "color"), false);
                t.eq("remaining style backgroundColor present", r.styleBeforeClear.backgroundColor, "black");
                t.eq("remaining style custom property present", r.styleBeforeClear["--runtime"], "inline");
                t.eq("remaining css color present", r.cssBeforeClear.color, "blue");
                t.eq("removed css backgroundColor absent from getMany", Object.prototype.hasOwnProperty.call(r.cssBeforeClear, "backgroundColor"), false);
                t.eq("remaining css custom property present", r.cssBeforeClear["--theme"], "sheet");
                t.eq("selector clear leaves selector getMany empty", Object.keys(r.selectorAfterClear).length, 0);
                t.eq("style clear leaves style getMany empty", Object.keys(r.styleAfterClear).length, 0);
                t.eq("css clear leaves css getMany empty", Object.keys(r.cssAfterClear).length, 0);
            },
        },
        {
            suite: SUITE,
            name: "getMany keeps inline style and QUID css scopes separate",
            dom: true,
            fixture: "get-many-surface",
            sub: "getmany-scope-separation",

            html: `
        <main id="root">
          <div id="box">x</div>
        </main>
    `,

            async act(tree) {
                const box = tree.find.must.byId("box");

                box.style.setMany({ color: "red" });
                box.style.var.set("shared", "inline");
                box.css.setMany({ color: "blue" });
                box.css.var.set("shared", "sheet");

                const styleMany = box.style.getMany();
                const cssMany = box.css.getMany();

                (tree as any).__result = {
                    styleColor: styleMany.color,
                    cssColor: cssMany.color,
                    styleShared: styleMany["--shared"],
                    cssShared: cssMany["--shared"],
                    sharedEqual: box.style.var.value("shared") === box.css.var.value("shared"),
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;

                t.eq("style getMany reads inline color", r.styleColor, "red");
                t.eq("css getMany reads stylesheet color", r.cssColor, "blue");
                t.eq("style getMany reads inline custom property", r.styleShared, "inline");
                t.eq("css getMany reads stylesheet custom property", r.cssShared, "sheet");
                t.eq("style/css custom property values remain separate", r.sharedEqual, false);
            },
        },
        {
            suite: SUITE,
            name: "get.vars reads selected inline custom properties with canonical keys",
            dom: true,
            fixture: "get-many-surface",
            sub: "style-get-vars-selected-canonical",

            html: `
        <main id="root">
          <div id="box">x</div>
        </main>
    `,

            async act(tree) {
                const box = tree.find.must.byId("box");

                box.style.var.set("runtime-x", "12px");
                box.style.var.set("--runtime-y", "24px");
                box.style.var.set("-runtime-z", "36px");

                const picked = box.style.get.vars([
                    "runtime-x",
                    "--runtime-y",
                    "-runtime-z",
                    "missing",
                    "--",
                    "   ",
                ]);

                (tree as any).__result = {
                    picked,
                    legacySingle: box.style.var.value("runtime-x"),
                    allMany: box.style.getMany(),
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;

                t.eq("style get.vars reads bare-name var with canonical key", r.picked["--runtime-x"], "12px");
                t.eq("style get.vars reads canonical-name var with canonical key", r.picked["--runtime-y"], "24px");
                t.eq("style get.vars reads single-hyphen var with canonical key", r.picked["--runtime-z"], "36px");
                t.eq("style get.vars omits missing var", Object.prototype.hasOwnProperty.call(r.picked, "--missing"), false);
                t.eq("style get.vars omits invalid bare custom-property name", Object.prototype.hasOwnProperty.call(r.picked, "--"), false);
                t.eq("style getMany still includes the same custom property", r.allMany["--runtime-x"], "12px");
            },
        },
        {
            suite: SUITE,
            name: "get.vars reads selected QUID-scoped custom properties with canonical keys",
            dom: true,
            fixture: "get-many-surface",
            sub: "css-get-vars-selected-canonical",

            html: `
        <main id="root">
          <div id="box">x</div>
        </main>
    `,

            async act(tree) {
                const box = tree.find.must.byId("box");

                box.css.var.set("theme-x", "red");
                box.css.var.set("--theme-y", "blue");
                box.css.var.set("-theme-z", "green");
                box.css.set.color(box.css.var.key("theme-x"));

                const picked = box.css.get.vars([
                    "theme-x",
                    "--theme-y",
                    "-theme-z",
                    "not-present",
                ]);

                (tree as any).__result = {
                    picked,
                    legacySingle: box.css.var.value("theme-x"),
                    color: box.css.get.color(),
                    allMany: box.css.getMany(),
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;

                t.eq("css get.vars reads bare-name var with canonical key", r.picked["--theme-x"], "red");
                t.eq("css get.vars reads canonical-name var with canonical key", r.picked["--theme-y"], "blue");
                t.eq("css get.vars reads single-hyphen var with canonical key", r.picked["--theme-z"], "green");
                t.eq("css get.vars omits missing var", Object.prototype.hasOwnProperty.call(r.picked, "--not-present"), false);
                t.eq("normal css property can consume var.key output", r.color, "var(--theme-x)");
                t.eq("css getMany still includes the same custom property", r.allMany["--theme-x"], "red");
            },
        },
        {
            suite: SUITE,
            name: "get.vars reads selected selector custom properties with canonical keys",
            dom: true,
            fixture: "get-many-surface",
            sub: "selector-get-vars-selected-canonical",

            html: `
        <main id="root">
          <div id="box">x</div>
        </main>
    `,

            async act(tree) {
                const box = tree.find.must.byId("box");
                const before = box.css.selector("&::before");

                before.set.content(`""`);
                before.var.set("before-x", "rgb(1, 2, 3)");
                before.var.set("--before-y", "rgb(4, 5, 6)");
                before.var.set("-before-z", "rgb(7, 8, 9)");
                before.set.color(before.var.key("before-x"));

                const picked = before.get.vars([
                    "before-x",
                    "--before-y",
                    "-before-z",
                    "missing",
                ]);

                (tree as any).__result = {
                    picked,
                    color: before.get.color(),
                    many: before.getMany(),
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;

                t.eq("selector get.vars reads bare-name var with canonical key", r.picked["--before-x"], "rgb(1, 2, 3)");
                t.eq("selector get.vars reads canonical-name var with canonical key", r.picked["--before-y"], "rgb(4, 5, 6)");
                t.eq("selector get.vars reads single-hyphen var with canonical key", r.picked["--before-z"], "rgb(7, 8, 9)");
                t.eq("selector get.vars omits missing var", Object.prototype.hasOwnProperty.call(r.picked, "--missing"), false);
                t.eq("selector property can consume var.key output", r.color, "var(--before-x)");
                t.eq("selector getMany still includes the same custom property", r.many["--before-x"], "rgb(1, 2, 3)");
            },
        },
        {
            suite: SUITE,
            name: "get.vars keeps inline style and QUID css custom-property scopes separate",
            dom: true,
            fixture: "get-many-surface",
            sub: "get-vars-scope-separation",

            html: `
        <main id="root">
          <div id="box">x</div>
        </main>
    `,

            async act(tree) {
                const box = tree.find.must.byId("box");

                box.style.var.set("shared", "inline");
                box.css.var.set("shared", "sheet");

                const stylePicked = box.style.get.vars(["shared"]);
                const cssPicked = box.css.get.vars(["shared"]);

                (tree as any).__result = {
                    stylePicked,
                    cssPicked,
                    styleSingle: box.style.var.value("shared"),
                    cssSingle: box.css.var.value("shared"),
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;

                t.eq("style get.vars reads inline-scoped value", r.stylePicked["--shared"], "inline");
                t.eq("css get.vars reads QUID-scoped value", r.cssPicked["--shared"], "sheet");
                t.eq("style var.value agrees with style get.vars", r.styleSingle, "inline");
                t.eq("css var.value agrees with css get.vars", r.cssSingle, "sheet");
            },
        },



    ];

    return make_livetree_suite(SUITE, cases);
}
