# TOWL Cloudflare Worker compatibility deployment

This adapter is a compatibility target, not the Node LiveHost architecture.
The complete Node LiveHost builds, starts, discovers, executes, cancels,
recovers, reports, and shuts down without Wrangler, bindings, Durable Objects,
or a Worker URL. Removing this adapter excludes only certification whose
explicit subject is Cloudflare Worker compatibility.

## Scope and authority lifetime

This is an explicitly non-hibernating proof-of-deployment adapter. Each
`HostedTestDurableObject` constructs exactly one in-memory
`create_hosted_test_application` composition and uses the ordinary
`server.accept()` WebSocket API. It does not call `state.acceptWebSocket()` and
does not persist application authority in Durable Object storage.

The namespace is SQLite-backed so it can run on the Workers Free plan, but this
slice intentionally writes nothing to SQLite. Persisting only a subset of the
authority would create an unsafe shadow state.

Durable Object eviction, restart, deployment, or reconstruction resets all
coordinator state, dynamically registered report Loci, sessions, action-dedupe
outcomes, canonical revisions and replay history, retention metadata, and
in-flight runs. Existing clients must reconnect to the new empty authority;
recovery across reconstruction is not supported or claimed.

Ordinary accepted WebSockets keep the Durable Object in memory while connected
and incur Durable Object duration usage. This is suitable for deployment proof
and bounded hosted-test sessions, but it does not receive the cost benefit of
WebSocket hibernation.

The Worker advertises only the canonical case descriptors it can execute and
accepts those identities through `tests.runSelected`. It does not advertise
Node-only opaque launchers or synthetic-DOM work, and removed aggregate/category
routes are not registered. Absence from Worker discovery is capability truth,
not an unsupported-result projection. Lazy case inspection remains unavailable
in this slice.

Full hibernation/reconstruction support requires one canonical hosted-test
application checkpoint surface capable of exporting and restoring coordinator
state, report hosts, revisions/incarnations, replay history, sessions, dedupe
outcomes, retention metadata, and any recoverable execution state.

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

The Durable Object retains the obsolete hosted-test implementation internally,
but the public fetch handler no longer routes visitors to it. TOWL browser URL
construction and the Locus wire protocol are unchanged.

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
npm run test:hosted-cloudflare
npm run cloudflare:types
npm run cloudflare:deploy
```

`wrangler.jsonc` provisions `HostedTestDurableObject` as a SQLite-backed class
through the `v1` `new_sqlite_classes` migration and binds it as `HOSTED_TESTS`.

Before deploying, authenticate Wrangler with `wrangler login` or provide the
standard Cloudflare API token/account environment configuration. Convert the
existing Worker's generated `https://...workers.dev` hostname to a `wss://`
origin and supply it as `VITE_LIVEHOST_WS_URL` when preparing the static build.
The ordinary browser test explorer does not use this endpoint.
