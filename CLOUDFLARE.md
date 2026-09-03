# TOWL Cloudflare Worker compatibility deployment

This adapter is a production compatibility target for TOWL and anonymous
session admission, not a remote test executor. Local tests and reports run
without Wrangler, bindings, Durable Objects, or a Worker URL.

## Scope and authority lifetime

This is an explicitly non-hibernating TOWL adapter. Each Durable Object owns one
in-memory TOWL authority and uses the ordinary `server.accept()` WebSocket API.
It does not call `state.acceptWebSocket()` and does not persist application
authority in Durable Object storage.

The namespace is SQLite-backed so it can run on the Workers Free plan, but this
slice intentionally writes nothing to SQLite. Persisting only a subset of the
authority would create an unsafe shadow state.

Durable Object eviction, restart, deployment, or reconstruction resets its TOWL
rooms. Existing clients must reconnect to the new empty authority; recovery
across reconstruction is not supported or claimed.

Ordinary accepted WebSockets keep the Durable Object in memory while connected
and incur Durable Object duration usage. This does not receive the cost benefit
of WebSocket hibernation.

## Public routing

The public Worker surface accepts only:

```text
GET https://<worker-host>/session
wss://<worker-host>/towl?locus=towl:<room-id>
```

`GET /session` is a no-cookie compatibility response for the generic browser
bootstrap. It admits only the existing public LiveDemo origins (plus loopback
development origins) and grants no account or service credential. `/towl`
requires a WebSocket upgrade, an accepted browser Origin when one is present,
and a `towl:` Locus selector. Hosted Tests and `/circuit-verification` return
404 and do not reach the Durable Object.

The Worker passes valid TOWL upgrades to one stable Durable Object selected with:

```text
idFromName("hson-demo2-hosted-tests-v1")
```

The historical instance name is provider state identity only. The implementation
contains no hosted-test discovery, selection, execution, registry, or report
authority. TOWL browser URL construction and the Locus wire protocol are
unchanged.

## Local development

Install dependencies and start Wrangler from `hson-demo2`:

```sh
npm ci
npm run cloudflare:dev
```

Wrangler prints the local HTTP origin. Use its equivalent `ws://` origin as
`VITE_LIVEHOST_WS_URL`; the browser derives `/towl` and the existing `locus`
query. The local compatibility `/session` response allows loopback browser
origins.

## Checks and deployment

```sh
npm run check:cloudflare
npm run test:towl-worker-compatibility
npm run test:towl-room
npm run cloudflare:types
npm run cloudflare:deploy
```

`wrangler.jsonc` provisions `HostedTestDurableObject` as a SQLite-backed class
through the `v1` `new_sqlite_classes` migration and binds it as `HOSTED_TESTS`.
Those two historical names remain because they are bound to Cloudflare platform
identity; the class itself is TOWL-only. Production Worker implementation lives
under `src/server/cloudflare`, and its tests import that production code.

Before deploying, authenticate Wrangler with `wrangler login` or provide the
standard Cloudflare API token/account environment configuration. Convert the
existing Worker's generated `https://...workers.dev` hostname to a `wss://`
origin and supply it as `VITE_LIVEHOST_WS_URL` when preparing the static build.
The ordinary browser test explorer does not use this endpoint.
