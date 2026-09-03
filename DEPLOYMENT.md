# LiveDemo build and deployment boundary

This repository builds the static browser application, the production Node
LiveHost runtime, and the Cloudflare TOWL compatibility Worker. Deployment is a
separate downstream operation: it does not run tests and it does not update Git
submodules.

Run tests and create local evidence independently with `npm run test:report`.
See [`tests/docs/workflow.md`](./tests/docs/workflow.md). Failed, cancelled,
unsupported, and infrastructure-error reports remain valid terminal evidence;
they are not deployment admission records.

## Static application

Build the Vite application with:

```sh
npm run build
```

The static host publishes `dist/`. It must preserve the checked-in
`public/_redirects` SPA fallback so direct `/towl?room=<room-id>` navigation
retains the query string.

The Tests explorer requires one immutable static report root:

```sh
VITE_TEST_EVIDENCE_ROOT=/test-evidence/<run-id> npm run build
```

Publish the matching `.test-reports/<run-id>/site/` content at that exact
public path. The explorer progressively fetches static JSON and admitted
attachments. It never runs tests, opens a report WebSocket, or falls back to a
mutable local pointer.

Live browser features use `VITE_LIVEHOST_WS_URL`, a `ws://` or `wss://` origin
without an application path. Production requires `wss://`; loopback `ws://` is
for local development. TOWL derives `/towl`, and circuit verification derives
`/circuit-verification`.

## Production Node runtime

Build the Node artifacts with:

```sh
npm run build:node-production
```

The command produces `dist-node/livehost-server.mjs` and
`dist-node/circuit-verification-worker.mjs`. Start the bundled server on a
supported Node release with:

```sh
HOST=0.0.0.0 PORT="$PORT" \
LOCUS_ALLOWED_ORIGINS=https://hson.example.com \
LOCUS_BEARER_TOKEN="$LOCUS_BEARER_TOKEN" \
npm run start:production
```

`LOCUS_ALLOWED_ORIGINS` and a high-entropy `LOCUS_BEARER_TOKEN` are required in
production. `HOST` defaults to `127.0.0.1`, `PORT` to `8787`, and
`SHUTDOWN_TIMEOUT_MS` to `5000`. Optional TOWL limits are
`LOCUS_MAX_TOWL_ROOMS`, `LOCUS_TOWL_IDLE_MS`, and
`LOCUS_AUTHORITY_SWEEP_INTERVAL_MS`.

The service exposes product routes `GET /session`, `/towl`, and
`/circuit-verification`; LiveHost owns `GET /healthz`. The process must sit
behind TLS with WebSocket upgrade headers, paths, and query strings preserved.
It contains no public test route.

## Local product development

Start Vite with `npm run dev`. Start `npm run local:livehost-server` separately
only when TOWL or circuit-verification product behavior needs a local origin.
Test report generation does not use that server.

## Cloudflare compatibility Worker

The Worker is a TOWL/session production compatibility adapter, not a deployment
test runner. Typecheck it with `npm run check:cloudflare`, test its production
adapter directly with `npm run test:towl-worker-compatibility`, and deploy only
when explicitly requested with `npm run deploy:worker`. That deploy script
builds and typechecks; it does not execute tests or update submodules.

See [`CLOUDFLARE.md`](./CLOUDFLARE.md) for routes, lifecycle, and provider
identity constraints.
