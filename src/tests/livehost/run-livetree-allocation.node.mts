import { run_test_suites } from "../../hosted-test/test-runner";
import { with_hosted_dom_runtime } from "../../hosted-test/dom/hosted-dom-mutex";
import { livetree_allocation } from "../livetree/livetree-29-allocation";

const result = await with_hosted_dom_runtime(() => run_test_suites(
  [livetree_allocation()],
  () => undefined,
  { yieldEveryCases: 0, yieldBetweenSuites: false },
));

if (!result.ok || result.summary.suites !== 1 || result.summary.cases !== 5 || result.summary.pass !== 5) {
  throw new Error(`LiveTree allocation suite failed: ${JSON.stringify(result.summary)}`);
}

console.log(JSON.stringify({ suites: 1, cases: 5, pass: 5 }));
