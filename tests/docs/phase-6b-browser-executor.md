# Phase 6B browser executor

## Scope audit

The pre-Phase-6B browser gap was exactly 19 census surfaces. The 14 spec
surfaces contain 71 stable Playwright journeys. `hson-demo2:test:browser` is the
aggregate command surface and maps semantically to selecting all 71 browser
journeys through Node LiveHost; it is not counted as a second execution of the
same tests. The final four surfaces are stable raster-readback identities.

| Surface | Journeys | Browser capabilities actually exercised |
|---|---:|---|
| `browser:app-boot` | 7 | real DOM/layout, navigation, keyboard, WebSocket, local server |
| `browser:build` | 1 | real DOM, navigation, local server |
| `browser:cellsheet-resize` | 9 | layout geometry, pointer capture/cancel, DOM mutation |
| `browser:cellsheet` | 14 | real DOM, editing, selection, remount lifecycle |
| `browser:parse-verification-performance` | 1 | real DOM, local server, timing measurements |
| `browser:parse-verification` | 9 | DOMParser, navigation, WebSocket, debounce and recovery |
| `browser:parse` | 6 | browser parsing/serialization and real DOM |
| `browser:quid-selector` | 1 | HTML/SVG selector application and navigation |
| `browser:sanitizer-metadata` | 1 | browser and Worker sanitizer parity |
| `browser:shell-resource-lifecycle` | 5 | layout, canvas, animation scheduling, ambient listeners |
| `browser:small-state-surfaces` | 1 | real DOM state and remount |
| `browser:towl-direct-entry` | 5 | WebSocket, storage, navigation, resizing, multiple contexts |
| `browser:towl-rooms` | 4 | WebSocket, storage, clipboard/share, reload, multiple contexts |
| `browser:visual-determinism-authority` | 3 | SVG, canvas presentation, animation cancellation |
| `hson-demo2:test:browser` | aggregate | semantic alias for the complete browser selection |
| `browser-fidelity:livetree/canvas-clear::canvas.clear-clears-full-backing-bitmap` | 1 | native canvas bitmap readback |
| `browser-fidelity:livetree/canvas-clear::canvas.clear-rectangle-clears-only-requested-region` | 1 | native canvas region clearing and pixel preservation |
| `browser-fidelity:livetree/canvas-plot::canvas.plot-runs-callback-with-native-2d-context-when-mounted` | 1 | native 2D canvas context |
| `browser-fidelity:livetree/canvas-plot::canvas.must.plot-runs-callback-with-native-2d-context-when-mounted` | 1 | required native 2D canvas context |

## Authority boundary

Node LiveHost remains the control-plane authority. It discovers the browser
suites, assigns them to `local-playwright-chromium`, accepts the RunPlan, owns
the report authority and attempt identity, normalizes streamed case events, and
fences cancellation/recovery.

The executor starts one native Playwright CLI child per browser selection. That
child owns the existing Playwright runner semantics: fixtures, one worker,
browser/context lifecycle, explicit multi-context journeys, assertions,
screenshots/traces, and the two configured localhost web servers. The existing
30-second per-journey and 30-second per-server timeouts are unchanged. The
outer supervisor watchdog is their additive bound, not an enlarged test
timeout.

Cancellation is `AbortSignal`-driven. The Node supervisor terminates the entire
Playwright process tree with a graceful signal, waits a bounded interval, and
force-kills only if necessary. Node LiveHost then terminalizes started work as
cancelled and prevents late events from mutating the accepted attempt.

## Evidence and artifacts

The custom reporter streams suite/case boundaries, status, duration, assertion
errors, stdout/stderr, and attachment metadata over the child stdout protocol.
An automatic fixture attaches browser console warnings/errors, uncaught page
errors, and failed requests without converting warnings into failures.

Each run receives a unique artifact directory. Report evidence carries stable
paths for Playwright attachments and bounded inline content only for small
attachments. Directories remain present through run recovery and are deleted
when the owning Node-hosted application is disposed.

## Module isolation decision

The Node hosted-test executor loads the synthetic-DOM catalog and therefore initializes
`jsdom`. Playwright's normal CLI, its worker, Chromium, Vite, and the hosted-test
server are separate processes. The previously reported
`fallback/encoding.js is not in cache` fault occurred when Playwright startup
shared the already-initialized Node/jsdom module environment. Current native
Playwright execution is green when process-isolated. Phase 6B preserves that
known-good boundary instead of loading Playwright into the hosted-test executor process;
no `hson-live` or jsdom dependency change is required.
