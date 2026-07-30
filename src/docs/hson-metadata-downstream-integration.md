# HSON metadata downstream integration

LiveDemo uses one spelling at each representation boundary:

- canonical graph metadata: `$_meta.quid` and `$_meta.index`;
- HTML, SVG, and DOM metadata: `hson:quid` and `hson:index`;
- HSON identity syntax: `@<quid>`;
- application attributes: every `data-*` name, including `data-_quid` and
  `data-_index`.

Canonical QUID stylesheet selectors are emitted as
`[hson\:quid="…"]`. Chromium parses, matches, and applies those selectors.
jsdom parses the rule into CSSOM and supports DOM selector matching, but does
not apply escaped-colon attribute selectors through `getComputedStyle`.

The following synthetic-DOM cases therefore retain their distinct LiveTree
state, batching, isolation, and cleanup contracts without treating jsdom as a
browser rendering engine. Actual HTML and SVG style application, replacement,
isolation, and cleanup are consolidated in
`tests/browser/quid-selector.spec.ts`.

| Synthetic-DOM case | Former rendering assertion | Synthetic replacement |
| --- | --- | --- |
| `livetree/coverage-css-and-content::CssManager: computed style reflects QUID CSS after flush` | HTML computed opacity, position, and background | exact QUID selector plus managed declarations |
| `livetree/scheduling-and-events::CssManager batching: multiple writes collapse to final state` | final computed opacity | final managed declaration |
| `livetree/scheduling-and-events::CssManager batching: successive writes merge properties` | three computed properties | three merged managed declarations |
| `livetree/scheduling-and-events::CssManager batching: multiple nodes flush together` | two computed opacities | two independently managed declarations |
| `livetree/scheduling-and-events::CssManager scheduling: flush boundary applies styles` | computed opacity after flush | CSSOM rule insertion, exact selector, and declaration |
| `livetree/scheduling-and-events::CssManager scheduling: interleaved writes resolve to final state` | final computed opacity | final managed declaration after the interleaving |
| `livetree/css-manager-lifecycle::CssManager lifecycle: updating a prop overwrites prior value` | updated computed opacity | managed value plus exact old/new CSS text |
| `livetree/css-manager-lifecycle::CssManager lifecycle: clearing one node does not affect sibling rule` | cleared and surviving computed opacity | removed owner registration and preserved sibling rule |
| `livetree/css-manager-lifecycle::CssManager lifecycle: remove(prop) preserves sibling declarations` | reset/retained computed properties | removed/retained managed properties plus CSSOM contents |
| `livetree/node-lifecycle::node lifecycle: removing one styled node preserves sibling CSS` | sibling computed opacity | removed owner rule plus preserved sibling registration and rule |
| `livetree/root-multi-isolation::multi-root: CSS applied in one tree does not affect another tree` | target and sibling computed opacity | target-only registration and exact target-only rule |
| `livetree/root-multi-isolation::multi-root: removing one root does not clear CSS of another root` | surviving computed opacity | surviving registration and stylesheet rule |
| `livetree/document-question::multi-instance: CSS in one instance does not affect sibling instance` | target and sibling computed opacity/position | target-only managed declarations |
| `livetree/document-question::multi-instance: removing one instance does not clear sibling instance CSS` | surviving computed opacity | surviving registration and stylesheet rule |
| `livetree/document-question::multi-instance: shared document and shared stylesheet still preserve instance isolation` | target and sibling computed opacity | exact target selector, target registration, and absent sibling registration |

Three additional failures in `livetree/css-refinements` were not jsdom
rendering failures. Their test-only keyframe owner strings were not valid
persisted QUIDs. Those owners now use deterministic valid QUIDs; the original
keyframe ownership assertions remain unchanged.
