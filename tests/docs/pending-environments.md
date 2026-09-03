# Pending execution environments

Local Node, supervised subprocess, synthetic DOM/canvas, and Playwright
execution are direct test paths. Their events flow to LocalRunReporter without a
LiveHost or WebSocket report transport.

The remaining Cloudflare Worker hosted-test executor, registry, and Durable
Object internals are Phase 7 migration targets. They remain isolated from
normal local reporting and from the frozen Tests explorer.

The deployed TOWL compatibility probe remains a product/runtime environment
check requiring network access and `TOWL_DEPLOYED_WS_URL`. It is not part of
local report generation.

Compiler, build, public-entrypoint, production bundle, and artifact validation
use ordinary isolated command execution with bounded process and filesystem
behavior.
