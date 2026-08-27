# Phase 6A Node hosted-test executor

This is the audit record for Node-generalist closure. The machine-readable
authority remains the surface catalog, executable registries, Node command
inventory, and composed surface census. Counts here are a review snapshot, not
test contracts.

## Verdict

The complete Node hosted-test system has no required Cloudflare dependency.
Removing Wrangler configuration, Worker bindings, Durable Objects, Worker
routes, and any deployed Worker URL leaves Node discovery, exact RunPlan
acceptance, canonical and opaque execution, supervised command execution,
cancellation, recovery, normalized reporting, health, and shutdown intact.

Cloudflare remains one optional portability target. Its single census surface
tests the Cloudflare adapter itself, so a Node executor must reject rather than
pretend to satisfy its `cloudflare-worker` requirement.

## Cloudflare dependency map

| Class | Before/after dependency | Status |
|---|---|---|
| A — optional portability | `tests/harness/runtimes/cloudflare/**`, the Worker/Durable Object application adapter, `wrangler.jsonc`, and `CLOUDFLARE.md` | Retained behind the Cloudflare runtime boundary. It is absent from Node discovery and production startup. |
| B — test-only certification | `test:hosted-cloudflare`, `check:cloudflare`, generated Worker types, and the historical `test:stage4a-selected-worker` alias | Retained as optional Worker verification. The alias is verification-only, not another semantic surface. |
| C — deployment convenience | `cloudflare:dev`, `cloudflare:deploy`, `cloudflare:types`, and `deploy:worker` | Retained only for the optional adapter. No Node build/start script invokes them. |
| D — genuine LiveHost dependency | None found | Node uses the hson-live Node application host directly. |
| E — accidental historical coupling | The old capability name `worker` conflated Node `worker_threads` with Cloudflare Workers | Removed by separate `worker-threads` and `cloudflare-worker` requirements. |

Worker WebSocket upgrade APIs, Durable Object storage/identity, bindings, URLs,
routing, and generated types are referenced only from the optional Worker
adapter, its checks, or its documentation. They are not accepted RunPlan,
coordinator, lifecycle, report, cancellation, or recovery concepts.

## Node hosted-test executor flow

```text
dist-node/livehost-server.mjs / local server entry
    -> hson-live Node application host (HTTP + WebSocket ownership)
    -> finite application registry
       -> hosted-test coordinator LiveHost
          -> authoritative RunPlan and capability assignment
          -> canonical in-process Node/jsdom/canvas execution
          -> opaque hson-live launcher pool
          -> supervised Node command pool
          -> per-run report LiveHost
       -> TOWL LiveHost applications
       -> circuit verification LiveHost application
    -> heartbeat/backpressure/close handling
    -> bounded authority retention and clean process shutdown
```

LiveHost owns identity, ordering, accepted plans, attempts, cancellation,
recovery, evidence routing, and terminal settlement. Executors own their
environment and release its resources. WebSocket is the current active-session
transport; it is not semantic test identity or report authority. The Node
server uses LiveHost's Node host directly and introduces no Express-style
framework layer.

## Missing capability that Phase 6A closed

The Node runtime already possessed every required nonbrowser platform
capability. What was missing was application-level description and dispatch:

1. standalone commands had no descriptor shape distinct from canonical cases
   and opaque check aggregates;
2. the hson-live launcher supervisor could not accept a general Node command;
3. command requirements were not considered during executor assignment;
4. command completion had no normalized certification denominator in reports;
5. command entrypoints that only alias already-hosted semantics were not
   distinguished from independent propositions.

Phase 6A adds `certification-aggregate`, capability-matched command descriptors,
and a generalized supervised command path. No hson-live core or public API
primitive was missing: these policies belong to the hosted Test application.

## Assignment and supervision

The Node executor advertises only capabilities it actually provides:
`javascript`, `node`, `process`, `worker-threads`, `filesystem`,
`synthetic-dom`, `synthetic-canvas`, `websocket`, `network`, `local-server`,
`compiler/typescript`, `build-tooling`, and `dynamic-generated`.

Assignment is set inclusion over descriptor requirements. It does not inspect
filenames, routes, provenance, or Cloudflare configuration. Node rejects
`cloudflare-worker`, `browser`, `browser-dom`, `chromium`, and unsupported mixed
requirements. The accepted RunPlan retains canonical catalog order and records
executor identity as evidence without changing semantic IDs.

Canonical work runs in-process under its existing guarded environments. Opaque
hson-live launchers and command certifications share bounded child-process
ownership: one active execution per identity, bounded concurrency and output,
captured stdout/stderr, truthful exit/completion handling, process-group
SIGTERM followed by a one-second SIGKILL bound, authoritative cancellation, and
disposal that leaves no owned child. Reconnect attaches to the existing attempt
and cannot start the command again.

## Exact migration inventory

These 26 independent command certifications are now selectable through Node
LiveHost:

- hson-live: array-index, attribute-transport, graph-content-codec, and
  transform-worker certifications;
- demo inspectors: keyed Reflect and three LiveInspector certificates;
- server/runtime: hosted deployment, backpressure, Node application entry,
  bootstrap integration, jsdom runtime, DOM collection, sanitizer, deterministic
  canvas runtime/collection, timing, and Phase 3A coordinator;
- application/generated: generated JSON, Amoebi geometry, soft tile, and splash
  lifecycle;
- meta/protocol: external-launcher protocol, launcher-manifest audit, and runner
  truthfulness.

These 22 command surfaces are classified `hosted-local-now` as semantic aliases,
not launched a second time: hson-live default-identity fixture; TOWL and TOWL
room; replay; the three Phase 3B cancellation commands; Node application-host;
three circuit commands; two parsing commands; five LiveTree/HSON lifecycle
commands; the two external-library aggregate commands; inclusive-library; and
DOM compatibility. Their exact work is already represented by canonical or
opaque identities in the same authoritative selection.

The four formerly external-process-class surfaces are covered by those two
paths: process semantics already represented canonically remain aliases, while
independent process-boundary propositions use the generalized supervisor.
There are no remaining `hostable-node` or `hostable-external-process` entries.

## Certifications and generated work

The panel and normalized report keep three denominators: structured cases,
opaque checks, and command certifications. Certifications never change the
5,493 semantic-check total. Twenty-six independent commands are Node-LiveHost
launchable; one is the separately denominated dynamic generator, so 25 enter
the certification denominator. Six additional certification commands are
semantic aliases already represented by hosted cases/checks. Thus 31 of the 56
certification surfaces are hosted locally and 25 remain verification-only. The
overall `verification-only` hostability class is 28 because root compatibility,
the deployed TOWL probe, and the built-production-runtime check use the `none`
denominator. This population includes the two recursive Phase 6A certificates,
deployment probes requiring external configuration, historical aggregate
certificates, and build/type/artifact checks not intentionally promoted.

Generated JSON is hosted as a command with the `dynamic-generated` capability.
`HOSTED_FUZZ_SEED` and `HOSTED_FUZZ_CASES` define reproducible attempt
configuration. Its exact check count remains dynamic and is never inserted into
a fixed case/check inventory.

## Public Node deployment inventory

| Concern | Repository contract |
|---|---|
| Build artifact | `npm run build:node-production` produces `dist-node/livehost-server.mjs` and the Node worker-thread circuit artifact without invoking Wrangler. |
| Entry command | `npm run start:production` (`node dist-node/livehost-server.mjs`). |
| Runtime | Node `>=22.12.0 <25`; build context includes sibling `hson-live`; ordinary package dependencies include `ws`, jsdom, TSX loader support for supervised source certificates, and test dependencies needed by selected commands. |
| Network | HTTP listener plus WebSocket upgrade, `HOST`/`PORT`, full path/query preservation, and long-lived connections. `GET /healthz` is the process canary. |
| Browser endpoint | Build the static UI with `VITE_LIVEHOST_WS_URL` set to the public `wss://` origin of the Node/LiveHost service. Live applications derive their paths; the frozen public Tests explorer does not connect to `/hosted-tests`. |
| Security | TLS terminates at the provider/proxy; configure exact `LIVEHOST_ALLOWED_ORIGINS`, bearer/cookie authentication, and trusted-proxy settings only when applicable. |
| Lifecycle | Persistent single-process ownership, provider restart on exit, bounded heartbeat, `SHUTDOWN_TIMEOUT_MS`, signal-driven close, and no orphan supervised children. |
| State | Coordinator/catalog are process-lifetime; TOWL rooms and terminal reports are bounded and ephemeral. Restart changes authority incarnations; no durable report reconstruction is claimed. |
| Provider work | Select a persistent Node host, provision hostname/TLS/WebSocket forwarding and environment, deploy artifact, then rebuild the frontend endpoint. No vendor is selected here. |

The repository does not prove a currently deployed Node endpoint, so
`hosted-deployed-now` remains zero. Cloudflare may be used as a transparent
proxy/static host, but its Worker runtime is not required in the execution path.

## Phase 6A census snapshot

| Class | Surfaces |
|---|---:|
| `hosted-local-now` | 328 |
| `hostable-node` | 0 |
| `hostable-external-process` | 0 |
| `hostable-worker` | 1 |
| `hostable-browser` | 19 |
| `verification-only` | 28 |
| `hosted-deployed-now` | 0 verified |
| `blocked-external` | 0 |
| excluded developer utilities | 12 |

There are 376 legitimate runnable/verification surfaces. Current semantic truth
is unchanged at 153 canonical suites / 2,499 cases plus 126 opaque launchers /
2,994 checks = 5,493 nonduplicative semantic checks. Browser truth is 14 specs /
71 journeys plus four raster fidelity cases. One generated surface stays
dynamic. The separate certification denominator is 56.

The only unhosted execution capability in the ordinary runnable population is
the real-browser/Chromium environment reserved for Phase 6B. The optional
Worker surface certifies Cloudflare compatibility itself. Nothing is classified
genuinely blocked.

## Recorded Phase 6A execution

The complete production-path certificate selected 305 suites: 153 canonical
suites / 2,499 cases, 126 opaque launchers / 2,994 checks, and 26 command
certifications. It reported zero failures, cancellation readiness, successful
report recovery, healthy post-run canary, zero backpressure rejections, 160
incremental report commits, and 171.3 seconds wall time.

The representative existing performance guard used fixed ordinary concurrency
two, special concurrency one, and verified direct launcher invocation. It
started 126 launchers and passed all 5,493 semantic checks with zero failures.
Its 641.7-second wall time is diagnostic rather than a threshold; the matrix
driver's fresh-process capture is intentionally distinct from the public server
latency certificate above.
