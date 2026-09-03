# Local LiveHost server

The local LiveHost server exists for TOWL and circuit-verification product
behavior. Start it separately from Vite when those live features are needed:

```sh
npm run local:livehost-server
npm run dev
```

It defaults to `127.0.0.1:8787`; configure the bind address with `HOST` and
`PORT`. Browser applications use `VITE_LIVEHOST_WS_URL` as the generic
origin and derive their TOWL or circuit-verification paths.

The Tests explorer does not connect to this server. It reads progressive static
evidence only.
