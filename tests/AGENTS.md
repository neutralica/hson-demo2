# Test-system instructions

`tests/` is the authoritative repository test root. Keep shipped LiveDemo panel code in `src/app/demos/tests`; place harness code, runtime adapters, suites, runners, fixtures, helpers, integrations, tools, and test documentation here according to [`README.md`](./README.md).

Do not reintroduce `src/tests`, `src/test-system`, `src/hosted-test`, `src/app/hosted-test`, `tests/browser`, or `tests/cloudflare`.

## Test visibility and execution

Any automated test added, restored, split, renamed, or materially expanded must remain reachable from the canonical hosted-test application used by CLI, capture, and certification tooling, and must be represented truthfully in generated frozen evidence.

This is part of completing the test change, not optional follow-up work. The ordinary browser surface is a frozen evidence explorer and must not initiate test execution.

### Tests owned by hson-demo2

Register new `TestSuite` / `TestCase` factories with the canonical hosted-test registry so they are:

- present in `tests.discover`;
- assigned accurate subject, collection, and execution-context metadata;
- selectable through `tests.runSelected`;
- materialized under the appropriate frozen evidence category and suite navigation after capture.

Do not create a second panel-specific test list.

### Tests owned by hson-live

For a new or changed acceptance/runtime-probe launcher, update the exported `hson-live/test-launchers` manifest with:

- a stable launcher ID;
- accurate subject;
- display name;
- package script and repository module;
- runtime classification;
- accurate executable case count;
- relevant collections.

The corresponding hson-demo2 integration must expose it to the internal hosted registry and generated evidence under its functional category. Do not create a separate “library verification” category when the test belongs to LiveHost, LiveMap, LiveTree, Transform, or another established subject.

A test change is not complete until the test is runnable through supported CLI/build tooling and represented in generated evidence, or an unsupported-environment exception is explicitly documented.

### Unsupported environments

If a new automated test genuinely cannot run through an existing LiveDemo executor, do not silently omit it. Document:

- the required execution environment;
- why the current hosted executor cannot support it truthfully;
- the smallest required adapter or executor;
- where the test remains runnable.

Treat the task as incomplete unless this exception is explicit and justified.

### Completion check

Before reporting a test-related task complete, verify that:

- the original CLI command still passes;
- hosted discovery includes the new test or launcher;
- category and suite counts reflect it;
- CLI/capture selection executes it;
- Worker discovery remains free of Node-only tests;
- no test is registered twice.
