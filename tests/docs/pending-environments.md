# Pending execution environments

Local Node, supervised subprocess, synthetic DOM/canvas, and Playwright
execution are direct test paths. Their events flow to LocalRunReporter without a
LiveHost or WebSocket report transport.

The Cloudflare Worker is an ordinary production TOWL/session compatibility
runtime under `src/server/cloudflare`. Tests consume that production runtime;
there is no hosted-test executor or registry.

The deployed TOWL compatibility probe remains a product/runtime environment
check requiring network access and `TOWL_DEPLOYED_WS_URL`. It is not part of
local report generation.

Compiler, build, public-entrypoint, production bundle, and artifact validation
use ordinary isolated command execution with bounded process and filesystem
behavior.
