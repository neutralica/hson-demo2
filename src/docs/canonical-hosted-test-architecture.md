# Canonical hosted test architecture

The completed hosted test system has one descriptive vocabulary and one
executable runner:

```text
original TestSuite/TestCase factories
        ↓
immutable descriptor projection
        ↓
executor-owned registration
        ↓
tests.discover
        ↓
exact canonical IDs
        ↓
tests.runSelected
        ↓
run_test_suites()
        ↓
bounded streamed report
```

In short: **catalogs describe, registries execute, capabilities constrain
availability, canonical IDs select, and the existing runner reports.**

## Definitions and registration

`TestSuite` and `TestCase` remain the executable authority. Suite metadata is
inherited by cases unless a case supplies an override. Projection produces
frozen `TestDescriptor` values with deterministic `suite::case` IDs. Duplicate
IDs fail catalog construction.

A catalog contains descriptors only. It never imports executable Node, jsdom,
server, or Worker implementations. Each executor registry owns the exact
`TestCase` registrations it can execute, and construction checks descriptor,
registration, capability, and ID parity.

The Node and Worker registries are intentionally separate. Shared stable IDs
must have identical descriptors across executors.

## Discovery and versioning

`tests.discover` accepts an explicitly validated empty object and returns the
executor descriptor, protocol version, catalog fingerprint, and descriptor-only
catalog as one JSON-safe result.

The protocol version is manually controlled for wire compatibility. The catalog
version is an FNV-1a fingerprint of canonicalized descriptor content. Descriptor
records and set-like metadata are sorted, so module and registry construction
order do not alter the fingerprint.

## Exact selection

`tests.runSelected` accepts only stable test IDs advertised by the active
executor. It rejects malformed, duplicate, unknown, and executor-unavailable
IDs before constructing a report. Selection size is bounded by the active
catalog size; general LiveHost payload limits protect incoming JSON.

IDs are resolved directly through the executor registry. They are never
translated into `hosted/all`, `category/*`, or another legacy route. Selected
cases retain original suite grouping and execute in canonical suite/case order.

## Runner completion contract

`run_test_suites()` executes cases sequentially. Every case has a finite
effective timeout: a case override, then a suite override, then a run override,
or the conservative 30-second default. Timeout values must be positive finite
safe integers and are validated before execution begins.

The runner awaits the value returned by `TestCase.run`. A case may optionally
provide cleanup, which runs after pass, failure, cancellation, or timeout and
must finish before the terminal case event. Cleanup uses the same finite
deadline. A cleanup failure turns a would-be pass into a failure and remains
visible alongside an earlier case failure. Suite setup is likewise bounded; a
setup failure emits an explicit failure for every affected selected case.

Timeout or cancellation settles exactly one terminal result. A later resolve or
reject from the abandoned promise is observed but cannot replace or duplicate
that result. Recorder lifecycle checks reject duplicate begins, duplicate ends,
ends without begins, and terminal summaries with active cases.

Portable JavaScript cannot attribute arbitrary detached asynchronous work to a
case without a scoped runtime mechanism. Test bodies must therefore return or
await every asynchronous operation that contributes to their result.

## Node execution contexts

The Node LiveHost advertises `javascript`, `node`, and `synthetic-dom`.

- Ordinary suites run while holding a shared guard that guarantees temporary DOM
  globals are absent.
- Synthetic-DOM suites run under the exclusive hosted DOM mutex because jsdom
  installs process-global browser values.
- Deterministic canvas suites use that same synthetic-DOM context. The existing
  adapter records 2D commands, state, transforms, explicit rectangles, and
  deterministic resize notifications. It does not rasterize and throws for
  pixels, image loading, or font metrics.

The DOM runtime resets the document per suite and geometry and canvas state per
case. Setup and teardown restore every installed global and patched prototype,
including failure paths. No separate canvas execution context or public canvas
capability is needed.

Some original factories keep mutable closure state. The hosted Node boundary
therefore reconstructs original suites for each selected request, then verifies
that the fresh ordered ID set and fingerprint match the advertised registry
before execution.

## Transform semantic oracle

Transform semantic closure uses hson-live's test-only portable oracle. The
oracle compares already-admitted graphs strictly, reports the first canonical
path divergence, preserves structured Transform error identity, and emits a
deterministic named witness. It performs no comparison-time normalization or
root transparency. Exact tokenizer, formatting, browser presentation, and
launcher-completion assertions remain specialized.

The same support module is importable in Node, browser, and Worker-safe test
contexts without filesystem, process, Node assertion, or inspection utilities.
The external launcher manifest remains the accounting authority for its oracle
self-test launcher; Demo catalog and inclusive totals derive from that manifest.

## Panel

The browser panel is limited to discovery, selection, dispatch, and report
presentation. Its primary taxonomy is:

```text
All discovered tests
Transform
LiveMap
Reflect
LiveTree
LiveHost
Unit
Dev
```

Empty categories are omitted. Every choice resolves to frozen, sorted, unique
canonical IDs. The secondary targeted controls first select a suite, then
either the entire suite or one exact case. Changing suites clears stale case
selection.

Discovery failure is an error, not an empty catalog and not a reason to silently
fall back to hard-coded legacy routes. Existing legacy actions and launchers
remain compatibility surfaces for other clients, but they are not panel
authority.

## Reports and Worker boundary

Canonical selected runs use the existing report association, mirror,
inspection, batching, timing, metadata, artifact, diagnostic, and terminal
revision system. The panel schedules bounded summary rendering rather than
performing one DOM update per assertion event.

The Cloudflare executor advertises only `javascript` and imports only its
portable executable registry. It does not import jsdom, the DOM/canvas runtime,
Node selected-run planning, Node servers, or `ws`. Node-only IDs are rejected
before report construction.

## External environments

The canonical Node catalog is complete for the execution semantics currently
provided. Real browser rendering, raster pixels, real WebSocket servers,
filesystem/process/build commands, standalone adapters without suite factories,
and manual visual demonstrations remain distinct future or manual boundaries.
See `pending-test-environments.md` for the concrete inventory.
