import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { discover_direct_report_executables, select_direct_report_executable_ids } from "../../harness/runtimes/node/direct-report-discovery";
import {
  create_external_library_launcher_service,
  parse_hson_live_test_metadata_source,
  resolve_external_library_launchers,
} from "../../harness/runtimes/node/external-library-launchers";
import { run_external_library_launcher_pool } from "../../harness/runtimes/node/run-node-selected-verifications";
import { assert_external_launcher_stdout_parity } from "../../harness/runtimes/node/external-launcher-stdout-parity";

assert.doesNotThrow(() => assert_external_launcher_stdout_parity("livemap.aggregate-library-transitions", "ok 1\ntelemetry single-library=0.1ms aggregate-two-library=0.2ms candidates=2 revisions=1 publications=1\n", "ok 1\ntelemetry single-library=9.1ms aggregate-two-library=8.2ms candidates=2 revisions=1 publications=1\n"));
assert.throws(() => assert_external_launcher_stdout_parity("livemap.aggregate-library-transitions", "ok 1\ntelemetry single-library=0.1ms aggregate-two-library=0.2ms candidates=2 revisions=1 publications=1\n", "not ok 1\ntelemetry single-library=0.1ms aggregate-two-library=0.2ms candidates=2 revisions=1 publications=1\n"), /PARITY_FAILED/);

const first = await resolve_external_library_launchers();
const second = await resolve_external_library_launchers();
assert.ok(first.repositoryRoot); assert.equal(first.unavailable.length, 0);
assert.deepEqual(first.targets.map((target) => target.launcherId), second.targets.map((target) => target.launcherId), "source discovery is deterministic");
assert.equal(new Set(first.targets.map((target) => target.id)).size, first.targets.length, "semantic suite IDs are unique");
assert.equal(first.targets.every((target) => target.sourceRef === `hson-live:${target.sourceFile}`), true, "source resolves directly to executable invocation");
assert.equal(first.targets.every((target) => first.invocations?.[target.id]?.args.at(-1) === target.sourceFile), true);

const fixtureText = `const fixture = \`\nexport const HSON_LIVE_TEST_METADATA = Object.freeze({ id: "fake", title: "Fake", category: "Core", runtime: "node", tags: Object.freeze(["fake"]) });\n\`;`;
assert.equal(parse_hson_live_test_metadata_source(fixtureText, "fixture.mjs"), undefined, "fixture strings cannot masquerade as declarations");
assert.throws(() => parse_hson_live_test_metadata_source("export const HSON_LIVE_TEST_METADATA = metadata();", "dynamic.mjs"), /literal Object\.freeze/);
assert.throws(() => parse_hson_live_test_metadata_source('export const HSON_LIVE_TEST_METADATA = Object.freeze({ id: makeId(), title: "T", category: "Core", runtime: "node", tags: Object.freeze(["x"]) });', "dynamic-id.mjs"), /id must be/);

const duplicateRoot = await mkdtemp(join(tmpdir(), "hson-live-source-discovery-"));
await mkdir(join(duplicateRoot, "tests"));
await writeFile(join(duplicateRoot, "package.json"), JSON.stringify({ name: "hson-live", type: "module" }));
await writeFile(join(duplicateRoot, "index.js"), "export {};\n");
const metadata = 'export const HSON_LIVE_TEST_METADATA = Object.freeze({ id: "duplicate", title: "Duplicate", category: "Core", runtime: "node", tags: Object.freeze(["x"]) });\n';
await writeFile(join(duplicateRoot, "tests", "one.mjs"), metadata); await writeFile(join(duplicateRoot, "tests", "two.mjs"), metadata);
await assert.rejects(resolve_external_library_launchers(new URL(`file://${join(duplicateRoot, "index.js")}`).href), /DUPLICATE_ID:duplicate/);

assert.equal(Object.values(first.invocations ?? {}).every((invocation) => invocation.kind === "direct"), true, "every discovered source uses direct executable invocation");

const direct = await discover_direct_report_executables();
const sample = [direct.catalog.tests[0]!.id, first.targets[0]!.id];
assert.deepEqual(select_direct_report_executable_ids(direct.catalog, [...sample].reverse()), select_direct_report_executable_ids(direct.catalog, sample));
assert.deepEqual(select_direct_report_executable_ids(direct.catalog, []), []);
assert.throws(() => select_direct_report_executable_ids(direct.catalog, [sample[0]!, sample[0]!]), /DUPLICATE_SELECTION/);
assert.throws(() => select_direct_report_executable_ids(direct.catalog, ["unknown/suite"]), /UNKNOWN_SELECTION/);

if (process.argv.includes("--all")) {
  const service = create_external_library_launcher_service();
  try {
    const pool = await run_external_library_launcher_pool(first.targets, (target) => service.run(first, target.id));
    assert.equal(pool.results.length, first.targets.length); assert.equal(pool.results.every((result) => result.ok), true);
  } finally { service.terminate(); }
}
console.log(JSON.stringify({ executableSourceDiscovery: "passed", discoveredSuites: first.targets.length, exactSelection: "passed" }));
