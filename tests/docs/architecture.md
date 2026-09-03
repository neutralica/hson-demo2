# Direct test architecture

The active test path is:

```text
executable TestSuite/TestCase factories
        ↓
direct descriptor discovery and exact selection
        ↓
TestRunner, subprocess, and Playwright events
        ↓
LocalRunReporter
        ↓
run.json plus progressive static evidence
        ↓
frozen Tests explorer
```

`TestSuite` and `TestCase` remain executable authority. Immutable descriptors
provide stable `suite::case` identities, subject and collection metadata, and
runtime requirements. Executor registries bind those descriptors to executable
cases and reject duplicate, missing, or capability-incompatible registrations.

The canonical Node CLI selects by subject, suite, or exact ID and executes the
selected cases directly. External launchers and Playwright children emit
truthful bounded process events. `LocalRunReporter` reduces those events into
the terminal report and progressively materialized static evidence.

The public Tests UI imports only the frozen explorer. It fetches an immutable
index followed by category, suite, case, and admitted attachment resources on
demand. It has no test discovery, execution, cancellation, LiveHost, or
WebSocket path.

LiveHost remains ordinary product infrastructure for TOWL, circuit
verification, Locus protocol behavior, lifecycle, recovery, security, and
generic WebSocket tests. It is not a test-report transport.

The Cloudflare hosted-test executor and Durable Object registry remain isolated
Phase 7 migration targets. They are not part of local reporting or the public
Tests UI.
