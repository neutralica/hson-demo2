# Test-system instructions

`tests/` owns executable suites, fixtures, helpers, runtime adapters, runners,
and test documentation. Shipped Tests explorer code belongs in
`src/app/demos/tests`; production source must not import repository-root test
modules.

Executable suites are authoritative. Keep stable suite and case identity,
subject, collection, requirements, and other discovery metadata beside the
suite that executes the behavior. Register executable factories with the
appropriate direct executor. Do not add a parallel UI inventory or fixed-count
admission rule.

`TestRunner`, supervised external processes, and Playwright must emit truthful
case and terminal events. A failed, cancelled, skipped, unsupported, or
infrastructure-error run is valid evidence and must not be hidden or converted
into a passing aggregate. External children must emit real case identity and
exactly one final terminal record.

All child processes require bounded timeouts, cancellation propagation,
bounded output capture, process-tree cleanup, and deterministic resource
disposal. Late events must not mutate a terminal attempt.

`LocalRunReporter` records observed terminal truth in `run.json` and creates the
progressive static report. Local reporting does not require LiveHost. The
browser Tests UI reads only a selected static report and must never discover,
run, cancel, or recover tests.

Deployment is separate from test execution. Deployment must not run tests or
update submodules. Cloudflare code is production compatibility behavior for
`/session` and `/towl`, not a test executor.

Keep test names focused on behavior. Declare only capabilities the behavior
actually needs, retain useful local fixtures and semantic contracts, and use a
direct focused command before broad report generation when iterating.
