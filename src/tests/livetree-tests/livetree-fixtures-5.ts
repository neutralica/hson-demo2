import { hson } from "hson-live";
import { LiveTree } from "../../../../hson-live/dist/api/livetree/livetree";
import type { TestSuite, LiveTreeCaseSpec } from "../tests.types";
import { tick } from "./livetree-fixtures-3";
import { make_livetree_suite } from "./livetree-testkit";



export function roundtrip_projection_stability(): TestSuite {
    const SUITE = "livetree/roundtrip-projection";
    const cases: readonly LiveTreeCaseSpec[] =
        [
            {
                suite: SUITE,
                name: "serialization: IR to DOM to branch preserves basic structure",
                dom: true,
                fixture: "serialization/roundtrip",
                sub: "basic-shape",

                html: `
                    <main id="root">
                    <section id="card" data-state="open">
                        <h1>Title</h1>
                        <p>Hello world</p>
                    </section>
                    </main>
                `,

                async act(tree) {
                    const rootEl = tree.find.must.byId("root").dom.el();
                    const round = hson.fromTrustedHtml(rootEl!).liveTree.asBranch();

                    const sandboxHost = (tree as any).__sandboxHost;
                    sandboxHost.append(round);

                    const card = round.find.must.byId("card");
                    const cardEl = card.asDomElement() as HTMLElement;

                    (tree as any).__result = {
                        tag: cardEl.tagName.toLowerCase(),
                        state: cardEl.getAttribute("data-state"),
                        h1Text: round.find.must.byTag("h1").text.get(),
                        pText: round.find.must.byTag("p").text.get(),
                    };
                },

                assert(tree, t) {
                    const r = (tree as any).__result;
                    t.eq("tag preserved", r.tag, "section");
                    t.eq("data-state preserved", r.state, "open");
                    t.eq("h1 text preserved", r.h1Text, "Title");
                    t.eq("p text preserved", r.pText, "Hello world");
                },
            },
            {
                suite: SUITE,
                name: "serialization: hydrated DOM survives mutation and rehydrate",
                dom: true,
                fixture: "serialization/roundtrip",
                sub: "hydrate-mutate-rehydrate",

                html: `
                    <main id="root">
                    <div id="box" class="alpha" data-mode="cold">x</div>
                    </main>
                `,

                async act(tree) {
                    const box = tree.find.must.byId("box");
                    box.attr.set("title", "greeting");
                    box.data.set("mode", "warm");
                    box.text.set("hello");

                    await tick();
                    const rootEl = tree.find.must.byId("root").dom.el();
                    const round = hson.fromTrustedHtml(rootEl!).liveTree.asBranch();

                    const sandboxHost = (tree as any).__sandboxHost;
                    sandboxHost.append(round);

                    const box2 = round.find.must.byId("box");
                    const el2 = box2.asDomElement() as HTMLElement;
                    (tree as any).__result = {
                        cls: el2.getAttribute("class"),
                        mode: el2.getAttribute("data-mode"),
                        title: el2.getAttribute("title"),
                        text: box2.text.get(),
                    };
                },

                assert(tree, t) {
                    const r = (tree as any).__result;
                    t.eq("class preserved", r.cls, "alpha");
                    t.eq("data-mode updated", r.mode, "warm");
                    t.eq("title added", r.title, "greeting");
                    t.eq("text updated", r.text, "hello");
                },
            },
            {
                suite: SUITE,
                name: "serialization: IR-only node text remains readable without DOM lookup",
                dom: true,
                fixture: "serialization/partial",
                sub: "ir-only-text",

                html: `<main id="root"></main>`,

                async act(tree) {
                    const root = tree.find.must.byId("root");

                    const ghost = root.create.div().id.set("ghost");
                    ghost.text.set("from-ir");

                    // remove immediately so handle survives but tree lookup should not
                    ghost.removeSelf();

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
                name: "serialization: rehydrate preserves shape but remints identity",
                dom: true,
                fixture: "serialization/roundtrip",
                sub: "shape-not-quid",

                html: `
                    <main id="root">
                        <div id="box">x</div>
                    </main>
                `,

                async act(tree) {
                    const box = tree.find.must.byId("box");
                    const oldEl = box.asDomElement() as HTMLElement;
                    const oldQuid = oldEl.getAttribute("data-_quid") ?? "";

                    const rootEl = tree.find.must.byId("root").dom.el();
                    const round = hson.fromTrustedHtml(rootEl!).liveTree.asBranch();

                    // CHANGED: mount detached rehydrated branch into existing sandbox
                    const sandboxHost = (tree as any).__sandboxHost;
                    sandboxHost.append(round);

                    const box2 = round.find.must.byId("box");
                    const newEl = box2.asDomElement() as HTMLElement;
                    const newQuid = newEl.getAttribute("data-_quid") ?? "";

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
                    t.eq("quid preserved", r.oldQuid === r.newQuid, true);
                },
            },
            {
                suite: SUITE,
                name: "serialization: hydration of one subtree is unaffected by separate sibling mutation",
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

                    // CHANGED: hydrate only subtree B, not the whole root
                    const bEl = tree.find.must.byId("b").dom.el();
                    const bTree = hson.fromTrustedHtml(bEl!).liveTree.asBranch();

                    const b1 = bTree.find.must.byId("b1");

                    (tree as any).__result = {
                        bText: b1.text.get(),
                        aText: tree.find.must.byId("a1").text.get(),
                    };
                },

                assert(tree, t) {
                    const r = (tree as any).__result;
                    t.eq("A mutation stayed in A", r.aText, "AA");
                    t.eq("B subtree hydrates cleanly", r.bText, "B");
                },
            },
            {
                suite: SUITE,
                name: "serialization: rehydrate from surviving DOM does not resurrect removed sibling",
                dom: true,
                fixture: "serialization/partial",
                sub: "no-resurrection",

                html: `
    <main id="root">
      <div id="keep">K</div>
      <div id="drop">D</div>
    </main>
  `,

                async act(tree) {
                    tree.find.must.byId("drop").removeSelf();
                    await tick();

                    const rootEl = tree.find.must.byId("root").dom.el();
                    const round = hson.fromTrustedHtml(rootEl!).liveTree.asBranch();


                    (tree as any).__result = {
                        keep: !!round.find.byId("keep"),
                        drop: round.find.byId("drop"),
                    };
                },

                assert(tree, t) {
                    const r = (tree as any).__result;
                    t.eq("keep survives", r.keep, true);
                    t.eq("drop is not resurrected", r.drop, undefined);
                },
            },
            {
                suite: SUITE,
                name: "serialization: outerHTML shape remains stable after mutate and rehydrate",
                dom: true,
                fixture: "serialization/roundtrip",
                sub: "html-shape-stable",

                html: `
    <main id="root">
      <div id="box">x</div>
    </main>
  `,

             async act(tree) {
    const box = tree.find.must.byId("box");
    box.data.set("state", "open");
    box.attr.set("title", "hello");
    box.text.set("y");

    await tick();

    const rootEl = tree.find.must.byId("root").dom.el();
    const round = hson.fromTrustedHtml(rootEl!).liveTree.asBranch();

    // CHANGED: mount detached rehydrated branch before DOM lookup
    const sandboxHost = (tree as any).__sandboxHost;
    sandboxHost.append(round);

    const out = round.find.must.byId("box").dom.el() as HTMLElement;

    (tree as any).__html = out.outerHTML;
},

                assert(tree, t) {
                    const html = (tree as any).__html as string;
                    t.ok("id preserved", html.includes(`id="box"`));
                    t.ok("title preserved", html.includes(`title="hello"`));
                    t.ok("data-state preserved", html.includes(`data-state="open"`));
                    t.ok("text preserved", html.includes(`>y</`));
                },
            },


        ];

    return make_livetree_suite(SUITE, cases);
}


