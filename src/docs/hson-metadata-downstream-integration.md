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

## CSS assertion ownership

The CSS-focused LiveTree, Reflect, and browser surfaces use the following
division. The inventory covers `getComputedStyle`, stylesheet `cssRules` and
`selectorText`, DOM selector helpers, pseudo selectors, scheduling, cleanup,
and keyframe/animation assertions.

| Assertion class | Synthetic-DOM ownership | Browser ownership |
| --- | --- | --- |
| managed state | declaration maps, selector handles, ownership, isolation, replacement, cleanup, pending writes | none |
| CSSOM/source | exact escaped QUID selectors, exact declarations, insertion/removal, one-owner rules, pseudo-rule source | none |
| selector engine | ordinary class/attribute/compound `matches()` and structural `querySelector()` cases that jsdom supports | escaped-QUID selector matching as applied to HTML and SVG |
| rendered/computed style | none | preflush/postflush opacity, replacement, cleanup, sibling/root isolation, and `::before` generated content |
| animation engine | keyframe source, ownership, replacement, and lifecycle only | no animation execution claim in the current baseline |

`tests/integration/browser/quid-selector.spec.ts` owns actual HTML and SVG application,
preflush and postflush visible effect, replacement, cleanup, cross-root
isolation, stable QUID targeting, and the rendered `::before` content cases.
It synchronizes through the fixture’s explicit install/flush state rather than
sleeping.

The synthetic cases below were corrected because their former assertions used
jsdom defaults or their names claimed more than their assertions proved.

| Case | Former assertion/claim | Synthetic replacement | Browser owner |
| --- | --- | --- | --- |
| `livetree/coverage-css-and-content::CssManager: CSSOM and managed state contain QUID rule after flush` | title claimed computed-style application | exact QUID rule plus managed declarations | HTML/SVG postflush computed opacity |
| `livetree/coverage-css-and-content::CssManager: emitted QUID CSS coexists with registered hosted geometry` | title implied CSS created a real layout rectangle | exact emitted declarations plus explicitly registered hosted rectangle | selector application is covered separately; browser layout is not claimed |
| `livetree/scheduling-and-events::CssManager scheduling: managed write remains absent from CSSOM before flush` | default computed opacity was treated as preflush proof | pending managed value plus exact rule absence | synchronous preflush computed opacity and rule absence |
| `livetree/scheduling-and-events::CssManager scheduling: flush boundary emits the exact managed rule` | title claimed style application | exact selector, declaration, and managed value | postflush computed opacity |
| `livetree/scheduling-and-events::CssManager scheduling: interleaved writes resolve to final state` | a computed-style read was used to infer that no flush occurred | exact rule absence before the second write plus final managed value | replacement effect after explicit flush |
| `livetree/css-manager-lifecycle::CssManager lifecycle: clear() removes all declarations for node` | browser-default computed values were treated as cleanup proof | declaration removal and exact rule absence | computed opacity returns to the unmanaged value |
| `livetree/node-lifecycle::node lifecycle: recreated same-id node does not inherit old CSS` | default computed values were treated as noninheritance proof | distinct QUID, released old rule, absent new managed state/rule | cleanup and stable-target behavior |
| `livetree/css-pseudo::css pseudos: before plain text generates exact quoted CSS` | pseudo computed content in jsdom | selector getter and exact CSSOM content/color | Chromium `::before` content `"X"` |
| `livetree/css-pseudo::css pseudos: before omission generates exact empty content CSS` | pseudo computed content in jsdom | selector getter and exact CSSOM empty content/color | Chromium `::before` content `""` |
| `livetree/css-pseudo::css pseudos: manual and auto quoted content generate exact CSS` | pseudo computed content in jsdom | exact managed and CSSOM values | Chromium manual/automatic content `"M"`/`"A"` |
| `livetree-18/treeselector-surface::css pseudos: attr() content generates exact composed-selector CSS` | accepted either source text or resolved computed text | exact selector, managed value, and emitted source | Chromium resolved content `"HELLO"` |

The four pseudo cases are now part of the 78-suite hosted jsdom collection as
CSS-generation assertions. None remains deferred as a synthetic rendering
test. The only browser-fidelity cases excluded from the hosted collection are
the four canvas pixel-readback cases.

Three additional failures in `livetree/css-refinements` were not jsdom
rendering failures. Their test-only keyframe owner strings were not valid
persisted QUIDs. Those owners now use deterministic valid QUIDs; the original
keyframe ownership assertions remain unchanged.
