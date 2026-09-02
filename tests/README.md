# hson-demo2 tests

This directory is the authoritative home for the repository's test system. The only test-related code outside it is the shipped LiveDemo test application in [`src/app/demos/tests`](../src/app/demos/tests).

## Start here

The canonical harness entry is [`harness/index.ts`](./harness/index.ts). It intentionally exposes only the stable runtime-independent surface. The main runner is [`harness/core/test-runner.ts`](./harness/core/test-runner.ts), and executable commands live separately under [`runners/`](./runners).

| Responsibility | Owner |
| --- | --- |
| Catalog construction and stable descriptor IDs | [`harness/core/test-catalog.ts`](./harness/core/test-catalog.ts) |
| Discovery protocol and catalog fingerprint | [`harness/core/test-discovery.ts`](./harness/core/test-discovery.ts) |
| Exact subject, suite, and case selection | [`harness/core/test-selection.ts`](./harness/core/test-selection.ts) |
| Executor registration and capability matching | [`harness/core/test-executor.ts`](./harness/core/test-executor.ts) |
| Selected-case orchestration | [`harness/core/run-selected-test-suites.ts`](./harness/core/run-selected-test-suites.ts) |
| Case execution, timeouts, cleanup, and events | [`harness/core/test-runner.ts`](./harness/core/test-runner.ts) |
| Event normalization | [`harness/core/test-run-events.ts`](./harness/core/test-run-events.ts) |
| Reports and report protocol | [`harness/reporting/`](./harness/reporting) |
| Hosted application protocol and suite registration | [`harness/hosted/`](./harness/hosted) |
| Node, DOM, Cloudflare, and socket implementations | [`harness/runtimes/`](./harness/runtimes) |

The high-level flow is:

```text
catalog → discovery → selection → execution → events → report → panel/application mirror
```

The browser panel consumes shared contracts and reports, but it does not own discovery, suites, runners, or runtime adapters.

## Where things go

- `suites/<subject>/`: `TestSuite` and `TestCase` definitions grouped by the behavior they claim. A subject registry uses the explicit name `suite-registry.ts`.
- `runners/<subject>/`: executable `run-*.node.mts` and `run-*.ts` entrypoints. A runner imports a suite registry; it does not own suite definitions.
- `fixtures/`: static or declarative inputs. Transform fixtures are split into `hson`, `json`, `html`, and `large`; browser and protocol fixtures have their own folders.
- `helpers/`: helpers shared by multiple suites or subsystems. Helpers used by only one suite remain beside that suite.
- `integration/browser/`: Playwright journeys. `integration/cloudflare/`: Worker/Durable Object integration entrypoints.
- `tools/`: non-suite development tools such as the JSON fuzzer.
- `docs/`: architecture, hosted server, environment, workflow, inventory, and migration detail.

Keep benchmarks in the repository-level `benchmarks/` directory.

## Running tests

Run a direct report from executable discovery:

```sh
npm run test:report -- --suite transform/hson-number
```

Run the fixed hson-demo2 catalog only:

```sh
npm run test:canonical-node
```

Run one subject or suite through the canonical runner:

```sh
npm run test:canonical-node -- --subject livemap
npm run test:canonical-node -- --suite livemap/replay
```

Run the environment-specific integrations:

```sh
npm run test:browser
npm run test:hosted-cloudflare
```

The file-by-file old-to-new record is in [`docs/migration-inventory.md`](./docs/migration-inventory.md). Native suite descriptors, hson-live suite-owned metadata, and Playwright discovery own executable identity. Reports count actual emitted case terminals; package scripts are invocation conveniences rather than inventory authority.

## Adding coverage

Add a suite under the subject it tests, give every suite and case stable names, and register its factory in that subject's `suite-registry.ts` and the canonical hosted registry. Verify discovery, selection, Worker exclusion for Node-only cases, and LiveDemo visibility. Do not create a panel-only list.

Prefer coherent subsystem-focused reported suites of roughly 20–25 checks. Do not hide nearly 100 independently named claims in one aggregate without a real contract or runtime reason, and do not split completed certified corpora merely to raise visible suite counts.

Add fixtures under the matching format or runtime folder and import them from their consumers. The Wikipedia HTML sample is a lazy static Parsing Panels demonstration at `public/fixtures/parse/wikipedia-main-page.html`; it is not a corpus descriptor.

Shared helpers belong in `helpers/` only when multiple suites or subsystems use them. Otherwise keep them local to their owner.

## Authoritative surfaces

Native executable suites, hson-live suite-owned metadata, Playwright discovery,
and environment-specific adapters own their test identities. Reports derive
totals from actual case terminals. See [`docs/architecture.md`](./docs/architecture.md)
and [`docs/pending-environments.md`](./docs/pending-environments.md) for runtime boundaries.
