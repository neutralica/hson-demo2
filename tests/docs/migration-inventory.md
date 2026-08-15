# Test structure migration inventory

This is the complete pre-move ownership assignment and old-to-new file inventory for the repository test-root migration. Import and execution ownership was traced before moving files; no item remained in the `unknown` category.

The twelve entries marked as removed were internal re-export shims: ten LiveHost report facades plus two deprecated Node hosting facades. Report consumers now import `tests/harness/reporting/hosted`, and Node hosting consumers already import `hson-live/livehost/node`; no externally consumed repository path was found.

## Classification totals

- documentation: 8
- runner: 72
- harness reporting: 23
- app test UI: 13
- helper: 5
- harness core: 28
- runtime adapter: 30
- suite definition: 103
- tool: 1
- fixture: 22
- integration test: 8

## Complete inventory

| Previous path | Ownership category | Final path or disposition |
| --- | --- | --- |
| `HOSTED_TEST_SERVER.md` | documentation | `tests/docs/hosted-test-server.md` |
| `TEST-SURFACE-INVENTORY.md` | documentation | `tests/docs/surface-inventory.md` |
| `agents.tests.md` | documentation | `tests/AGENTS.md` |
| `src/app/demos/amoeba/amoebi-geometry.test.mts` | runner | `tests/runners/app/run-amoebi-geometry.node.mts` |
| `src/app/demos/test/assert-row-status.ts` | harness reporting | `tests/harness/reporting/assert-row-status.ts` |
| `src/app/demos/test/hosted-test-case-list.ts` | app test UI | `src/app/demos/tests/panel/hosted-test-case-list.ts` |
| `src/app/demos/test/hosted-test-geometry.ts` | runtime adapter | `tests/harness/runtimes/dom/hosted-test-geometry.ts` |
| `src/app/demos/test/hosted-test-panel-adapter.ts` | app test UI | `src/app/demos/tests/panel/hosted-test-panel-adapter.ts` |
| `src/app/demos/test/hosted-test-panel-runtime.ts` | app test UI | `src/app/demos/tests/panel/hosted-test-panel-runtime.ts` |
| `src/app/demos/test/hosted-test-panel-selection.ts` | app test UI | `src/app/demos/tests/panel/hosted-test-panel-selection.ts` |
| `src/app/demos/test/hosted-test-report-summary.ts` | app test UI | `src/app/demos/tests/panel/hosted-test-report-summary.ts` |
| `src/app/demos/test/hosted-test-report-view.ts` | app test UI | `src/app/demos/tests/panel/hosted-test-report-view.ts` |
| `src/app/demos/test/livemap-tests.types.ts` | helper | `tests/suites/livemap/livemap-tests.types.ts` |
| `src/app/demos/test/mount-tp.ts` | app test UI | `src/app/demos/tests/panel/mount-tp.ts` |
| `src/app/demos/test/test-helpers.ts` | app test UI | `src/app/demos/tests/panel/test-helpers.ts` |
| `src/app/demos/test/test-logger.ts` | app test UI | `src/app/demos/tests/panel/test-logger.ts` |
| `src/app/demos/test/test-recorder.ts` | harness reporting | `tests/harness/reporting/test-recorder.ts` |
| `src/app/demos/test/tests.consts.ts` | app test UI | `src/app/demos/tests/panel/tests.consts.ts` |
| `src/app/demos/test/tests.types.ts` | harness core | `tests/harness/core/test-contracts.ts` |
| `src/app/demos/test/tp.css.ts` | app test UI | `src/app/demos/tests/panel/tp.css.ts` |
| `src/app/demos/test/tp.types.ts` | app test UI | `src/app/demos/tests/panel/tp.types.ts` |
| `src/app/hosted-test/browser-websocket-socket.ts` | app test UI | `src/app/demos/tests/hosted-client/browser-websocket-socket.ts` |
| `src/app/hosted-test/hosted-test-action-error.ts` | harness core | `tests/harness/hosted/hosted-test-action-error.ts` |
| `src/app/hosted-test/hosted-test-action.ts` | harness core | `tests/harness/hosted/hosted-test-action.ts` |
| `src/app/hosted-test/hosted-test-action.types.ts` | harness core | `tests/harness/hosted/hosted-test-action.types.ts` |
| `src/app/hosted-test/hosted-test-application.types.ts` | harness core | `tests/harness/hosted/hosted-test-application.types.ts` |
| `src/app/hosted-test/hosted-test-client-action.ts` | harness core | `tests/harness/hosted/hosted-test-client-action.ts` |
| `src/app/hosted-test/hosted-test-report-initial.ts` | harness reporting | `tests/harness/reporting/hosted/hosted-test-report-initial.ts` |
| `src/app/hosted-test/hosted-test-report-initial.types.ts` | harness reporting | `tests/harness/reporting/hosted/hosted-test-report-initial.types.ts` |
| `src/app/hosted-test/hosted-test-report-mirror.ts` | harness reporting | `tests/harness/reporting/hosted/hosted-test-report-mirror.ts` |
| `src/app/hosted-test/hosted-test-report-mirror.types.ts` | harness reporting | `tests/harness/reporting/hosted/hosted-test-report-mirror.types.ts` |
| `src/app/hosted-test/hosted-test-report-router.ts` | harness reporting | `tests/harness/reporting/hosted/hosted-test-report-router.ts` |
| `src/app/hosted-test/hosted-test-report-router.types.ts` | harness reporting | `tests/harness/reporting/hosted/hosted-test-report-router.types.ts` |
| `src/app/hosted-test/hosted-test-report-wire.ts` | harness reporting | `tests/harness/reporting/hosted/hosted-test-report-wire.ts` |
| `src/app/hosted-test/hosted-test-report-wire.types.ts` | harness reporting | `tests/harness/reporting/hosted/hosted-test-report-wire.types.ts` |
| `src/app/hosted-test/hosted-test-report.ts` | harness reporting | `tests/harness/reporting/hosted/hosted-test-report.ts` |
| `src/app/hosted-test/hosted-test-report.types.ts` | harness reporting | `tests/harness/reporting/hosted/hosted-test-report.types.ts` |
| `src/app/hosted-test/hosted-test-suite.ts` | harness core | `tests/harness/hosted/hosted-test-suite.ts` |
| `src/app/hosted-test/hosted-test-timing.ts` | harness reporting | `tests/harness/reporting/hosted/hosted-test-timing.ts` |
| `src/app/hosted-test/test-surface-catalog.ts` | harness core | `tests/harness/hosted/test-surface-catalog.ts` |
| `src/app/ui/soft-tile/soft-tile-test.mts` | runner | `tests/runners/app/run-soft-tile.node.mts` |
| `src/docs/canonical-hosted-test-architecture.md` | documentation | `tests/docs/architecture.md` |
| `src/docs/pending-test-environments.md` | documentation | `tests/docs/pending-environments.md` |
| `src/docs/tests.md` | documentation | `tests/docs/workflow.md` |
| `src/hosted-test/canonical-portable-test-suites.ts` | harness core | `tests/harness/hosted/canonical-portable-test-suites.ts` |
| `src/hosted-test/canonical-synthetic-dom-test-suites.ts` | harness core | `tests/harness/hosted/canonical-synthetic-dom-test-suites.ts` |
| `src/hosted-test/cloudflare/cloudflare-hosted-test-suites.ts` | runtime adapter | `tests/harness/runtimes/cloudflare/cloudflare-hosted-test-suites.ts` |
| `src/hosted-test/cloudflare/cloudflare-test-executor.ts` | runtime adapter | `tests/harness/runtimes/cloudflare/cloudflare-test-executor.ts` |
| `src/hosted-test/cloudflare/cloudflare-websocket-socket.ts` | runtime adapter | `tests/harness/runtimes/cloudflare/cloudflare-websocket-socket.ts` |
| `src/hosted-test/cloudflare/hosted-test-durable-object-runtime.ts` | runtime adapter | `tests/harness/runtimes/cloudflare/hosted-test-durable-object-runtime.ts` |
| `src/hosted-test/cloudflare/worker-configuration.d.ts` | runtime adapter | `tests/harness/runtimes/cloudflare/worker-configuration.d.ts` |
| `src/hosted-test/cloudflare/worker-routing.ts` | runtime adapter | `tests/harness/runtimes/cloudflare/worker-routing.ts` |
| `src/hosted-test/cloudflare/worker.ts` | runtime adapter | `tests/harness/runtimes/cloudflare/worker.ts` |
| `src/hosted-test/deterministic-transform-test-suites.ts` | harness core | `tests/harness/hosted/deterministic-transform-test-suites.ts` |
| `src/hosted-test/dom/canvas/hosted-canvas-runtime.ts` | runtime adapter | `tests/harness/runtimes/dom/canvas/hosted-canvas-runtime.ts` |
| `src/hosted-test/dom/canvas/hosted-canvas.types.ts` | runtime adapter | `tests/harness/runtimes/dom/canvas/hosted-canvas.types.ts` |
| `src/hosted-test/dom/canvas/jsdom-hosted-canvas-suites.ts` | runtime adapter | `tests/harness/runtimes/dom/canvas/jsdom-hosted-canvas-suites.ts` |
| `src/hosted-test/dom/hosted-dom-geometry.ts` | runtime adapter | `tests/harness/runtimes/dom/hosted-dom-geometry.ts` |
| `src/hosted-test/dom/hosted-dom-migration-inventory.ts` | runtime adapter | `tests/harness/runtimes/dom/hosted-dom-migration-inventory.ts` |
| `src/hosted-test/dom/hosted-dom-mutex.ts` | runtime adapter | `tests/harness/runtimes/dom/hosted-dom-mutex.ts` |
| `src/hosted-test/dom/hosted-dom-runtime.ts` | runtime adapter | `tests/harness/runtimes/dom/hosted-dom-runtime.ts` |
| `src/hosted-test/dom/jsdom-hosted-test-suites.ts` | runtime adapter | `tests/harness/runtimes/dom/jsdom-hosted-test-suites.ts` |
| `src/hosted-test/dom/jsdom.types.d.ts` | runtime adapter | `tests/harness/runtimes/dom/jsdom.types.d.ts` |
| `src/hosted-test/final-harness-migration-inventory.ts` | historical migration ledger | retired in Phase 5; current truth derives from `test-surface-census.ts` |
| `src/hosted-test/hosted-all-test-suites.ts` | harness core | `tests/harness/hosted/hosted-all-test-suites.ts` |
| `src/hosted-test/hosted-test-application.ts` | harness core | `tests/harness/hosted/hosted-test-application.ts` |
| `src/hosted-test/hosted-test-case-inspection.ts` | harness core | `tests/harness/hosted/hosted-test-case-inspection.ts` |
| `src/hosted-test/hosted-test-migration-inventory.ts` | historical migration ledger | retired in Phase 5; current truth derives from `test-surface-census.ts` |
| `src/hosted-test/livehost-authority-composition.ts` | harness core | `tests/harness/hosted/livehost-authority-composition.ts` |
| `src/hosted-test/node-safe-hosted-test-suites.ts` | harness core | `tests/harness/hosted/node-safe-hosted-test-suites.ts` |
| `src/hosted-test/registered-hosted-test-suites.ts` | harness core | `tests/harness/hosted/registered-hosted-test-suites.ts` |
| `src/hosted-test/run-node-selected-test-suites.ts` | runtime adapter | `tests/harness/runtimes/node/run-node-selected-test-suites.ts` |
| `src/hosted-test/run-node-selected-verifications.ts` | runtime adapter | `tests/harness/runtimes/node/run-node-selected-verifications.ts` |
| `src/hosted-test/run-selected-test-suites.ts` | harness core | `tests/harness/core/run-selected-test-suites.ts` |
| `src/hosted-test/server/hosted-test-server-entry.node.ts` | runtime adapter | `tests/harness/runtimes/node/server/hosted-test-server-entry.node.ts` |
| `src/hosted-test/server/hosted-test-server-process.ts` | runtime adapter | `tests/harness/runtimes/node/server/hosted-test-server-process.ts` |
| `src/hosted-test/server/hosted-test-server-production-entry.node.ts` | runtime adapter | `tests/harness/runtimes/node/server/hosted-test-server-production-entry.node.ts` |
| `src/hosted-test/server/hosted-test-server.ts` | runtime adapter | `tests/harness/runtimes/node/server/hosted-test-server.ts` |
| `src/hosted-test/server/node-application-host.ts` | runtime adapter | `[removed internal re-export shim]` |
| `src/hosted-test/server/node-hosted-tests-application.ts` | runtime adapter | `tests/harness/runtimes/node/server/node-hosted-tests-application.ts` |
| `src/hosted-test/server/node-production-security.ts` | runtime adapter | `tests/harness/runtimes/node/server/node-production-security.ts` |
| `src/hosted-test/server/node-towl-application.ts` | runtime adapter | `tests/harness/runtimes/node/server/node-towl-application.ts` |
| `src/hosted-test/server/node-websocket-socket.ts` | runtime adapter | `[removed internal re-export shim]` |
| `src/hosted-test/test-runner.ts` | harness core | `tests/harness/core/test-runner.ts` |
| `src/hosted-test/towl-authority-application.ts` | harness core | `tests/harness/hosted/towl-authority-application.ts` |
| `src/test-system/external-library-launchers.ts` | runtime adapter | `tests/harness/runtimes/node/external-library-launchers.ts` |
| `src/test-system/livehost-node-executor.ts` | runtime adapter | `tests/harness/runtimes/node/livehost-node-executor.ts` |
| `src/test-system/test-catalog.ts` | harness core | `tests/harness/core/test-catalog.ts` |
| `src/test-system/test-discovery.ts` | harness core | `tests/harness/core/test-discovery.ts` |
| `src/test-system/test-executor.ts` | harness core | `tests/harness/core/test-executor.ts` |
| `src/test-system/test-run-events.ts` | harness core | `tests/harness/core/test-run-events.ts` |
| `src/test-system/test-selected-run.ts` | harness core | `tests/harness/core/test-selected-run.ts` |
| `src/test-system/test-selection.ts` | harness core | `tests/harness/core/test-selection.ts` |
| `src/tests/app/run-splash-lifecycle.node.mts` | runner | `tests/runners/app/run-splash-lifecycle.node.mts` |
| `src/tests/diagnostics/run-generated-json.node.mts` | runner | `tests/runners/diagnostics/run-generated-json.node.mts` |
| `src/tests/inspector/inspector.helpers.ts` | suite definition | `tests/suites/inspector/inspector.helpers.ts` |
| `src/tests/json-fuzzer/fuzzer-builder.ts` | tool | `tests/tools/json-fuzzer/fuzzer-builder.ts` |
| `src/tests/livehost-tests/all-livehost-suites.ts` | suite definition | `tests/suites/livehost/suite-registry.ts` |
| `src/tests/livehost-tests/api-suite.ts` | suite definition | `tests/suites/livehost/api-suite.ts` |
| `src/tests/livehost-tests/client-suite.ts` | suite definition | `tests/suites/livehost/client-suite.ts` |
| `src/tests/livehost-tests/core-suite.ts` | suite definition | `tests/suites/livehost/core-suite.ts` |
| `src/tests/livehost-tests/host-disposal-suite.ts` | suite definition | `tests/suites/livehost/host-disposal-suite.ts` |
| `src/tests/livehost-tests/hosted-replay-action-in-memory-suite.ts` | suite definition | `tests/suites/livehost/hosted-replay-action-in-memory-suite.ts` |
| `src/tests/livehost-tests/hosted-replay-action.ts` | suite definition | `tests/suites/livehost/hosted-replay-action.ts` |
| `src/tests/livehost-tests/hosted-test-report-initial.ts` | harness reporting | `[removed internal re-export shim]` |
| `src/tests/livehost-tests/hosted-test-report-initial.types.ts` | harness reporting | `[removed internal re-export shim]` |
| `src/tests/livehost-tests/hosted-test-report-mirror.ts` | harness reporting | `[removed internal re-export shim]` |
| `src/tests/livehost-tests/hosted-test-report-mirror.types.ts` | harness reporting | `[removed internal re-export shim]` |
| `src/tests/livehost-tests/hosted-test-report-router.ts` | harness reporting | `[removed internal re-export shim]` |
| `src/tests/livehost-tests/hosted-test-report-router.types.ts` | harness reporting | `[removed internal re-export shim]` |
| `src/tests/livehost-tests/hosted-test-report-wire.ts` | harness reporting | `[removed internal re-export shim]` |
| `src/tests/livehost-tests/hosted-test-report-wire.types.ts` | harness reporting | `[removed internal re-export shim]` |
| `src/tests/livehost-tests/hosted-test-report.ts` | harness reporting | `[removed internal re-export shim]` |
| `src/tests/livehost-tests/hosted-test-report.types.ts` | harness reporting | `[removed internal re-export shim]` |
| `src/tests/livehost-tests/in-memory-hosted-test-panel-runtime.ts` | suite definition | `tests/suites/livehost/in-memory-hosted-test-panel-runtime.ts` |
| `src/tests/livehost-tests/node-application-host-suite.ts` | suite definition | `tests/suites/livehost/node-application-host-suite.ts` |
| `src/tests/livehost-tests/pair-suite.ts` | suite definition | `tests/suites/livehost/pair-suite.ts` |
| `src/tests/livehost-tests/protocol-suite.ts` | suite definition | `tests/suites/livehost/protocol-suite.ts` |
| `src/tests/livehost-tests/real-websocket-test-runtime.ts` | suite definition | `tests/suites/livehost/real-websocket-test-runtime.ts` |
| `src/tests/livehost-tests/run-hosted-all-real-websocket.node.mts` | runner | `tests/runners/livehost/run-hosted-all-real-websocket.node.mts` |
| `src/tests/livehost-tests/run-hosted-app-boundary.node.mts` | runner | `tests/runners/livehost/run-hosted-app-boundary.node.mts` |
| `src/tests/livehost-tests/run-hosted-canvas-collection.node.mts` | runner | `tests/runners/livehost/run-hosted-canvas-collection.node.mts` |
| `src/tests/livehost-tests/run-hosted-canvas-real-websocket.node.mts` | runner | `tests/runners/livehost/run-hosted-canvas-real-websocket.node.mts` |
| `src/tests/livehost-tests/run-hosted-canvas-runtime.node.mts` | runner | `tests/runners/livehost/run-hosted-canvas-runtime.node.mts` |
| `src/tests/livehost-tests/run-hosted-case-inspection.node.mts` | runner | `tests/runners/livehost/run-hosted-case-inspection.node.mts` |
| `src/tests/livehost-tests/run-hosted-deployment.node.mts` | runner | `tests/runners/livehost/run-hosted-deployment.node.mts` |
| `src/tests/livehost-tests/run-hosted-dom-behavior-diagnostics.node.mts` | runner | `tests/runners/livehost/run-hosted-dom-behavior-diagnostics.node.mts` |
| `src/tests/livehost-tests/run-hosted-dom-collection.node.mts` | runner | `tests/runners/livehost/run-hosted-dom-collection.node.mts` |
| `src/tests/livehost-tests/run-hosted-dom-compatibility.node.mts` | runner | `tests/runners/livehost/run-hosted-dom-compatibility.node.mts` |
| `src/tests/livehost-tests/run-hosted-dom-layout-diagnostics.node.mts` | runner | `tests/runners/livehost/run-hosted-dom-layout-diagnostics.node.mts` |
| `src/tests/livehost-tests/run-hosted-dom-real-websocket.node.mts` | runner | `tests/runners/livehost/run-hosted-dom-real-websocket.node.mts` |
| `src/tests/livehost-tests/run-hosted-generic-livehost.node.mts` | runner | `tests/runners/livehost/run-hosted-generic-livehost.node.mts` |
| `src/tests/livehost-tests/run-hosted-jsdom-runtime.node.mts` | runner | `tests/runners/livehost/run-hosted-jsdom-runtime.node.mts` |
| `src/tests/livehost-tests/run-hosted-multi-suite-concurrent.node.mts` | runner | `tests/runners/livehost/run-hosted-multi-suite-concurrent.node.mts` |
| `src/tests/livehost-tests/run-hosted-node-all.node.mts` | runner | `tests/runners/livehost/run-hosted-node-all.node.mts` |
| `src/tests/livehost-tests/run-hosted-real-websocket.node.mts` | runner | `tests/runners/livehost/run-hosted-real-websocket.node.mts` |
| `src/tests/livehost-tests/run-hosted-replay-action.node.mts` | runner | `tests/runners/livehost/run-hosted-replay-action.node.mts` |
| `src/tests/livehost-tests/run-hosted-replay-concurrent.node.mts` | runner | `tests/runners/livehost/run-hosted-replay-concurrent.node.mts` |
| `src/tests/livehost-tests/run-hosted-replay-events.node.mts` | runner | `tests/runners/livehost/run-hosted-replay-events.node.mts` |
| `src/tests/livehost-tests/run-hosted-replay-router.node.mts` | runner | `tests/runners/livehost/run-hosted-replay-router.node.mts` |
| `src/tests/livehost-tests/run-hosted-report-performance.node.mts` | runner | `tests/runners/livehost/run-hosted-report-performance.node.mts` |
| `src/tests/livehost-tests/run-hosted-retry-classification.node.mts` | runner | `tests/runners/livehost/run-hosted-retry-classification.node.mts` |
| `src/tests/livehost-tests/run-hosted-run-identity.node.mts` | runner | `tests/runners/livehost/run-hosted-run-identity.node.mts` |
| `src/tests/livehost-tests/run-hosted-sanitizer.node.mts` | runner | `tests/runners/livehost/run-hosted-sanitizer.node.mts` |
| `src/tests/livehost-tests/run-hosted-stale-suite-real-websocket.node.mts` | runner | `tests/runners/livehost/run-hosted-stale-suite-real-websocket.node.mts` |
| `src/tests/livehost-tests/run-hosted-suite-registry.node.mts` | runner | `tests/runners/livehost/run-hosted-suite-registry.node.mts` |
| `src/tests/livehost-tests/run-hosted-test-panel-adapter.node.mts` | runner | `tests/runners/livehost/run-hosted-test-panel-adapter.node.mts` |
| `src/tests/livehost-tests/run-hosted-test-panel-projection.node.mts` | runner | `tests/runners/livehost/run-hosted-test-panel-projection.node.mts` |
| `src/tests/livehost-tests/run-hosted-test-report-batch.node.mts` | runner | `tests/runners/livehost/run-hosted-test-report-batch.node.mts` |
| `src/tests/livehost-tests/run-hosted-test-report-initial.node.mts` | runner | `tests/runners/livehost/run-hosted-test-report-initial.node.mts` |
| `src/tests/livehost-tests/run-hosted-test-report-mirror.node.mts` | runner | `tests/runners/livehost/run-hosted-test-report-mirror.node.mts` |
| `src/tests/livehost-tests/run-hosted-test-report-protocol.node.mts` | runner | `tests/runners/livehost/run-hosted-test-report-protocol.node.mts` |
| `src/tests/livehost-tests/run-hosted-test-report-router.node.mts` | runner | `tests/runners/livehost/run-hosted-test-report-router.node.mts` |
| `src/tests/livehost-tests/run-hosted-test-report-wire.node.mts` | runner | `tests/runners/livehost/run-hosted-test-report-wire.node.mts` |
| `src/tests/livehost-tests/run-hosted-test-report.node.mts` | runner | `tests/runners/livehost/run-hosted-test-report.node.mts` |
| `src/tests/livehost-tests/run-hosted-test-timing.node.mts` | runner | `tests/runners/livehost/run-hosted-test-timing.node.mts` |
| `src/tests/livehost-tests/run-hosted-websocket-lifecycle.node.mts` | runner | `tests/runners/livehost/run-hosted-websocket-lifecycle.node.mts` |
| `src/tests/livehost-tests/run-hson-node-representation.node.mts` | runner | `tests/runners/livehost/run-hson-node-representation.node.mts` |
| `src/tests/livehost-tests/run-livehost-bootstrap-integration.node.mts` | runner | `tests/runners/livehost/run-livehost-bootstrap-integration.node.mts` |
| `src/tests/livehost-tests/run-livetree-allocation.node.mts` | runner | `tests/runners/livehost/run-livetree-allocation.node.mts` |
| `src/tests/livehost-tests/run-livetree-lifecycle-foundations.node.mts` | runner | `tests/runners/livehost/run-livetree-lifecycle-foundations.node.mts` |
| `src/tests/livehost-tests/run-livetree-lifecycle-ownership.node.mts` | runner | `tests/runners/livehost/run-livetree-lifecycle-ownership.node.mts` |
| `src/tests/livehost-tests/run-livetree-lifecycle-public.node.mts` | runner | `tests/runners/livehost/run-livetree-lifecycle-public.node.mts` |
| `src/tests/livehost-tests/run-node-application-host-entry.node.mts` | runner | `tests/runners/livehost/run-node-application-host-entry.node.mts` |
| `src/tests/livehost-tests/run-node-production-runtime.node.mts` | runner | `tests/runners/livehost/run-node-production-runtime.node.mts` |
| `src/tests/livehost-tests/session-lifecycle-suite.ts` | suite definition | `tests/suites/livehost/session-lifecycle-suite.ts` |
| `src/tests/livehost-tests/socket-suite.ts` | suite definition | `tests/suites/livehost/socket-suite.ts` |
| `src/tests/livehost-tests/store-suite.ts` | suite definition | `tests/suites/livehost/store-suite.ts` |
| `src/tests/livehost-tests/sync-suite.ts` | suite definition | `tests/suites/livehost/sync-suite.ts` |
| `src/tests/liveinspect-tests/run-live-inspector-materialization.node.mts` | runner | `tests/runners/liveinspect/run-live-inspector-materialization.node.mts` |
| `src/tests/liveinspect-tests/run-live-inspector-scaling.node.mts` | runner | `tests/runners/liveinspect/run-live-inspector-scaling.node.mts` |
| `src/tests/liveinspect-tests/run-live-inspector.node.mts` | runner | `tests/runners/liveinspect/run-live-inspector.node.mts` |
| `src/tests/livemap-tests/all-livemap-suites.ts` | suite definition | `tests/suites/livemap/suite-registry.ts` |
| `src/tests/livemap-tests/api-suite.ts` | suite definition | `tests/suites/livemap/api-suite.ts` |
| `src/tests/livemap-tests/assert-helpers.ts` | suite definition | `tests/suites/livemap/assert-helpers.ts` |
| `src/tests/livemap-tests/batch-suite.ts` | suite definition | `tests/suites/livemap/batch-suite.ts` |
| `src/tests/livemap-tests/bind-suite.ts` | suite definition | `tests/suites/livemap/bind-suite.ts` |
| `src/tests/livemap-tests/bridge-livetree-2.ts` | suite definition | `tests/suites/livemap/bridge-livetree-2.ts` |
| `src/tests/livemap-tests/bridge-livetree-suite.ts` | suite definition | `tests/suites/livemap/bridge-livetree-suite.ts` |
| `src/tests/livemap-tests/bridge-suite.ts` | suite definition | `tests/suites/livemap/bridge-suite.ts` |
| `src/tests/livemap-tests/compile-tests-api-bulk.ts` | suite definition | `tests/suites/livemap/compile-tests-api-bulk.ts` |
| `src/tests/livemap-tests/compile-tests-schema.ts` | suite definition | `tests/suites/livemap/compile-tests-schema.ts` |
| `src/tests/livemap-tests/core-helpers.ts` | suite definition | `tests/suites/livemap/core-helpers.ts` |
| `src/tests/livemap-tests/core-suite.ts` | suite definition | `tests/suites/livemap/core-suite.ts` |
| `src/tests/livemap-tests/core.types.ts` | helper | `tests/suites/livemap/core.types.ts` |
| `src/tests/livemap-tests/document-foundation-suite.ts` | suite definition | `tests/suites/livemap/document-foundation-suite.ts` |
| `src/tests/livemap-tests/editor-contract-tests.ts` | suite definition | `tests/suites/livemap/editor-contract-tests.ts` |
| `src/tests/livemap-tests/editor-suite.ts` | suite definition | `tests/suites/livemap/editor-suite.ts` |
| `src/tests/livemap-tests/error-handling-suite.ts` | suite definition | `tests/suites/livemap/error-handling-suite.ts` |
| `src/tests/livemap-tests/feed-suite.ts` | suite definition | `tests/suites/livemap/feed-suite.ts` |
| `src/tests/livemap-tests/feed-test-helpers.ts` | suite definition | `tests/suites/livemap/feed-test-helpers.ts` |
| `src/tests/livemap-tests/generated-control-suite.ts` | suite definition | `tests/suites/livemap/generated-control-suite.ts` |
| `src/tests/livemap-tests/guard-suite.ts` | suite definition | `tests/suites/livemap/guard-suite.ts` |
| `src/tests/livemap-tests/handle-helpers.ts` | suite definition | `tests/suites/livemap/handle-helpers.ts` |
| `src/tests/livemap-tests/handle-suite-2.ts` | suite definition | `tests/suites/livemap/handle-suite-2.ts` |
| `src/tests/livemap-tests/handle-suite.ts` | suite definition | `tests/suites/livemap/handle-suite.ts` |
| `src/tests/livemap-tests/handle.types.ts` | helper | `tests/suites/livemap/handle.types.ts` |
| `src/tests/livemap-tests/html-livemap-suite.ts` | suite definition | `tests/suites/livemap/html-livemap-suite.ts` |
| `src/tests/livemap-tests/json-root-node.ts` | suite definition | `tests/suites/livemap/json-root-node.ts` |
| `src/tests/livemap-tests/link-contract-suite.ts` | suite definition | `tests/suites/livemap/link-contract-suite.ts` |
| `src/tests/livemap-tests/link-suite.ts` | suite definition | `tests/suites/livemap/link-suite.ts` |
| `src/tests/livemap-tests/misc-suite.ts` | suite definition | `tests/suites/livemap/misc-suite.ts` |
| `src/tests/livemap-tests/path-handle-suite.ts` | suite definition | retired in Phase 5; authoritative owner is hson-live launcher `livemap.path-handle` |
| `src/tests/livemap-tests/path-suite.ts` | suite definition | `tests/suites/livemap/path-suite.ts` |
| `src/tests/livemap-tests/proxy-suite.ts` | suite definition | `tests/suites/livemap/proxy-suite.ts` |
| `src/tests/livemap-tests/replay-suite.ts` | suite definition | `tests/suites/livemap/replay-suite.ts` |
| `src/tests/livemap-tests/rev-suite.ts` | suite definition | `tests/suites/livemap/rev-suite.ts` |
| `src/tests/livemap-tests/run-replay-suite.node.mts` | runner | `tests/runners/livemap/run-replay-suite.node.mts` |
| `src/tests/livemap-tests/run-replay-suite.ts` | runner | `tests/runners/livemap/run-replay-suite.ts` |
| `src/tests/livemap-tests/schema-control-suite-2.ts` | suite definition | `tests/suites/livemap/schema-control-suite-2.ts` |
| `src/tests/livemap-tests/schema-suite.ts` | suite definition | `tests/suites/livemap/schema-suite.ts` |
| `src/tests/livemap-tests/store-suite.ts` | suite definition | `tests/suites/livemap/store-suite.ts` |
| `src/tests/livemap-tests/test-helpers.ts` | suite definition | `tests/suites/livemap/test-helpers.ts` |
| `src/tests/livemap-tests/types.ts` | suite definition | `tests/suites/livemap/types.ts` |
| `src/tests/livetree-tests/TODO-livetree-tests.md` | documentation | `tests/suites/livetree/TODO-livetree-tests.md` |
| `src/tests/livetree-tests/all-livetree-suites.ts` | suite definition | `tests/suites/livetree/suite-registry.ts` |
| `src/tests/livetree-tests/livetree-01.ts` | suite definition | `tests/suites/livetree/livetree-01.ts` |
| `src/tests/livetree-tests/livetree-02.ts` | suite definition | `tests/suites/livetree/livetree-02.ts` |
| `src/tests/livetree-tests/livetree-03.ts` | suite definition | `tests/suites/livetree/livetree-03.ts` |
| `src/tests/livetree-tests/livetree-04.ts` | suite definition | `tests/suites/livetree/livetree-04.ts` |
| `src/tests/livetree-tests/livetree-05.ts` | suite definition | `tests/suites/livetree/livetree-05.ts` |
| `src/tests/livetree-tests/livetree-06.ts` | suite definition | `tests/suites/livetree/livetree-06.ts` |
| `src/tests/livetree-tests/livetree-07.ts` | suite definition | `tests/suites/livetree/livetree-07.ts` |
| `src/tests/livetree-tests/livetree-08-dom.ts` | suite definition | `tests/suites/livetree/livetree-08-dom.ts` |
| `src/tests/livetree-tests/livetree-09-svg.ts` | suite definition | `tests/suites/livetree/livetree-09-svg.ts` |
| `src/tests/livetree-tests/livetree-10-svg-2.ts` | suite definition | `tests/suites/livetree/livetree-10-svg-2.ts` |
| `src/tests/livetree-tests/livetree-11-svg-3.ts` | suite definition | `tests/suites/livetree/livetree-11-svg-3.ts` |
| `src/tests/livetree-tests/livetree-12-svg-new.ts` | suite definition | `tests/suites/livetree/livetree-12-svg-new.ts` |
| `src/tests/livetree-tests/livetree-13-form.ts` | suite definition | `tests/suites/livetree/livetree-13-form.ts` |
| `src/tests/livetree-tests/livetree-14-canvas.ts` | suite definition | `tests/suites/livetree/livetree-14-canvas.ts` |
| `src/tests/livetree-tests/livetree-15-canvas-size.ts` | suite definition | `tests/suites/livetree/livetree-15-canvas-size.ts` |
| `src/tests/livetree-tests/livetree-16-canvas-3.ts` | suite definition | `tests/suites/livetree/livetree-16-canvas-3.ts` |
| `src/tests/livetree-tests/livetree-17-new-vars.ts` | suite definition | `tests/suites/livetree/livetree-17-new-vars.ts` |
| `src/tests/livetree-tests/livetree-18-css-refinements.ts` | suite definition | `tests/suites/livetree/livetree-18-css-refinements.ts` |
| `src/tests/livetree-tests/livetree-19-tree-selector.ts` | suite definition | `tests/suites/livetree/livetree-19-tree-selector.ts` |
| `src/tests/livetree-tests/livetree-20-vars-set-get.ts` | suite definition | `tests/suites/livetree/livetree-20-vars-set-get.ts` |
| `src/tests/livetree-tests/livetree-21-anim-kf.ts` | suite definition | `tests/suites/livetree/livetree-21-anim-kf.ts` |
| `src/tests/livetree-tests/livetree-22-quid-media.ts` | suite definition | `tests/suites/livetree/livetree-22-quid-media.ts` |
| `src/tests/livetree-tests/livetree-23-coverage-gaps.ts` | suite definition | `tests/suites/livetree/livetree-23-coverage-gaps.ts` |
| `src/tests/livetree-tests/livetree-24-dom-corners.ts` | suite definition | `tests/suites/livetree/livetree-24-dom-corners.ts` |
| `src/tests/livetree-tests/livetree-25-regression-2.ts` | suite definition | `tests/suites/livetree/livetree-25-regression-2.ts` |
| `src/tests/livetree-tests/livetree-26-lifecycle-foundations.ts` | suite definition | `tests/suites/livetree/livetree-26-lifecycle-foundations.ts` |
| `src/tests/livetree-tests/livetree-27-lifecycle-public.ts` | suite definition | `tests/suites/livetree/livetree-27-lifecycle-public.ts` |
| `src/tests/livetree-tests/livetree-28-lifecycle-ownership.ts` | suite definition | `tests/suites/livetree/livetree-28-lifecycle-ownership.ts` |
| `src/tests/livetree-tests/livetree-29-allocation.ts` | suite definition | `tests/suites/livetree/livetree-29-allocation.ts` |
| `src/tests/livetree-tests/livetree-30-node-representation.ts` | suite definition | `tests/suites/livetree/livetree-30-node-representation.ts` |
| `src/tests/livetree-tests/make-livetree-suite.ts` | suite definition | `tests/suites/livetree/make-livetree-suite.ts` |
| `src/tests/reflect-tests/run-keyed-projection.node.mts` | runner | `tests/runners/reflect/run-keyed-projection.node.mts` |
| `src/tests/test-data/hson-metadata-helpers.ts` | helper | `tests/helpers/hson/hson-metadata-helpers.ts` |
| `src/tests/test-data/html-fixtures.ts` | fixture | `tests/fixtures/transform/html/html-fixtures.ts` |
| `src/tests/test-data/html-mdn.html` | fixture | `tests/fixtures/transform/html/html-mdn.html` |
| `src/tests/test-data/html-mdn.ts` | fixture | `tests/fixtures/transform/html/html-mdn.ts` |
| `src/tests/test-data/htmlstring-new.html` | fixture | `tests/fixtures/transform/html/htmlstring-new.html` |
| `src/tests/test-data/htmlstring.html` | fixture | `tests/fixtures/transform/html/htmlstring.html` |
| `src/tests/test-data/json-fixtures.ts` | fixture | `tests/fixtures/transform/json/json-fixtures.ts` |
| `src/tests/test-data/large-fixtures/html-gwern.mock.ts` | fixture | `tests/fixtures/transform/large/html-gwern.mock.ts` |
| `src/tests/test-data/large-fixtures/html-hackernews.mock.ts` | fixture | `tests/fixtures/transform/large/html-hackernews.mock.ts` |
| `src/tests/test-data/large-fixtures/html-mdn-homepage.html` | fixture | `tests/fixtures/transform/large/html-mdn-homepage.html` |
| `src/tests/test-data/large-fixtures/html-wikipedia.mock.ts` | fixture | `tests/fixtures/transform/large/html-wikipedia.mock.ts` |
| `src/tests/test-data/large-fixtures/invalid-html.ts` | fixture | `tests/fixtures/transform/large/invalid-html.ts` |
| `src/tests/test-data/large-fixtures/json-chunks.mock.ts` | fixture | `tests/fixtures/transform/large/json-chunks.mock.ts` |
| `src/tests/test-data/large-fixtures/json-homepage-string.mock.ts` | fixture | `tests/fixtures/transform/large/json-homepage-string.mock.ts` |
| `src/tests/test-surface/run-test-surface-enumeration.node.mts` | runner | `tests/runners/harness/run-test-surface-enumeration.node.mts` |
| `src/tests/test-system/fixtures/external-launcher-protocol-fixture.mjs` | fixture | `tests/fixtures/protocol/external-launcher-protocol-fixture.mjs` |
| `src/tests/test-system/run-canonical-tests.node.mts` | runner | `tests/runners/harness/run-canonical-tests.node.mts` |
| `src/tests/test-system/run-external-launcher-protocol.node.mts` | runner | `tests/runners/harness/run-external-launcher-protocol.node.mts` |
| `src/tests/test-system/run-external-library-launchers.node.mts` | runner | `tests/runners/harness/run-external-library-launchers.node.mts` |
| `src/tests/test-system/run-hosted-test-performance.node.mts` | runner | `tests/runners/harness/run-hosted-test-performance.node.mts` |
| `src/tests/test-system/run-inclusive-library-verification.node.mts` | runner | `tests/runners/harness/run-inclusive-library-verification.node.mts` |
| `src/tests/test-system/run-stage-2-contracts.node.mts` | runner | `tests/runners/harness/run-stage-2-contracts.node.mts` |
| `src/tests/test-system/run-stage-3-discovery.node.mts` | runner | `tests/runners/harness/run-stage-3-discovery.node.mts` |
| `src/tests/test-system/run-stage-4a-selected.node.mts` | runner | `tests/runners/harness/run-stage-4a-selected.node.mts` |
| `src/tests/test-system/run-stage-4b-panel.node.mts` | runner | `tests/runners/harness/run-stage-4b-panel.node.mts` |
| `src/tests/test-system/run-stage-5a-corpus.node.mts` | runner | `tests/runners/harness/run-stage-5a-corpus.node.mts` |
| `src/tests/test-system/run-stage-5b-dom.node.mts` | runner | `tests/runners/harness/run-stage-5b-dom.node.mts` |
| `src/tests/test-system/run-stage-5c-closeout.node.mts` | runner | `tests/runners/harness/run-stage-5c-closeout.node.mts` |
| `src/tests/test-system/run-test-runner-truthfulness.node.mts` | runner | `tests/runners/harness/run-test-runner-truthfulness.node.mts` |
| `src/tests/towl-tests/all-towl-suites.ts` | suite definition | `tests/suites/towl/suite-registry.ts` |
| `src/tests/towl-tests/run-towl-room-suite.node.mts` | runner | `tests/runners/towl/run-towl-room-suite.node.mts` |
| `src/tests/towl-tests/run-towl-suites.node.mts` | runner | `tests/runners/towl/run-towl-suites.node.mts` |
| `src/tests/towl-tests/towl-client-suite.ts` | suite definition | `tests/suites/towl/towl-client-suite.ts` |
| `src/tests/towl-tests/towl-room-suite.ts` | suite definition | `tests/suites/towl/towl-room-suite.ts` |
| `src/tests/towl-tests/towl-runtime-suite.ts` | suite definition | `tests/suites/towl/towl-runtime-suite.ts` |
| `src/tests/towl-tests/towl-state-suite.ts` | suite definition | `tests/suites/towl/towl-state-suite.ts` |
| `src/tests/towl-tests/towl-test-helpers.ts` | suite definition | `tests/suites/towl/towl-test-helpers.ts` |
| `src/tests/towl-tests/towl-transition-suite.ts` | suite definition | `tests/suites/towl/towl-transition-suite.ts` |
| `src/tests/transform/browser-transform-oracle.ts` | helper | `tests/helpers/transform/browser-transform-oracle.ts` |
| `src/tests/transform/extra-fixtures.ts` | fixture | `tests/fixtures/transform/html/extra-fixtures.ts` |
| `src/tests/transform/hson-tests.ts` | fixture | `tests/fixtures/transform/hson/hson-tests.ts` |
| `src/tests/transform/json-level-2.ts` | fixture | `tests/fixtures/transform/json/json-level-2.ts` |
| `src/tests/transform/make-transform-suite.ts` | suite definition | `tests/suites/transform/make-transform-suite.ts` |
| `src/tests/transform/new-html-fixtures.ts` | fixture | `tests/fixtures/transform/html/new-html-fixtures.ts` |
| `src/tests/unit/all-unit-tests.ts` | suite definition | `tests/suites/unit/suite-registry.ts` |
| `src/tests/unit/test-harness-tests.ts` | suite definition | `tests/suites/unit/test-harness-tests.ts` |
| `src/tests/unit/unit-tests-1.ts` | suite definition | `tests/suites/unit/unit-tests-1.ts` |
| `src/tests/unit/unit-tests-2.ts` | suite definition | `tests/suites/unit/unit-tests-2.ts` |
| `src/tests/unit/unit-tests-TODO.md` | documentation | `tests/suites/unit/unit-tests-TODO.md` |
| `tests/browser/app-boot.spec.ts` | integration test | `tests/integration/browser/app-boot.spec.ts` |
| `tests/browser/app-test-support.ts` | integration test | `tests/integration/browser/app-test-support.ts` |
| `tests/browser/build.spec.ts` | integration test | `tests/integration/browser/build.spec.ts` |
| `tests/browser/parse.spec.ts` | integration test | `tests/integration/browser/parse.spec.ts` |
| `tests/browser/quid-selector-fixture.html` | fixture | `tests/fixtures/browser/quid-selector-fixture.html` |
| `tests/browser/quid-selector-fixture.ts` | fixture | `tests/fixtures/browser/quid-selector-fixture.ts` |
| `tests/browser/quid-selector.spec.ts` | integration test | `tests/integration/browser/quid-selector.spec.ts` |
| `tests/browser/sanitizer-metadata-fixture.html` | fixture | `tests/fixtures/browser/sanitizer-metadata-fixture.html` |
| `tests/browser/sanitizer-metadata-fixture.ts` | fixture | `tests/fixtures/browser/sanitizer-metadata-fixture.ts` |
| `tests/browser/sanitizer-metadata.spec.ts` | integration test | `tests/integration/browser/sanitizer-metadata.spec.ts` |
| `tests/browser/towl-rooms.spec.ts` | integration test | `tests/integration/browser/towl-rooms.spec.ts` |
| `tests/cloudflare/run-hosted-cloudflare.node.mts` | integration test | `tests/integration/cloudflare/run-hosted-cloudflare.node.mts` |
