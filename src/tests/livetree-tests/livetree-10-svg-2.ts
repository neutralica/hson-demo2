import { hson } from "hson-live";
import type { TestSuite, LiveTreeCaseSpec } from "../tests.types";
import { make_livetree_suite } from "./livetree-testkit";



export function livetree_svg_ingermediate(): TestSuite {
    const SUITE = "livetree/svg/intermediate";
    const cases: readonly LiveTreeCaseSpec[] =
        [
            {
                suite: SUITE,
                name: "create: prepend() inserts empty html tag at front",
                fixture: "create/placement",
                sub: "prepend-empty-html",
                html: `<main id="root"><div id="a"></div><div id="b"></div></main>`,
                dom: true,

                act: async (root) => {
                    const host = root.find.must.byId("root");
                    const mid = host.create.prepend().section().id.set("first");

                    const el = host.dom.el();

                    (root as any).__result = {
                        ids: Array.from(el?.children ?? []).map((k) => k.getAttribute("id")),
                        tag: mid.dom.el()?.tagName,
                    };
                },

                assert: async (root, t) => {
                    const r = (root as any).__result;
                    t.eq("inserted first", r.ids[0], "first");
                    t.eq("old first shifted", r.ids[1], "a");
                    t.eq("created tag preserved", r.tag?.toLowerCase(), "section");
                },
            },
            {
                suite: SUITE,
                name: "create: at(index) inserts empty html tag at index",
                fixture: "create/placement",
                sub: "at-empty-html",
                html: `<main id="root"><div id="a"></div><div id="b"></div></main>`,
                dom: true,

                act: async (root) => {
                    const host = root.find.must.byId("root");
                    const mid = host.create.at(1).section().id.set("mid");

                    const el = host.dom.el();

                    (root as any).__result = {
                        ids: Array.from(el?.children ?? []).map((k) => k.getAttribute("id")),
                        tag: mid.dom.el()?.tagName,
                    };
                },

                assert: async (root, t) => {
                    const r = (root as any).__result;
                    t.eq("index 0 unchanged", r.ids[0], "a");
                    t.eq("inserted at index 1", r.ids[1], "mid");
                    t.eq("old second shifted", r.ids[2], "b");
                    t.eq("created tag preserved", r.tag?.toLowerCase(), "section");
                },
            },
            {
                suite: SUITE,
                name: "create: prepend() applies to html markup insertion",
                fixture: "create/placement",
                sub: "prepend-markup-html",
                html: `<main id="root"><div id="tail"></div></main>`,
                dom: true,

                act: async (root) => {
                    const host = root.find.must.byId("root");
                    const box = (host.create.prepend() as any).div(`<div id="first"><span id="child"></span></div>`);

                    const el = host.dom.el();

                    (root as any).__result = {
                        ids: Array.from(el?.children ?? []).map((k) => k.getAttribute("id")),
                        childTag: box.dom.el()?.children[0]?.tagName,
                    };
                },

                assert: async (root, t) => {
                    const r = (root as any).__result;
                    t.eq("inserted before tail", r.ids[0], "first");
                    t.eq("old child shifted", r.ids[1], "tail");
                    t.eq("subtree preserved", r.childTag?.toLowerCase(), "span");
                },
            },
            {
                suite: SUITE,
                name: "create: at(index) applies to html markup insertion",
                fixture: "create/placement",
                sub: "at-markup-html",
                html: `<main id="root"><div id="a"></div><div id="b"></div></main>`,
                dom: true,

                act: async (root) => {
                    const host = root.find.must.byId("root");
                    const box = (host.create.at(1) as any).div(`<div id="mid"><span id="child"></span></div>`);

                    const el = host.dom.el();

                    (root as any).__result = {
                        ids: Array.from(el?.children ?? []).map((k) => k.getAttribute("id")),
                        childTag: box.dom.el()?.children[0]?.tagName,
                    };
                },

                assert: async (root, t) => {
                    const r = (root as any).__result;
                    t.eq("index 0 unchanged", r.ids[0], "a");
                    t.eq("inserted at index 1", r.ids[1], "mid");
                    t.eq("old second shifted", r.ids[2], "b");
                    t.eq("subtree preserved", r.childTag?.toLowerCase(), "span");
                },
            },
            {
                suite: SUITE,
                name: "create: html markup insertion rejects mismatched root tag",
                fixture: "create/markup-guards",
                sub: "html-mismatch-root",
                html: `<main id="root"></main>`,

                act: async (root) => {
                    const host = root.find.must.byId("root");
                    let msg = "";

                    try {
                        (host.create as any).div(`<section id="wrong"></section>`);
                    } catch (err) {
                        msg = err instanceof Error ? err.message : String(err);
                    }

                    (root as any).__result = { msg };
                },

                assert: async (root, t) => {
                    const r = (root as any).__result;
                    t.ok("mismatch throws expected error", r.msg.includes(`expected exactly one <div> root`));
                },
            },
            {
                suite: SUITE,
                name: "create: html markup insertion rejects multiple roots",
                fixture: "create/markup-guards",
                sub: "html-multiple-roots",
                html: `<main id="root"></main>`,

                act: async (root) => {
                    const host = root.find.must.byId("root");
                    let msg = "";

                    try {
                        (host.create as any).div(`<div id="a"></div><div id="b"></div>`);
                    } catch (err) {
                        msg = err instanceof Error ? err.message : String(err);
                    }

                    (root as any).__result = { msg };
                },

                assert: async (root, t) => {
                    const r = (root as any).__result;
                    t.ok("multiple roots rejected", r.msg.includes(`expected exactly one <div> root`));
                },
            },
            {
                suite: SUITE,
                name: "create: html markup insertion rejects malformed markup",
                fixture: "create/markup-guards",
                sub: "html-malformed",
                html: `<main id="root"></main>`,

                act: async (root) => {
                    const host = root.find.must.byId("root");
                    let threw = false;

                    try {
                        (host.create as any).div(`<div><span></div>`);
                    } catch {
                        threw = true;
                    }

                    (root as any).__result = { threw };
                },

                assert: async (root, t) => {
                    const r = (root as any).__result;
                    t.eq("malformed markup throws", r.threw, true);
                },
            },
            {
                suite: SUITE,
                name: "svg: prepend() applies to g(string)",
                fixture: "svg/create-placement",
                sub: "prepend-g-string",
                html: `<main id="root"></main>`,
                dom: true,

                act: async (root) => {
                    const svg = root.create.svg();
                    svg.create.g().id.set("tail");

                    const g = (svg.create.prepend() as any).g(`<g id="first"><circle id="c1"></circle></g>`);
                    const el = svg.dom.el();

                    (root as any).__result = {
                        ids: Array.from(el?.children ?? []).map((k) => k.getAttribute("id")),
                        childTag: g.dom.el()?.children[0]?.tagName,
                    };
                },

                assert: async (root, t) => {
                    const r = (root as any).__result;
                    t.eq("prepended g is first", r.ids[0], "first");
                    t.eq("old g shifted", r.ids[1], "tail");
                    t.eq("subtree preserved", r.childTag?.toLowerCase(), "circle");
                },
            },
            {
                suite: SUITE,
                name: "svg: at(index) applies to g(string)",
                fixture: "svg/create-placement",
                sub: "at-g-string",
                html: `<main id="root"></main>`,
                dom: true,

                act: async (root) => {
                    const svg = root.create.svg();
                    svg.create.g().id.set("a");
                    svg.create.g().id.set("b");

                    const g = (svg.create.at(1) as any).g(`<g id="mid"><circle id="c1"></circle></g>`);
                    const el = svg.dom.el();

                    (root as any).__result = {
                        ids: Array.from(el?.children ?? []).map((k) => k.getAttribute("id")),
                        childTag: g.dom.el()?.children[0]?.tagName,
                    };
                },

                assert: async (root, t) => {
                    const r = (root as any).__result;
                    t.eq("index 0 unchanged", r.ids[0], "a");
                    t.eq("inserted at index 1", r.ids[1], "mid");
                    t.eq("old second shifted", r.ids[2], "b");
                    t.eq("subtree preserved", r.childTag?.toLowerCase(), "circle");
                },
            },
            {
                suite: SUITE,
                name: "svg: g(string) rejects multiple roots",
                fixture: "svg/create-placement",
                sub: "g-multiple-roots",
                html: `<main id="root"></main>`,

                act: async (root) => {
                    const svg = root.create.svg();
                    let msg = "";

                    try {
                        (svg.create as any).g(`<g id="a"></g><g id="b"></g>`);
                    } catch (err) {
                        msg = err instanceof Error ? err.message : String(err);
                    }

                    (root as any).__result = { msg };
                },

                assert: async (root, t) => {
                    const r = (root as any).__result;
                    t.ok("multiple roots rejected", r.msg.includes(`expected exactly one <g> root`));
                },
            },
            {
                suite: SUITE,
                name: "svg: g(string) rejects malformed markup",
                fixture: "svg/create-placement",
                sub: "g-malformed",
                html: `<main id="root"></main>`,

                act: async (root) => {
                    const svg = root.create.svg();
                    let threw = false;

                    try {
                        (svg.create as any).g(`<g><circle></g>`);
                    } catch {
                        threw = true;
                    }

                    (root as any).__result = { threw };
                },

                assert: async (root, t) => {
                    const r = (root as any).__result;
                    t.eq("malformed g markup throws", r.threw, true);
                },
            },

            {
                suite: SUITE,
                name: "svg: g(string) rejects empty string",
                fixture: "svg/create-placement",
                sub: "g-empty-string",
                html: `<main id="root"></main>`,

                act: async (root) => {
                    const svg = root.create.svg();
                    let msg = "";

                    try {
                        (svg.create as any).g(``);
                    } catch (err) {
                        msg = err instanceof Error ? err.message : String(err);
                    }

                    (root as any).__result = { msg };
                },

                assert: async (root, t) => {
                    const r = (root as any).__result;
                    t.ok("empty g string rejected", r.msg.includes(`expected non-empty markup string`));
                },
            },
            {
                suite: SUITE,
                name: "svg: g(string) rejects whitespace string",
                fixture: "svg/create-placement",
                sub: "g-whitespace-string",
                html: `<main id="root"></main>`,

                act: async (root) => {
                    const svg = root.create.svg();
                    let msg = "";

                    try {
                        (svg.create as any).g(`   
      
      `);
                    } catch (err) {
                        msg = err instanceof Error ? err.message : String(err);
                    }

                    (root as any).__result = { msg };
                },

                assert: async (root, t) => {
                    const r = (root as any).__result;
                    t.ok("whitespace g string rejected", r.msg.includes(`expected non-empty markup string`));
                },
            },
    
            {
                suite: SUITE,
                name: "svg: g(string) rejects mismatched root tag",
                fixture: "svg/create-placement",
                sub: "g-mismatched-root",
                html: `<main id="root"></main>`,

                act: async (root) => {
                    const svg = root.create.svg();
                    let msg = "";

                    try {
                        (svg.create as any).g(`<circle id="wrong"></circle>`);
                    } catch (err) {
                        msg = err instanceof Error ? err.message : String(err);
                    }

                    (root as any).__result = { msg };
                },

                assert: async (root, t) => {
                    const r = (root as any).__result;
                    t.ok("mismatched g root rejected", r.msg.includes(`expected exactly one <g> root`));
                },
            },

            {
                suite: SUITE,
                name: "svg: svg(string) rejects whitespace string",
                fixture: "svg/create-placement",
                sub: "svg-whitespace-string",
                html: `<main id="root"></main>`,

                act: async (root) => {
                    let msg = "";

                    try {
                        root.create.svg(`   
      
      `);
                    } catch (err) {
                        msg = err instanceof Error ? err.message : String(err);
                    }

                    (root as any).__result = { msg };
                },

                assert: async (root, t) => {
                    const r = (root as any).__result;
                    t.ok("whitespace svg string rejected", r.msg.includes(`expected non-empty markup string`));
                },
            },
            {
                suite: SUITE,
                name: "append: html append preserves html scope for chaining",
                fixture: "append/scope",
                sub: "html-preserves-html",
                html: `<main id="root"></main>`,
                dom: true,

                act: async (root) => {
                    const host = root.find.must.byId("root");
                    const branch = hson.liveTree.fromTrustedHtml(`<div id="a"></div>`);

                    const out = host.append(branch);
                    const child = out.create.section().id.set("b");

                    const el = host.dom.el();

                    (root as any).__result = {
                        ids: Array.from(el?.children ?? []).map((k) => k.getAttribute("id")),
                        childTag: child.dom.el()?.tagName,
                    };
                },

                assert: async (root, t) => {
                    const r = (root as any).__result;
                    t.eq("first appended id", r.ids[0], "a");
                    t.eq("chained create still html", r.childTag?.toLowerCase(), "section");
                    t.eq("second created id", r.ids[1], "b");
                },
            },
            {
                suite: SUITE,
                name: "append: svg append preserves svg scope for chaining",
                fixture: "append/scope",
                sub: "svg-preserves-svg",
                html: `<main id="root"></main>`,
                dom: true,

                act: async (root) => {
                    const field = root.create.svg().id.set("field");
                    const branch = hson.liveTree.fromTrustedHtml(`<g id="g1"><circle id="c1"></circle></g>`);

                    const out = field.append(branch as any);
                    const child = (out.create as any).g().id.set("g2");

                    const el = field.dom.el();

                    (root as any).__result = {
                        ids: Array.from(el?.children ?? []).map((k) => k.getAttribute("id")),
                        childTag: child.dom.el()?.tagName,
                    };
                },

                assert: async (root, t) => {
                    const r = (root as any).__result;
                    t.eq("first appended id", r.ids[0], "g1");
                    t.eq("chained create still svg", r.childTag?.toLowerCase(), "g");
                    t.eq("second created id", r.ids[1], "g2");
                },
            },
            {
                suite: SUITE,
                name: "append: html target accepts svg root subtree",
                fixture: "append/scope",
                sub: "html-accepts-svg-root",
                html: `<main id="root"></main>`,
                dom: true,

                act: async (root) => {
                    const host = root.find.must.byId("root");
                    const svgBranch = hson.liveTree.fromTrustedHtml(`<svg id="s"><g id="g1"></g></svg>`);

                    host.append(svgBranch as any);

                    const el = host.dom.el();

                    (root as any).__result = {
                        firstTag: el?.children[0]?.tagName,
                        firstId: el?.children[0]?.getAttribute("id"),
                    };
                },

                assert: async (root, t) => {
                    const r = (root as any).__result;
                    t.eq("svg root appended to html target", r.firstTag?.toLowerCase(), "svg");
                    t.eq("svg id preserved", r.firstId, "s");
                },
            },
            {
                suite: SUITE,
                name: "append: html target rejects bare svg child subtree",
                fixture: "append/scope",
                sub: "html-rejects-bare-svg-child",
                html: `<main id="root"></main>`,

                act: async (root) => {
                    const host = root.find.must.byId("root");
                    const gBranch = hson.fromTrustedHtml(`<g id="g1"><circle id="c1"></circle></g>`);

                    let msg = "";

                    try {
                        host.append(gBranch as any);
                    } catch (err) {
                        msg = err instanceof Error ? err.message : String(err);
                    }

                    (root as any).__result = { msg };
                },

                assert: async (root, t) => {
                    const r = (root as any).__result;
                    t.ok("html target rejects bare svg child", r.msg.length > 0);
                },
            },
            {
                suite: SUITE,
                name: "append: svg target rejects html subtree",
                fixture: "append/scope",
                sub: "svg-rejects-html",
                html: `<main id="root"></main>`,

                act: async (root) => {
                    const field = root.create.svg().id.set("field");
                    const divBranch = hson.liveTree.fromTrustedHtml(`<div id="x"></div>`);

                    let msg = "";

                    try {
                        field.append(divBranch as any);
                    } catch (err) {
                        msg = err instanceof Error ? err.message : String(err);
                    }

                    (root as any).__result = { msg };
                },

                assert: async (root, t) => {
                    const r = (root as any).__result;
                    t.ok("svg target rejects html subtree", r.msg.length > 0);
                },
            },
            {
                suite: SUITE,
                name: "append: index insertion still works",
                fixture: "append/scope",
                sub: "append-index",
                html: `<main id="root"><div id="a"></div><div id="b"></div></main>`,
                dom: true,

                act: async (root) => {
                    const host = root.find.must.byId("root");
                    const branch = hson.liveTree.fromTrustedHtml(`<section id="mid"></section>`)

                    host.append(branch, 1);

                    const el = host.dom.el();

                    (root as any).__result = {
                        ids: Array.from(el?.children ?? []).map((k) => k.getAttribute("id")),
                        tags: Array.from(el?.children ?? []).map((k) => k.tagName.toLowerCase()),
                    };
                },

                assert: async (root, t) => {
                    const r = (root as any).__result;
                    t.eq("index 0 unchanged", r.ids[0], "a");
                    t.eq("inserted at index 1", r.ids[1], "mid");
                    t.eq("old second shifted", r.ids[2], "b");
                    t.eq("inserted tag preserved", r.tags[1], "section");
                },
            },
            {
                suite: SUITE,
                name: "attr: svg attr.set preserves svg scope for chaining",
                fixture: "attr/scope",
                sub: "svg-set-preserves-scope",
                html: `<main id="root"></main>`,
                dom: true,

                act: async (root) => {
                    const svg = root.create.svg()
                        .attr.set("viewBox", "0 0 10 10");

                    const g = svg.create.g().id.set("g1");

                    (root as any).__result = {
                        svgTag: svg.dom.el()?.tagName,
                        gTag: g.dom.el()?.tagName,
                        viewBox: svg.dom.el()?.getAttribute("viewBox"),
                    };
                },

                assert: async (root, t) => {
                    const r = (root as any).__result;
                    t.eq("svg tag preserved", r.svgTag?.toLowerCase(), "svg");
                    t.eq("svg create still available after attr.set", r.gTag?.toLowerCase(), "g");
                    t.eq("viewBox preserved", r.viewBox, "0 0 10 10");
                },
            },
            {
                suite: SUITE,
                name: "attr: svg attr.setMany preserves svg scope for chaining",
                fixture: "attr/scope",
                sub: "svg-setMany-preserves-scope",
                html: `<main id="root"></main>`,
                dom: true,

                act: async (root) => {
                    const svg = root.create.svg()
                        .attr.setMany({
                            viewBox: "0 0 20 20",
                            preserveAspectRatio: "xMidYMid meet",
                        });

                    const g = svg.create.g().id.set("g1");

                    (root as any).__result = {
                        gTag: g.dom.el()?.tagName,
                        viewBox: svg.dom.el()?.getAttribute("viewBox"),
                        preserveAspectRatio: svg.dom.el()?.getAttribute("preserveAspectRatio"),
                    };
                },

                assert: async (root, t) => {
                    const r = (root as any).__result;
                    t.eq("svg create still available after attr.setMany", r.gTag?.toLowerCase(), "g");
                    t.eq("viewBox preserved", r.viewBox, "0 0 20 20");
                    t.eq("preserveAspectRatio preserved", r.preserveAspectRatio, "xMidYMid meet");
                },
            },
            {
                suite: SUITE,
                name: "flag: svg flag.set preserves svg scope for chaining",
                fixture: "attr/scope",
                sub: "svg-flag-set-preserves-scope",
                html: `<main id="root"></main>`,
                dom: true,

                act: async (root) => {
                    const svg = root.create.svg().flag.set("data-active");

                    const g = svg.create.g().id.set("g1");

                    (root as any).__result = {
                        gTag: g.dom.el()?.tagName,
                        flagVal: svg.dom.el()?.getAttribute("data-active"),
                    };
                },

                assert: async (root, t) => {
                    const r = (root as any).__result;
                    t.eq("svg create still available after flag.set", r.gTag?.toLowerCase(), "g");
                    t.eq("flag present", r.flagVal, "data-active");
                },
            },
            {
                suite: SUITE,
                name: "flag: svg flag.clear preserves svg scope for chaining",
                fixture: "attr/scope",
                sub: "svg-flag-clear-preserves-scope",
                html: `<main id="root"></main>`,
                dom: true,

                act: async (root) => {
                    const svg0 = root.create.svg().flag.set("data-active");
                    const svg = svg0.flag.clear("data-active");

                    const g = svg.create.g().id.set("g1");

                    (root as any).__result = {
                        gTag: g.dom.el()?.tagName,
                        flagVal: svg.dom.el()?.getAttribute("data-active"),
                    };
                },

                assert: async (root, t) => {
                    const r = (root as any).__result;
                    t.eq("svg create still available after flag.clear", r.gTag?.toLowerCase(), "g");
                    t.eq("flag removed", r.flagVal, null);
                },
            },
            {
                suite: SUITE,
                name: "attr: html attr.setMany preserves html scope for chaining",
                fixture: "attr/scope",
                sub: "html-setMany-preserves-scope",
                html: `<main id="root"></main>`,
                dom: true,

                act: async (root) => {
                    const host = root.find.must.byId("root")
                        .attr.setMany({
                            title: "hello",
                            "data-x": "1",
                        });

                    const section = host.create.section().id.set("s1");

                    (root as any).__result = {
                        title: host.dom.el()?.getAttribute("title"),
                        dataX: host.dom.el()?.getAttribute("data-x"),
                        sectionTag: section.dom.el()?.tagName,
                    };
                },

                assert: async (root, t) => {
                    const r = (root as any).__result;
                    t.eq("title preserved", r.title, "hello");
                    t.eq("data-x preserved", r.dataX, "1");
                    t.eq("html create still available", r.sectionTag?.toLowerCase(), "section");
                },
            },
            {
                suite: SUITE,
                name: "attr: svg read path matches svg canonicalization",
                fixture: "attr/scope",
                sub: "svg-read-canonicalization",
                html: `<main id="root"></main>`,

                act: async (root) => {
                    const svg = root.create.svg()
                        .attr.set("viewBox", "0 0 30 30")
                        .attr.set("preserveAspectRatio", "none");

                    (root as any).__result = {
                        viewBox: svg.attr.get("viewBox"),
                        preserveAspectRatio: svg.attr.get("preserveAspectRatio"),
                        hasViewBox: svg.attr.has("viewBox"),
                        hasPreserveAspectRatio: svg.attr.has("preserveAspectRatio"),
                    };
                },

                assert: async (root, t) => {
                    const r = (root as any).__result;
                    t.eq("viewBox read matches", r.viewBox, "0 0 30 30");
                    t.eq("preserveAspectRatio read matches", r.preserveAspectRatio, "none");
                    t.eq("has viewBox", r.hasViewBox, true);
                    t.eq("has preserveAspectRatio", r.hasPreserveAspectRatio, true);
                },
            },
            {
                suite: SUITE,
                name: "attr: svg drop preserves svg scope for chaining",
                fixture: "attr/scope",
                sub: "svg-drop-preserves-scope",
                html: `<main id="root"></main>`,
                dom: true,

                act: async (root) => {
                    const svg0 = root.create.svg().attr.set("viewBox", "0 0 40 40");
                    const svg = svg0.attr.drop("viewBox");

                    const g = svg.create.g().id.set("g1");

                    (root as any).__result = {
                        gTag: g.dom.el()?.tagName,
                        viewBox: svg.dom.el()?.getAttribute("viewBox"),
                    };
                },

                assert: async (root, t) => {
                    const r = (root as any).__result;
                    t.eq("svg create still available after drop", r.gTag?.toLowerCase(), "g");
                    t.eq("viewBox removed", r.viewBox, null);
                },
            },
            {
                suite: SUITE,
                name: "data: html set preserves html scope for chaining",
                fixture: "data/scope",
                sub: "html-set-preserves-scope",
                html: `<main id="root"></main>`,
                dom: true,

                act: async (root) => {
                    const host = root.find.must.byId("root")
                        .data.set("userId", 42);

                    const section = host.create.section().id.set("s1");

                    (root as any).__result = {
                        dataUserId: host.dom.el()?.getAttribute("data-user-id"),
                        sectionTag: section.dom.el()?.tagName,
                    };
                },

                assert: async (root, t) => {
                    const r = (root as any).__result;
                    t.eq("data-user-id written", r.dataUserId, "42");
                    t.eq("html create still available", r.sectionTag?.toLowerCase(), "section");
                },
            },
            {
                suite: SUITE,
                name: "data: svg set preserves svg scope for chaining",
                fixture: "data/scope",
                sub: "svg-set-preserves-scope",
                html: `<main id="root"></main>`,
                dom: true,

                act: async (root) => {
                    const svg = root.create.svg()
                        .data.set("flowerId", 7);

                    const g = svg.create.g().id.set("g1");

                    (root as any).__result = {
                        dataFlowerId: svg.dom.el()?.getAttribute("data-flower-id"),
                        gTag: g.dom.el()?.tagName,
                    };
                },

                assert: async (root, t) => {
                    const r = (root as any).__result;
                    t.eq("data-flower-id written", r.dataFlowerId, "7");
                    t.eq("svg create still available", r.gTag?.toLowerCase(), "g");
                },
            },
            {
                suite: SUITE,
                name: "data: setMany preserves owner scope and writes kebab-case keys",
                fixture: "data/scope",
                sub: "setMany-kebab-and-scope",
                html: `<main id="root"></main>`,
                dom: true,

                act: async (root) => {
                    const svg = root.create.svg()
                        .data.setMany({
                            flowerId: 7,
                            petalCount: 12,
                        });

                    const g = svg.create.g().id.set("g1");

                    (root as any).__result = {
                        flowerId: svg.dom.el()?.getAttribute("data-flower-id"),
                        petalCount: svg.dom.el()?.getAttribute("data-petal-count"),
                        gTag: g.dom.el()?.tagName,
                    };
                },

                assert: async (root, t) => {
                    const r = (root as any).__result;
                    t.eq("flowerId kebabized", r.flowerId, "7");
                    t.eq("petalCount kebabized", r.petalCount, "12");
                    t.eq("svg scope preserved after setMany", r.gTag?.toLowerCase(), "g");
                },
            },
            {
                suite: SUITE,
                name: "data: get uses same normalization as set",
                fixture: "data/scope",
                sub: "get-normalizes-like-set",
                html: `<main id="root"></main>`,

                act: async (root) => {
                    const svg = root.create.svg()
                        .data.set("preserveAspectRatioMode", "meet");

                    (root as any).__result = {
                        camelRead: svg.data.get("preserveAspectRatioMode"),
                        rawRead: svg.attr.get("data-preserve-aspect-ratio-mode"),
                    };
                },

                assert: async (root, t) => {
                    const r = (root as any).__result;
                    t.eq("get reads with normalized key", r.camelRead, "meet");
                    t.eq("attr also sees normalized key", r.rawRead, "meet");
                },
            },
            {
                suite: SUITE,
                name: "data: set null removes data attribute and preserves scope",
                fixture: "data/scope",
                sub: "set-null-removes",
                html: `<main id="root"></main>`,
                dom: true,

                act: async (root) => {
                    const svg0 = root.create.svg().data.set("flowerId", 7);
                    const svg = svg0.data.set("flowerId", null);

                    const g = svg.create.g().id.set("g1");

                    (root as any).__result = {
                        dataFlowerId: svg.dom.el()?.getAttribute("data-flower-id"),
                        gTag: g.dom.el()?.tagName,
                    };
                },

                assert: async (root, t) => {
                    const r = (root as any).__result;
                    t.eq("data attr removed", r.dataFlowerId, null);
                    t.eq("svg scope preserved after removal", r.gTag?.toLowerCase(), "g");
                },
            },
            {
                suite: SUITE,
                name: "data: setMany null removes selected keys only",
                fixture: "data/scope",
                sub: "setMany-null-removes-selected",
                html: `<main id="root"></main>`,
                dom: true,

                act: async (root) => {
                    const host0 = root.find.must.byId("root")
                        .data.setMany({
                            userId: 42,
                            panelId: "main",
                        });

                    const host = host0.data.setMany({
                        userId: null,
                    });

                    (root as any).__result = {
                        userId: host.dom.el()?.getAttribute("data-user-id"),
                        panelId: host.dom.el()?.getAttribute("data-panel-id"),
                    };
                },

                assert: async (root, t) => {
                    const r = (root as any).__result;
                    t.eq("userId removed", r.userId, null);
                    t.eq("panelId preserved", r.panelId, "main");
                },
            },
            {
                suite: SUITE,
                name: "data: get returns undefined when missing",
                fixture: "data/scope",
                sub: "get-missing-undefined",
                html: `<main id="root"></main>`,

                act: async (root) => {
                    const host = root.find.must.byId("root");

                    (root as any).__result = {
                        missing: host.data.get("doesNotExist"),
                    };
                },

                assert: async (root, t) => {
                    const r = (root as any).__result;
                    t.eq("missing key returns undefined", r.missing, undefined);
                },
            },
            {
                suite: SUITE,
                name: "data: rejects empty dataset key",
                fixture: "data/scope",
                sub: "rejects-empty-key",
                html: `<main id="root"></main>`,

                act: async (root) => {
                    const host = root.find.must.byId("root");
                    let msg = "";

                    try {
                        host.data.set("", "x");
                    } catch (err) {
                        msg = err instanceof Error ? err.message : String(err);
                    }

                    (root as any).__result = { msg };
                },

                assert: async (root, t) => {
                    const r = (root as any).__result;
                    t.ok("empty key rejected", r.msg.includes("Dataset key must be non-empty"));
                },
            },
            {
                suite: SUITE,
                name: "data: rejects whitespace-only dataset key",
                fixture: "data/scope",
                sub: "rejects-whitespace-key",
                html: `<main id="root"></main>`,

                act: async (root) => {
                    const host = root.find.must.byId("root");
                    let msg = "";

                    try {
                        host.data.set("   ", "x");
                    } catch (err) {
                        msg = err instanceof Error ? err.message : String(err);
                    }

                    (root as any).__result = { msg };
                },

                assert: async (root, t) => {
                    const r = (root as any).__result;
                    t.ok("whitespace key rejected", r.msg.includes("Dataset key must be non-empty"));
                },
            },
            {
                suite: SUITE,
                name: "data: set stringifies booleans and numbers",
                fixture: "data/scope",
                sub: "stringifies-primitives",
                html: `<main id="root"></main>`,
                dom: true,

                act: async (root) => {
                    const host = root.find.must.byId("root")
                        .data.setMany({
                            count: 3,
                            active: true,
                        });

                    (root as any).__result = {
                        count: host.dom.el()?.getAttribute("data-count"),
                        active: host.dom.el()?.getAttribute("data-active"),
                    };
                },

                assert: async (root, t) => {
                    const r = (root as any).__result;
                    t.eq("number stringified", r.count, "3");
                    t.eq("boolean stringified", r.active, "true");
                },
            },



        ];

    return make_livetree_suite(SUITE, cases);
}