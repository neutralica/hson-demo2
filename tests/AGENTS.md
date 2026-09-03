# Test-system instructions

`tests/` is the authoritative repository test root. Keep shipped LiveDemo
panel code in `src/app/demos/tests`; place harness code, runtime adapters,
suites, runners, fixtures, helpers, integrations, tools, and test documentation
here according to [README.md](./README.md).

Do not reintroduce `src/tests`, `src/test-system`, `src/hosted-test`,
`src/app/hosted-test`, `tests/browser`, or `tests/cloudflare`.

Automated tests must be reachable from direct CLI/build tooling and represented
truthfully in generated static evidence. Register `TestSuite`/`TestCase`
factories with their semantic executor registry, preserve accurate subject,
collection, and runtime metadata, and avoid a second panel-specific inventory.

The browser Tests surface is a frozen evidence explorer. It must perform static
fetches only and must never initiate TestRunner, subprocess, Playwright,
LiveHost report, WebSocket report, or remote test actions.

hson-live acceptance launchers own frozen metadata and emit only the established
child case lifecycle, diagnostics, and terminal protocol. Static source
discovery is authoritative; do not add expected counts, certification records,
or aggregate completion gates.

If a test genuinely needs an unsupported environment, document the requirement,
the existing direct command, and the smallest missing adapter. Do not silently
omit it.
