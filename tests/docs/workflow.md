# hson-demo2 Test Workflow

This guide describes the canonical test workflow used by `hson-demo2`.

The test system keeps the existing `TestSuite`, `TestCase`, and `run_test_suites()` model. The consolidation adds predictable metadata, stable IDs, hosted discovery, and executor-owned registration without replacing the familiar runner.

## Mental model

A test answers two separate questions:

1. What does this test cover?
2. What environment does it require?

The test host answers a third:

3. Which registered tests can I execute here?

The basic flow is:

```text
TestSuite / TestCase
        ↓
descriptor metadata
        ↓
executor registration
        ↓
selection by stable test ID
        ↓
run_test_suites()
        ↓
existing streamed report
```

The browser test panel should eventually select, dispatch, and display results. Substantial test execution should occur through hosted test channels rather than on the panel’s main thread.

---

## Core test shape

Tests continue to use the existing suite-and-case structure:

```ts
const exampleSuite: TestSuite = {
  suite: "livemap/basic",
  subject: "livemap",
  requirements: ["javascript"],

  cases: [
    {
      suite: "livemap/basic",
      name: "set changes the selected value",

      run() {
        // Arrange
        // Act
        // Assert
      },
    },
  ],
};
```

Use the project’s real constructors, types, and assertion helpers. The example above shows the structure only.

### `suite`

A stable behavioral grouping:

```ts
suite: "livemap/basic"
```

Related cases should normally share a suite.

### `name`

The individual behavior under test:

```ts
name: "set changes the selected value"
```

Keep names specific enough to identify the behavior without reading the implementation.

### `subject`

The library area being tested:

```ts
subject: "livemap"
```

Examples include:

```text
transform
livetree
livemap
livehost
liveinspect
reflect
towl
integration
dev
```

Subject is used for organization and selection. It does not describe the runtime.

The deterministic Transform inventory currently contains nine suites and 361
legacy/demo cases. Its earlier authored-HSON subset remains registered for
continuity, including the six bare primitive families and the two established
adjacent-text element sources (`<div "a" "b"/>` and `<div """"""/>`).

The authoritative authored-language contract now lives in hson-live's
`transform.certified-authored-hson-corpus` external launcher. It materializes
366 candidate descriptors and 2,844 weighted assertions. The demo cases are not
counted again as certified descriptors. The former large-format HTML samples
are intentionally not in the authoritative corpus. Wikipedia remains available
as a lazy Parsing Panels browser demonstration at
`/fixtures/parse/wikipedia-main-page.html`.

### `requirements`

The minimum environment needed to execute the test:

```ts
requirements: ["javascript"]
```

Current capability vocabulary:

```text
javascript
node
synthetic-dom
browser-dom
worker
filesystem
websocket
```

Declare the smallest truthful set.

Portable logic:

```ts
requirements: ["javascript"]
```

A test that genuinely uses Node APIs:

```ts
requirements: ["javascript", "node"]
```

A test that needs the hosted jsdom environment:

```ts
requirements: ["javascript", "synthetic-dom"]
```

Do not mark a test as Node-specific merely because its current launcher is a `.node.mts` file.

---

## Stable test IDs

Canonical IDs currently use:

```text
<suite>::<case name>
```

Example:

```text
livemap/basic::set changes the selected value
```

These IDs are used by:

- the canonical CLI;
- executor catalogs;
- hosted discovery;
- exact hosted selection;
- future report filtering and orchestration.

Treat the ID as a public identifier. Avoid renaming a suite or case casually once other tools depend on it.

---

## Suite defaults and case overrides

Suite metadata supplies defaults to its cases:

```ts
const suite: TestSuite = {
  suite: "livehost/core",
  subject: "livehost",
  requirements: ["javascript"],

  cases: [
    // Cases inherit the suite metadata.
  ],
};
```

A case may override metadata when it genuinely has different requirements.

Keep this inheritance shallow:

```text
suite defaults
    ↓
case overrides
```

Do not add further layers of implicit metadata.

---

## Descriptor versus executable registration

The test system separates descriptive metadata from executable code.

### Descriptor

A `TestDescriptor` contains transport-safe information such as:

```text
id
suite
name
subject
requirements
```

It contains no `run()` function.

Descriptors are safe to:

- serialize as JSON;
- return from `tests.discover`;
- include in browser- or Worker-neutral code;
- compare across executors.

### Executable registration

An executor registry owns:

```text
descriptor
+
matching TestCase.run()
```

The registry validates that:

- IDs are unique;
- every descriptor has an executable case;
- every executable case has a descriptor;
- descriptor and case identity agree;
- the executor provides all required capabilities.

The catalog is descriptive. The executor registry is executable.

Never create one universal executable catalog and filter it at runtime. That can pull Node or jsdom code into browser and Worker bundles.

---

## Executors

An executor is simply a hosted environment that can run registered tests.

Current executor types include:

```text
Node LiveHost
Cloudflare Worker application runtime
```

The Node host currently advertises:

```text
javascript
node
```

The Worker currently advertises:

```text
javascript
```

Later, the Node host can also own jsdom, real WebSocket, filesystem, process, and Playwright-backed execution without changing the public test shape.

---

## Hosted discovery

A client can ask a connected host what it can run:

```text
tests.discover
```

Request:

```ts
{}
```

The result includes:

```text
executor identity
executor capabilities
protocol version
catalog version
descriptor-only test catalog
```

Conceptually:

```ts
{
  executor: {
    id: "cloudflare-livehost",
    kind: "cloudflare-worker",
    label: "Cloudflare LiveHost",
    location: "hosted",

    capabilities: {
      provides: ["javascript"],
    },

    supportsStreaming: true,
    supportsCancellation: false,
  },

  protocolVersion: 1,
  catalogVersion: "fnv1a32-...",

  catalog: {
    tests: [
      {
        id: "livehost/core::create initializes map from state",
        suite: "livehost/core",
        name: "create initializes map from state",
        subject: "livehost",
        requirements: ["javascript"],
      },
    ],
  },
}
```

Discovery replaces hardcoded assumptions such as:

```text
this host probably supports this category
hosted/all probably means everything
```

A host advertises only tests actually installed in its executable registry.

---

## Running tests locally

The canonical Node CLI supports selection by subject, suite, or exact test ID.

### Subject

```sh
npm run test:canonical-node -- --subject livehost
```

### Suite

```sh
npm run test:canonical-node -- --suite livehost/core
```

### Exact test

```sh
npm run test:canonical-node -- \
  --test "livehost/core::create initializes map from state"
```

The CLI:

```text
loads the Node executor registry
        ↓
filters the descriptor catalog
        ↓
resolves matching executable cases
        ↓
runs them through run_test_suites()
```

Selections matching no tests fail clearly.

Established named npm commands remain compatibility entrypoints where useful.

---

## Running tests through LiveHost

### Discovery

Available now:

```text
tests.discover
```

This reports the tests executable by the connected host.

### Exact selected execution

Canonical exact-ID execution uses:

```text
tests.runSelected
```

Conceptual request:

```ts
{
  selectionIds: [
    "livehost/core::create initializes map from state",
    "livehost/core::set applies a commit",
  ],
}
```

The hosted flow is:

```text
connect to LiveHost
        ↓
tests.discover({})
        ↓
select advertised test IDs
        ↓
request exact execution
        ↓
receive the existing streamed report
```

The host resolves IDs directly through its canonical executor registry and
persists the resulting complete RunPlan. Removed generic and category routes
are rejected rather than translated or aliased.

---

## What happens during execution

Selected cases are grouped into their original suites and passed to:

```ts
run_test_suites(...)
```

The existing runner remains responsible for:

- suite and case lifecycle;
- assertions;
- expected failures;
- timings;
- metadata and artifacts;
- failure details and stacks.

Current runner events include:

```text
suite_begin
case_begin
case_end
suite_end
```

Hosted execution projects these events through the existing report channel:

```text
executor runs tests
        ↓
runner emits events
        ↓
host batches report updates
        ↓
report Locus publishes canonical report state
        ↓
panel displays progress and details
```

The consolidation should preserve diagnostic quality rather than flattening failures into generic strings.

---

## Adding a new test

### 1. Choose or create a suite

Use an existing suite when the new behavior belongs there.

Create a new suite only for a coherent behavioral group:

```text
livemap/update
livehost/replay
livetree/attrs
```

### 2. Declare subject and minimum requirements

Ask:

```text
Does this need only JavaScript?
Does it use Node APIs?
Does it need a synthetic DOM?
Does it require a real browser?
Does it specifically test Worker behavior?
Does it require filesystem or WebSocket access?
```

Prefer portable requirements whenever accurate.

### 3. Write ordinary `TestCase` entries

```ts
const updateSuite: TestSuite = {
  suite: "livemap/update",
  subject: "livemap",
  requirements: ["javascript"],

  cases: [
    {
      suite: "livemap/update",
      name: "update receives the current value",

      run() {
        // Existing setup and assertions.
      },
    },

    {
      suite: "livemap/update",
      name: "update writes the returned value",

      run() {
        // Existing setup and assertions.
      },
    },
  ],
};
```

Do not write a separate hosted version of the test.

### 4. Add the suite to its subject collection

Register the suite with the appropriate real aggregate, such as the relevant LiveMap, LiveTree, or LiveHost suite collection.

### 5. Register it with compatible executors

A portable test may be registered with both Node and Worker executors.

A Node-only test belongs only in the Node executor.

A synthetic-DOM test belongs in a Node-hosted DOM executor once that registry is migrated.

Register based on actual functionality, not filename or historical category.

### 6. Run the narrowest useful selection

```sh
npm run test:canonical-node -- --suite livemap/update
```

Or:

```sh
npm run test:canonical-node -- \
  --test "livemap/update::update writes the returned value"
```

### 7. Run the wider subject

```sh
npm run test:canonical-node -- --subject livemap
```

### 8. Run catalog and boundary checks

Relevant checks should catch:

- duplicate IDs;
- incomplete registrations;
- executor capability mismatch;
- descriptor disagreement;
- unsafe Worker or browser imports;
- stale test-surface paths.

Once exact hosted selection is available, use the same stable IDs to verify the test through each compatible hosted executor.

---

## Authoring principles

### Keep portable tests portable

Use:

```ts
requirements: ["javascript"]
```

unless the test truly depends on another capability.

### Test behavior, not the current launcher

A `.node.mts` entry point does not automatically make the underlying behavior Node-specific.

### Avoid duplicate test forms

A normal test should not require:

```text
a Node version
a Worker version
a hosted version
a panel-specific version
a separate result format
```

Write one canonical case and register it with every compatible executor.

### Preserve the existing runner

Do not create another assertion framework or runner for canonical execution.

### Keep the panel thin

The panel should:

```text
discover
select
dispatch
display
```

It should not run large suites on its main browser thread.

### Keep reporting bounded

Hosted execution may stream progress, but report updates should remain batched enough to avoid flooding the panel with one DOM update per assertion.

### Treat unsupported as unavailable, not failed

When no connected executor can satisfy a test’s requirements, the eventual orchestrator should report it as unavailable rather than executing it in the wrong environment.

---

## Desired end state

For ordinary test authoring:

```text
1. Write a TestCase.
2. Identify its subject.
3. Declare its minimum requirements.
4. Register it with compatible executors.
5. Select it by stable ID.
6. Run it through the existing runner.
7. Receive the existing streamed report.
```

The consolidation is successful when new tests no longer require additions to several overlapping Node-safe, jsdom, Worker, hosted, visible-suite, and panel-mapping lists.
