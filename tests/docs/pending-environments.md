# Phase 6 executor capability backlog

This is a capability backlog, not a list of tests excluded from LiveHost.
Every legitimate current test is either hosted now or assigned to a concrete
Phase 6 executor class by the derived census.

## Deployed Node executor

Implemented locally in Phase 6A for every nonbrowser Node surface. The remaining
work is operational deployment of the same complete server. Its runtime must
satisfy the repository engine contract (`>=22.12.0 <25`).

Synthetic DOM and the deterministic canvas recorder are ordinary Node
capabilities. They are not reasons to exclude a test from hosting.

## Supervised process executor

Implemented locally in Phase 6A for hson-live launchers and promoted command
certifications, including process-tree termination, timeouts, server lifecycle,
bounded stdout/stderr, normalized evidence, and terminal events.

This can be a specialization of the deployed Node executor, but the process
control contract must remain explicit.

## Browser executor

Required for 67 Playwright journeys and four authored canvas raster-readback
cases. It needs managed Chromium, browser DOM/layout/canvas, supervised Vite and
LiveHost servers, network/WebSocket access, cancellation, traces, screenshots,
video where configured, server logs, and normalized reports.

The four raster cases are exactly the identities in
`JSDOM_HOSTED_CANVAS_DEFERRED_CASE_KEYS`. The synthetic canvas recorder remains
authoritative for deterministic command/state behavior; it intentionally does
not pretend to implement pixel output.

## Optional Worker portability

The Worker executor remains an optional portability adapter. Its single
unhosted census surface explicitly certifies the Cloudflare environment. It is
not a dependency of Node LiveHost, and absence of a deployed Worker does not
reduce general hosted-test availability.

## Verification executor

TypeScript checks, builds, public-entrypoint certification, Cloudflare typing,
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
