// import { hson } from "hson-live";
// import type { TestSuite, TestCase, LiveTreeFx } from "../tests.types";

// export function make_livetree_suite(
//     suiteName: string,
//     fixtures: readonly LiveTreeFx[],
// ): TestSuite {
//     const cases: TestCase[] = fixtures.map((fx) => ({
//         suite: suiteName,
//         name: fx.name,
//         run: async () => {
//             const tree = hson.fromTrustedHtml(fx.html).liveTree.asBranch();

//             await fx.run(tree);
//             fx.assert(tree);

//             return {
//                 metaPatch: {
//                     input: fx.html,
//                     preview: fx.preview ?? fx.name,
//                     fixture: suiteName,
//                     sub: fx.inputLabel ?? "",
//                 },
//             } as const;
//         },
//     }));

//     return { suite: suiteName, cases };
// }