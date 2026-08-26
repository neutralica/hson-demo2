import { strict as assert } from "node:assert";
import {
  resolve_external_library_launchers,
  run_external_library_launcher,
} from "../../harness/runtimes/node/external-library-launchers";
import { run_external_library_launcher_pool } from "../../harness/runtimes/node/run-node-selected-verifications";

// This audit is itself one supervised certification command. It launches the
// complete manifest, so the ordinary lane needs enough capacity to settle well
// inside the outer command boundary even while certification is under load.
// Real-WebSocket launchers retain the pool's single constrained special lane.
const MANIFEST_AUDIT_ORDINARY_CONCURRENCY = 4;

const availability = await resolve_external_library_launchers();
assert.equal(availability.unavailable.length, 0, "every hson-live launcher must be available");

const pool = await run_external_library_launcher_pool(
  availability.targets,
  (target) => run_external_library_launcher(availability, target.id, { forceVerifiedDirect: true }),
  MANIFEST_AUDIT_ORDINARY_CONCURRENCY,
);
const mismatches = pool.results.flatMap((result) => {
  const completion = result.completion;
  if (completion === undefined || completion.executed === result.target.executableChecks) return [];
  return [Object.freeze({
    launcherId: result.target.launcherId,
    suiteId: result.target.id,
    declaredChecks: result.target.executableChecks,
    executed: completion.executed,
    passed: completion.passed,
    failed: completion.failed,
    exitCode: result.exitCode,
    completionError: result.completionError,
  })];
});
const launcherDefects = pool.results.filter((result) =>
  result.exitCode !== 0
  || result.signal !== null
  || result.timedOut
  || result.completion === undefined
  || result.completion.failed !== 0
  || result.completion.passed !== result.completion.executed
  || (result.completionError !== undefined && !/manifest declares/.test(result.completionError))
);

console.log(JSON.stringify({
  launchers: availability.targets.length,
  executedLaunchers: pool.results.length,
  declaredChecks: availability.targets.reduce((total, target) => total + target.executableChecks, 0),
  completionChecks: pool.results.reduce((total, result) => total + (result.completion?.executed ?? 0), 0),
  maximumOrdinaryConcurrent: pool.maximumOrdinaryConcurrent,
  maximumSpecialConcurrent: pool.maximumSpecialConcurrent,
  mismatches,
  launcherDefects: launcherDefects.map((result) => Object.freeze({
    launcherId: result.target.launcherId,
    exitCode: result.exitCode,
    signal: result.signal,
    timedOut: result.timedOut,
    completion: result.completion,
    completionError: result.completionError,
    stderr: result.stderr,
  })),
}, null, 2));

assert.equal(pool.results.length, availability.targets.length, "every launcher must execute exactly once");
assert.ok(pool.maximumOrdinaryConcurrent <= MANIFEST_AUDIT_ORDINARY_CONCURRENCY);
assert.ok(pool.maximumSpecialConcurrent <= 1);
assert.equal(launcherDefects.length, 0, "launcher execution defects must be reported separately from manifest drift");
assert.equal(mismatches.length, 0, "launcher completion counts must match declared manifest counts");
