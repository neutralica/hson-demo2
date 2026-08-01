# LiveDemo hosted-test server

The visible hosted-test modes use a dedicated Node LiveHost over WebSocket.

Local development uses two terminals:

```sh
npm run hosted:test-server
```

```sh
npm run dev
```

The Node server defaults to `127.0.0.1:8787`. Configure its bind address with
`HOST` and `PORT`.

Local startup explicitly uses development transport policy. Public startup uses
the built `dist-node/livehost-server.mjs` artifact and requires exact origin and
authentication configuration; see the deployment guide.

Node application state is explicitly bounded: TOWL owns a finite idle room
registry, hosted tests own a finite terminal-report registry, and the
coordinator remains process-lifetime. Eviction never disconnects active work.
Room and report state are ephemeral across process restart. The Node transport
host owns neither registry.

The browser defaults to `ws://127.0.0.1:8787`. Override it with Vite's
`VITE_HOSTED_TEST_WS_URL` environment variable.

There is no silent in-browser fallback. Static public deployment therefore
requires a separately deployed persistent Node-compatible hosted-test service
and an appropriate `VITE_HOSTED_TEST_WS_URL` value.

See [DEPLOYMENT.md](../../DEPLOYMENT.md) for production build, proxy, TLS, package
boundary, and provider-dashboard requirements.
