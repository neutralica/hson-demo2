import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DOM_REQUIRED_SUITES,
  HOSTED_SUITES,
  HOST_READY_SUITES,
  UNKNOWN_OR_MIXED_SUITES,
} from "../../hosted-test/hosted-test-migration-inventory";
import {
  DEFERRED_BROWSER_FIDELITY_CASES,
  FINAL_HARNESS_MIGRATION_INVENTORY,
  GENERATED_TEST_MODES,
} from "../../hosted-test/final-harness-migration-inventory";
import { all_hosted_test_suites } from "../../hosted-test/hosted-all-test-suites";
import { all_node_safe_hosted_test_suites } from "../../hosted-test/node-safe-hosted-test-suites";
import { all_deterministic_transform_test_suites } from "../../hosted-test/deterministic-transform-test-suites";
import { all_jsdom_hosted_test_suites } from "../../hosted-test/dom/jsdom-hosted-test-suites";
import { all_unit_tests } from "../unit/all-unit-tests";

function expect_boundary(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`hosted app boundary: ${message}`);
}

const hostedDirectory = new URL("../../app/hosted-test/", import.meta.url);
const hostedFiles = readdirSync(hostedDirectory).filter((name) => name.endsWith(".ts"));
const panelFiles = [
  new URL("../../app/demos/test/hosted-test-panel-adapter.ts", import.meta.url),
  new URL("../../app/demos/test/hosted-test-panel-runtime.ts", import.meta.url),
];
const appDirectory = fileURLToPath(new URL("../../app/", import.meta.url));
function application_files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const child = join(directory, entry.name);
    if (entry.isDirectory() && !entry.isSymbolicLink()) return application_files(child);
    return entry.name.endsWith(".ts") ? [child] : [];
  });
}
for (const name of hostedFiles) {
  const source = readFileSync(new URL(name, hostedDirectory), "utf8");
  expect_boundary(!/(?:from\s+|import\s*\()["'][^"']*tests\//.test(source), `${name} must not import from src/tests`);
}

const browserRuntimeSource = readFileSync(new URL("../../app/demos/test/hosted-test-panel-runtime.ts", import.meta.url), "utf8");
const browserAdapterSource = readFileSync(new URL("../../app/hosted-test/browser-websocket-socket.ts", import.meta.url), "utf8");
const mainSource = readFileSync(new URL("../../main.ts", import.meta.url), "utf8");
const panelMountSource = readFileSync(new URL("../../app/demos/test/mount-tp.ts", import.meta.url), "utf8");
const panelAdapterSource = readFileSync(new URL("../../app/demos/test/hosted-test-panel-adapter.ts", import.meta.url), "utf8");
const panelProjectionSource = readFileSync(new URL("../../app/demos/test/hosted-test-case-list.ts", import.meta.url), "utf8");
expect_boundary(!browserRuntimeSource.includes("create_hosted_test_livehost"), "visible runtime must not construct a browser LiveHost");
expect_boundary(!browserRuntimeSource.includes("registered-hosted-test-suites") && !mainSource.includes("registered-hosted-test-suites"), "browser graph must not reach executable suite descriptors");
expect_boundary(!browserRuntimeSource.includes('from "ws"') && !browserAdapterSource.includes('from "ws"'), "browser runtime must use native WebSocket rather than Node ws");
expect_boundary(!browserRuntimeSource.includes("jsdom") && !browserAdapterSource.includes("jsdom") && !mainSource.includes("jsdom"), "browser hosted-test graph must not reach jsdom");
expect_boundary(!browserRuntimeSource.includes("hosted-canvas") && !mainSource.includes("hosted-canvas"), "browser hosted-test graph must not reach the Node canvas recorder");
for (const file of application_files(appDirectory)) {
  const source = readFileSync(file, "utf8");
  expect_boundary(!source.includes('from "jsdom"') && !source.includes('from "ws"'), `${file} excludes Node-only transport and DOM packages`);
  expect_boundary(!/(?:from\s+|import\s*\()["'][^"']*(?:registered-hosted-test-suites|jsdom-hosted-test-suites)/.test(source), `${file} excludes executable Node descriptors`);
  expect_boundary(!source.includes("all_test_suites") && !source.includes("run_test_suites"), `${file} excludes browser-local suite execution`);
  expect_boundary(!/(?:from\s+|import\s*\()["'][^"']*tests\/(?:livemap|livetree|livehost|unit|transform)\//.test(source), `${file} excludes executable test definitions`);
}
const nodeRegistrySource = readFileSync(new URL("../../hosted-test/registered-hosted-test-suites.ts", import.meta.url), "utf8");
expect_boundary(nodeRegistrySource.includes("jsdom-hosted-test-suites"), "Node executable registry may reach the jsdom-backed runner");
expect_boundary(browserRuntimeSource.includes("VITE_HOSTED_TEST_WS_URL"), "visible runtime reads the explicit WebSocket environment variable");
expect_boundary(panelMountSource.includes("HOSTED_TEST_VISIBLE_SUITES") && !panelMountSource.includes('key: "all"') && !panelMountSource.includes('key: "fuzz-json"'), "visible selector list is generated from remote-hosted metadata only");
expect_boundary(!panelMountSource.includes("make_ad_hoc_transform_suite") && !panelMountSource.includes("flush_dom"), "visible panel has no ad hoc local execution bridge");
expect_boundary(!panelMountSource.includes("create_test_log") && !panelAdapterSource.includes("TestEvent"), "hosted production panel excludes the duplicate logger and synthetic event bridge");
expect_boundary(!panelAdapterSource.includes("Object.keys(report.caseBatches)") && !panelAdapterSource.includes("hosted_test_report_cases"), "hosted adapter advances through new batches without rescanning or flattening prior cases");
expect_boundary(!panelProjectionSource.includes(".listen.onClick(async") && panelProjectionSource.includes("const actionListener = root.listen.onClick"), "case and suite actions share one delegated listener");
expect_boundary(!panelProjectionSource.includes("row.create.span().css") && !panelProjectionSource.includes("controls.create.button().css"), "dense projection descendants use shared class rules rather than per-element CSS surfaces");
for (const file of panelFiles) {
  const source = readFileSync(file, "utf8");
  expect_boundary(!/(?:from\s+|import\s*\()["'][^"']*tests\//.test(source), `${file.pathname} must not import from src/tests`);
  if (file.pathname.endsWith("hosted-test-panel-adapter.ts")) {
    expect_boundary(!source.includes("run_test_suites") && !source.includes("all_test_suites"), "hosted panel adapter must not invoke either browser-local runner");
  }
}

const compatibilityFiles = [
  "hosted-test-report.ts", "hosted-test-report.types.ts", "hosted-test-report-wire.ts",
  "hosted-test-report-wire.types.ts", "hosted-test-report-initial.ts", "hosted-test-report-initial.types.ts",
  "hosted-test-report-mirror.ts", "hosted-test-report-mirror.types.ts", "hosted-test-report-router.ts",
  "hosted-test-report-router.types.ts",
];
const compatibilityDirectory = new URL("./", import.meta.url);
for (const name of compatibilityFiles) {
  const source = readFileSync(new URL(name, compatibilityDirectory), "utf8");
  expect_boundary(source.includes("../../app/hosted-test/"), `${name} must remain a narrow application re-export`);
}

expect_boundary(HOSTED_SUITES.length === 127 && HOSTED_SUITES.reduce((total, entry) => total + (entry.cases ?? 0), 0) === 2102, "inventory pins 43 Node-safe, 78 jsdom-hosted, and 6 canvas-hosted suites with 2102 canonical cases");
expect_boundary(HOSTED_SUITES.every((entry) => (entry.hostedBy === "node/all" || entry.hostedBy === "dom/core" || entry.hostedBy === "canvas/core") && !entry.nextBulk), "every hosted entry names its aggregate descriptor");
expect_boundary(DOM_REQUIRED_SUITES.length === 4 && DOM_REQUIRED_SUITES.reduce((total, entry) => total + (entry.cases ?? 0), 0) === 8, "inventory retains exactly eight browser-fidelity cases");
expect_boundary(UNKNOWN_OR_MIXED_SUITES.length === 0, "no former local mode remains unexplained");
expect_boundary(HOST_READY_SUITES.length === 0, "no verified Node-safe suite remains merely HOST_READY");
expect_boundary(DOM_REQUIRED_SUITES.every((entry) => !entry.nextBulk && entry.browserApis.length > 0), "DOM-required entries are excluded from the next bulk migration");
expect_boundary(join("src", "app", "hosted-test") === "src/app/hosted-test", "boundary test remains workspace-relative");
const hostedAll = all_hosted_test_suites();
const hostedAllKeys = hostedAll.flatMap((suite) => suite.cases.map((testCase) => `${testCase.suite}::${testCase.name}`));
expect_boundary(hostedAll.length === 127 && hostedAllKeys.length === 2102 && new Set(hostedAllKeys).size === 2102, "hosted/all is canonical and non-overlapping");
expect_boundary(DEFERRED_BROWSER_FIDELITY_CASES.length === 8 && DEFERRED_BROWSER_FIDELITY_CASES.every((entry) => !new Set(hostedAllKeys).has(entry.id)), "the exact eight fidelity cases remain explicit and excluded");
expect_boundary(GENERATED_TEST_MODES.length === 2 && GENERATED_TEST_MODES.reduce((total, entry) => total + (entry.cases ?? 0), 0) === 250, "generated diagnostics remain separately classified");
expect_boundary(FINAL_HARNESS_MIGRATION_INVENTORY.every((entry) => entry.status !== "UNKNOWN"), "final harness inventory has no unknown entries");
const nodeKeys = new Set(all_node_safe_hosted_test_suites().flatMap((suite) => suite.cases.map((testCase) => `${testCase.suite}::${testCase.name}`)));
const unitSuites = all_unit_tests();
const unitKeys = unitSuites.flatMap((suite) => suite.cases.map((testCase) => `${testCase.suite}::${testCase.name}`));
expect_boundary(unitSuites.length === 9 && unitKeys.length === 101 && unitKeys.every((key) => nodeKeys.has(key)), "all nine unit suites / 101 cases are represented by node/all");
const domKeys = new Set(all_jsdom_hosted_test_suites().flatMap((suite) => suite.cases.map((testCase) => `${testCase.suite}::${testCase.name}`)));
const transformSuites = all_deterministic_transform_test_suites();
const transformKeys = transformSuites.flatMap((suite) => suite.cases.map((testCase) => `${testCase.suite}::${testCase.name}`));
expect_boundary(transformSuites.length === 9 && transformKeys.length === 362 && transformKeys.every((key) => domKeys.has(key)), "all nine deterministic transform suites / 362 cases are represented by dom/core");
console.log("hosted app boundary: ok");
