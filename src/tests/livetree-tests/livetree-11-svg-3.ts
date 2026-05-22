import type { LiveTreeCaseSpec, TestSuite } from "../tests.types";
import { make_livetree_suite } from "./livetree-testkit";

export function livetree_gnarly_svg(): TestSuite {
  const SUITE = "livetree/svg/gnarly";
  const cases: readonly LiveTreeCaseSpec[] =
    [
      {
        suite: SUITE,
        name: "svg: direct child creation preserves parentage and avoids wrapper leak",
        fixture: "svg/materialization",
        sub: "direct-parentage",
        html: `<main id="root"></main>`,
        dom: true,

        act: async (root) => {
          const field = root.create.svg().id.set("field");
          const g1 = field.create.g().id.set("g1");
          const c1 = g1.create.circle().id.set("c1");

          const fieldEl = field.dom.el() as Element | undefined;
          const gEl = g1.dom.el() as Element | undefined;
          const cEl = c1.dom.el() as Element | undefined;

          (root as any).__result = {
            fieldTag: fieldEl?.tagName?.toLowerCase() ?? null,
            fieldNs: fieldEl?.namespaceURI ?? null,
            fieldChildTags: Array.from(fieldEl?.children ?? []).map((el) => el.tagName.toLowerCase()),

            gTag: gEl?.tagName?.toLowerCase() ?? null,
            gNs: gEl?.namespaceURI ?? null,
            gParent: gEl?.parentElement?.tagName?.toLowerCase() ?? null,

            cTag: cEl?.tagName?.toLowerCase() ?? null,
            cNs: cEl?.namespaceURI ?? null,
            cParent: cEl?.parentElement?.tagName?.toLowerCase() ?? null,

            nestedSvgCount: gEl ? gEl.querySelectorAll("svg").length : -1,
          };
        },

              assert: async (root, t) => {
          const r = (root as any).__result;

          t.eq("field is svg", r.fieldTag, "svg");
          t.eq("field namespace", r.fieldNs, "http://www.w3.org/2000/svg");
          t.eq("field direct child is g only", JSON.stringify(r.fieldChildTags), JSON.stringify(["g"]));

          t.eq("g tag", r.gTag, "g");
          t.eq("g namespace", r.gNs, "http://www.w3.org/2000/svg");
          t.eq("g parent", r.gParent, "svg");

          t.eq("circle tag", r.cTag, "circle");
          t.eq("circle namespace", r.cNs, "http://www.w3.org/2000/svg");
          t.eq("circle parent", r.cParent, "g");

          t.eq("no leaked nested svg wrappers under g", r.nestedSvgCount, 0);
        },
      },
      {
        suite: SUITE,
        name: "svg: direct sibling creation under g preserves order and parentage",
        fixture: "svg/materialization",
        sub: "direct-siblings",
        html: `<main id="root"></main>`,
        dom: true,

        act: async (root) => {
          const field = root.create.svg().id.set("field");
          const g1 = field.create.g().id.set("g1");

          const c1 = g1.create.circle().id.set("c1");
          const e1 = g1.create.ellipse().id.set("e1");
          const r1 = g1.create.rect().id.set("r1");

          const gEl = g1.dom.el() as Element | undefined;

          (root as any).__result = {
            childTags: Array.from(gEl?.children ?? []).map((el) => el.tagName.toLowerCase()),
            childIds: Array.from(gEl?.children ?? []).map((el) => el.getAttribute("id")),
            childParents: [c1, e1, r1].map((tree) => tree.dom.el()?.parentElement?.tagName?.toLowerCase() ?? null),
            childNs: [c1, e1, r1].map((tree) => tree.dom.el()?.namespaceURI ?? null),
            nestedSvgCount: gEl ? gEl.querySelectorAll("svg").length : -1,
          };
        },
        assert: async (root, t) => {
          const r = (root as any).__result;

          t.eq(
            "child order preserved",
            JSON.stringify(r.childTags),
            JSON.stringify(["circle", "ellipse", "rect"])
          );
          t.eq(
            "child ids preserved",
            JSON.stringify(r.childIds),
            JSON.stringify(["c1", "e1", "r1"])
          );
          t.eq(
            "all parents are g",
            JSON.stringify(r.childParents),
            JSON.stringify(["g", "g", "g"])
          );
          t.eq(
            "all children are svg namespace",
            JSON.stringify(r.childNs),
            JSON.stringify([
              "http://www.w3.org/2000/svg",
              "http://www.w3.org/2000/svg",
              "http://www.w3.org/2000/svg",
            ])
          );
          t.eq("no leaked nested svg wrappers", r.nestedSvgCount, 0);
        },
      },
      {
        suite: SUITE,
        name: "svg: g(string) creates subtree without wrapper leak",
        fixture: "svg/materialization",
        sub: "string-root-parentage",
        html: `<main id="root"></main>`,
        dom: true,

        act: async (root) => {
          const field = root.create.svg().id.set("field");
          const outer = field.create.g(`<g id="outer"><circle id="c1"></circle></g>`);

          const outerEl = outer.dom.el() as Element | undefined;
          const circleEl = outerEl?.querySelector("#c1") as Element | null;

          (root as any).__result = {
            outerTag: outerEl?.tagName?.toLowerCase() ?? null,
            outerNs: outerEl?.namespaceURI ?? null,
            outerParent: outerEl?.parentElement?.tagName?.toLowerCase() ?? null,

            circleTag: circleEl?.tagName?.toLowerCase() ?? null,
            circleNs: circleEl?.namespaceURI ?? null,
            circleParent: circleEl?.parentElement?.tagName?.toLowerCase() ?? null,

            fieldChildren: Array.from((field.dom.el()?.children ?? []) as HTMLCollection).map((el) => ({
              tag: el.tagName.toLowerCase(),
              id: el.getAttribute("id"),
            })),
            nestedSvgCount: outerEl ? outerEl.querySelectorAll("svg").length : -1,
          };
        },
        assert: async (root, t) => {
          const r = (root as any).__result;

          t.eq("returned root is g", r.outerTag, "g");
          t.eq("outer namespace", r.outerNs, "http://www.w3.org/2000/svg");
          t.eq("outer parent", r.outerParent, "svg");

          t.eq("circle exists", r.circleTag, "circle");
          t.eq("circle namespace", r.circleNs, "http://www.w3.org/2000/svg");
          t.eq("circle parent is g", r.circleParent, "g");

          t.eq(
            "field has direct g child only",
            JSON.stringify(r.fieldChildren),
            JSON.stringify([{ tag: "g", id: "outer" }])
          );
          t.eq("no leaked nested svg wrappers under created g", r.nestedSvgCount, 0);
        },
      },

      {
        suite: SUITE,
        name: "svg: nested g(string) subtree preserves parent chain",
        fixture: "svg/materialization",
        sub: "string-nested-parentage",
        html: `<main id="root"></main>`,
        dom: true,

        act: async (root) => {
          const field = root.create.svg().id.set("field");
          const outer = field.create.g(
            `<g id="outer"><g id="inner"><circle id="c1"></circle></g></g>`
          );

          const outerEl = outer.dom.el() as Element | undefined;
          const innerEl = outerEl?.querySelector("#inner") as Element | null;
          const circleEl = outerEl?.querySelector("#c1") as Element | null;

          (root as any).__result = {
            outerParent: outerEl?.parentElement?.tagName?.toLowerCase() ?? null,
            innerParent: innerEl?.parentElement?.tagName?.toLowerCase() ?? null,
            circleParent: circleEl?.parentElement?.tagName?.toLowerCase() ?? null,

            outerNs: outerEl?.namespaceURI ?? null,
            innerNs: innerEl?.namespaceURI ?? null,
            circleNs: circleEl?.namespaceURI ?? null,

            nestedSvgCount: outerEl ? outerEl.querySelectorAll("svg").length : -1,
          };
        },
        assert: async (root, t) => {
          const r = (root as any).__result;

          t.eq("outer parent is svg", r.outerParent, "svg");
          t.eq("inner parent is outer g", r.innerParent, "g");
          t.eq("circle parent is inner g", r.circleParent, "g");

          t.eq("outer namespace", r.outerNs, "http://www.w3.org/2000/svg");
          t.eq("inner namespace", r.innerNs, "http://www.w3.org/2000/svg");
          t.eq("circle namespace", r.circleNs, "http://www.w3.org/2000/svg");

          t.eq("no leaked nested svg wrappers", r.nestedSvgCount, 0);
        },
      },
      {
        suite: SUITE,
        name: "svg: at(index) inserts real g nodes, not svg wrappers",
        fixture: "svg/materialization",
        sub: "placement-no-wrapper-leak",
        html: `<main id="root"></main>`,
        dom: true,

        act: async (root) => {
          const field = root.create.svg().id.set("field");

          field.create.g().id.set("a");
          field.create.g().id.set("b");
          field.create.at(1).g().id.set("mid");

          const fieldEl = field.dom.el() as Element | undefined;

          (root as any).__result = {
            childTags: Array.from(fieldEl?.children ?? []).map((el) => el.tagName.toLowerCase()),
            childIds: Array.from(fieldEl?.children ?? []).map((el) => el.getAttribute("id")),
            childNs: Array.from(fieldEl?.children ?? []).map((el) => el.namespaceURI),
          };
        },
        assert: async (root, t) => {
          const r = (root as any).__result;

          t.eq(
            "all direct children are g",
            JSON.stringify(r.childTags),
            JSON.stringify(["g", "g", "g"])
          );
          t.eq(
            "order preserved",
            JSON.stringify(r.childIds),
            JSON.stringify(["a", "mid", "b"])
          );
          t.eq(
            "all direct children are svg namespace",
            JSON.stringify(r.childNs),
            JSON.stringify([
              "http://www.w3.org/2000/svg",
              "http://www.w3.org/2000/svg",
              "http://www.w3.org/2000/svg",
            ])
          );
        },
      },


    ];

  return make_livetree_suite(SUITE, cases);
}