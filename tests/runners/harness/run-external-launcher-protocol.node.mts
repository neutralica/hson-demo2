import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import {
  create_external_library_launcher_service,
  EXTERNAL_LIBRARY_LAUNCHER_STDERR_LIMIT_BYTES,
  EXTERNAL_LIBRARY_LAUNCHER_STDOUT_LIMIT_BYTES,
  EXTERNAL_LIBRARY_LAUNCHER_TERMINATION_GRACE_MS,
  EXTERNAL_LIBRARY_LAUNCHER_TRUNCATION_MARKER,
  resolve_external_library_launchers,
  type ExternalLibraryLauncherAvailability,
  type ExternalLibraryLauncherResult,
} from "../../harness/runtimes/node/external-library-launchers";
import type { ExternalLibraryLauncherTarget } from "../../../src/shared/testing/external-launcher-contract";

const fixturePath = fileURLToPath(new URL("../../fixtures/protocol/external-launcher-protocol-fixture.mjs", import.meta.url));
const discovered = await resolve_external_library_launchers();
const discoveredTarget = discovered.targets.find((entry) => entry.launcherId === "transform.hson-tokenizer");
if (discoveredTarget === undefined) throw new Error("Protocol fixture requires the manifested tokenizer launcher.");
const target: ExternalLibraryLauncherTarget = discoveredTarget;

function fixture_availability(
  selected: ExternalLibraryLauncherTarget,
  scenario: string,
): ExternalLibraryLauncherAvailability {
  return Object.freeze({
    repositoryRoot: process.cwd(),
    targets: Object.freeze([selected]),
    unavailable: Object.freeze([]),
    invocations: Object.freeze({
      [selected.id]: Object.freeze({
        kind: "direct" as const,
        command: process.execPath,
        args: Object.freeze([
          fixturePath,
          scenario,
          selected.launcherId,
          String(selected.executableChecks),
        ]),
        env: Object.freeze({}),
      }),
    }),
  });
}

async function run(
  scenario: string,
  timeoutMs = 5_000,
): Promise<Readonly<{ result: ExternalLibraryLauncherResult; activeChildren: number }>> {
  const service = create_external_library_launcher_service();
  const result = await service.run(fixture_availability(target, scenario), target.id, { timeoutMs });
  return Object.freeze({ result, activeChildren: service.metrics().activeChildren });
}

const valid = await run("valid");
assert.equal(valid.result.ok, true, "correct identity, count, and zero exit pass");
assert.deepEqual(valid.result.completion, {
  version: 1,
  launcherId: target.launcherId,
  executed: target.executableChecks,
  passed: target.executableChecks,
  failed: 0,
});
assert.match(valid.result.stdout, /<HSON_LIVE_TEST_COMPLETION>/, "raw stdout retains the completion control frame");
assert.doesNotMatch(valid.result.ordinaryStdout, /<HSON_LIVE_TEST_COMPLETION>/, "ordinary stdout excludes the completion control frame");
assert.ok(valid.result.stdoutBytes >= Buffer.byteLength(valid.result.stdout, "utf8"));

for (const [scenario, pattern] of [
  ["missing", /no completion record/],
  ["zero", /executed 0 checks/],
  ["fewer", /manifest declares/],
  ["more", /manifest declares/],
  ["wrong-id", /expected "transform\.hson-tokenizer"/],
  ["malformed", /malformed completion data/],
  ["duplicate", /more than one completion record/],
] as const) {
  const observed = await run(scenario);
  assert.equal(observed.result.ok, false, `${scenario} completion fails`);
  assert.match(observed.result.completionError ?? "", pattern, `${scenario} has a classified protocol error`);
  assert.equal(observed.activeChildren, 0, `${scenario} leaves no active child`);
}

const failed = await run("failed");
assert.equal(failed.result.ok, false, "a truthful failed-check aggregate fails semantically");
assert.equal(failed.result.completionError, undefined, "failed assertions are not protocol failures");
assert.equal(failed.result.completion?.failed, 1);
assert.equal(failed.result.completion?.passed, target.executableChecks - 1);

const nonzero = await run("nonzero");
assert.equal(nonzero.result.ok, false, "nonzero exit fails despite a valid completion");
assert.equal(nonzero.result.exitCode, 7);
assert.equal(nonzero.result.completionError, undefined);

const graceful = await run("graceful-timeout", 20);
assert.equal(graceful.result.ok, false, "graceful timeout fails");
assert.equal(graceful.result.timedOut, true);
assert.notEqual(graceful.result.signal, "SIGKILL");
assert.equal(graceful.result.forceKilled, undefined);
assert.equal(graceful.activeChildren, 0, "gracefully terminated child closes");

const resistantStarted = performance.now();
const resistant = await run("resistant-timeout", 20);
assert.equal(resistant.result.ok, false, "SIGTERM-resistant timeout fails");
assert.equal(resistant.result.timedOut, true);
assert.equal(resistant.result.forceKilled, true);
assert.equal(resistant.result.signal, "SIGKILL");
assert.equal(resistant.activeChildren, 0, "force-killed child closes");
assert.ok(
  performance.now() - resistantStarted >= EXTERNAL_LIBRARY_LAUNCHER_TERMINATION_GRACE_MS,
  "forced termination waits for the finite grace period",
);

const largeStdout = await run("large-stdout");
assert.equal(largeStdout.result.ok, true, "bounded stdout does not hide the independently scanned completion");
assert.ok(Buffer.byteLength(largeStdout.result.stdout, "utf8") <= EXTERNAL_LIBRARY_LAUNCHER_STDOUT_LIMIT_BYTES);
assert.match(largeStdout.result.stdout, /stdout-head/);
assert.match(largeStdout.result.stdout, /stdout-tail/);
assert.match(largeStdout.result.stdout, new RegExp(EXTERNAL_LIBRARY_LAUNCHER_TRUNCATION_MARKER));

const largeStderr = await run("large-stderr");
assert.equal(largeStderr.result.ok, true, "bounded stderr preserves a valid stdout completion");
assert.ok(Buffer.byteLength(largeStderr.result.stderr, "utf8") <= EXTERNAL_LIBRARY_LAUNCHER_STDERR_LIMIT_BYTES);
assert.match(largeStderr.result.stderr, /stderr-head/);
assert.match(largeStderr.result.stderr, /stderr-tail/);
assert.match(largeStderr.result.stderr, new RegExp(EXTERNAL_LIBRARY_LAUNCHER_TRUNCATION_MARKER));

console.log("external launcher completion protocol: ok (14 process-boundary cases)");
