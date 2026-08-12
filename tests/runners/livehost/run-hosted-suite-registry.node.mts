import { make_hosted_test_suite_registry } from "../../harness/hosted/hosted-test-suite";
import { make_registered_hosted_test_suite_registry } from "../../harness/hosted/registered-hosted-test-suites";

function expect_registry(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`hosted suite registry: ${message}`);
}

const registered = make_registered_hosted_test_suite_registry();
expect_registry(registered.list().map((descriptor) => descriptor.id).join(",") === "hosted/all,livemap/replay,livehost/all,node/all,dom/core,canvas/core,category/livetree,category/livemap,category/livehost,category/transform,category/unit,category/dev", "registry exposes focused collections and the six visible category IDs");
expect_registry(registered.get("hosted/all").label === "all hosted", "complete hosted descriptor resolves");
expect_registry(registered.get("livemap/replay").label === "livemap/replay", "replay descriptor resolves");
expect_registry(registered.get("livehost/all").label === "livehost/all", "LiveHost descriptor resolves");
expect_registry(registered.get("node/all").label === "all Node-safe", "aggregate descriptor resolves");
expect_registry(registered.get("dom/core").label === "DOM core", "DOM descriptor resolves");
expect_registry(registered.get("canvas/core").label === "Canvas core", "canvas descriptor resolves");

let replayCalls = 0;
let livehostCalls = 0;
let nodeCalls = 0;
let domCalls = 0;
let canvasCalls = 0;
let hostedAllCalls = 0;
const isolated = make_hosted_test_suite_registry([
  {
    id: "hosted/all",
    label: "all hosted",
    async run() {
      hostedAllCalls += 1;
      return { ok: true, summary: { suites: 0, cases: 0, pass: 0, fail: 0, skip: 0, msTotal: 0, failures: [] } };
    },
  },
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
  {
    id: "dom/core",
    label: "dom",
    async run() {
      domCalls += 1;
      return { ok: true, summary: { suites: 0, cases: 0, pass: 0, fail: 0, skip: 0, msTotal: 0, failures: [] } };
    },
  },
  {
    id: "canvas/core",
    label: "canvas",
    async run() {
      canvasCalls += 1;
      return { ok: true, summary: { suites: 0, cases: 0, pass: 0, fail: 0, skip: 0, msTotal: 0, failures: [] } };
    },
  },
]);
await isolated.get("hosted/all").run();
expect_registry(Number(hostedAllCalls) === 1 && replayCalls === 0, "complete descriptor invokes only complete hosted runner");
await isolated.get("livemap/replay").run();
expect_registry(Number(replayCalls) === 1 && Number(livehostCalls) === 0, "replay descriptor invokes only replay runner");
await isolated.get("livehost/all").run();
expect_registry(Number(replayCalls) === 1 && Number(livehostCalls) === 1, "LiveHost descriptor invokes only LiveHost runner");
await isolated.get("node/all").run();
expect_registry(Number(replayCalls) === 1 && Number(livehostCalls) === 1 && Number(nodeCalls) === 1, "aggregate descriptor invokes only aggregate runner");
await isolated.get("dom/core").run();
expect_registry(Number(domCalls) === 1 && Number(nodeCalls) === 1, "DOM descriptor invokes only DOM runner");
await isolated.get("canvas/core").run();
expect_registry(Number(canvasCalls) === 1 && Number(domCalls) === 1, "canvas descriptor invokes only canvas runner");

const replay = await registered.get("livemap/replay").run(undefined, { yieldEveryCases: 0, yieldBetweenSuites: false });
const livehost = await registered.get("livehost/all").run(undefined, { yieldEveryCases: 0, yieldBetweenSuites: false });
const nodeAll = await registered.get("node/all").run(undefined, { yieldEveryCases: 0, yieldBetweenSuites: false });
const domCore = await registered.get("dom/core").run(undefined, { yieldEveryCases: 0, yieldBetweenSuites: false });
const canvasCore = await registered.get("canvas/core").run(undefined, { yieldEveryCases: 0, yieldBetweenSuites: false });
const hostedAll = await registered.get("hosted/all").run(undefined, { yieldEveryCases: 0, yieldBetweenSuites: false });
expect_registry(replay.ok && replay.summary.suites === 1 && replay.summary.cases === 45, "registered replay runner passes 45 cases under Node");
expect_registry(livehost.ok && livehost.summary.suites === 10 && livehost.summary.cases === 174, "registered LiveHost runner passes 174 cases under Node");
expect_registry(nodeAll.ok && nodeAll.summary.suites === 58 && nodeAll.summary.cases === 1412, "registered aggregate runner passes every Node-safe case exactly once");
expect_registry(domCore.ok && domCore.summary.suites === 78 && domCore.summary.cases === 968, "registered DOM runner passes the expanded canonical jsdom and geometry tranche");
expect_registry(canvasCore.ok && canvasCore.summary.suites === 6 && canvasCore.summary.cases === 62, "registered canvas runner passes the deterministic command/state tranche");
expect_registry(hostedAll.ok && hostedAll.summary.suites === 142 && hostedAll.summary.cases === 2442 && hostedAll.summary.pass === 2442, "registered complete runner passes every canonical hosted case exactly once");
expect_registry(typeof window === "undefined" && typeof document === "undefined" && typeof DOMParser === "undefined", "both registered runners are Node-safe");
console.log("hosted suite registry: ok");
