# Current test architecture

```text
source-owned executable metadata
        ↓
direct discovery and exact selection
        ↓
TestRunner / external process / Playwright
        ↓
truthful case events and one terminal record
        ↓
LocalRunReporter
        ↓
run.json and progressive static report
        ↓
frozen Tests explorer
```

## Executable discovery

Executable suites and metadata beside those suites are authoritative. Discovery
combines registered `TestSuite`/`TestCase` factories, source-owned hson-live
metadata, and Playwright journeys. Suite and case identity is stable; counts are
derived from what is discovered and observed.

## Execution

Selected work runs through `TestRunner`, supervised external processes, or the
Playwright adapter. Runtime requirements determine the executor. Failure,
cancellation, skip, unsupported capability, and infrastructure error are
terminal evidence, not admission failures.

External processes emit real case lifecycle events and exactly one final
terminal record. Supervisors enforce timeout, cancellation, bounded output,
graceful then forced process-tree termination, and cleanup. Late output cannot
change a terminal attempt.

## Reporting and retention

`LocalRunReporter` reduces observed events into `.test-reports/<run-id>/run.json`
and progressively materializes a static site beside it. Terminal reports are
retained locally; incomplete owned directories are bounded and pruned by the
report store. Report generation requires no LiveHost service.

## Public Tests

The shipped Tests explorer is frozen and read-only. It fetches a selected
immutable static report progressively—index, category, suite, case, and admitted
attachments—and has no discovery, execution, cancellation, or WebSocket path.

## Production boundary

LiveHost, Locus, TOWL, and circuit verification are product runtime behavior,
even when tested by these suites. Production source is separate from the test
harness and must not import repository-root tests. The Cloudflare Worker serves
production compatibility routes only. Deployment consumes built artifacts
downstream; it does not run tests or update submodules.
