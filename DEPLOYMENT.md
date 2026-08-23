# Hosted-test deployment

## Worker command

From the parent deployment workspace, `npm run deploy:worker` deploys only
this Cloudflare Worker and Durable Object adapter. It does not publish the
static Vite application, deploy the persistent Node service, commit a release,
or push Git state. The parent command verifies clean, gitlink-pinned
`hson-live` and `hson-demo2` checkouts; builds; checks the `hson-live` public
entrypoints and built package surface; and typechecks this package before it
checks for `CLOUDFLARE_API_TOKEN` and invokes Wrangler. See
[`../DEPLOYMENT.md`](../DEPLOYMENT.md) for the full local preflight.

## Architecture

The browser application is a static Vite build. The repository contains no
provider manifest, container, process declaration, or deployment workflow. The
live site redirects to `https://hson.terminalgothic.com` and is served through
Cloudflare, but the proxy hides the origin provider. Neither this package nor
the parent deployment package defines a persistent Node process or a WebSocket
upgrade route.

Consequently, the checked-in deployment model requires two services:

1. a static host for the Vite `dist/` output; and
2. a WebSocket-capable host running either the complete hosted-test Node
   process or the bounded Cloudflare Durable Object adapter.

The repository also contains an optional Cloudflare Workers + Durable Objects
portability proof. See [CLOUDFLARE.md](./CLOUDFLARE.md). It is
explicitly non-hibernating and currently exposes only the Worker-compatible
suite subset documented there; the conventional Node service remains the
complete hosted-test deployment.

### TOWL client/authority compatibility gate

The static browser bundle and WebSocket authority must be rebuilt from the same
compatible `hson-live` source. Projected-state recovery snapshots are HSON
protocol data; deploying a newer strict parser beside an older Worker serializer
can let the socket and session attach succeed but fail the first recovery
snapshot before TOWL state is installed.

After deploying the Worker and before promoting the matching static bundle, run:

```sh
TOWL_DEPLOYED_WS_URL=wss://<worker-host>/socket npm run diagnose:towl-deployed
```

The probe creates a fresh ephemeral TOWL room, creates a session, consumes the
revision-zero recovery snapshot with the current client, and exits nonzero on
any compatibility failure. A release is healthy only when it prints
`"compatible": true`. Redeploying only the static bundle is insufficient when
this gate reports a Worker-emitted snapshot parse failure.

Cloudflare in front of the current site is not evidence that the static origin
can execute a persistent Node process. Do not point the browser at a Worker,
function, or static host unless that product explicitly supports this stateful,
long-running WebSocket server.

The `hson-demo2` package is not a workspace of the parent package. It has its
own `package.json` and lockfile and currently resolves `hson-live` from the
sibling `../hson-live` directory. A server build context must therefore contain
both sibling directories in that layout. `ws` is a direct runtime dependency
of `hson-demo2`; `@types/ws` is a direct development dependency.

## Local development

From `hson-demo2`, run the server and frontend in separate terminals:

```sh
npm run hosted:test-server
npm run dev
```

The server defaults to `HOST=127.0.0.1`, `PORT=8787`, and the development
browser defaults to `ws://127.0.0.1:8787`.

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

Set the public WebSocket endpoint while building the Vite frontend:

```sh
VITE_HOSTED_TEST_WS_URL=wss://hosted-tests.example.com/socket npm run build
```

`VITE_HOSTED_TEST_WS_URL` is public build-time configuration, not a secret.
Changing it requires rebuilding and redeploying the frontend. Production builds
require an explicit `wss://` URL. If it is absent, the test panel reports:

> Hosted tests are unavailable because VITE_HOSTED_TEST_WS_URL was not configured for this deployment.

An explicit runtime `url` remains available for tests and embedding and takes
precedence over the Vite value.

## Server production runtime

Install and validate the server from a build context containing both
`hson-demo2` and its sibling `hson-live`:

```sh
cd hson-demo2
npm ci
npm run check
```

Build and start the deterministic JavaScript artifact on supported Node
`>=22.12.0 <25`:

```sh
npm run build:node-production
HOST=0.0.0.0 PORT="$PORT" \
LIVEHOST_ALLOWED_ORIGINS=https://hson.example.com \
LIVEHOST_BEARER_TOKEN="$LIVEHOST_BEARER_TOKEN" \
npm run start:production
```

`HOST` defaults to `127.0.0.1` and `PORT` defaults to `8787` for local use.
Production platforms normally supply `PORT`; bind `HOST` to `0.0.0.0` so the
platform proxy can reach the process. A bind address such as
`ws://0.0.0.0:8787` is diagnostic only and must never be used as the browser
configuration. The production entry defaults to
`LIVEHOST_DEPLOYMENT=production` and fails before listening when origins,
credentials, runtime, or numeric configuration are invalid. It runs
`dist-node/livehost-server.mjs`, not TypeScript or `tsx`.

## Authority lifetime and restart contract

The Node process owns two finite application registries, separate from
transport limits:

- TOWL defaults to at most 128 loaded rooms, eligible for eviction 30 minutes
  after connections and resumable-session grace are gone.
- hosted tests default to at most 16 loaded reports, retained for 10 minutes
  after terminal execution and subscribers are gone.
- one unreferenced 30-second sweep applies both policies.

Configure these with `LIVEHOST_MAX_TOWL_ROOMS`, `LIVEHOST_TOWL_IDLE_MS`,
`LIVEHOST_MAX_HOSTED_REPORTS`, `LIVEHOST_HOSTED_REPORT_RETENTION_MS`, and
`LIVEHOST_AUTHORITY_SWEEP_INTERVAL_MS`. Values are finite positive integers.
TOWL idle time cannot be shorter than its 30-second resumable-session grace,
and the sweep interval cannot exceed either retention duration. Invalid values
fail before listening.

Running reports, attached clients, resumable sessions inside grace, actions,
recovery, persistence, and request acquisitions cannot be automatically
evicted. Capacity exhaustion rejects new room/report creation; it never removes
an active authority. The hosted-test coordinator and canonical catalog remain
process-lifetime application state.

TOWL rooms and hosted reports are ephemeral projected-data authorities.
Eviction or process restart loses their state, sessions, history, and
credentials. Returning to the same TOWL room key creates initial game state
with a new incarnation; old bootstrap state uses the existing incarnation-
replacement recovery path. Reports are not reconstructed after eviction.
Document persistence in `hson-live` does not make these projected authorities
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
through `LIVEHOST_ALLOWED_ORIGINS`; missing and `null` origins reject in this
production composition. Bootstrap HTTP and WebSocket requests independently
authenticate the same principal. Non-browser clients may use an
`Authorization: Bearer` header. Browser deployments provision an HttpOnly
`livehost_auth` cookie (name configurable with
`LIVEHOST_AUTH_COOKIE_NAME`) at the proxy/application identity boundary; this
server does not create login routes or cookies. The token is never placed in
bootstrap state or query parameters.

Direct mode ignores all forwarded identity headers. To trust a TLS-terminating
proxy, set `LIVEHOST_TRUSTED_PROXY_PEERS` to the comma-separated immediate peer
addresses and optionally `LIVEHOST_FORWARDED_FOR_HOP=first|last`. Only trusted
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
public TLS hostname, enable WebSocket forwarding, then set
`VITE_HOSTED_TEST_WS_URL` in the frontend build settings and rebuild the static
site.

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
