import type { TestSuite, LiveTreeCaseSpec } from "../../app/phases/phase-3-demo/demo-test/tests.types";
import { make_livetree_suite } from "./livetree-testkit";



export function suite_find(): TestSuite {
  const SUITE = "test/fail";

  const cases: readonly LiveTreeCaseSpec[] = [
    {
      suite: "##!!TEST FAIL STYLE TEST!!##",
      name: "this is a deliberately failing test to see how it is styled",
      dom: true,
      fixture: "dom/contains",
      sub: "INVALID/FAIL",

      html: `
        <main id="root">
          <section id="panel">Panel</section>
        </main>
      `,

      async act(tree) {


      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("this should fail", r.comparableCloneContains, true);
        t.eq("this should fail too", r.comparableCloneContains, true);
        t.eq("this should fail three", r.comparableCloneContains, true);
        t.eq("this should fail 4LSO", r.comparableCloneContains, true);
      },
    },
  ];

  return make_livetree_suite(SUITE, cases);
}

