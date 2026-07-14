import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  DOM_REQUIRED_SUITES,
  HOSTED_SUITES,
  HOST_READY_SUITES,
  UNKNOWN_OR_MIXED_SUITES,
} from "../../hosted-test/hosted-test-migration-inventory";

function expect_boundary(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`hosted app boundary: ${message}`);
}

const hostedDirectory = new URL("../../app/hosted-test/", import.meta.url);
const hostedFiles = readdirSync(hostedDirectory).filter((name) => name.endsWith(".ts"));
const panelFiles = [
  new URL("../../app/demos/test/hosted-test-panel-adapter.ts", import.meta.url),
  new URL("../../app/demos/test/hosted-test-panel-runtime.ts", import.meta.url),
];
for (const name of hostedFiles) {
  const source = readFileSync(new URL(name, hostedDirectory), "utf8");
  expect_boundary(!source.includes("tests/"), `${name} must not import from src/tests`);
}

const browserRuntimeSource = readFileSync(new URL("../../app/demos/test/hosted-test-panel-runtime.ts", import.meta.url), "utf8");
const browserAdapterSource = readFileSync(new URL("../../app/hosted-test/browser-websocket-socket.ts", import.meta.url), "utf8");
const mainSource = readFileSync(new URL("../../main.ts", import.meta.url), "utf8");
expect_boundary(!browserRuntimeSource.includes("create_hosted_test_livehost"), "visible runtime must not construct a browser LiveHost");
expect_boundary(!browserRuntimeSource.includes("registered-hosted-test-suites") && !mainSource.includes("registered-hosted-test-suites"), "browser graph must not reach executable suite descriptors");
expect_boundary(!browserRuntimeSource.includes('from "ws"') && !browserAdapterSource.includes('from "ws"'), "browser runtime must use native WebSocket rather than Node ws");
expect_boundary(!browserRuntimeSource.includes("jsdom") && !browserAdapterSource.includes("jsdom") && !mainSource.includes("jsdom"), "browser hosted-test graph must not reach jsdom");
expect_boundary(browserRuntimeSource.includes("VITE_HOSTED_TEST_WS_URL"), "visible runtime reads the explicit WebSocket environment variable");
for (const file of panelFiles) {
  const source = readFileSync(file, "utf8");
  expect_boundary(!source.includes("tests/"), `${file.pathname} must not import from src/tests`);
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

expect_boundary(HOSTED_SUITES.length === 41 && HOSTED_SUITES.reduce((total, entry) => total + (entry.cases ?? 0), 0) === 1060, "inventory pins 41 HOSTED suites and 1060 cases");
expect_boundary(HOSTED_SUITES.every((entry) => entry.hostedBy === "node/all" && !entry.nextBulk), "every Node-safe entry is hosted by the aggregate descriptor");
expect_boundary(DOM_REQUIRED_SUITES.length === 81, "inventory pins all known DOM-required suite entries");
expect_boundary(UNKNOWN_OR_MIXED_SUITES.length === 3, "inventory pins mixed runtime modes separately");
expect_boundary(HOST_READY_SUITES.length === 0, "no verified Node-safe suite remains merely HOST_READY");
expect_boundary(DOM_REQUIRED_SUITES.every((entry) => !entry.nextBulk && entry.browserApis.length > 0), "DOM-required entries are excluded from the next bulk migration");
expect_boundary(join("src", "app", "hosted-test") === "src/app/hosted-test", "boundary test remains workspace-relative");
console.log("hosted app boundary: ok");
