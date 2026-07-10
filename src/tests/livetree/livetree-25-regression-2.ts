// livetree-25-regression-2.ts

import { hson, type LiveTree } from "hson-live";

import {
  make_livetree_suite,
} from "./make-livetree-suite.js";
import type { LiveTreeCaseSpec } from "../../app/demos/test/livemap-tests.types.js";

type IdentitySnapshot = Readonly<Record<string, string>>;

function makeTestQuid(label: string): string {
  const bytes = new Uint32Array(2);
  globalThis.crypto.getRandomValues(bytes);
  return `${label}-${bytes[0]!.toString(16)}${bytes[1]!.toString(16)}`;
}

function identitySnapshot(tree: LiveTree, ids: readonly string[]): IdentitySnapshot {
  const snapshot: Record<string, string> = {};

  for (const id of ids) {
    snapshot[id] = tree.find.must.byId(id).quid;
  }
  return snapshot;
}

function identitiesDiffer(
  left: IdentitySnapshot,
  right: IdentitySnapshot,
  ids: readonly string[],
): boolean {
  return ids.every((id) => left[id] !== right[id]);
}

function identitiesMatch(
  left: IdentitySnapshot,
  right: IdentitySnapshot,
  ids: readonly string[],
): boolean {
  return ids.every((id) => left[id] === right[id]);
}

export function livetree_regression_2(): ReturnType<typeof make_livetree_suite> {
  const SUITE = "livetree/regression-2";
  const ROUNDTRIP_IDS = ["panel", "heading", "copy", "accent"] as const;

  const cases: readonly LiveTreeCaseSpec[] = [
    {
      suite: SUITE,
      name: "identity: Element rehydration remints every imported node",
      fixture: "identity/element-rehydrate",
      sub: "recursive-remint",
      dom: true,
      html: `
        <main id="root">
          <section id="panel">
            <h2 id="heading">Heading</h2>
            <p id="copy">copy <strong id="accent">accent</strong></p>
          </section>
        </main>
      `,

      act(tree) {
        const source = identitySnapshot(tree, ROUNDTRIP_IDS);
        const hydrated = hson.liveTree.fromTrustedHtml(tree.dom.must.el());
        const next = identitySnapshot(hydrated, ROUNDTRIP_IDS);

        (tree as any).__result = {
          allReminted: identitiesDiffer(source, next, ROUNDTRIP_IDS),
          source,
          next,
        };

        hydrated.removeSelf();
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq("every imported node receives a fresh quid", r.allReminted, true);
      },
    },

    {
      suite: SUITE,
      name: "identity: Element rehydration leaves source DOM and source quids untouched",
      fixture: "identity/element-rehydrate",
      sub: "source-untouched",
      dom: true,
      html: `
        <main id="root">
          <section id="panel">
            <h2 id="heading">Heading</h2>
            <p id="copy">copy <strong id="accent">accent</strong></p>
          </section>
        </main>
      `,

      act(tree) {
        const sourceElement = tree.dom.must.el();
        const htmlBefore = sourceElement.innerHTML;
        const identityBefore = identitySnapshot(tree, ROUNDTRIP_IDS);

        const hydrated = hson.liveTree.fromTrustedHtml(sourceElement);

        const htmlAfter = sourceElement.innerHTML;
        const identityAfter = identitySnapshot(tree, ROUNDTRIP_IDS);

        (tree as any).__result = {
          htmlUnchanged: htmlAfter === htmlBefore,
          identityUnchanged: identitiesMatch(
            identityBefore,
            identityAfter,
            ROUNDTRIP_IDS,
          ),
        };

        hydrated.removeSelf();
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq("source DOM markup is unchanged", r.htmlUnchanged, true);
        t.eq("source branch retains its original quids", r.identityUnchanged, true);
      },
    },

    {
      suite: SUITE,
      name: "identity: repeated Element rehydration produces independent branches",
      fixture: "identity/element-rehydrate",
      sub: "repeated-independent",
      dom: true,
      html: `
        <main id="root">
          <section id="panel">
            <h2 id="heading">Heading</h2>
            <p id="copy">copy <strong id="accent">accent</strong></p>
          </section>
        </main>
      `,

      act(tree) {
        const sourceElement = tree.dom.must.el();
        const first = hson.liveTree.fromTrustedHtml(sourceElement);
        const second = hson.liveTree.fromTrustedHtml(sourceElement);
        const firstIds = identitySnapshot(first, ROUNDTRIP_IDS);
        const secondIds = identitySnapshot(second, ROUNDTRIP_IDS);

        (tree as any).__result = {
          independent: identitiesDiffer(firstIds, secondIds, ROUNDTRIP_IDS),
        };

        first.removeSelf();
        second.removeSelf();
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq("separate rehydrations never share quids", r.independent, true);
      },
    },

    {
      suite: SUITE,
      name: "identity: explicit HTML strings preserve unique persisted quids",
      fixture: "identity/string-import",
      sub: "preserve-persisted",
      dom: true,
      html: `<main id="root"></main>`,

      act(tree) {
        const sectionQuid = makeTestQuid("section");
        const childQuid = makeTestQuid("child");
        const imported = hson.liveTree.fromTrustedHtml(`
          <section id="persisted" data-_quid="${sectionQuid}">
            <span id="persisted-child" data-_quid="${childQuid}">child</span>
          </section>
        `);

        (tree as any).__result = {
          sectionQuid,
          childQuid,
          importedSectionQuid: imported.find.must.byId("persisted").quid,
          importedChildQuid: imported.find.must.byId("persisted-child").quid,
        };

        imported.removeSelf();
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq(
          "string import preserves parent persisted quid",
          r.importedSectionQuid,
          r.sectionQuid,
        );
        t.eq(
          "string import preserves child persisted quid",
          r.importedChildQuid,
          r.childQuid,
        );
      },
    },

    {
      suite: SUITE,
      name: "identity: duplicate persisted quid within one string is rejected",
      fixture: "identity/string-import",
      sub: "reject-intra-branch-duplicate",
      dom: true,
      html: `<main id="root"></main>`,

      act(tree) {
        const duplicateQuid = makeTestQuid("duplicate");
        let message = "";
        let imported: LiveTree | undefined;

        try {
          imported = hson.liveTree.fromTrustedHtml(`
      <main id="duplicate-root">
        <section id="first" data-_quid="${duplicateQuid}"></section>
        <section id="second" data-_quid="${duplicateQuid}"></section>
      </main>
    `);

          // Identity resolution is lazy for imported descendants, so force both
          // persisted identities to be claimed before asserting the collision.
          void imported.find.must.byId("first").quid;
          void imported.find.must.byId("second").quid;
        } catch (error) {
          message = error instanceof Error ? error.message : String(error);
        } finally {
          imported?.removeSelf();
        }

        (tree as any).__result = {
          rejected: message.includes("Duplicate QUID"),
          includesQuid: message.includes(duplicateQuid),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq("duplicate identity is rejected", r.rejected, true);
        t.eq("duplicate error identifies the offending quid", r.includesQuid, true);
      },
    },

    {
      suite: SUITE,
      name: "identity: duplicate persisted quid across live branches is rejected",
      fixture: "identity/string-import",
      sub: "reject-inter-branch-duplicate",
      dom: true,
      html: `<main id="root"></main>`,

      act(tree) {
        const duplicateQuid = makeTestQuid("cross-branch");
        const first = hson.liveTree.fromTrustedHtml(
          `<section id="owner" data-_quid="${duplicateQuid}"></section>`,
        );
        let message = "";

        try {
          const second = hson.liveTree.fromTrustedHtml(
            `<section id="contender" data-_quid="${duplicateQuid}"></section>`,
          );
          second.removeSelf();
        } catch (error) {
          message = error instanceof Error ? error.message : String(error);
        }

        (tree as any).__result = {
          rejected: message.includes("Duplicate QUID"),
          ownerStillHasQuid: first.find.must.byId("owner").quid === duplicateQuid,
        };

        first.removeSelf();
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq("second live owner is rejected", r.rejected, true);
        t.eq("failed import does not steal original identity", r.ownerStillHasQuid, true);
      },
    },

    {
      suite: SUITE,
      name: "identity: subtree Element rehydration preserves shape and remints descendants",
      fixture: "identity/subtree-rehydrate",
      sub: "subtree-boundary",
      dom: true,
      html: `
        <main id="root">
          <section id="outside">outside</section>
          <article id="target">
            <h3 id="target-heading">Title</h3>
            <p id="target-copy">Body</p>
          </article>
        </main>
      `,

      act(tree) {
        const target = tree.find.must.byId("target");
        const ids = ["target", "target-heading", "target-copy"] as const;
        const source = identitySnapshot(tree, ids);

        // CHANGED: Element input imports the element's children. Wrap a cloned
        // subtree so the article itself is the single imported branch root.
        const wrapper = document.createElement("div");
        wrapper.append(target.dom.must.el().cloneNode(true));

        const hydrated = hson.liveTree.fromTrustedHtml(wrapper);
        const next = identitySnapshot(hydrated, ids);

        (tree as any).__result = {
          shapePreserved:
            hydrated.find.must.byId("target-heading").text.get() === "Title"
            && hydrated.find.must.byId("target-copy").text.get() === "Body",
          identitiesReminted: identitiesDiffer(source, next, ids),
          outsideAbsent: hydrated.find.byId("outside") === undefined,
        };

        hydrated.removeSelf();
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq("subtree content survives rehydration", r.shapePreserved, true);
        t.eq("subtree descendants receive new quids", r.identitiesReminted, true);
        t.eq("unrelated siblings are not imported", r.outsideAbsent, true);
      },
    },

    {
      suite: SUITE,
      name: "identity: removed DOM sibling is not resurrected during rehydration",
      fixture: "identity/element-rehydrate",
      sub: "no-resurrection",
      dom: true,
      html: `
        <main id="root">
          <section id="survivor">survivor</section>
          <section id="removed">removed</section>
        </main>
      `,

      act(tree) {
        tree.find.must.byId("removed").removeSelf();
        const hydrated = hson.liveTree.fromTrustedHtml(tree.dom.must.el());

        (tree as any).__result = {
          survivorExists: hydrated.find.byId("survivor") !== undefined,
          removedAbsent: hydrated.find.byId("removed") === undefined,
        };

        hydrated.removeSelf();
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq("surviving sibling remains", r.survivorExists, true);
        t.eq("removed sibling stays removed", r.removedAbsent, true);
      },
    },


    {
      suite: SUITE,
      name: "identity: Element rehydration strips only runtime quid metadata",
      fixture: "identity/element-rehydrate",
      sub: "preserve-non-quid-attrs",
      dom: true,
      html: `
        <main id="root">
          <section
            id="panel"
            class="panel featured"
            data-role="demo"
            aria-label="Demo panel"
          >
            <span id="accent" data-kind="accent">accent</span>
          </section>
        </main>
      `,

      act(tree) {
        const sourcePanel = tree.find.must.byId("panel");
        const sourceQuid = sourcePanel.quid;
        const hydrated = hson.liveTree.fromTrustedHtml(tree.dom.must.el());
        const panel = hydrated.find.must.byId("panel");
        const accent = hydrated.find.must.byId("accent");

        (tree as any).__result = {
          quidReminted: panel.quid !== sourceQuid,
          classPreserved: panel.attr.get("class") === "panel featured",
          rolePreserved: panel.attr.get("data-role") === "demo",
          ariaPreserved: panel.attr.get("aria-label") === "Demo panel",
          childDataPreserved: accent.attr.get("data-kind") === "accent",
        };

        hydrated.removeSelf();
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq("runtime quid is reminted", r.quidReminted, true);
        t.eq("class attribute is preserved", r.classPreserved, true);
        t.eq("non-quid data attribute is preserved", r.rolePreserved, true);
        t.eq("aria attribute is preserved", r.ariaPreserved, true);
        t.eq("descendant data attribute is preserved", r.childDataPreserved, true);
      },
    },

    {
      suite: SUITE,
      name: "identity: removeSelf detaches branch without releasing persisted quids",
      fixture: "identity/string-import",
      sub: "retain-on-remove",
      dom: true,
      html: `<main id="root"></main>`,

      act(tree) {
        const rootQuid = makeTestQuid("retain-root");
        const childQuid = makeTestQuid("retain-child");
        const markup = `
          <section id="owner" data-_quid="${rootQuid}">
            <span id="owner-child" data-_quid="${childQuid}">child</span>
          </section>
        `;

        const first = hson.liveTree.fromTrustedHtml(markup);
        const firstRootMatches = first.find.must.byId("owner").quid === rootQuid;
        const firstChildMatches = first.find.must.byId("owner-child").quid === childQuid;
        first.removeSelf();

        let duplicateMessage = "";
        try {
          const second = hson.liveTree.fromTrustedHtml(markup);
          second.removeSelf();
        } catch (error) {
          duplicateMessage = error instanceof Error ? error.message : String(error);
        }

        const stillOwnsRoot = first.find.must.byId("owner").quid === rootQuid;
        const stillOwnsChild = first.find.must.byId("owner-child").quid === childQuid;

        (tree as any).__result = {
          firstRootMatches,
          firstChildMatches,
          stillOwnsRoot,
          stillOwnsChild,
          duplicateRejected: duplicateMessage.includes("Duplicate QUID"),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq("first branch adopts persisted root quid", r.firstRootMatches, true);
        t.eq("first branch adopts persisted child quid", r.firstChildMatches, true);
        t.eq("removed branch retains root quid ownership", r.stillOwnsRoot, true);
        t.eq("removed branch retains child quid ownership", r.stillOwnsChild, true);
        t.eq("same persisted quids cannot be reused while branch still exists", r.duplicateRejected, true);
      },
    },

    {
      suite: SUITE,
      name: "identity: root and descendant cannot share one persisted quid",
      fixture: "identity/string-import",
      sub: "reject-root-descendant-duplicate",
      dom: true,
      html: `<main id="root"></main>`,

      act(tree) {
        const duplicateQuid = makeTestQuid("root-child-duplicate");
        let message = "";
        let imported: LiveTree | undefined;

        try {
          imported = hson.liveTree.fromTrustedHtml(`
            <section id="duplicate-owner" data-_quid="${duplicateQuid}">
              <span id="duplicate-child" data-_quid="${duplicateQuid}">child</span>
            </section>
          `);

          void imported.find.must.byId("duplicate-child").quid;
        } catch (error) {
          message = error instanceof Error ? error.message : String(error);
        } finally {
          imported?.removeSelf();
        }

        (tree as any).__result = {
          rejected: message.includes("Duplicate QUID"),
          includesQuid: message.includes(duplicateQuid),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq("root/descendant duplicate is rejected", r.rejected, true);
        t.eq("root/descendant error identifies the quid", r.includesQuid, true);
      },
    }
  ];
  return make_livetree_suite(SUITE, cases);
}