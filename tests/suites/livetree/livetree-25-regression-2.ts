// livetree-25-regression-2.ts

import {  hsonLiveTree, type LiveTree } from "hson-live/livetree";

import {
  make_livetree_suite,
} from "./make-livetree-suite.js";
import type { LiveTreeCaseSpec } from "../livemap/livemap-tests.types.js";
import type { TestSuite } from "../../harness/core/test-contracts.js";

type IdentitySnapshot = Readonly<Record<string, string>>;

function freshPersistedQuidFixture(): string {
  return crypto.randomUUID().replaceAll("-", "").slice(0, 9);
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

export function livetree_regression_2(): TestSuite {
  const SUITE = "livetree/regression-2";
  const ROUNDTRIP_IDS = ["panel", "heading", "copy", "accent"] as const;

  const cases: readonly LiveTreeCaseSpec[] = [
    {
      suite: SUITE,
      caseId: "identity-explicit-clone-remints-every-eligible-node", name: "identity: explicit clone remints every eligible node",
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
        const clone = tree.cloneBranch();
        const next = identitySnapshot(clone, ROUNDTRIP_IDS);

        (tree as any).__result = {
          allReminted: identitiesDiffer(source, next, ROUNDTRIP_IDS),
          source,
          next,
        };

        clone.remove();
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq("every imported node receives a fresh quid", r.allReminted, true);
      },
    },

    {
      suite: SUITE,
      caseId: "identity-active-element-ownership-conflict-leaves-source-untouched", name: "identity: active Element ownership conflict leaves source untouched",
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
        let rejected = false;
        let hydrated: LiveTree | undefined;
        try {
          hydrated = hsonLiveTree.fromTrustedHtml(sourceElement);
        } catch (error) {
          rejected = error instanceof Error && error.message.includes("Duplicate QUID");
        }

        const htmlAfter = sourceElement.innerHTML;
        const identityAfter = identitySnapshot(tree, ROUNDTRIP_IDS);

        (tree as any).__result = {
          rejected,
          noPartialBranch: hydrated === undefined,
          htmlUnchanged: htmlAfter === htmlBefore,
          identityUnchanged: identitiesMatch(
            identityBefore,
            identityAfter,
            ROUNDTRIP_IDS,
          ),
        };

        hydrated?.remove();
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq("second active owner is rejected explicitly", r.rejected, true);
        t.eq("failed admission returns no partial branch", r.noPartialBranch, true);
        t.eq("source DOM markup is unchanged", r.htmlUnchanged, true);
        t.eq("source branch retains its original quids", r.identityUnchanged, true);
      },
    },

    {
      suite: SUITE,
      caseId: "identity-repeated-explicit-clones-produce-independent-branches", name: "identity: repeated explicit clones produce independent branches",
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
        const first = tree.cloneBranch();
        const second = tree.cloneBranch();
        const firstIds = identitySnapshot(first, ROUNDTRIP_IDS);
        const secondIds = identitySnapshot(second, ROUNDTRIP_IDS);

        (tree as any).__result = {
          independent: identitiesDiffer(firstIds, secondIds, ROUNDTRIP_IDS),
        };

        first.remove();
        second.remove();
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq("separate rehydrations never share quids", r.independent, true);
      },
    },

    {
      suite: SUITE,
      caseId: "identity-explicit-html-strings-preserve-unique-persisted-quids", name: "identity: explicit HTML strings preserve unique persisted quids",
      fixture: "identity/string-import",
      sub: "preserve-persisted",
      dom: true,
      html: `<main id="root"></main>`,

      act(tree) {
        const sectionQuid = freshPersistedQuidFixture();
        const childQuid = freshPersistedQuidFixture();
        const imported = hsonLiveTree.fromTrustedHtml(`
          <section id="persisted" hson:quid="${sectionQuid}">
            <span id="persisted-child" hson:quid="${childQuid}">child</span>
          </section>
        `);

        (tree as any).__result = {
          sectionQuid,
          childQuid,
          importedSectionQuid: imported.find.must.byId("persisted").quid,
          importedChildQuid: imported.find.must.byId("persisted-child").quid,
        };

        imported.remove();
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
      caseId: "identity-duplicate-persisted-quid-within-one-string-is-rejected", name: "identity: duplicate persisted quid within one string is rejected",
      fixture: "identity/string-import",
      sub: "reject-intra-branch-duplicate",
      dom: true,
      html: `<main id="root"></main>`,

      act(tree) {
        const duplicateQuid = "000000021";
        let message = "";
        let imported: LiveTree | undefined;

        try {
          imported = hsonLiveTree.fromTrustedHtml(`
      <main id="duplicate-root">
        <section id="first" hson:quid="${duplicateQuid}"></section>
        <section id="second" hson:quid="${duplicateQuid}"></section>
      </main>
    `);

          // Identity resolution is lazy for imported descendants, so force both
          // persisted identities to be claimed before asserting the collision.
          void imported.find.must.byId("first").quid;
          void imported.find.must.byId("second").quid;
        } catch (error) {
          message = error instanceof Error ? error.message : String(error);
        } finally {
          imported?.remove();
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
      caseId: "identity-duplicate-persisted-quid-across-live-branches-is-rejected", name: "identity: duplicate persisted quid across live branches is rejected",
      fixture: "identity/string-import",
      sub: "reject-inter-branch-duplicate",
      dom: true,
      html: `<main id="root"></main>`,

      act(tree) {
        const duplicateQuid = freshPersistedQuidFixture();
        const first = hsonLiveTree.fromTrustedHtml(
          `<section id="owner" hson:quid="${duplicateQuid}"></section>`,
        );
        let message = "";

        try {
          const second = hsonLiveTree.fromTrustedHtml(
            `<section id="contender" hson:quid="${duplicateQuid}"></section>`,
          );
          second.remove();
        } catch (error) {
          message = error instanceof Error ? error.message : String(error);
        }

        (tree as any).__result = {
          rejected: message.includes("Duplicate QUID"),
          ownerStillHasQuid: first.find.must.byId("owner").quid === duplicateQuid,
        };

        first.remove();
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq("second live owner is rejected", r.rejected, true);
        t.eq("failed import does not steal original identity", r.ownerStillHasQuid, true);
      },
    },

    {
      suite: SUITE,
      caseId: "identity-explicit-subtree-clone-preserves-shape-and-remints-descendants", name: "identity: explicit subtree clone preserves shape and remints descendants",
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

        const clone = target.cloneBranch();
        const next = identitySnapshot(clone, ids);

        (tree as any).__result = {
          shapePreserved:
            clone.find.must.byId("target-heading").text.get() === "Title"
            && clone.find.must.byId("target-copy").text.get() === "Body",
          identitiesReminted: identitiesDiffer(source, next, ids),
          outsideAbsent: clone.find.byId("outside") === undefined,
        };

        clone.remove();
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
      caseId: "identity-explicit-clone-does-not-resurrect-a-removed-sibling", name: "identity: explicit clone does not resurrect a removed sibling",
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
        tree.find.must.byId("removed").remove();
        const clone = tree.cloneBranch();

        (tree as any).__result = {
          survivorExists: clone.find.byId("survivor") !== undefined,
          removedAbsent: clone.find.byId("removed") === undefined,
        };

        clone.remove();
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq("surviving sibling remains", r.survivorExists, true);
        t.eq("removed sibling stays removed", r.removedAbsent, true);
      },
    },


    {
      suite: SUITE,
      caseId: "identity-explicit-clone-remints-identity-and-preserves-ordinary-metadata", name: "identity: explicit clone remints identity and preserves ordinary metadata",
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
        const clone = tree.cloneBranch();
        const panel = clone.find.must.byId("panel");
        const accent = clone.find.must.byId("accent");

        (tree as any).__result = {
          quidReminted: panel.quid !== sourceQuid,
          classPreserved: panel.attrs.get("class") === "panel featured",
          rolePreserved: panel.attrs.get("data-role") === "demo",
          ariaPreserved: panel.attrs.get("aria-label") === "Demo panel",
          childDataPreserved: accent.attrs.get("data-kind") === "accent",
        };

        clone.remove();
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
      caseId: "identity-detach-preserves-persisted-quid-ownership", name: "identity: detach preserves persisted quid ownership",
      fixture: "identity/string-import",
      sub: "retain-on-remove",
      dom: true,
      html: `<main id="root"></main>`,

      act(tree) {
        const rootQuid = freshPersistedQuidFixture();
        const childQuid = freshPersistedQuidFixture();
        const markup = `
          <section id="owner" hson:quid="${rootQuid}">
            <span id="owner-child" hson:quid="${childQuid}">child</span>
          </section>
        `;

        const first = hsonLiveTree.fromTrustedHtml(markup);
        const firstRootMatches = first.find.must.byId("owner").quid === rootQuid;
        const firstChildMatches = first.find.must.byId("owner-child").quid === childQuid;
        tree.find.must.byId("root").append(first);
        first.detach();

        let duplicateMessage = "";
        try {
          const second = hsonLiveTree.fromTrustedHtml(markup);
          second.remove();
        } catch (error) {
          duplicateMessage = error instanceof Error ? error.message : String(error);
        }

        const stillOwnsRoot = first.find.must.byId("owner").quid === rootQuid;
        const stillOwnsChild = first.find.must.byId("owner-child").quid === childQuid;
        first.remove();

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
        t.eq("detached branch retains root quid ownership", r.stillOwnsRoot, true);
        t.eq("detached branch retains child quid ownership", r.stillOwnsChild, true);
        t.eq("same persisted quids cannot be reused while branch still exists", r.duplicateRejected, true);
      },
    },

    {
      suite: SUITE,
      caseId: "identity-root-and-descendant-cannot-share-one-persisted-quid", name: "identity: root and descendant cannot share one persisted quid",
      fixture: "identity/string-import",
      sub: "reject-root-descendant-duplicate",
      dom: true,
      html: `<main id="root"></main>`,

      act(tree) {
        const duplicateQuid = "000000001";
        let message = "";
        let imported: LiveTree | undefined;

        try {
          imported = hsonLiveTree.fromTrustedHtml(`
            <section id="duplicate-owner" hson:quid="${duplicateQuid}">
              <span id="duplicate-child" hson:quid="${duplicateQuid}">child</span>
            </section>
          `);

          void imported.find.must.byId("duplicate-child").quid;
        } catch (error) {
          message = error instanceof Error ? error.message : String(error);
        } finally {
          imported?.remove();
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

export function livetree_quid_level_2(): TestSuite {
  const SUITE = "livetree/quid-level-2";

  const cases: readonly LiveTreeCaseSpec[] = [
    {
      suite: SUITE,
      caseId: "serialization-dom-outerhtml-includes-resolved-root-quid-by-default", name: "serialization: DOM outerHTML includes resolved root quid by default",
      fixture: "identity/serialization",
      sub: "root-quid-default",
      dom: true,
      html: `
        <main id="root">
          <section id="panel">panel</section>
        </main>
      `,

      act(tree) {
        const rootQuid = tree.quid;
        const html = tree.dom.must.el().outerHTML;

        (tree as any).__result = {
          includesDataQuid: html.includes("hson:quid"),
          includesRootQuid: html.includes(rootQuid),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq("outerHTML includes hson:quid by default", r.includesDataQuid, true);
        t.eq("outerHTML includes the resolved root quid", r.includesRootQuid, true);
      },
    },

    {
      suite: SUITE,
      caseId: "serialization-dom-outerhtml-includes-resolved-descendant-quids-by-default", name: "serialization: DOM outerHTML includes resolved descendant quids by default",
      fixture: "identity/serialization",
      sub: "descendant-quid-default",
      dom: true,
      html: `
        <main id="root">
          <section id="panel">
            <span id="accent">accent</span>
          </section>
        </main>
      `,

      act(tree) {
        const panel = tree.find.must.byId("panel");
        const accent = tree.find.must.byId("accent");
        const html = tree.dom.must.el().outerHTML;

        (tree as any).__result = {
          includesPanelQuid: html.includes(panel.quid),
          includesAccentQuid: html.includes(accent.quid),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq("outerHTML includes resolved descendant quid", r.includesPanelQuid, true);
        t.eq("outerHTML includes resolved nested descendant quid", r.includesAccentQuid, true);
      },
    },

    {
      suite: SUITE,
      caseId: "serialization-dom-outerhtml-preserves-ordinary-data-attrs-alongside-quids", name: "serialization: DOM outerHTML preserves ordinary data attrs alongside quids",
      fixture: "identity/serialization",
      sub: "preserve-data-attrs",
      dom: true,
      html: `
        <main id="root">
          <section id="panel" data-role="demo" data-kind="panel">panel</section>
        </main>
      `,

      act(tree) {
        const panel = tree.find.must.byId("panel");
        const html = tree.dom.must.el().outerHTML;

        (tree as any).__result = {
          includesQuid: html.includes(panel.quid),
          preservesRole: html.includes('data-role="demo"'),
          preservesKind: html.includes('data-kind="panel"'),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq("outerHTML includes quid identity", r.includesQuid, true);
        t.eq("outerHTML preserves data-role", r.preservesRole, true);
        t.eq("outerHTML preserves data-kind", r.preservesKind, true);
      },
    },

    {
      suite: SUITE,
      caseId: "serialization-reading-dom-outerhtml-does-not-remint-source-quids", name: "serialization: reading DOM outerHTML does not remint source quids",
      fixture: "identity/serialization",
      sub: "read-only-serialization",
      dom: true,
      html: `
        <main id="root">
          <section id="panel">
            <span id="accent">accent</span>
          </section>
        </main>
      `,

      act(tree) {
        const ids = ["root", "panel", "accent"] as const;
        const before = identitySnapshot(tree, ids);
        const firstHtml = tree.dom.must.el().outerHTML;
        const secondHtml = tree.dom.must.el().outerHTML;
        const after = identitySnapshot(tree, ids);

        (tree as any).__result = {
          htmlStable: firstHtml === secondHtml,
          identitiesStable: identitiesMatch(before, after, ids),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq("repeated outerHTML reads are stable", r.htmlStable, true);
        t.eq("outerHTML reads do not remint source identities", r.identitiesStable, true);
      },
    },

    {
      suite: SUITE,
      caseId: "serialization-mounted-subtree-serializes-materialized-child-quids", name: "serialization: mounted subtree serializes materialized child quids",
      fixture: "identity/serialization",
      sub: "mounted-subtree-materializes-children",
      dom: true,
      html: `
        <main id="root">
          <section id="panel">panel</section>
          <aside id="sibling">sibling</aside>
        </main>
      `,

      act(tree) {
        const rootQuid = tree.quid;
        const panel = tree.find.must.byId("panel");
        const sibling = tree.find.must.byId("sibling");
        const html = tree.dom.must.el().outerHTML;

        (tree as any).__result = {
          includesRootQuid: html.includes(rootQuid),
          includesPanelQuid: html.includes(panel.quid),
          includesSiblingQuid: html.includes(sibling.quid),
          quidCount: html.match(/hson:quid=/g)?.length ?? 0,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq("outerHTML includes resolved root quid", r.includesRootQuid, true);
        t.eq("outerHTML includes materialized child quid", r.includesPanelQuid, true);
        t.eq("outerHTML includes materialized sibling quid", r.includesSiblingQuid, true);
        t.eq("mounted subtree serializes root and child quids", r.quidCount, 3);
      },
    },

    {
      suite: SUITE,
      caseId: "serialization-mounted-siblings-serialize-with-quids-alongside-resolved-descendant", name: "serialization: mounted siblings serialize with quids alongside resolved descendant",
      fixture: "identity/serialization",
      sub: "mounted-siblings-serialize-with-quids",
      dom: true,
      html: `
        <main id="root">
          <section id="panel">panel</section>
          <aside id="sibling">sibling</aside>
        </main>
      `,

      act(tree) {
        const rootQuid = tree.quid;
        const panel = tree.find.must.byId("panel");
        const panelQuid = panel.quid;
        const sibling = tree.find.must.byId("sibling");
        const siblingQuid = sibling.quid;
        const html = tree.dom.must.el().outerHTML;

        (tree as any).__result = {
          includesRootQuid: html.includes(rootQuid),
          includesPanelQuid: html.includes(panelQuid),
          includesSiblingQuid: html.includes(siblingQuid),
          siblingHasQuid: /<aside\b[^>]*\bhson:quid=/.test(html),
          quidCount: html.match(/hson:quid=/g)?.length ?? 0,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq("outerHTML includes resolved root quid", r.includesRootQuid, true);
        t.eq("outerHTML includes resolved descendant quid", r.includesPanelQuid, true);
        t.eq("outerHTML includes materialized sibling quid", r.includesSiblingQuid, true);
        t.eq("outerHTML marks mounted sibling with hson:quid", r.siblingHasQuid, true);
        t.eq("mounted root, descendant, and sibling quids serialize", r.quidCount, 3);
      },
    },

    {
      suite: SUITE,
      caseId: "serialization-reading-outerhtml-is-stable-for-materialized-subtree-quids", name: "serialization: reading outerHTML is stable for materialized subtree quids",
      fixture: "identity/serialization",
      sub: "outerhtml-stable-materialized-subtree",
      dom: true,
      html: `
        <main id="root">
          <section id="panel">
            <span id="accent">accent</span>
          </section>
          <aside id="sibling">sibling</aside>
        </main>
      `,

      act(tree) {
        const rootQuid = tree.quid;
        const panel = tree.find.must.byId("panel");
        const accent = tree.find.must.byId("accent");
        const sibling = tree.find.must.byId("sibling");
        const firstHtml = tree.dom.must.el().outerHTML;
        const secondHtml = tree.dom.must.el().outerHTML;

        (tree as any).__result = {
          htmlStable: firstHtml === secondHtml,
          includesRootQuid: secondHtml.includes(rootQuid),
          includesPanelQuid: secondHtml.includes(panel.quid),
          includesAccentQuid: secondHtml.includes(accent.quid),
          includesSiblingQuid: secondHtml.includes(sibling.quid),
          quidCount: secondHtml.match(/hson:quid=/g)?.length ?? 0,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;
        t.eq("repeated outerHTML reads are stable", r.htmlStable, true);
        t.eq("outerHTML includes the resolved root quid", r.includesRootQuid, true);
        t.eq("outerHTML includes materialized child quid", r.includesPanelQuid, true);
        t.eq("outerHTML includes materialized nested child quid", r.includesAccentQuid, true);
        t.eq("outerHTML includes materialized sibling quid", r.includesSiblingQuid, true);
        t.eq("outerHTML includes all materialized subtree quids", r.quidCount, 4);
      },
    },
  ];

  return make_livetree_suite(SUITE, cases);
}
