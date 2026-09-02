# Hosted-test deployment

## Worker command

From the parent deployment workspace, `npm run deploy:worker` deploys only
this Cloudflare Worker and Durable Object adapter. It does not publish the
static Vite application, deploy the persistent Node service, commit a release,
or push Git state. The parent command verifies clean, gitlink-pinned
`hson-live` and `hson-demo2` checkouts; builds; checks the `hson-live` public
entrypoints and built package surface; and typechecks this package before it
checks for either `CLOUDFLARE_API_TOKEN` or an authenticated local Wrangler
session and invokes Wrangler. See
[`../DEPLOYMENT.md`](../DEPLOYMENT.md) for the full local preflight.

## Architecture

The browser application is a static Vite build. The repository contains no
provider manifest, container, process declaration, or deployment workflow. The
live site redirects to `https://hson.terminalgothic.com` and is served through
Cloudflare, but the proxy hides the origin provider. Neither this package nor
the parent deployment package defines a persistent Node process or a WebSocket
upgrade route.

The default complete deployment model requires two services:

1. a static host for the Vite `dist/` output; and
2. a WebSocket-capable host running the public Node LiveHost process.

The repository also contains the existing Cloudflare Workers + Durable Objects
TOWL compatibility service. See [CLOUDFLARE.md](./CLOUDFLARE.md). It is
explicitly non-hibernating and exposes only anonymous `/session` compatibility
and `/towl`; the Node service remains the complete future LiveHost deployment.

### TOWL client/authority compatibility gate

The static browser bundle and WebSocket authority must be rebuilt from the same
compatible `hson-live` source. data state recovery snapshots are Hson
protocol data; deploying a newer strict parser beside an older Worker serializer
can let the socket and session attach succeed but fail the first recovery
snapshot before TOWL state is installed.

After a Worker compatibility deployment and before promoting a static bundle
that targets it, run:

```sh
TOWL_DEPLOYED_WS_URL=wss://<worker-host>/towl npm run diagnose:towl-deployed
```

The probe creates a fresh ephemeral TOWL room, creates a session, consumes the
revision-zero recovery snapshot with the current client, and exits nonzero on
any compatibility failure. A release is healthy only when it prints
`"compatible": true`. Redeploying only the static bundle is insufficient when
this gate reports a Worker-emitted snapshot parse failure.

For the TOWL-only compatibility lane, point `VITE_LIVEHOST_WS_URL` at the
existing Worker's secure origin. The browser derives `/towl`, and the Worker
provides the no-cookie `/session` bootstrap required by the generic origin
contract. `/circuit-verification` remains unavailable on that origin.

The `hson-demo2` package is a parent-workspace member with its own
`package.json` and lockfile. It resolves `hson-live` from the sibling
`../hson-live` directory. A server build context must therefore contain both
sibling directories in that layout. `ws` is a direct runtime dependency of
`hson-demo2`; `@types/ws` is a direct development dependency.

## Local development

The browser tests explorer is frozen in local development as well as production.
Generate its exact immutable evidence root and start the frontend:

```sh
npm run pack
npm run dev
```

For ordinary local packaging, `npm run pack` needs no
runtime-origin environment prefix. Both default `VITE_LIVEHOST_WS_URL` to the
established local production-simulation origin `ws://127.0.0.1:8787`. Supplying
`VITE_LIVEHOST_WS_URL` explicitly overrides that default and validates the
supplied origin before capture. This local default does not change the separate
public deployment requirement for an appropriate public `wss://` origin.

`pack` writes the generated `.env.frozen-local.local` pointer. Vite reads that
local-only file and serves the matching evidence directory from the packed
static artifact. No manual copy or environment export is required.

Run `npm run hosted:test-server` separately only when CLI/build tooling or
internal LiveHost diagnostics require the hosted execution substrate. The
ordinary browser tests explorer never connects to it.

## Frontend production build

The stable same-origin TOWL entry is `/towl`, with invitations shaped as
`/towl?room=<room-id>`. Vite development and preview servers return the SPA
entry document for direct navigation to that path. The checked-in
`public/_redirects` file supplies the equivalent production fallback:

```text
/*      /index.html 200
```

The static host must publish that file or configure the equivalent internal
rewrite for `/towl` (including direct refreshes) while preserving the query
string. It must not redirect the invitation to `/` or discard `room`. No
subdomain is required; keeping TOWL on the LiveDemo origin preserves room
credentials in the same local-storage boundary and reuses the same assets and
WebSocket configuration.

Frozen public test exploration is built with an accepted immutable evidence root:

```sh
VITE_TEST_EVIDENCE_ROOT=/test-evidence/<exact-40-hex-hson-deploy-commit> npm run build
```

The frozen browser explorer uses ordinary HTTP to load its index and explicit row
evidence artifacts; it never starts hosted tests or opens a hosted-test
WebSocket in either development or production. Live browser applications use
`VITE_LIVEHOST_WS_URL`, the browser-visible generic runtime origin. TOWL derives
`/towl` and circuit verification derives
`/circuit-verification` while preserving intentional query parameters and
replacing `locus`. The value is an origin, not an application URL, and production
requires `wss://` except for explicit localhost simulation. Missing frozen
evidence is a visible frozen infrastructure error, never a live-test fallback.
The Worker compatibility origin implements `/session` and `/towl` only, so a
static build targeting it restores TOWL while leaving circuit verification
unavailable.

Generate and execute test evidence through `npm run test:cli` or `npm run pack`.
LiveHost remains the execution substrate for those paths;
the browser is an evidence consumer, not a test authority.

An explicit runtime `url` remains available for tests and embedding and takes
precedence over the Vite value.

## Server production runtime

The Node service is the default hosted authority. It runs from the parent
deployment workspace, which must retain sibling `hson-demo2` and `hson-live`
directories, their installed runtime packages, and these build artifacts:

- `hson-demo2/dist-node/livehost-server.mjs`;
- `hson-demo2/dist-node/circuit-verification-worker.mjs`; and
- `hson-live/dist/` resolved through `hson-demo2`'s unchanged
  `file:../hson-live` dependency.

The production server artifact is bundled from application source, so TypeScript
source files are not required after build. It retains only its public runtime
imports: `hson-live` and `ws`. Install and validate from that sibling layout;
do not copy individual artifacts into a different package boundary.

```sh
cd ..
npm ci
LOCUS_ALLOWED_ORIGINS=https://hson.example.com \
LOCUS_BEARER_TOKEN="$LOCUS_BEARER_TOKEN" \
npm run prepare:node-production
```

`prepare:node-production` is repository-side preparation, not a deployment.
It verifies, builds, checks, and validates the Node production contract. Start
the deterministic JavaScript artifact on supported Node `>=22.12.0 <25`:

```sh
npm run build:node-production
HOST=0.0.0.0 PORT="$PORT" \
LOCUS_ALLOWED_ORIGINS=https://hson.example.com \
LOCUS_BEARER_TOKEN="$LOCUS_BEARER_TOKEN" \
npm -w hson-demo2 run start:production
```

`HOST` defaults to `127.0.0.1` and `PORT` defaults to `8787` for local use.
Production platforms normally supply `PORT`; bind `HOST` to `0.0.0.0` so the
platform proxy can reach the process. A bind address such as
`ws://0.0.0.0:8787` is diagnostic only and must never be used as the browser
configuration. The production entry defaults to
`LOCUS_DEPLOYMENT=production` and fails before listening when origins,
credentials, runtime, or numeric configuration are invalid. It runs
`dist-node/livehost-server.mjs`, not TypeScript or `tsx`.

### Production environment contract

| Variable | Production contract |
| --- | --- |
| `LOCUS_DEPLOYMENT` | Optional; production entry defaults it to `production`. Set only to `production` for this service. |
| `LOCUS_ALLOWED_ORIGINS` | Required; comma-separated exact browser origins. |
| `LOCUS_BEARER_TOKEN` | Required high-entropy deployment secret (use at least 32 random bytes encoded without cookie delimiters). Operational clients may use it as a Bearer token. |
| `HOST` | Optional bind address; defaults to `127.0.0.1`. Production providers normally use `0.0.0.0`. |
| `PORT` | Optional integer from 1 through 65535; defaults to `8787`. |
| `SHUTDOWN_TIMEOUT_MS` | Optional positive integer; defaults to `5000`. |
| `LOCUS_AUTH_COOKIE_NAME` | Optional cookie name; defaults to `locus_auth`. |
| `LOCUS_TRUSTED_PROXY_PEERS` | Optional comma-separated immediate proxy peer addresses. Leave unset for direct mode. |
| `LOCUS_FORWARDED_FOR_HOP` | Optional only with trusted peers; `first` or `last`. |
| `LOCUS_MAX_TOWL_ROOMS`, `LOCUS_TOWL_IDLE_MS`, `LOCUS_AUTHORITY_SWEEP_INTERVAL_MS` | Optional positive-integer TOWL lifecycle limits. The idle and sweep relationships are validated before listening. |
| `VITE_TEST_EVIDENCE_ROOT` | Required immutable public frozen-test evidence root: `/test-evidence/<exact-40-hex-hson-deploy-commit>`. |
| `VITE_LIVEHOST_WS_URL` | Required browser-visible WebSocket origin of the deployed Node/LiveHost service. It contains no application path; TOWL and circuit verification derive their routes and bootstrap anonymous service admission at `/session`. |
| `CLOUDFLARE_API_TOKEN`, `TOWL_DEPLOYED_WS_URL` | Worker compatibility deployment/probe only; not required by the Node authority. |

The local readiness endpoint is unauthenticated `GET /healthz`. It returns 200
with `{ "ready": true }` only after every public application is ready, and 503
otherwise. A provider should check this endpoint locally through its proxy;
the repository does not provision that proxy, TLS, DNS, process supervisor, or
public endpoint.

The public process registers exactly `GET /session`, `/towl`, and
`/circuit-verification`; `/healthz` is owned by LiveHost. `GET /session` is
anonymous service admission, not a login: an exact allowed browser Origin
receives a host-only, browser-session `HttpOnly; Secure; SameSite=Strict;
Path=/` cookie and exact-origin credentialed CORS headers. Missing, `null`, and
unlisted Origins receive no cookie. TOWL's room/seat credentials remain a
separate protocol concern. `/hosted-tests` is intentionally absent from this
public runtime; public Tests are frozen static evidence.

## Authority lifetime and restart contract

The Node process owns two finite application registries, separate from
transport limits:

- TOWL defaults to at most 128 loaded rooms, eligible for eviction 30 minutes
  after connections and resumable-session grace are gone.
- hosted tests default to at most 16 loaded reports, retained for 10 minutes
  after terminal execution and subscribers are gone.
- one unreferenced 30-second sweep applies both policies.

Configure these with `LOCUS_MAX_TOWL_ROOMS`, `LOCUS_TOWL_IDLE_MS`,
`LOCUS_MAX_HOSTED_REPORTS`, `LOCUS_HOSTED_REPORT_RETENTION_MS`, and
`LOCUS_AUTHORITY_SWEEP_INTERVAL_MS`. Values are finite positive integers.
TOWL idle time cannot be shorter than its 30-second resumable-session grace,
and the sweep interval cannot exceed either retention duration. Invalid values
fail before listening.

Running reports, attached clients, resumable sessions inside grace, actions,
recovery, persistence, and request acquisitions cannot be automatically
evicted. Capacity exhaustion rejects new room/report creation; it never removes
an active authority. The hosted-test coordinator and canonical catalog remain
process-lifetime application state.

TOWL rooms and hosted reports are ephemeral data authorities.
Eviction or process restart loses their state, sessions, history, and
credentials. Returning to the same TOWL room key creates initial game state
with a new incarnation; old bootstrap state uses the existing incarnation-
replacement recovery path. Reports are not reconstructed after eviction.
Document persistence in `hson-live` does not make these data authorities
durable.

The supported Node topology is one process and one application registry owning
each logical authority. Multi-process service of one authority namespace is
unsupported; a shared database alone is not distributed locking. Cloudflare
Durable Objects retain their platform-keyed ownership and existing Worker
behavior instead of using this Node policy.

## Proxy and network requirements

The public service must terminate TLS and expose a `wss://` URL. Its reverse
proxy must forward HTTP Upgrade and Connection headers to the Node process and
must retain the full path and query string. Exact browser origins are required
through `LOCUS_ALLOWED_ORIGINS`; missing and `null` origins reject in this
production composition. Bootstrap HTTP and WebSocket requests independently
authenticate the same principal. Non-browser clients may use an
`Authorization: Bearer` header. Browser deployments provision an HttpOnly
`locus_auth` cookie (name configurable with
`LOCUS_AUTH_COOKIE_NAME`) at the proxy/application identity boundary; this
server does not create login routes or cookies. The token is never placed in
bootstrap state or query parameters.

Direct mode ignores all forwarded identity headers. To trust a TLS-terminating
proxy, set `LOCUS_TRUSTED_PROXY_PEERS` to the comma-separated immediate peer
addresses and optionally `LOCUS_FORWARDED_FOR_HOP=first|last`. Only trusted
peers influence effective scheme, host, and client address through
`X-Forwarded-For`, `X-Forwarded-Proto`, and `X-Forwarded-Host`.
The `Forwarded` header is intentionally unsupported and rejected in trusted
mode.

The browser preserves existing query parameters and adds or replaces
`locus=<selector>` for coordinator, report, and reconnect sockets. The
application interprets this selector; LiveHost does not assign universal
topology. Do not
configure a proxy that discards those parameters. Choose proxy and platform
idle timeouts suitable for WebSocket sessions; this protocol has no polling or
HTTP fallback. The service must remain a persistent process and should be
restarted by the platform if it exits.

Provider dashboard work remains intentionally provider-specific: create the
persistent Node service, set its build context and start command, attach a
public TLS hostname, and enable WebSocket forwarding for live features. Supply
that service origin as `VITE_LIVEHOST_WS_URL` when preparing the static artifact.
Build the public frozen test site with its accepted immutable evidence root; it
has no visitor-triggered hosted-test endpoint requirement.

## Hosted-test timing boundaries

Hosted-test durations use the monotonic `performance.now()` clock:

- `canonical phase` begins when the canonical executor task starts and ends
  when that task becomes terminal, including a reported failure.
- `external phase` begins when the external pool task starts and ends after
  every selected launcher has closed and reported.
- `runner` or `hosted total` begins when the accepted selection is dispatched
  to the combined Node runner and ends after both execution phases are
  terminal.
- `host` begins immediately before the host invokes the runner and ends when
  the runner returns, immediately before the terminal report commit.
- Panel `elapsed` begins when the panel accepts the user's run action, before
  dispatch, and ends after the terminal mirrored report has been applied. It
  includes action round-trip and final report application, but excludes
  application boot and discovery.

The reproducible performance probe is:

```sh
npm run test:hosted-performance-node -- --repeats=1 --policies=fixed:2 --invocation=verified
```

The representative production-mode sample derives the current canonical-case
and opaque-check selection in a fresh Node process. Increase repeats or add
policies for comparative tuning; `tsx` remains an optional source-loader
comparison rather than the production baseline. The matrix driver reports the
two denominators separately, phase medians, inclusive median and range,
observed concurrency, launcher starts, and pass/fail totals. Timing values are
diagnostic measurements, not correctness thresholds.
