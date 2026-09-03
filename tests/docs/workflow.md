# hson-demo2 test workflow

Tests use ordinary `TestSuite` and `TestCase` factories. Describe the
smallest truthful runtime requirements and register executable suites with the
appropriate direct executor registry.

Canonical IDs are `<suite>::<case-id>`. They support direct CLI selection:

```sh
npm run test:canonical-node -- --subject livehost
npm run test:canonical-node -- --suite livehost/core
npm run test:canonical-node -- --test "livehost/core::create"
```

Run the complete local report directly:

```sh
npm run test:report
```

The command executes native suites, supervised subprocess suites, and
Playwright suites directly. `LocalRunReporter` writes `run.json` and
progressive static evidence. No LiveHost application, hosted-test server,
report LiveMap, or report WebSocket participates.

The browser Tests UI is a read-only frozen explorer. It consumes the immutable
`VITE_TEST_EVIDENCE_ROOT` through static HTTP fetches and cannot launch a
runner, subprocess, Playwright, or remote test action.

LiveHost/Locus/TOWL/circuit tests remain ordinary semantic suites. Runtime
capabilities such as Node, filesystem, synthetic DOM, browser DOM, WebSocket,
and process supervision should be declared only where behavior actually
requires them.

Tests owned by hson-live keep frozen launcher metadata and emit the established
child event protocol. Their observed case events determine report totals; do
not add expected corpus counts or aggregate certification state.

Cloudflare Worker hosted execution is retained only as a Phase 7 migration
target and is not a local report dependency.
