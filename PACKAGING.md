# Certified package ownership

LiveDemo owns application test policy and the `pack` / `certify` command boundary. The implementation is
`scripts/certified-package.mjs`. It deliberately calls the existing `hson-deploy` capture, materialization,
static assembly, and verification primitives; it is not another test runner or evidence format.

Commands:

- `npm run build` builds hson-live and the ordinary Vite application. It does not execute tests.
- `npm run test:cli -- run --suite <suite-id>` runs a selected canonical suite through the existing Node runner.
- `npm run pack` requires a clean, gitlink-pinned deployment workspace, captures all authoritative surfaces,
  materializes accepted evidence, builds the frozen explorer, and verifies the artifact.
- `npm run certify` runs the complete integrated hson-demo2 + hson-live catalog, then runs `pack` without
  optimizing away the certification work performed during capture.
- `npm run artifact:location` prints the canonical work and explorer locations.
- `npm run test:cli -- inspect <report-or-accepted-json>` prints the existing report/package status.

The canonical output is `<hson-deploy>/static-production`; capture and accepted evidence packages remain under
`<hson-deploy>/.deployment-work`. This is one output structure regardless of whether the command starts in
hson-demo2 or through the hson-live convenience wrapper. Set `HSON_DEPLOY_ROOT` only when the deployment
workspace is not the usual parent or sibling checkout.
