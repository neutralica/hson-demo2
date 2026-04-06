
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
          const manualBase = manual.dom.computed() ?? { content: "" };
          const autoBase = auto.dom.computed() ?? { content: "" };

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
}