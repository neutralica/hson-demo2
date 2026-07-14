import { make_hosted_test_suite_registry } from "../../app/hosted-test/hosted-test-suite";
import { make_registered_hosted_test_suite_registry } from "../../hosted-test/registered-hosted-test-suites";

function expect_registry(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`hosted suite registry: ${message}`);
}

const registered = make_registered_hosted_test_suite_registry();
expect_registry(registered.list().map((descriptor) => descriptor.id).join(",") === "livemap/replay,livehost/all,node/all", "registry exposes the three closed suite IDs");
expect_registry(registered.get("livemap/replay").label === "livemap/replay", "replay descriptor resolves");
expect_registry(registered.get("livehost/all").label === "livehost/all", "LiveHost descriptor resolves");
expect_registry(registered.get("node/all").label === "all Node-safe", "aggregate descriptor resolves");

let replayCalls = 0;
let livehostCalls = 0;
let nodeCalls = 0;
const isolated = make_hosted_test_suite_registry([
  {
    id: "livemap/replay",
    label: "replay",
    async run() {
      replayCalls += 1;
      return { ok: true, summary: { suites: 0, cases: 0, pass: 0, fail: 0, skip: 0, msTotal: 0, failures: [] } };
    },
  },
  {
    id: "livehost/all",
    label: "livehost",
    async run() {
      livehostCalls += 1;
      return { ok: true, summary: { suites: 0, cases: 0, pass: 0, fail: 0, skip: 0, msTotal: 0, failures: [] } };
    },
  },
  {
    id: "node/all",
    label: "node",
    async run() {
      nodeCalls += 1;
      return { ok: true, summary: { suites: 0, cases: 0, pass: 0, fail: 0, skip: 0, msTotal: 0, failures: [] } };
    },
  },
]);
await isolated.get("livemap/replay").run();
expect_registry(replayCalls === 1 && livehostCalls === 0, "replay descriptor invokes only replay runner");
await isolated.get("livehost/all").run();
expect_registry(replayCalls === 1 && Number(livehostCalls) === 1, "LiveHost descriptor invokes only LiveHost runner");
await isolated.get("node/all").run();
expect_registry(replayCalls === 1 && Number(livehostCalls) === 1 && nodeCalls === 1, "aggregate descriptor invokes only aggregate runner");

const replay = await registered.get("livemap/replay").run(undefined, { yieldEveryCases: 0, yieldBetweenSuites: false });
const livehost = await registered.get("livehost/all").run(undefined, { yieldEveryCases: 0, yieldBetweenSuites: false });
const nodeAll = await registered.get("node/all").run(undefined, { yieldEveryCases: 0, yieldBetweenSuites: false });
expect_registry(replay.ok && replay.summary.suites === 1 && replay.summary.cases === 45, "registered replay runner passes 45 cases under Node");
expect_registry(livehost.ok && livehost.summary.suites === 9 && livehost.summary.cases === 157, "registered LiveHost runner passes 157 cases under Node");
expect_registry(nodeAll.ok && nodeAll.summary.suites === 41 && nodeAll.summary.cases === 1060, "registered aggregate runner passes every Node-safe case exactly once");
expect_registry(typeof window === "undefined" && typeof document === "undefined" && typeof DOMParser === "undefined", "both registered runners are Node-safe");
console.log("hosted suite registry: ok");
