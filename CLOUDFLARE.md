# Optional Cloudflare hosted-test Worker

This adapter is a portability target, not the Node LiveHost architecture.
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

## Routing

The Worker accepts URLs shaped like:

```text
wss://<worker-host>/<optional-path>?locus=<selector>
```

Only WebSocket upgrades are accepted. `locus` is required and must be
non-empty. The Worker passes the original path and query to one stable Durable
Object selected with:

```text
idFromName("hson-demo2-hosted-tests-v1")
```

Inside that object, the existing hosted-test application distinguishes
`hosted-tests` from dynamically created `hosted-report:<run-id>` Loci. The
browser URL construction and Locus wire protocol are unchanged.

## Local development

Install dependencies and start Wrangler from `hson-demo2`:

```sh
npm ci
npm run cloudflare:dev
```

Wrangler prints the local HTTP origin. Use its equivalent `ws://` URL plus the
existing `locus` query for direct internal probes. Tooling that explicitly
exercises this optional adapter can use the deployed secure endpoint:

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
first deploy, internal hosted-test diagnostics can convert the generated
`https://...workers.dev` hostname to `wss://` and pass it explicitly as
`VITE_HOSTED_TEST_WS_URL`. The ordinary browser test explorer does not use this
endpoint. A custom Worker route is optional and must support WebSocket upgrades.
