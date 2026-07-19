# Cloudflare hosted-test Worker

## Scope and authority lifetime

This is an explicitly non-hibernating proof-of-deployment adapter. Each
`HostedTestDurableObject` constructs exactly one in-memory
`create_hosted_test_application` authority and uses the ordinary
`server.accept()` WebSocket API. It does not call `state.acceptWebSocket()` and
does not persist application authority in Durable Object storage.

The namespace is SQLite-backed so it can run on the Workers Free plan, but this
slice intentionally writes nothing to SQLite. Persisting only a subset of the
authority would create an unsafe shadow state.

Durable Object eviction, restart, deployment, or reconstruction resets all
coordinator state, dynamically registered report hosts, sessions, action-dedupe
outcomes, canonical revisions and replay history, retention metadata, and
in-flight runs. Existing clients must reconnect to the new empty authority;
recovery across reconstruction is not supported or claimed.

Ordinary accepted WebSockets keep the Durable Object in memory while connected
and incur Durable Object duration usage. This is suitable for deployment proof
and bounded hosted-test sessions, but it does not receive the cost benefit of
WebSocket hibernation.

The Worker registry executes the Worker-compatible `livemap/replay`,
`livehost/all`, `category/livehost`, `category/transform`, and `category/unit`
routes. The canonical `hosted/all`, `node/all`, `category/livetree`,
`category/livemap`, `category/dev`, `dom/core`, and `canvas/core` routes remain
registered but return a clear `CLOUDFLARE_HOSTED_SUITE_UNAVAILABLE`
infrastructure failure because they require the Node/jsdom runtime. Lazy case
inspection is likewise unavailable in this slice. The conventional Node server
continues to provide the complete registry and inspection behavior unchanged.

Full hibernation/reconstruction support requires one canonical hosted-test
application checkpoint surface capable of exporting and restoring coordinator
state, report hosts, revisions/incarnations, replay history, sessions, dedupe
outcomes, retention metadata, and any recoverable execution state.

## Routing

The Worker accepts URLs shaped like:

```text
wss://<worker-host>/<optional-path>?livehost=<host-id>
```

Only WebSocket upgrades are accepted. `livehost` is required and must be
non-empty. The Worker passes the original path and query to one stable Durable
Object selected with:

```text
idFromName("hson-demo2-hosted-tests-v1")
```

Inside that object, the existing hosted-test application distinguishes
`hosted-tests` from dynamically created `hosted-report:<run-id>` hosts. The
browser URL construction and LiveHost wire protocol are unchanged.

## Local development

Install dependencies and start Wrangler from `hson-demo2`:

```sh
npm ci
npm run cloudflare:dev
```

Wrangler prints the local HTTP origin. Use its equivalent `ws://` URL plus the
existing `livehost` query for direct probes. The production browser must be
built with the deployed secure endpoint:

```sh
VITE_HOSTED_TEST_WS_URL=wss://hson-demo2-hosted-tests.<account>.workers.dev/socket npm run build
```

## Checks and deployment

```sh
npm run check:cloudflare
npm run test:hosted-cloudflare
npm run cloudflare:types
npm run cloudflare:deploy
```

`wrangler.jsonc` provisions `HostedTestDurableObject` as a SQLite-backed class
through the `v1` `new_sqlite_classes` migration and binds it as `HOSTED_TESTS`.

Before deploying, authenticate Wrangler with `wrangler login` or provide the
standard Cloudflare API token/account environment configuration. After the
first deploy, copy the generated `https://...workers.dev` hostname, convert it
to `wss://`, set it as the frontend build-time
`VITE_HOSTED_TEST_WS_URL`, and rebuild the frontend. A custom Worker route is
optional and must support WebSocket upgrades.
