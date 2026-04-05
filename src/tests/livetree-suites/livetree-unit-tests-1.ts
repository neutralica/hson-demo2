
import type { LiveTree } from "hson-live";
import { default_preview, make_livetree_suite } from "./livetree-testkit";
import type { LiveTreeCaseSpec, TestSuite } from "../tests.types";
import { tick } from "./livetree-fixtures-3";
import { flush_dom, next_frame } from "../inspector/inspector.helpers";


export function make_unit_test_suite(): TestSuite {
    const SUITE = "unit/regressions";
    const cases: readonly LiveTreeCaseSpec[] = [

        {
            suite: SUITE,
            name: "css pseudos: auto-quoted content matches manually quoted content",
            dom: true,
            fixture: "css/pseudos",
            sub: "before-manual-vs-auto",

            html: `
      <main id="root">
        <div id="manual">hello</div>
        <div id="auto">hello</div>
      </main>
    `,

            async act(tree) {
                const manual = tree.find.must.byId("manual");
                const auto = tree.find.must.byId("auto");

                manual.css.setMany({
                    __before: {
                        content: `"M"`, // removed escapes
                        color: "rgb(255, 0, 255)",
                    },
                });

                auto.css.setMany({
                    __before: {
                        content: "A",
                        color: "rgb(0, 255, 255)",
                    },
                });

                await flush_dom();

                const manualEl = manual.dom.el() as HTMLElement;
                const autoEl = auto.dom.el() as HTMLElement;

                const autoBefore = getComputedStyle(autoEl, "::before");
                const manualBefore = getComputedStyle(manualEl, "::before");
                const manualBase = manual.dom.computed() ?? {content: ""};
                const autoBase = auto.dom.computed() ?? {content: ""};

                console.log("manual: before content", manualBefore.content);
                console.log("manual: base content", manualBase.content);
                console.log("manual: before content", autoBefore.content);
                console.log("manual: base content", autoBase.content);
                (tree as any).__result = {
                    manualContent: manualBefore.content,
                    autoContent: autoBefore.content,
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;
                t.eq("manual quoted content rendered", r.manualContent, `"M"`); // removed escapes
                t.eq("auto quoted content rendered", r.autoContent, `"A"`); // removed escapes
            },
        },
    ];

    return make_livetree_suite(SUITE, cases);


};
