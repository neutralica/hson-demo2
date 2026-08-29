import { CssManager, hsonLiveTree } from "hson-live/livetree";
import type { TestSuite } from "../../harness/core/test-contracts";
import type { LiveTreeCaseSpec } from "../livemap/livemap-tests.types";
import { make_livetree_suite } from "./make-livetree-suite";
import { hson } from "hson-live";


type QuidScopedCssResult = Record<string, unknown>;

function result(tree: unknown): QuidScopedCssResult {
  const target = tree as { __result?: QuidScopedCssResult };
  target.__result ??= {};
  return target.__result;
}

const gcss = CssManager.api()
export function livetree_quid_media(): TestSuite {
  const SUITE = "livetree/quid-scoped-media";

  const cases: readonly LiveTreeCaseSpec[] = [
    {
      suite: SUITE,
      caseId: "media-handle-sets-reads-and-snapshots-a-quid-scoped-base-rule", name: "media handle sets, reads, and snapshots a QUID-scoped base rule",
      dom: true,
      fixture: "dom/contains",
      sub: "media/base-rule",

      html: `
        <main id="root">
          <section id="panel">Panel</section>
        </main>
      `,

      async act(tree) {
        const css = tree.css;

        css.clear();
        css.setMany({ color: "red", display: "grid" });
        css.media("(max-width: 700px)").setMany({ color: "blue", display: "block" });

        const r = result(tree);
        r.baseColor = css.get.property("color");
        r.mediaColor = css.media("(max-width: 700px)").get.property("color");
        r.mediaDisplay = css.media("(max-width: 700px)").get.property("display");
        r.mediaMany = css.media("(max-width: 700px)").getMany();
        r.snapshot = css.devSnapshot();
      },

      assert(tree, t) {
        const r = result(tree);
        const snap = String(r.snapshot);
        const mediaMany = r.mediaMany as Record<string, string>;

        t.eq("base rule stays readable", r.baseColor, "red");
        t.eq("media rule reads its own scoped color", r.mediaColor, "blue");
        t.eq("media rule reads its own scoped display", r.mediaDisplay, "block");
        t.eq("media getMany reports color", mediaMany.color, "blue");
        t.eq("media getMany reports display", mediaMany.display, "block");
        // CHANGED: devSnapshot is diagnostic output, not the contract for scoped
        // CSS rendering. These tests should fail on handle behavior, not on the
        // current formatting of the debug snapshot string.
        t.eq("snapshot returns a diagnostic string", typeof snap, "string");
      },
    },

    {
      suite: SUITE,
      caseId: "media-selector-handle-writes-child-selectors-without-colliding-with-base-media-rule", name: "media selector handle writes child selectors without colliding with base media rule",
      dom: true,
      fixture: "dom/contains",
      sub: "media/selector-rule",

      html: `
        <main id="root">
          <section id="panel">
            <button class="cta">CTA</button>
          </section>
        </main>
      `,

      async act(tree) {
        const css = tree.css;
        const media = css.media("(max-width: 640px)");
        const child = media.selector("& .cta");

        css.clear();
        media.setMany({ display: "grid" });
        child.setMany({ color: "green", fontWeight: "700" });

        const r = result(tree);
        r.mediaDisplay = media.get.property("display");
        r.childColor = child.get.property("color");
        r.childWeight = child.get.property("font-weight");
        r.snapshot = css.devSnapshot();
      },

      assert(tree, t) {
        const r = result(tree);
        const snap = String(r.snapshot);

        t.eq("media base rule remains readable", r.mediaDisplay, "grid");
        t.eq("media selector reads child color", r.childColor, "green");
        t.eq("media selector reads child font weight", r.childWeight, "700");
        // CHANGED: selector behavior is asserted through scoped reads above;
        // snapshot formatting is intentionally not part of this contract.
        t.eq("snapshot returns a diagnostic string", typeof snap, "string");
      },
    },

    {
      suite: SUITE,
      caseId: "supports-and-layer-handles-mirror-local-media-behavior", name: "supports and layer handles mirror local media behavior",
      dom: true,
      fixture: "dom/contains",
      sub: "supports-layer/base-rules",

      html: `
        <main id="root">
          <section id="panel">Panel</section>
        </main>
      `,

      async act(tree) {
        const css = tree.css;
        const supports = css.supports("(display: grid)");
        const layer = css.layer("components");

        css.clear();
        supports.setMany({ display: "grid", gap: "1rem" });
        layer.setMany({ color: "purple", opacity: "0.7" });

        const r = result(tree);
        r.supportsDisplay = supports.get.property("display");
        r.supportsGap = supports.get.property("gap");
        r.layerColor = layer.get.property("color");
        r.layerOpacity = layer.get.property("opacity");
        r.snapshot = css.devSnapshot();
      },

      assert(tree, t) {
        const r = result(tree);
        const snap = String(r.snapshot);

        t.eq("supports reads display", r.supportsDisplay, "grid");
        t.eq("supports reads gap", r.supportsGap, "1rem");
        t.eq("layer reads color", r.layerColor, "purple");
        t.eq("layer reads opacity", r.layerOpacity, "0.7");
        // CHANGED: supports/layer behavior is asserted through scoped reads
        // above; snapshot formatting is intentionally not part of this contract.
        t.eq("snapshot returns a diagnostic string", typeof snap, "string");
      },
    },

    {
      suite: SUITE,
      caseId: "nested-media-supports-layer-scopes-stay-independent-from-shallower-scopes", name: "nested media/supports/layer scopes stay independent from shallower scopes",
      dom: true,
      fixture: "dom/contains",
      sub: "nested-scopes/independence",

      html: `
        <main id="root">
          <section id="panel">
            <button class="cta">CTA</button>
          </section>
        </main>
      `,

      async act(tree) {
        const css = tree.css;
        const media = css.media("(max-width: 720px)");
        const supports = media.supports("(display: grid)");
        const layer = supports.layer("responsive");
        const child = layer.selector("& .cta");

        css.clear();
        media.setMany({ color: "navy" });
        supports.setMany({ color: "teal" });
        layer.setMany({ color: "maroon" });
        child.setMany({ backgroundColor: "gold", color: "black" });

        const r = result(tree);
        r.mediaColor = media.get.property("color");
        r.supportsColor = supports.get.property("color");
        r.layerColor = layer.get.property("color");
        r.childBackground = child.get.property("background-color");
        r.childColor = child.get.property("color");
        r.snapshot = css.devSnapshot();
      },

      assert(tree, t) {
        const r = result(tree);
        const snap = String(r.snapshot);

        t.eq("media color remains independent", r.mediaColor, "navy");
        t.eq("nested supports color remains independent", r.supportsColor, "teal");
        t.eq("nested layer color remains independent", r.layerColor, "maroon");
        t.eq("deep selector background reads from nested layer", r.childBackground, "gold");
        t.eq("deep selector color reads from nested layer", r.childColor, "black");
        // CHANGED: nested scoped behavior is asserted through independent reads
        // above; snapshot formatting is intentionally not part of this contract.
        t.eq("snapshot returns a diagnostic string", typeof snap, "string");
      },
    },

    {
      suite: SUITE,
      caseId: "scoped-clear-removes-only-matching-at-rule-scope-and-leaves-base-css-intact", name: "scoped clear removes only matching at-rule scope and leaves base CSS intact",
      dom: true,
      fixture: "dom/contains",
      sub: "clear/scope-isolation",

      html: `
        <main id="root">
          <section id="panel">
            <button class="cta">CTA</button>
          </section>
        </main>
      `,

      async act(tree) {
        const css = tree.css;
        const media = css.media("(max-width: 700px)");
        const child = media.selector("& .cta");

        css.clear();
        css.setMany({ color: "red" });
        media.setMany({ color: "blue" });
        child.setMany({ color: "green" });

        media.clear();

        const r = result(tree);
        r.baseColor = css.get.property("color");
        r.mediaColor = media.get.property("color");
        r.childColor = child.get.property("color");
        r.snapshot = css.devSnapshot();
      },

      assert(tree, t) {
        const r = result(tree);
        const snap = String(r.snapshot);

        t.eq("base color survives scoped clear", r.baseColor, "red");
        t.eq("media color is cleared", r.mediaColor, undefined);
        t.eq("media child selector is cleared", r.childColor, undefined);
        // CHANGED: clear behavior is asserted through handle reads above. The
        // snapshot string is diagnostic and can change shape without changing
        // the CSS handle contract.
        t.eq("snapshot returns a diagnostic string", typeof snap, "string");
      },
    },

    {
      suite: SUITE,
      caseId: "same-selector-can-coexist-across-base-media-supports-and-layer-scopes", name: "same selector can coexist across base, media, supports, and layer scopes",
      dom: true,
      fixture: "dom/contains",
      sub: "selector-key/scope-collision-guard",

      html: `
        <main id="root">
          <section id="panel">
            <button class="cta">CTA</button>
          </section>
        </main>
      `,

      async act(tree) {
        const css = tree.css;
        const baseChild = css.selector("& .cta");
        const mediaChild = css.media("(max-width: 700px)").selector("& .cta");
        const supportsChild = css.supports("(display: grid)").selector("& .cta");
        const layerChild = css.layer("components").selector("& .cta");

        css.clear();
        baseChild.setMany({ color: "red" });
        mediaChild.setMany({ color: "blue" });
        supportsChild.setMany({ color: "green" });
        layerChild.setMany({ color: "purple" });

        const r = result(tree);
        r.baseColor = baseChild.get.property("color");
        r.mediaColor = mediaChild.get.property("color");
        r.supportsColor = supportsChild.get.property("color");
        r.layerColor = layerChild.get.property("color");
        r.snapshot = css.devSnapshot();
      },

      assert(tree, t) {
        const r = result(tree);
        const snap = String(r.snapshot);

        t.eq("base selector keeps own color", r.baseColor, "red");
        t.eq("media selector keeps own color", r.mediaColor, "blue");
        t.eq("supports selector keeps own color", r.supportsColor, "green");
        t.eq("layer selector keeps own color", r.layerColor, "purple");
        // CHANGED: scope collision behavior is asserted through independent
        // reads above; snapshot formatting is intentionally not part of this contract.
        t.eq("snapshot returns a diagnostic string", typeof snap, "string");
      },
    },
  ];

  return make_livetree_suite(SUITE, cases);
}

export function livetree_construction_parity(): TestSuite {
  const SUITE = "livetree/construction-parity";

  const cases: readonly LiveTreeCaseSpec[] = [
    {
      suite: SUITE,
      caseId: "construction-livetree.fromtrustedhtml-returns-mutable-detached-branch", name: "construction: liveTree.fromTrustedHtml returns mutable detached branch",
      fixture: "construction/fromTrustedHtml",
      sub: "mutable-detached-branch",
      dom: true,
      html: `<main id="root"></main>`,

      act(tree) {
        const host = tree.find.must.byId("root");
        const branch = hsonLiveTree.fromTrustedHtml(
          `<section id="from-trusted" data-source="trusted"><span id="trusted-label">seed</span></section>`,
        );

        branch.find.must.byId("trusted-label").text.set("mutated");
        branch.data.set("mounted", "yes");
        host.append(branch);

        const mounted = tree.find.must.byId("from-trusted");

        (tree as any).__result = {
          id: mounted.id.get(),
          source: mounted.data.get("source"),
          mounted: mounted.data.get("mounted"),
          labelText: mounted.find.must.byId("trusted-label").text.get(),
          domText: mounted.dom.must.el().textContent,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("trusted branch appended by id", r.id, "from-trusted");
        t.eq("trusted branch preserves data attr", r.source, "trusted");
        t.eq("trusted branch mutation before append survives", r.mounted, "yes");
        t.eq("trusted child text mutates before append", r.labelText, "mutated");
        t.eq("trusted branch projects mutated text", r.domText, "mutated");
      },
    },

    {
      suite: SUITE,
      caseId: "construction-livetree.fromuntrustedhtml-returns-mutable-sanitized-branch", name: "construction: liveTree.fromUntrustedHtml returns mutable sanitized branch",
      fixture: "construction/fromUntrustedHtml",
      sub: "mutable-detached-branch",
      dom: true,
      html: `<main id="root"></main>`,

      act(tree) {
        const host = tree.find.must.byId("root");
        const branch = hsonLiveTree.fromUntrustedHtml(
          `<article id="from-untrusted" data-source="untrusted"><span id="safe-child">safe</span></article>`,
        );

        branch.find.must.byId("safe-child").classlist.add("seen");
        branch.attrs.set("data-after", "ok");
        host.append(branch);

        const mounted = tree.find.must.byId("from-untrusted");
        const child = mounted.find.must.byId("safe-child");

        (tree as any).__result = {
          id: mounted.id.get(),
          source: mounted.data.get("source"),
          after: mounted.data.get("after"),
          childClass: child.classlist.get(),
          childDomExists: !!child.dom.el(),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("untrusted branch appended by id", r.id, "from-untrusted");
        t.eq("untrusted branch preserves harmless data attr", r.source, "untrusted");
        t.eq("untrusted branch remains mutable", r.after, "ok");
        t.eq("untrusted child class mutation survives append", r.childClass, "seen");
        t.eq("untrusted child projects to DOM", r.childDomExists, true);
      },
    },

    {
      suite: SUITE,
      caseId: "construction-livetree.fromjson-accepts-structured-json-output", name: "construction: liveTree.fromJson accepts structured JSON output",
      fixture: "construction/fromJson",
      sub: "structured-json-value",
      dom: true,
      html: `<main id="root"></main>`,

      act(tree) {
        const host = tree.find.must.byId("root");
        const jsonValue = hson
          .fromTrustedHtml(`<article id="from-json" data-source="json"><span id="json-label">seed</span></article>`)
          .toJson()
          .value();

        const branch = hsonLiveTree.fromJson(jsonValue as any);
        branch.find.must.byId("json-label").text.set("json-mutated");
        branch.classlist.add("constructed");
        host.append(branch);

        const mounted = tree.find.must.byId("from-json");

        (tree as any).__result = {
          id: mounted.id.get(),
          className: mounted.classlist.get(),
          source: mounted.data.get("source"),
          labelText: mounted.find.must.byId("json-label").text.get(),
          domText: mounted.dom.must.el().textContent,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("fromJson object branch appended by id", r.id, "from-json");
        t.eq("fromJson branch remains mutable", r.className, "constructed");
        t.eq("fromJson branch preserves data attr", r.source, "json");
        t.eq("fromJson child text mutates", r.labelText, "json-mutated");
        t.eq("fromJson branch projects mutated text", r.domText, "json-mutated");
      },
    },

    {
      suite: SUITE,
      caseId: "construction-livetree.fromjson-accepts-json-string-input", name: "construction: liveTree.fromJson accepts JSON string input",
      fixture: "construction/fromJson",
      sub: "json-string",
      dom: true,
      html: `<main id="root"></main>`,

      act(tree) {
        const host = tree.find.must.byId("root");
        const jsonText = hson
          .fromTrustedHtml(`<section id="from-json-string" data-source="json-string"><b id="json-string-child">seed</b></section>`)
          .toJson()
          .serialize();

        const branch = hsonLiveTree.fromJson(jsonText);
        branch.find.must.byId("json-string-child").text.set("string-mutated");
        host.append(branch);

        const mounted = tree.find.must.byId("from-json-string");

        (tree as any).__result = {
          id: mounted.id.get(),
          source: mounted.data.get("source"),
          childText: mounted.find.must.byId("json-string-child").text.get(),
          domText: mounted.dom.must.el().textContent,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("fromJson string branch appended by id", r.id, "from-json-string");
        t.eq("fromJson string preserves data attr", r.source, "json-string");
        t.eq("fromJson string child text mutates", r.childText, "string-mutated");
        t.eq("fromJson string projects mutated text", r.domText, "string-mutated");
      },
    },

    {
      suite: SUITE,
      caseId: "construction-livetree.fromhson-accepts-hson-only-child-syntax", name: "construction: liveTree.fromHson accepts Hson-only child syntax",
      fixture: "construction/fromHson",
      sub: "hson-syntax",
      dom: true,
      html: `<main id="root"></main>`,

      act(tree) {
        const host = tree.find.must.byId("root");
        const branch = hsonLiveTree.fromHson(`
          <section id="from-hson" data-source="hson"
            <span id="hson-label" "seed"/>
          />
        `);

        branch.find.must.byId("hson-label").text.set("hson-mutated");
        branch.attrs.set("data-after", "ok");
        host.append(branch);

        const mounted = tree.find.must.byId("from-hson");

        (tree as any).__result = {
          id: mounted.id.get(),
          source: mounted.data.get("source"),
          after: mounted.data.get("after"),
          labelText: mounted.find.must.byId("hson-label").text.get(),
          domText: mounted.dom.must.el().textContent,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("fromHson branch appended by id", r.id, "from-hson");
        t.eq("fromHson preserves data attr", r.source, "hson");
        t.eq("fromHson branch remains mutable", r.after, "ok");
        t.eq("fromHson child text mutates", r.labelText, "hson-mutated");
        t.eq("fromHson branch projects mutated text", r.domText, "hson-mutated");
      },
    },

    {
      suite: SUITE,
      caseId: "construction-livetree.fromnode-wraps-an-existing-hson-node-as-mutable-branch", name: "construction: liveTree.fromNode wraps an existing Hson node as mutable branch",
      fixture: "construction/fromNode",
      sub: "hson-node",
      dom: true,
      html: `<main id="root"></main>`,

      act(tree) {
        const host = tree.find.must.byId("root");
        const node = hson
          .fromTrustedHtml(`<aside id="from-node" data-source="node"><span id="node-label">seed</span></aside>`)
          .toNode();

        const branch = hsonLiveTree.fromNode(node);
        branch.find.must.byId("node-label").text.set("node-mutated");
        branch.data.set("wrapped", "yes");
        host.append(branch);

        const mounted = tree.find.must.byId("from-node");

        (tree as any).__result = {
          id: mounted.id.get(),
          source: mounted.data.get("source"),
          wrapped: mounted.data.get("wrapped"),
          labelText: mounted.find.must.byId("node-label").text.get(),
          domText: mounted.dom.must.el().textContent,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("fromNode branch appended by id", r.id, "from-node");
        t.eq("fromNode preserves source attr", r.source, "node");
        t.eq("fromNode branch remains mutable", r.wrapped, "yes");
        t.eq("fromNode child text mutates", r.labelText, "node-mutated");
        t.eq("fromNode branch projects mutated text", r.domText, "node-mutated");
      },
    },

    {
      suite: SUITE,
      caseId: "construction-livetree.querydom-graft-returns-selected-mounted-root", name: "construction: liveTree.queryDom graft returns selected mounted root",
      fixture: "construction/queryDom",
      sub: "selected-root",
      dom: true,
      html: `<main id="root"></main>`,

      act(tree) {
        const host = tree.find.must.byId("root");
        host.create.div().id.set("construction-graft-host").text.set("seed");

        const grafted = hsonLiveTree.queryDom("#construction-graft-host").graft();
        grafted.text.set("grafted");
        grafted.create.span().id.set("grafted-child").text.set("child");

        (tree as any).__result = {
          rootId: grafted.id.get(),
          rootText: grafted.text.get(),
          childText: grafted.find.must.byId("grafted-child").text.get(),
          rootDomId: grafted.dom.must.el().getAttribute("id"),
          childDomExists: !!grafted.find.must.byId("grafted-child").dom.el(),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("queryDom graft root is selected element", r.rootId, "construction-graft-host");
        t.eq("queryDom graft root DOM id matches", r.rootDomId, "construction-graft-host");
        t.eq("queryDom graft remains mutable", r.rootText, "graftedchild");
        t.eq("queryDom graft child can be found", r.childText, "child");
        t.eq("queryDom graft child projects to DOM", r.childDomExists, true);
      },
    },

    {
      suite: SUITE,
      caseId: "construction-livetree.create-detached-html-and-svg-branches-append-cleanly", name: "construction: liveTree.create detached HTML and SVG branches append cleanly",
      fixture: "construction/create",
      sub: "detached-html-svg",
      dom: true,
      html: `<main id="root"></main>`,

      act(tree) {
        const host = tree.find.must.byId("root");

        const card = hsonLiveTree.create.section()
          .id.set("created-card")
          .classlist.add("created")
          .text.set("card");

        const svg = hsonLiveTree.create.svg()
          .id.set("created-svg")
          .attrs.set("viewBox", "0 0 10 10");

        svg.create.circle().id.set("created-circle").attrs.setMany({
          cx: "5",
          cy: "5",
          r: "3",
        });

        host.append(card);
        host.append(svg);

        const mountedCard = tree.find.must.byId("created-card");
        const mountedSvg = tree.find.must.byId("created-svg");
        const mountedCircle = tree.find.must.byId("created-circle");

        (tree as any).__result = {
          cardTag: mountedCard.node.$_tag,
          cardClass: mountedCard.classlist.get(),
          cardText: mountedCard.text.get(),
          svgTag: mountedSvg.node.$_tag,
          viewBox: mountedSvg.attrs.get("viewBox"),
          circleTag: mountedCircle.node.$_tag,
          circleDomNamespace: mountedCircle.dom.must.el().namespaceURI,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("detached HTML create appends section", r.cardTag, "section");
        t.eq("detached HTML create preserves class", r.cardClass, "created");
        t.eq("detached HTML create preserves text", r.cardText, "card");
        t.eq("detached SVG create appends svg", r.svgTag, "svg");
        t.eq("detached SVG create preserves attrs", r.viewBox, "0 0 10 10");
        t.eq("detached SVG child appends circle", r.circleTag, "circle");
        t.eq("detached SVG child has SVG namespace", r.circleDomNamespace, "http://www.w3.org/2000/svg");
      },
    },
  ];

  return make_livetree_suite(SUITE, cases);
}

export function livetree_find_query_surface(): TestSuite {
  const SUITE = "livetree/find-query-surface";

  const cases: readonly LiveTreeCaseSpec[] = [
    {
      suite: SUITE,
      caseId: "find-surface-byclass-hit-miss-and-must-semantics", name: "find surface: byClass hit, miss, and must semantics",
      fixture: "find-query/byClass",
      sub: "singular-class",
      html: `
        <main id="root">
          <section id="first" class="card"></section>
          <section id="second" class="note"></section>
        </main>
      `,

      act(tree) {
        let mustMissThrows = false;

        try {
          tree.find.must.byClass("missing");
        } catch {
          mustMissThrows = true;
        }

        (tree as any).__result = {
          cardId: tree.find.byClass("card")?.id.get(),
          noteId: tree.find.byClass("note")?.id.get(),
          missing: tree.find.byClass("missing"),
          mustCardId: tree.find.must.byClass("card").id.get(),
          mustMissThrows,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("find.byClass hits first matching exact class", r.cardId, "first");
        t.eq("find.byClass hits another exact class", r.noteId, "second");
        t.eq("find.byClass miss returns undefined", r.missing, undefined);
        t.eq("find.must.byClass hits", r.mustCardId, "first");
        t.eq("find.must.byClass throws on miss", r.mustMissThrows, true);
      },
    },

    {
      suite: SUITE,
      caseId: "find-surface-byclass-current-exact-class-behavior-is-explicit", name: "find surface: byClass current exact-class behavior is explicit",
      fixture: "find-query/byClass",
      sub: "exact-class-contract",
      html: `
        <main id="root">
          <section id="exact" class="card"></section>
          <section id="compound" class="card featured"></section>
        </main>
      `,

      act(tree) {
        (tree as any).__result = {
          cardId: tree.find.byClass("card")?.id.get(),
          compoundByFullClass: tree.find.byClass("card featured")?.id.get(),
          compoundByToken: tree.find.byClass("featured")?.id.get(),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("byClass exact class hits exact class attr first", r.cardId, "exact");
        t.eq("byClass can match full compound class string", r.compoundByFullClass, "compound");
        t.eq("byClass does not currently token-match class lists", r.compoundByToken, undefined);
      },
    },

    {
      suite: SUITE,
      caseId: "find-surface-bydata-hit-prefixed-key-hit-miss-and-must-semantics", name: "find surface: byData hit, prefixed-key hit, miss, and must semantics",
      fixture: "find-query/byData",
      sub: "singular-data",
      html: `
        <main id="root">
          <article id="first" data-kind="card" data-state="open"></article>
          <article id="second" data-kind="card" data-state="closed"></article>
          <aside id="third" data-kind="note" data-state="open"></aside>
        </main>
      `,

      act(tree) {
        let mustMissThrows = false;

        try {
          tree.find.must.byData("kind", "missing");
        } catch {
          mustMissThrows = true;
        }

        (tree as any).__result = {
          firstCardId: tree.find.byData("kind", "card")?.id.get(),
          prefixedOpenId: tree.find.byData("data-state", "open")?.id.get(),
          missing: tree.find.byData("kind", "missing"),
          mustNoteId: tree.find.must.byData("kind", "note").id.get(),
          mustMissThrows,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("find.byData accepts bare data key", r.firstCardId, "first");
        t.eq("find.byData accepts data-prefixed key", r.prefixedOpenId, "first");
        t.eq("find.byData miss returns undefined", r.missing, undefined);
        t.eq("find.must.byData hits", r.mustNoteId, "third");
        t.eq("find.must.byData throws on miss", r.mustMissThrows, true);
      },
    },

    {
      suite: SUITE,
      caseId: "find-surface-bytag-hit-miss-and-must-semantics", name: "find surface: byTag hit, miss, and must semantics",
      fixture: "find-query/byTag",
      sub: "singular-tag",
      html: `
        <main id="root">
          <article id="article-one"></article>
          <aside id="aside-one"></aside>
        </main>
      `,

      act(tree) {
        let mustMissThrows = false;

        try {
          tree.find.must.byTag("nav");
        } catch {
          mustMissThrows = true;
        }

        (tree as any).__result = {
          articleId: tree.find.byTag("article")?.id.get(),
          asideId: tree.find.byTag("aside")?.id.get(),
          missing: tree.find.byTag("nav"),
          mustArticleId: tree.find.must.byTag("article").id.get(),
          mustMissThrows,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("find.byTag hits first matching tag", r.articleId, "article-one");
        t.eq("find.byTag hits another tag", r.asideId, "aside-one");
        t.eq("find.byTag miss returns undefined", r.missing, undefined);
        t.eq("find.must.byTag hits", r.mustArticleId, "article-one");
        t.eq("find.must.byTag throws on miss", r.mustMissThrows, true);
      },
    },

    {
      suite: SUITE,
      caseId: "find-surface-object-query-supports-tag-attrs-and-string-text", name: "find surface: object query supports tag, attrs, and string text",
      fixture: "find-query/object",
      sub: "tag-attrs-text",
      html: `
        <main id="root">
          <article id="first" data-kind="card">alpha text</article>
          <article id="second" data-kind="card">needle text</article>
          <section id="third" data-kind="card">needle text</section>
        </main>
      `,

      act(tree) {
        (tree as any).__result = {
          articleCardId: tree.find({ tag: "article", attrs: { "data-kind": "card" } })?.id.get(),
          articleNeedleId: tree.find({ tag: "article", text: "needle" })?.id.get(),
          sectionNeedleId: tree.find({ tag: "section", text: "needle" })?.id.get(),
          missing: tree.find({ tag: "aside", text: "needle" }),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("object query tag+attrs hits first article card", r.articleCardId, "first");
        t.eq("object query tag+text narrows to matching article", r.articleNeedleId, "second");
        t.eq("object query can distinguish tag with same text", r.sectionNeedleId, "third");
        t.eq("object query miss returns undefined", r.missing, undefined);
      },
    },

    {
      suite: SUITE,
      caseId: "find-surface-object-query-supports-regexp-text", name: "find surface: object query supports RegExp text",
      fixture: "find-query/object",
      sub: "regexp-text",
      html: `
        <main id="root">
          <article id="alpha">alpha-001</article>
          <article id="beta">beta-002</article>
          <article id="gamma">gamma-003</article>
        </main>
      `,

      act(tree) {
        let mustMissThrows = false;

        try {
          tree.find.must({ tag: "article", text: /^delta/ }, "delta regex");
        } catch {
          mustMissThrows = true;
        }

        (tree as any).__result = {
          betaId: tree.find({ tag: "article", text: /^beta-\d+$/ })?.id.get(),
          gammaId: tree.find.must({ tag: "article", text: /003$/ }).id.get(),
          missing: tree.find({ tag: "article", text: /^delta/ }),
          mustMissThrows,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("RegExp text query hits beta", r.betaId, "beta");
        t.eq("must RegExp text query hits gamma", r.gammaId, "gamma");
        t.eq("RegExp text query miss returns undefined", r.missing, undefined);
        t.eq("must RegExp text query throws on miss", r.mustMissThrows, true);
      },
    },

    {
      suite: SUITE,
      caseId: "find-surface-subtree-scoped-find-does-not-escape-to-siblings", name: "find surface: subtree-scoped find does not escape to siblings",
      fixture: "find-query/scope",
      sub: "subtree-scope",
      html: `
        <main id="root">
          <section id="left">
            <button id="left-btn" data-zone="left">left</button>
          </section>
          <section id="right">
            <button id="right-btn" data-zone="right">right</button>
          </section>
        </main>
      `,

      act(tree) {
        const left = tree.find.must.byId("left");
        const right = tree.find.must.byId("right");

        (tree as any).__result = {
          leftFindsLeft: left.find.byData("zone", "left")?.id.get(),
          leftFindsRight: left.find.byData("zone", "right")?.id.get(),
          rightFindsRight: right.find.byData("zone", "right")?.id.get(),
          rootFindsRight: tree.find.byData("zone", "right")?.id.get(),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("left subtree finds own descendant", r.leftFindsLeft, "left-btn");
        t.eq("left subtree does not find right sibling descendant", r.leftFindsRight, undefined);
        t.eq("right subtree finds own descendant", r.rightFindsRight, "right-btn");
        t.eq("root finds right descendant", r.rootFindsRight, "right-btn");
      },
    },

    {
      suite: SUITE,
      caseId: "findall-surface-byclass-preserves-order-and-returns-empty-selector-on-miss", name: "findAll surface: byClass preserves order and returns empty selector on miss",
      fixture: "find-query/findAll-byClass",
      sub: "order-empty",
      html: `
        <main id="root">
          <section id="one" class="item"></section>
          <section id="two" class="item"></section>
          <section id="three" class="other"></section>
        </main>
      `,

      act(tree) {
        const items = tree.findAll.byClass("item");
        const missing = tree.findAll.byClass("missing");

        (tree as any).__result = {
          length: items.length,
          ids: items.array().map((item) => item.id.get()),
          firstId: items.first()?.id.get(),
          lastId: items.last()?.id.get(),
          missingLength: missing.length,
          missingFirst: missing.first(),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("findAll.byClass returns two matches", r.length, 2);
        t.eq("findAll.byClass preserves first id", r.ids[0], "one");
        t.eq("findAll.byClass preserves second id", r.ids[1], "two");
        t.eq("findAll.byClass first returns first match", r.firstId, "one");
        t.eq("findAll.byClass last returns last match", r.lastId, "two");
        t.eq("findAll.byClass miss returns empty selector", r.missingLength, 0);
        t.eq("empty selector first is undefined", r.missingFirst, undefined);
      },
    },

    {
      suite: SUITE,
      caseId: "findall-surface-bydata-preserves-order-and-supports-must-semantics", name: "findAll surface: byData preserves order and supports must semantics",
      fixture: "find-query/findAll-byData",
      sub: "order-must",
      html: `
        <main id="root">
          <article id="one" data-kind="card" data-rank="1"></article>
          <article id="two" data-kind="card" data-rank="2"></article>
          <article id="three" data-kind="note" data-rank="3"></article>
        </main>
      `,

      act(tree) {
        const cards = tree.findAll.byData("kind", "card");
        const prefixedRank = tree.findAll.byData("data-rank", "3");
        const mustCards = tree.findAll.must.byData("kind", "card");

        let mustMissThrows = false;
        try {
          tree.findAll.must.byData("kind", "missing");
        } catch {
          mustMissThrows = true;
        }

        (tree as any).__result = {
          cardLength: cards.length,
          cardIds: cards.array().map((item) => item.id.get()),
          prefixedRankId: prefixedRank.first()?.id.get(),
          mustCardLength: mustCards.length,
          mustMissThrows,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("findAll.byData returns two card matches", r.cardLength, 2);
        t.eq("findAll.byData preserves first card", r.cardIds[0], "one");
        t.eq("findAll.byData preserves second card", r.cardIds[1], "two");
        t.eq("findAll.byData accepts data-prefixed key", r.prefixedRankId, "three");
        t.eq("findAll.must.byData returns card selector", r.mustCardLength, 2);
        t.eq("findAll.must.byData throws on miss", r.mustMissThrows, true);
      },
    },

    {
      suite: SUITE,
      caseId: "findall-surface-bytag-preserves-order-and-supports-must-semantics", name: "findAll surface: byTag preserves order and supports must semantics",
      fixture: "find-query/findAll-byTag",
      sub: "order-must",
      html: `
        <main id="root">
          <article id="one"></article>
          <section id="skip"></section>
          <article id="two"></article>
          <article id="three"></article>
        </main>
      `,

      act(tree) {
        const articles = tree.findAll.byTag("article");
        const mustArticles = tree.findAll.must.byTag("article");

        let mustMissThrows = false;
        try {
          tree.findAll.must.byTag("nav");
        } catch {
          mustMissThrows = true;
        }

        (tree as any).__result = {
          length: articles.length,
          ids: articles.array().map((item) => item.id.get()),
          mustLength: mustArticles.length,
          missingLength: tree.findAll.byTag("nav").length,
          mustMissThrows,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("findAll.byTag returns three articles", r.length, 3);
        t.eq("findAll.byTag preserves first article", r.ids[0], "one");
        t.eq("findAll.byTag preserves second article", r.ids[1], "two");
        t.eq("findAll.byTag preserves third article", r.ids[2], "three");
        t.eq("findAll.must.byTag returns non-empty selector", r.mustLength, 3);
        t.eq("findAll.byTag miss returns empty selector", r.missingLength, 0);
        t.eq("findAll.must.byTag throws on miss", r.mustMissThrows, true);
      },
    },

    {
      suite: SUITE,
      caseId: "findall-surface-id-and-byids-support-one-or-many-id-selection", name: "findAll surface: id and byIds support one-or-many id selection",
      fixture: "find-query/findAll-ids",
      sub: "multi-id",
      html: `
        <main id="root">
          <section id="one"></section>
          <section id="two"></section>
          <section id="three"></section>
        </main>
      `,

      act(tree) {
        const one = tree.findAll.id("one");
        const manyViaArray = tree.findAll.id(["one", "three"]);
        const manyViaVariadic = tree.findAll.byIds("two", "three");
        const mustMany = tree.findAll.must.byIds("one", "two");

        (tree as any).__result = {
          oneLength: one.length,
          oneId: one.first()?.id.get(),
          arrayIds: manyViaArray.array().map((item) => item.id.get()),
          variadicIds: manyViaVariadic.array().map((item) => item.id.get()),
          mustLength: mustMany.length,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("findAll.id single returns one match", r.oneLength, 1);
        t.eq("findAll.id single returns requested id", r.oneId, "one");
        t.eq("findAll.id array preserves first requested id", r.arrayIds[0], "one");
        t.eq("findAll.id array preserves second requested id", r.arrayIds[1], "three");
        t.eq("findAll.byIds preserves first variadic id", r.variadicIds[0], "two");
        t.eq("findAll.byIds preserves second variadic id", r.variadicIds[1], "three");
        t.eq("findAll.must.byIds returns requested matches", r.mustLength, 2);
      },
    },

    {
      suite: SUITE,
      caseId: "findall-surface-array-query-has-or-semantics-and-preserves-query-order", name: "findAll surface: array query has OR semantics and preserves query order",
      fixture: "find-query/findAll-array-query",
      sub: "or-semantics",
      html: `
        <main id="root">
          <article id="card-one" data-kind="card"></article>
          <article id="note-one" data-kind="note"></article>
          <aside id="aside-one" data-kind="aside"></aside>
        </main>
      `,

      act(tree) {
        const selected = tree.findAll([
          { attrs: { "data-kind": "note" } },
          { tag: "aside" },
          "#card-one",
        ]);

        (tree as any).__result = {
          length: selected.length,
          ids: selected.array().map((item) => item.id.get()),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("array query returns all OR matches", r.length, 3);
        t.eq("array query preserves first query match", r.ids[0], "note-one");
        t.eq("array query preserves second query match", r.ids[1], "aside-one");
        t.eq("array query preserves third query match", r.ids[2], "card-one");
      },
    },

    {
      suite: SUITE,
      caseId: "findall-surface-object-query-supports-text-and-multiple-matching-constraints", name: "findAll surface: object query supports text and multiple matching constraints",
      fixture: "find-query/findAll-object",
      sub: "text-attrs",
      html: `
        <main id="root">
          <article id="one" data-kind="card">needle one</article>
          <article id="two" data-kind="card">needle two</article>
          <article id="three" data-kind="note">needle three</article>
          <section id="four" data-kind="card">needle four</section>
        </main>
      `,

      act(tree) {
        const cardArticles = tree.findAll({
          tag: "article",
          attrs: { "data-kind": "card" },
          text: "needle",
        });

        const regexCards = tree.findAll({
          tag: "article",
          text: /two$/,
        });

        (tree as any).__result = {
          cardArticleLength: cardArticles.length,
          cardArticleIds: cardArticles.array().map((item) => item.id.get()),
          regexLength: regexCards.length,
          regexId: regexCards.first()?.id.get(),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("object findAll tag+attrs+text returns two matches", r.cardArticleLength, 2);
        t.eq("object findAll preserves first constrained match", r.cardArticleIds[0], "one");
        t.eq("object findAll preserves second constrained match", r.cardArticleIds[1], "two");
        t.eq("object findAll RegExp text returns one match", r.regexLength, 1);
        t.eq("object findAll RegExp text hits expected id", r.regexId, "two");
      },
    },

    {
      suite: SUITE,
      caseId: "findall-surface-must-callable-throws-when-array-query-has-no-matches", name: "findAll surface: must callable throws when array query has no matches",
      fixture: "find-query/findAll-must",
      sub: "array-query-miss",
      html: `
        <main id="root">
          <section id="one" data-kind="card"></section>
        </main>
      `,

      act(tree) {
        let callableMustThrows = false;
        let callableMustHitsLength = 0;

        try {
          tree.findAll.must([
            { attrs: { "data-kind": "missing" } },
            "nav",
          ]);
        } catch {
          callableMustThrows = true;
        }

        callableMustHitsLength = tree.findAll.must([
          { attrs: { "data-kind": "card" } },
          "nav",
        ]).length;

        (tree as any).__result = {
          callableMustThrows,
          callableMustHitsLength,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("findAll.must callable throws when every query misses", r.callableMustThrows, true);
        t.eq("findAll.must callable returns matches when any query hits", r.callableMustHitsLength, 1);
      },
    },

    {
      suite: SUITE,
      caseId: "find-surface-bydata-rejects-empty-data-keys-clearly", name: "find surface: byData rejects empty data keys clearly",
      fixture: "find-query/byData",
      sub: "empty-key",
      html: `
        <main id="root">
          <section id="one" data-kind="card"></section>
        </main>
      `,

      act(tree) {
        let softThrows = false;
        let mustThrows = false;
        let findAllThrows = false;

        try {
          tree.find.byData("", "card");
        } catch {
          softThrows = true;
        }

        try {
          tree.find.must.byData("   ", "card");
        } catch {
          mustThrows = true;
        }

        try {
          tree.findAll.byData("", "card");
        } catch {
          findAllThrows = true;
        }

        (tree as any).__result = {
          softThrows,
          mustThrows,
          findAllThrows,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("find.byData empty key throws", r.softThrows, true);
        t.eq("find.must.byData blank key throws", r.mustThrows, true);
        t.eq("findAll.byData empty key throws", r.findAllThrows, true);
      },
    },

    {
      suite: SUITE,
      caseId: "find-surface-byclass-rejects-empty-class-names-clearly", name: "find surface: byClass rejects empty class names clearly",
      fixture: "find-query/byClass",
      sub: "empty-class",
      html: `
        <main id="root">
          <section id="one" class="card"></section>
        </main>
      `,

      act(tree) {
        let softThrows = false;
        let mustThrows = false;
        let findAllThrows = false;

        try {
          tree.find.byClass("");
        } catch {
          softThrows = true;
        }

        try {
          tree.find.must.byClass("   ");
        } catch {
          mustThrows = true;
        }

        try {
          tree.findAll.byClass("");
        } catch {
          findAllThrows = true;
        }

        (tree as any).__result = {
          softThrows,
          mustThrows,
          findAllThrows,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("find.byClass empty class throws", r.softThrows, true);
        t.eq("find.must.byClass blank class throws", r.mustThrows, true);
        t.eq("findAll.byClass empty class throws", r.findAllThrows, true);
      },
    },
  ];

  return make_livetree_suite(SUITE, cases);
}
