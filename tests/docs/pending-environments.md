# Test environments outside the canonical Node corpus

The canonical Node LiveHost contains the fixed deterministic corpus supported by
ordinary Node, synthetic DOM, and the hosted deterministic canvas recorder.
The following surfaces require a materially different execution boundary.

## Real browser and Playwright

- **Sources:** `tests/integration/browser`, application boot/panel fixtures, rendered
  pseudo-element cases recorded in `DEFERRED_BROWSER_FIDELITY_CASES`.
- **Coverage:** four known pseudo-element readback cases plus browser application
  scenarios; browser scenarios are not represented as a speculative case total.
- **Requirement:** a real page, CSS rendering, layout, and browser event loop.
- **Factories:** the four deferred cases originate in reusable LiveTree suites;
  Playwright scenarios use their existing browser-test format.
- **Verification:** automated assertions.
- **Smallest future boundary:** Playwright as an internal adapter behind the Node
  LiveHost protocol.

## Native or raster rendering

- **Sources:** two cases in `livetree/canvas-clear` and two in
  `livetree/canvas-plot`, listed by `JSDOM_HOSTED_CANVAS_DEFERRED_CASE_KEYS`.
- **Coverage:** four unique automated cases.
- **Requirement:** actual 2D rasterization and `getImageData` pixel readback.
- **Factories:** reusable original LiveTree suite factories exist, but the
  rendering cases share suites with deterministic cases.
- **Verification:** automated pixel assertions.
- **Smallest future boundary:** a real-browser canvas adapter. The deterministic
  recorder deliberately throws for pixel, image-loading, and font-metric APIs.

## Real WebSocket server

- **Sources:** `hosted-real-websocket`, `hosted-websocket-lifecycle`,
  `hosted-dom-real-websocket`, `hosted-stale-suite-real-websocket`,
  `hosted-canvas-real-websocket`, and `hosted-all-real-websocket` launchers.
- **Coverage:** six launcher families; their transport assertions are not
  duplicated as canonical cases.
- **Requirement:** Node WebSocket server lifecycle and real network transport.
- **Factories:** some launchers reuse hosted suites; transport coordination
  remains launcher-owned.
- **Verification:** automated assertions.
- **Smallest future boundary:** a narrowly scoped WebSocket execution adapter
  within the Node LiveHost.

## Filesystem, process, and build

- **Sources:** generated-fixture diagnostics, type/build checks, Wrangler dry
  runs, and deployment verification commands.
- **Coverage:** command-oriented checks; no speculative case total.
- **Requirement:** controlled filesystem access, process execution, or build
  tools.
- **Factories:** generally command launchers rather than reusable `TestSuite`
  factories.
- **Verification:** automated command results and diagnostics.
- **Smallest future boundary:** explicit allow-listed Node host actions, if
  remote execution becomes valuable.

## Cloudflare binding integration

- **Sources:** Durable Object and Worker adapter tests in `tests/integration/cloudflare`.
- **Coverage:** checked-in Worker runtime verification; no excluded canonical
  suite currently requires a Cloudflare-only binding.
- **Requirement:** Worker and Durable Object bindings.
- **Factories:** adapter tests, not self-hosted executor registrations.
- **Verification:** automated assertions.
- **Smallest future boundary:** the existing Worker adapter test command.

## Standalone adapters without suite factories

- **Sources:** TOWL room, LiveInspector, application geometry, and similar
  standalone launchers.
- **Coverage:** launcher-specific; not assigned a speculative total.
- **Requirement:** varies by adapter.
- **Factories:** no reusable canonical `TestSuite` boundary currently exists.
- **Verification:** automated where the launcher asserts; diagnostic where it
  reports measurements.
- **Smallest future boundary:** extract a genuine suite factory before executor
  registration. Do not reproduce individual assertions as wrapper cases.

## Manual visual and interactive demonstrations

- **Sources:** LiveDemo layout, animation, hover, pointer, transition, and visual
  composition fixtures.
- **Coverage:** demonstrations, not missing automated cases.
- **Requirement:** a real browser and human visual or interactive judgment.
- **Factories:** presentation fixtures rather than automated test suites.
- **Verification:** manual.
- **Smallest future boundary:** retain as demonstrations unless a deterministic
  behavioral core can be extracted independently.
