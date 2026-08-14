import { flush_dom } from "../inspector/inspector.helpers";
import type { TestSuite } from "../../harness/core/test-contracts";
import type { LiveTreeCaseSpec } from "../livemap/livemap-tests.types";
import { make_livetree_suite } from "./make-livetree-suite";

export function livetree_svg_lvl2(): TestSuite {
    const SUITE = "livetree/new-svg";
    const cases: readonly LiveTreeCaseSpec[] =
        [
            {
                suite: SUITE,
                caseId: "svg.viewbox-set-overload-writes-string", name: "svg.viewBox set overload writes string",
                html: `<main><svg id="s"></svg></main>`,
                fixture: "svg/api",
                sub: "viewbox-string",

                async act(tree) {
                    const svg = tree.find.must.byId("s");
                    svg.svg.viewBox.set("0 0 100 100");

                    (tree as any).__result = {
                        viewBox: svg.attrs.get("viewBox"),
                        readback: svg.svg.viewBox.get(),
                    };
                },

                assert(tree, t) {
                    const r = (tree as any).__result;
                    t.eq("viewBox attr", r.viewBox, "0 0 100 100");
                    t.eq("viewBox readback", r.readback, "0 0 100 100");
                },
            },
            {
                suite: SUITE,
                caseId: "svg.viewbox-set-overload-writes-numbers", name: "svg.viewBox set overload writes numbers",
                html: `<main><svg id="s"></svg></main>`,
                fixture: "svg/api",
                sub: "viewbox-numbers",

                async act(tree) {
                    const svg = tree.find.must.byId("s");
                    svg.svg.viewBox.set(0, 0, 640, 480);

                    (tree as any).__result = {
                        viewBox: svg.attrs.get("viewBox"),
                    };
                },

                assert(tree, t) {
                    const r = (tree as any).__result;
                    t.eq("viewBox numeric attr", r.viewBox, "0 0 640 480");
                },
            },
            {
                suite: SUITE,
                caseId: "svg.preserveaspectratio-none-helper-writes-attr", name: "svg.preserveAspectRatio none helper writes attr",
                html: `<main><svg id="s"></svg></main>`,
                fixture: "svg/api",
                sub: "preserve-none",

                async act(tree) {
                    const svg = tree.find.must.byId("s");
                    svg.svg.preserveAspectRatio.none();

                    (tree as any).__result = {
                        value: svg.attrs.get("preserveAspectRatio"),
                        readback: svg.svg.preserveAspectRatio.get(),
                    };
                },

                assert(tree, t) {
                    const r = (tree as any).__result;
                    t.eq("preserveAspectRatio attr", r.value, "none");
                    t.eq("preserveAspectRatio readback", r.readback, "none");
                },
            },
            {
                suite: SUITE,
                caseId: "svg.path-d-fill-stroke-helpers-write-attrs", name: "svg.path d fill stroke helpers write attrs",
                html: `<main><svg id="s"><path id="p"></path></svg></main>`,
                fixture: "svg/api",
                dom: true,
                sub: "path-attrs",

                async act(tree) {
                    const path = tree.find.must.byId("p");

                    path.svg.d.set("M 0 0 H 10 V 10 Z");
                    path.svg.fill.none();
                    path.svg.stroke.set("rgba(255,245,190,0.22)");
                    path.svg.strokeWidth.set(1);
                    path.svg.vectorEffect.nonScalingStroke();

                    await flush_dom();

                    const el = path.dom.el();

                    (tree as any).__result = {
                        nodeAttrs: path.node.$_attrs,
                        domAttrs: {
                            d: el?.getAttribute("d"),
                            fill: el?.getAttribute("fill"),
                            stroke: el?.getAttribute("stroke"),
                            strokeWidth: el?.getAttribute("stroke-width"),
                            vectorEffect: el?.getAttribute("vector-effect"),
                        },
                    };
                },

                assert(tree, t) {
                    const r = (tree as any).__result;

                    t.eq("node stroke-width attr", r.nodeAttrs["stroke-width"], "1");
                    t.eq("node vector-effect attr", r.nodeAttrs["vector-effect"], "non-scaling-stroke");

                    t.eq("dom stroke-width attr", r.domAttrs.strokeWidth, "1");
                    t.eq("dom vector-effect attr", r.domAttrs.vectorEffect, "non-scaling-stroke");
                }
            },
            {
                suite: SUITE,
                caseId: "svg-api-exists-on-html-nodes-but-reports-out-of-scope", name: "svg api exists on html nodes but reports out of scope",
                html: `<main><div id="box"></div><svg id="s"></svg></main>`,
                fixture: "svg/api",
                sub: "scope",

                async act(tree) {
                    const box = tree.find.must.byId("box");
                    const svg = tree.find.must.byId("s");

                    (tree as any).__result = {
                        boxScope: box.svg.inScope(),
                        svgScope: svg.svg.inScope(),
                    };
                },

                assert(tree, t) {
                    const r = (tree as any).__result;
                    t.eq("html node svg scope false", r.boxScope, false);
                    t.eq("svg node svg scope true", r.svgScope, true);
                },
            },
            {
                suite: SUITE,
                caseId: "svg-bbox-returns-mounted-geometry", name: "svg bbox returns mounted geometry",
                html: `<main><svg id="s" viewBox="0 0 100 100"><rect id="r" x="10" y="20" width="30" height="40"></rect></svg></main>`,
                fixture: "svg/api",
                dom: true,
                sub: "bbox",
                hostedGeometry: [{ id: "r", rect: { x: 10, y: 20, width: 30, height: 40 } }],

                async act(tree) {
                    const rect = tree.find.must.byId("r");

                    await flush_dom();

                    (tree as any).__result = rect.svg.bbox();
                },

                assert(tree, t) {
                    const b = (tree as any).__result;

                    t.ok("bbox exists", !!b);
                    if (!b) return;
                    t.eq("bbox x", b.x, 10);
                    t.eq("bbox y", b.y, 20);
                    t.eq("bbox width", b.width, 30);
                    t.eq("bbox height", b.height, 40);
                },
            }
        ];

    return make_livetree_suite(SUITE, cases);
}
