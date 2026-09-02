# Phase 6 executor capability backlog

This is a capability backlog, not a list of tests excluded from hosted execution.
Every legitimate current test is either hosted now or assigned to a concrete
Phase 6 executor class by the derived census.

## Deployed Node executor

Implemented locally in Phase 6A for every nonbrowser Node surface. The remaining
work is operational deployment of the same complete server. Its runtime must
satisfy the repository engine contract (`>=22.12.0 <25`).

Synthetic DOM and the deterministic canvas recorder are ordinary Node
capabilities. They are not reasons to exclude a test from hosting.

## Supervised process executor

Implemented locally for hson-live launchers, including process-tree termination,
timeouts, server lifecycle, bounded stdout/stderr, normalized evidence, and
terminal events.

This can be a specialization of the deployed Node executor, but the process
control contract must remain explicit.

## Browser executor

Implemented locally in Phase 6B for 71 Playwright journeys and four authored
canvas raster-readback cases. Node LiveHost owns application dispatch and
process supervision; the hosted-test application owns selection and RunPlan,
while report Loci own canonical report state and recovery. One isolated native
Playwright child owns Chromium plus the existing Playwright fixtures, contexts,
retries, Vite server, and hosted-test server.

The executor provides browser DOM/layout/canvas, network/WebSocket access,
process-tree cancellation, bounded stdout/stderr, console/page/network evidence,
and trace/screenshot references when Playwright produces them. Artifact paths
are unique per run, survive report recovery, and are removed when the owning
Node-hosted server is disposed.

The four raster cases remain exactly the identities in
`JSDOM_HOSTED_CANVAS_DEFERRED_CASE_KEYS`, but are no longer deferred from local
hosting. The synthetic canvas recorder remains authoritative for deterministic
command/state behavior; it intentionally does not pretend to implement pixel
output.

## Optional Worker portability

The Worker executor remains an optional portability adapter. Its single
unhosted census surface explicitly verifies the Cloudflare environment. It is
not a dependency of Node LiveHost, and absence of a deployed Worker does not
reduce general hosted-test availability.

## Verification executor

TypeScript checks, builds, public-entrypoint validation, Cloudflare typing,
production bundling, inventory/meta checks, and artifact validation use a
separate verification denominator. A bounded executor needs compiler/build
tooling, repository inputs, controlled filesystem output, diagnostics, exit
status, and artifact identity.

## Deployment environment

The deployed TOWL probe additionally requires network access,
`TOWL_DEPLOYED_WS_URL`, and deployment access. This is a current environment
dependency, not an inherent hosting block. Phase 6 should model the endpoint as
an executor capability/configuration and keep secrets out of RunPlan payloads
and reports.

## External blocks

None are currently proven. Node, filesystem, processes, DOM, canvas, Chromium,
WebSocket, compiler tooling, and deployment access all describe executor or
environment requirements with viable hosted executor designs.
