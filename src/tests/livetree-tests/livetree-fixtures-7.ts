import { _listeners_debug_hard_reset } from "../../../../hson-live/dist/api/livetree/managers/listener-builder";
import { flush_dom } from "../inspector/inspector.helpers";
import type { TestSuite, LiveTreeCaseSpec } from "../tests.types";
import { make_livetree_suite } from "./livetree-testkit";

export function livetree_more_listeners(): TestSuite {
    console.error ("testing more listeners")
    const SUITE = "livetree/listener-cleanup";

    const cases: readonly LiveTreeCaseSpec[] = [
        {
            suite: SUITE,
            name: "listen.document: listener is removed when owning tree is removed",
            dom: true,
            fixture: "listen/cleanup",
            sub: "document-owner-remove",

            html: `
        <main id="root">
          <div id="owner">hello</div>
        </main>
      `,

            async act(tree) {
                _listeners_debug_hard_reset();

                const owner = tree.find.must.byId("owner");

                let count = 0;

                owner.listen.document.onKeyDown(() => {
                    count++;
                });

                document.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
                await flush_dom();

                const beforeRemove = count;

                owner.removeSelf();
                await flush_dom();

                document.dispatchEvent(new KeyboardEvent("keydown", { key: "b" }));
                await flush_dom();

                const afterRemove = count;

                _listeners_debug_hard_reset();

                (tree as any).__result = {
                    beforeRemove,
                    afterRemove,
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;
                t.eq("document listener fired before remove", r.beforeRemove, 1);
                t.eq("document listener did not fire after remove", r.afterRemove, 1);
            },
        },

        {
            suite: SUITE,
            name: "listen.window: listener is removed when owning tree is removed",
            dom: true,
            fixture: "listen/cleanup",
            sub: "window-owner-remove",

            html: `
        <main id="root">
          <div id="owner">hello</div>
        </main>
      `,

            async act(tree) {
                const owner = tree.find.must.byId("owner");

                let count = 0;

                owner.listen.window.onKeyDown(() => {
                    count++;
                });

                window.dispatchEvent(new KeyboardEvent("keydown", { key: "w" }));
                await flush_dom();

                owner.removeSelf();

                window.dispatchEvent(new KeyboardEvent("keydown", { key: "x" }));
                await flush_dom();

                (tree as any).__result = {
                    count,
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;
                t.eq("window listener fires before remove and not after", r.count, 1);
            },
        },

        {
            suite: SUITE,
            name: "listen.element: listener is removed when owning tree is removed",
            dom: true,
            fixture: "listen/cleanup",
            sub: "element-owner-remove",

            html: `
        <main id="root">
          <button id="owner">press</button>
        </main>
      `,

            async act(tree) {
                const owner = tree.find.must.byId("owner");

                let count = 0;

                owner.listen.onClick(() => {
                    count++;
                });

                (owner.dom.must.el() as HTMLElement).click();
                await flush_dom();

                owner.removeSelf();

                // element is gone; do not click again. the count should remain stable.
                await flush_dom();

                (tree as any).__result = {
                    count,
                    stillInDom: !!tree.find.byId("owner"),
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;
                t.eq("element listener fires before remove", r.count, 1);
                t.eq("owner removed from tree", r.stillInDom, false);
            },
        },

        {
            suite: SUITE,
            name: "listen.document.once: fires once and does not linger after remove",
            dom: true,
            fixture: "listen/cleanup",
            sub: "document-once-remove",

            html: `
        <main id="root">
          <div id="owner">hello</div>
        </main>
      `,

            async act(tree) {
                const owner = tree.find.must.byId("owner");

                let count = 0;
                let keySeen = "";

                owner.listen.document.once().onKeyDown((ev) => {
                    count++;
                    keySeen = ev.key;
                });

                document.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
                document.dispatchEvent(new KeyboardEvent("keydown", { key: "b" }));
                await flush_dom();

                owner.removeSelf();

                document.dispatchEvent(new KeyboardEvent("keydown", { key: "c" }));
                await flush_dom();

                (tree as any).__result = {
                    count,
                    keySeen,
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;
                t.eq("document once fires exactly once", r.count, 1);
                t.eq("document once keeps first key", r.keySeen, "a");
            },
        },

        {
            suite: SUITE,
            name: "listen target switching: document, window, and element stay distinct",
            dom: true,
            fixture: "listen/targets",
            sub: "document-window-element-distinct",

            html: `
        <main id="root">
          <button id="owner">press</button>
        </main>
      `,

            async act(tree) {
                const owner = tree.find.must.byId("owner");

                let docCount = 0;
                let winCount = 0;
                let elCount = 0;

                owner.listen.document.onKeyDown(() => {
                    docCount++;
                });

                owner.listen.window.onKeyDown(() => {
                    winCount++;
                });

                owner.listen.element.onClick(() => {
                    elCount++;
                });

                document.dispatchEvent(new KeyboardEvent("keydown", { key: "d" }));
                await flush_dom();

                window.dispatchEvent(new KeyboardEvent("keydown", { key: "w" }));
                await flush_dom();

                (owner.dom.must.el() as HTMLElement).click();
                await flush_dom();

                (tree as any).__result = {
                    docCount,
                    winCount,
                    elCount,
                };
            },

            assert(tree, t) {
                const r = (tree as any).__result;

                // NOTE:
                // Depending on browser/event model, document-level keydown may also reach window.
                // We only assert the minimum expected independent behavior here.
                t.eq("document listener fired", r.docCount >= 1, true);
                t.eq("window listener fired", r.winCount >= 1, true);
                t.eq("element click listener fired once", r.elCount, 1);
            },
        },

        {
            suite: SUITE,
            name: "listen.element getter resets target away from document/window",
            dom: true,
            fixture: "listen/targets",
            sub: "element-resets-target",

            html: `
        <main id="root">
          <button id="owner">press</button>
        </main>
      `,

            async act(tree) {
                const owner = tree.find.must.byId("owner");

                let clickCount = 0;
                let keyCount = 0;

                owner.listen.document.onKeyDown(() => {
                    keyCount++;
                });

                owner.listen.element.onClick(() => {
                    clickCount++;
                });

                (owner.dom.must.el() as HTMLElement).click();
                await flush_dom();

                document.dispatchEvent(new KeyboardEvent("keydown", { key: "z" }));
                await flush_dom();

                (tree as any).__result = {
                    clickCount,
                    keyCount,
                };

            },

            assert(tree, t) {
                const r = (tree as any).__result;
                t.eq("element click listener fired", r.clickCount, 1);
                t.eq("document key listener fired", r.keyCount, 1);
            },
        },
    ];

    return make_livetree_suite(SUITE, cases);
}