# Test workflow

Use the direct runner for focused iteration:

```sh
npm run test:canonical-node -- --subject livehost
npm run test:canonical-node -- --suite livehost/core
npm run test:canonical-node -- --test "livehost/core::create"
```

Generate a complete or selected terminal report with:

```sh
npm run test:report
npm run test:report -- --suite transform/hson-number
```

`LocalRunReporter` writes `.test-reports/<run-id>/run.json`, materializes the
progressive static site in `.test-reports/<run-id>/site/`, and updates the local
`current.json` pointer only after terminal materialization. Inspect the JSON and
static artifacts directly, or serve one frozen report locally:

```sh
VITE_TEST_EVIDENCE_ROOT=/test-evidence/<run-id> \
HSON_LOCAL_FROZEN_EVIDENCE_DIRECTORY="$PWD/.test-reports/<run-id>/site" \
npm run dev
```

The Tests UI reads that static evidence only. Local report generation does not
need the local LiveHost server. Start LiveHost separately only when developing
TOWL or circuit-verification product behavior.

External child processes must emit real case identities and exactly one final
terminal record. Preserve timeout, cancellation, bounded output, graceful and
forced process-tree termination, and cleanup behavior when changing an adapter.

Run build and deployment commands separately after testing. Deployment is a
downstream concern and must not execute tests or update submodules.
