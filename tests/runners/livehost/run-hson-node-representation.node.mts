import { run_test_suites } from "../../harness/core/test-runner";
import { with_hosted_dom_runtime } from "../../harness/runtimes/dom/hosted-dom-mutex";
import { hson_node_representation } from "../../suites/livetree/livetree-30-node-representation";

const suite = hson_node_representation();
const result = await with_hosted_dom_runtime(() => run_test_suites(
  [suite],
  () => undefined,
  { yieldEveryCases: 0, yieldBetweenSuites: false },
));

if (!result.ok || result.totals.suites !== 1 || result.totals.cases !== suite.cases.length || result.totals.pass !== suite.cases.length) {
  throw new Error(`HsonNode representation suite failed: ${JSON.stringify(result)}`);
}

console.log(JSON.stringify({ suites: result.totals.suites, cases: result.totals.cases, pass: result.totals.pass }));
