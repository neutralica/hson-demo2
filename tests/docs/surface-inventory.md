# Test surface census

This document is a readable snapshot of the derived Phase 6A census. It is not a
second inventory authority.

The descriptive authority is:

- `tests/harness/hosted/test-surface-catalog.ts` for package commands and
  manifested hson-live launchers;
- the executable Node and Worker catalogs for canonical suites and cases;
- the files under `tests/integration/browser` for Playwright journeys;
- `JSDOM_HOSTED_CANVAS_DEFERRED_CASE_KEYS` for the four authored raster semantic
  identities now mapped to the browser executor;
- `tests/runners/harness/run-test-surface-enumeration.node.mts` for repository
  discovery, parity, reachability, and the complete composed census.

Run `npm run test:surface-enumeration-node` to derive current counts and reject
orphaned files, deleted targets, duplicate identities, unmanifested scripts,
missing census fields, or unclassified hostability.

## Denominators

The current derived snapshot is:

| Denominator | Current truth | Meaning |
|---|---:|---|
| Runnable/verification surfaces | 390 | Independently selectable suites, launchers, browser specs/fidelity cases, standalone runners, aggregate runners, and certification commands. Developer-only utilities are excluded. |
| Canonical suites | 153 | Structured hson-demo2 suites in the local Node executor. |
| Canonical cases | 2,508 | Stable suite/case identities with case lifecycle. |
| Opaque launchers | 127 | Manifested hson-live launchers. |
| Opaque checks | 3,079 | Launcher-declared checks without structured case identity. |
| Hosted semantic checks | 5,587 | Canonical cases plus opaque checks after semantic duplicate retirement. |
| Playwright specs / journeys | 17 / 80 | Real Chromium files and Playwright-owned test granularity. |
| Browser fidelity cases | 4 | Authored canvas raster cases executed by real Chromium through Node LiveHost. |
| Generated/fuzz surfaces | 1 dynamic runner | Seed and count are controlled by `HOSTED_FUZZ_SEED` and `HOSTED_FUZZ_CASES`; this is not folded into a fixed total. |
| Certification surfaces | 64 | Typecheck, build/entrypoint, inventory/meta, Node-LiveHost command certifications, and production-artifact verification remain a separate denominator. |

The 5,587 figure is legitimate because the 2,508 canonical identities and
3,079 opaque checks no longer claim the same semantic propositions. Browser,
generated, and certification universes are deliberately not added to it.

Counts above are a Phase 5 snapshot for human review. Tests never pin them as
inventory contracts; the enumeration certificate derives the same quantities
from current authorities.

## Public terms

- A **case** is a structured canonical test with stable suite/case identity and
  case lifecycle.
- A **check** is an assertion count reported by an opaque launcher without
  structured case identity.
- **Semantic checks** means cases plus opaque checks only when those sets are
  semantically nonduplicative.

The tests explorer summary uses suites, cases, checks, certifications, their
applicable pass/fail/skip/cancel metrics, and elapsed. The Inspector retains the
same denominator per suite. The Logger remains chronological evidence, never a
second totals authority.

## Current hostability

Semantic identities and executor executions are separate dimensions. A
portable canonical case run in Node and Worker is one semantic case with two
executor executions.

| Current class | Exact census population | Phase 6 implication |
|---|---|---|
| `hosted-deployed-now` | none verified from repository authority | The Worker is deployable, but the repository records neither a concrete deployed endpoint nor a deployed frontend endpoint configuration. |
| `hosted-local-now` | 358 surfaces | All semantic cases/checks, browser journeys, raster cases, promoted Node command certifications, and semantic command aliases are dispatched by Node LiveHost; Locus-backed applications retain one-map authority. Deployment requires the complete Node service plus Chromium system dependencies. |
| `hostable-worker` | 1 Cloudflare adapter portability certificate | Optional because its explicit subject is the Worker environment. |
| `hostable-node` | none | Phase 6A closed command, jsdom, canvas, generated, integration, and source/meta dispatch. |
| `hostable-external-process` | none | Phase 6A generalized the proven launcher supervisor. |
| `hostable-browser` | none | Phase 6B closed the 19-surface browser gap locally. |
| `verification-only` | 32 build/type/artifact, deployment-dependent, recursive, and historical aggregate command surfaces | Separate from semantic totals; promote only when operationally useful and nonrecursive. |
| `blocked-external` | none | No legitimate current test is considered inherently unhostable. |

The machine census records every stable identity and all required fields:
subject, provenance, shape, current executor, capabilities, four availability
dimensions, cancellation, recovery/reporting, evidence, non-deployment reason,
exact missing capability, and proposed Phase 6 executor class.

## Capability vocabulary

Only capabilities observed in current sources are used:

`javascript`, `node`, `worker-threads`, `cloudflare-worker`, `filesystem`, `process`, `synthetic-dom`,
`synthetic-canvas`, `browser-dom`, `browser-raster`, `browser`, `chromium`, `websocket`, `network`,
`local-server`, `compiler/typescript`, `build-tooling`, `dynamic-generated`,
`environment/secrets`, and `deployment-access`.

These are executor requirements, not exclusion labels.

The Node executor must also satisfy the repository engine contract
(`>=22.12.0 <25`). Phase 5 verification used the bundled Node 24 runtime; an
accidental Node 20 launch reproduced a CSS-runtime failure and was rejected as
an unsupported executor version rather than treated as a test exclusion.

## Duplicate ownership retired in Phase 5

| Removed hson-demo2 identity | Retained hson-live launcher | Proposition | Removed cases |
|---|---|---|---:|
| `transform/hson/quoted-name-acceptance` | `transform.hson-quoted-name-acceptance` | quoted property-name acceptance grammar | 24 |
| `transform/hson/quoted-name-rejection` | `transform.hson-quoted-name-rejection` | quoted property-name rejection grammar | 25 |
| `livemap/path-handle` | `livemap.path-handle` | path-handle semantics | 8 |
| `livemap/carrier-mutation-planning` | `livemap.carrier-mutation-planning` | carrier mutation planning | 23 |
| `livemap/exact-transport` | `livemap.exact-transport` | exact transport | 23 |
| `livemap/exact-transport-rejection` | `livemap.exact-transport-rejection` | exact transport rejection | 10 |
| `livemap/exact-propagation` | `livemap.exact-propagation` | exact propagation | 23 |
| `livemap/schema-value-boundary` | `livemap.schema-value-boundary` | schema value boundary | 24 |

All eight were core hson-live contracts asserted at the same library boundary.
The retained launchers are broader and manifested, so hson-live is the single
semantic owner. Cross-runtime Node/Worker execution was not removed.
