
import type { LiveTreeCaseSpec, TestSuite } from "../tests.types";
import { make_livetree_suite } from "./livetree-testkit";
import { livetree_gnarly_svg } from "./livetree-fixtures-svg-3";
import { tick } from "./livetree-fixtures-3";
import { flush_dom, next_frame } from "../inspector/inspector.helpers";

export function livetree_fixtures_6(): TestSuite {
    const SUITE = "livetree/fixtures-6";
    const cases: readonly LiveTreeCaseSpec[] =
        [
            {
                suite: SUITE,
                name: "css pseudos: before content auto-quotes plain text",
                dom: true,
                fixture: "css/pseudos",
                sub: "before-auto-quotes",

                html: `
    <main id="root">
      <div id="target">hello</div>
    </main>
  `,

                async act(tree) {
                    const target = tree.find.must.byId("target");

                    target.css.setMany({
                        __before: {
                            content: "X",
                            color: "rgb(255, 0, 255)",
                        },
                    });

                    await flush_dom();

                    const el = target.dom.el() as HTMLElement;
                    const before = getComputedStyle(el, "::before");

                    (tree as any).__result = {
                        content: before.content,
                    };
                },

                assert(tree, t) {
                    const r = (tree as any).__result;
                    t.eq("before content rendered", r.content, `"X"`);
                },
            },
            {
                suite: SUITE,
                name: "css pseudos: before injects empty content when omitted",
                dom: true,
                fixture: "css/pseudos",
                sub: "before-empty-fallback",

                html: `
    <main id="root">
      <div id="target">hello</div>
    </main>
  `,

                async act(tree) {
                    const target = tree.find.must.byId("target");

                    target.css.setMany({
                        __before: {
                            color: "rgb(255, 0, 255)",
                        },
                    });

                    await flush_dom();

                    const el = target.dom.el() as HTMLElement;
                    const before = getComputedStyle(el, "::before");

                    (tree as any).__result = {
                        content: before.content,
                    };
                },

                assert(tree, t) {
                    const r = (tree as any).__result;
                    t.eq("empty content injected", r.content, `""`);
                },
            },
            {
                suite: SUITE,
                name: "css pseudos: raw attr() content is preserved",
                dom: true,
                fixture: "css/pseudos",
                sub: "before-attr-content",

                html: `
    <main id="root">
      <div id="target" data-label="HELLO">world</div>
    </main>
  `,

                async act(tree) {
                    const target = tree.find.must.byId("target");

                    target.css.setMany({
                        __before: {
                            content: "attr(data-label)",
                        },
                    });

                    await flush_dom();

                    const el = target.dom.el() as HTMLElement;
                    const before = getComputedStyle(el, "::before");

                    (tree as any).__result = {
                        content: before.content,
                    };
                },

                assert(tree, t) {
                    const r = (tree as any).__result;
                    t.eq("attr content rendered", r.content, `"HELLO"`);
                },
            },

        ];

    return make_livetree_suite(SUITE, cases);
}


