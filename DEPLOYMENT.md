# Hosted-test deployment

## Architecture discovered

The browser application is a static Vite build. The repository contains no
provider manifest, container, process declaration, or deployment workflow. The
live site redirects to `https://hson.terminalgothic.com` and is served through
Cloudflare, but the proxy hides the origin provider. Neither this package nor
the parent deployment package defines a persistent Node process or a WebSocket
upgrade route.

Consequently, the checked-in deployment model requires two services:

1. a static host for the Vite `dist/` output; and
2. a WebSocket-capable host running the hosted-test Node process.

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

Use this start command on a persistent Node service:

```sh
HOST=0.0.0.0 PORT="$PORT" npm run start:hosted-test-server
```

`HOST` defaults to `127.0.0.1` and `PORT` defaults to `8787` for local use.
Production platforms normally supply `PORT`; bind `HOST` to `0.0.0.0` so the
platform proxy can reach the process. A bind address such as
`ws://0.0.0.0:8787` is diagnostic only and must never be used as the browser
configuration.

## Proxy and network requirements

The public service must terminate TLS and expose a `wss://` URL. Its reverse
proxy must forward HTTP Upgrade and Connection headers to the Node process and
must retain the full path and query string. The server does not validate the
`Origin` header, so a separately hosted frontend works without additional
origin configuration. No special path is required; a path such as `/socket`
may be used when the proxy forwards it unchanged.

The browser preserves existing query parameters and adds or replaces
`livehost=<host-id>` for coordinator, report, and reconnect sockets. Do not
configure a proxy that discards those parameters. Choose proxy and platform
idle timeouts suitable for WebSocket sessions; this protocol has no polling or
HTTP fallback. The service must remain a persistent process and should be
restarted by the platform if it exits.

Provider dashboard work remains intentionally provider-specific: create the
persistent Node service, set its build context and start command, attach a
public TLS hostname, enable WebSocket forwarding, then set
`VITE_HOSTED_TEST_WS_URL` in the frontend build settings and rebuild the static
site.
