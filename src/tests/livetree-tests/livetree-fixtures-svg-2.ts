import type { TestSuite, LiveTreeCaseSpec } from "../tests.types";
import { make_livetree_suite } from "./livetree-testkit";



export function livetree_svg_ingermediate(): TestSuite {
    const SUITE = "livetree/svg-intermediate";
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

                    const el = host.asDomElement();

                    (root as any).__result = {
                        ids: Array.from(el?.children ?? []).map((k) => k.getAttribute("id")),
                        tag: mid.asDomElement()?.tagName,
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

                    const el = host.asDomElement();

                    (root as any).__result = {
                        ids: Array.from(el?.children ?? []).map((k) => k.getAttribute("id")),
                        tag: mid.asDomElement()?.tagName,
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

                    const el = host.asDomElement();

                    (root as any).__result = {
                        ids: Array.from(el?.children ?? []).map((k) => k.getAttribute("id")),
                        childTag: box.asDomElement()?.children[0]?.tagName,
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

                    const el = host.asDomElement();

                    (root as any).__result = {
                        ids: Array.from(el?.children ?? []).map((k) => k.getAttribute("id")),
                        childTag: box.asDomElement()?.children[0]?.tagName,
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
                    const el = svg.asDomElement();

                    (root as any).__result = {
                        ids: Array.from(el?.children ?? []).map((k) => k.getAttribute("id")),
                        childTag: g.asDomElement()?.children[0]?.tagName,
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
                    const el = svg.asDomElement();

                    (root as any).__result = {
                        ids: Array.from(el?.children ?? []).map((k) => k.getAttribute("id")),
                        childTag: g.asDomElement()?.children[0]?.tagName,
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
                    t.ok("multiple g roots rejected", r.msg.includes(`expected exactly one <g> root`));
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
                name: "svg: g(string) rejects malformed markup",
                fixture: "svg/create-placement",
                sub: "g-malformed",
                html: `<main id="root"></main>`,

                act: async (root) => {
                    const svg = root.create.svg();
                    let msg = "";

                    try {
                        (svg.create as any).g(`<g><circle></g>`);
                    } catch (err) {
                        msg = err instanceof Error ? err.message : String(err);
                    }

                    (root as any).__result = { msg };
                },

                assert: async (root, t) => {
                    const r = (root as any).__result;
                    t.ok("malformed g markup rejected", r.msg.includes(`failed to parse markup`));
                },
            },
            {
                suite: SUITE,
                name: "svg: svg(string) rejects multiple roots",
                fixture: "svg/create-placement",
                sub: "svg-multiple-roots",
                html: `<main id="thisroot"></main>`,

                act: async (root) => {
                    let msg = "";
                    let threw = false;

                    try {
                        root.create.svg(`<svg id="a"></svg><svg id="b"></svg>`);
                    } catch (err) {
                        threw = true;
                        msg = err instanceof Error ? err.message : String(err);
                    }

                    (root as any).__result = { threw, msg };
                },

                assert: async (root, t) => {
                    const r = (root as any).__result;
                    t.eq("multiple svg roots rejected", r.threw, true);
                    t.ok(
                        "message indicates parse/root failure",
                        r.msg.includes("failed to parse markup") ||
                        r.msg.includes("parsererror") ||
                        r.msg.includes("expected exactly one <svg> root"),
                    );
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



        ];

    return make_livetree_suite(SUITE, cases);
}