import { run_test_suites } from "../../hosted-test/test-runner";
import { with_hosted_dom_runtime } from "../../hosted-test/dom/hosted-dom-mutex";
import { hson_node_representation } from "../livetree/livetree-30-node-representation";

const result = await with_hosted_dom_runtime(() => run_test_suites(
  [hson_node_representation()],
  () => undefined,
  { yieldEveryCases: 0, yieldBetweenSuites: false },
));

if (!result.ok || result.summary.suites !== 1 || result.summary.cases !== 10 || result.summary.pass !== 10) {
  throw new Error(`HsonNode representation suite failed: ${JSON.stringify(result.summary)}`);
}

console.log(JSON.stringify({ suites: 1, cases: 10, pass: 10 }));
