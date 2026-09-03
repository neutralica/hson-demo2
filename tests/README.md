# hson-demo2 tests

This directory is the authoritative home for executable tests. The shipped,
read-only Tests explorer is application code under
[`src/app/demos/tests`](../src/app/demos/tests).

## Architecture

[`harness/index.ts`](./harness/index.ts) exposes the stable harness contracts.
The direct test path is implemented by:

| Responsibility | Current owner |
| --- | --- |
| Suite and case contracts | [`harness/core/test-contracts.ts`](./harness/core/test-contracts.ts) |
| Executable catalog and discovery | [`harness/core/test-catalog.ts`](./harness/core/test-catalog.ts), [`harness/core/test-discovery.ts`](./harness/core/test-discovery.ts) |
| Exact selection and execution | [`harness/core/test-run-plan.ts`](./harness/core/test-run-plan.ts), [`harness/core/test-runner.ts`](./harness/core/test-runner.ts) |
| Direct Node/external/Playwright discovery | [`harness/runtimes/node/direct-report-discovery.ts`](./harness/runtimes/node/direct-report-discovery.ts) |
| External process supervision | [`harness/runtimes/node/node-process-supervisor.ts`](./harness/runtimes/node/node-process-supervisor.ts) |
| Terminal reports and static materialization | [`harness/reporting/local/`](./harness/reporting/local) |

Suite-owned metadata and executable discovery define identity. Reports derive
their contents and totals from observed events.

## Layout

- `suites/<subject>/` contains `TestSuite` and `TestCase` factories and their
  metadata. Subject registries use `suite-registry.ts`.
- `runners/` contains executable entrypoints; runners do not own a second suite
  inventory.
- `integration/browser/` contains Playwright journeys.
- `integration/cloudflare/` tests the production Worker compatibility adapter.
- `fixtures/` contains static and declarative inputs.
- `helpers/` contains helpers shared by more than one suite or subsystem.
- `harness/runtimes/` contains direct environment adapters and process safety.
- `harness/reporting/local/` owns retained terminal reports and progressive
  static artifacts.

## Run tests

Run a selected direct suite or case:

```sh
npm run test:canonical-node -- --subject livemap
npm run test:canonical-node -- --suite livemap/replay
npm run test:canonical-node -- --test "livemap/replay::replays"
```

Create a complete or selected local report:

```sh
npm run test:report
npm run test:report -- --suite transform/hson-number
```

Run environment-specific integration paths directly when needed:

```sh
npm run test:browser
npm run test:towl-worker-compatibility
```

`LocalRunReporter` retains terminal `run.json` files and their static sites
under `.test-reports/<run-id>/`. Failed, cancelled, skipped, unsupported, and
infrastructure-error runs remain inspectable evidence.

## Add coverage

Add the suite under the subject it tests, give every suite and case stable
identity, keep discovery metadata beside the executable suite, and register the
factory with its direct executor. Declare the smallest truthful runtime
requirements. Do not create a panel-only list or an expected-count gate.

External processes must emit real case begin/end records and exactly one final
terminal record. Preserve bounded timeouts, cancellation, stdout/stderr limits,
and full process-tree cleanup. Production modules must not import from
repository-root `tests/`.

See [`docs/architecture.md`](./docs/architecture.md) for the system boundary and
[`docs/workflow.md`](./docs/workflow.md) for ordinary use.
