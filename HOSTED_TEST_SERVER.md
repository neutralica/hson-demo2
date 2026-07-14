# LiveDemo hosted-test server

The visible hosted-test modes use a dedicated Node LiveHost over WebSocket.

Local development uses two terminals:

```sh
npm run hosted:test-server
```

```sh
npm run dev
```

The Node server defaults to `127.0.0.1:8787`. Configure it with
`HOSTED_TEST_HOST` and `HOSTED_TEST_PORT`.

The browser defaults to `ws://127.0.0.1:8787`. Override it with Vite's
`VITE_HOSTED_TEST_WS_URL` environment variable.

There is no silent in-browser fallback. Static public deployment therefore
requires a separately deployed persistent Node-compatible hosted-test service
and an appropriate `VITE_HOSTED_TEST_WS_URL` value.
