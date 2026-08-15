import { run_test_suites } from "../../harness/core/test-runner";
import { with_hosted_dom_runtime } from "../../harness/runtimes/dom/hosted-dom-mutex";
import { livetree_lifecycle_ownership } from "../../suites/livetree/livetree-28-lifecycle-ownership";

const suite = livetree_lifecycle_ownership();
const result = await with_hosted_dom_runtime(() => run_test_suites(
  [suite],
  () => undefined,
  { yieldEveryCases: 0, yieldBetweenSuites: false },
));

if (!result.ok || result.summary.suites !== 1 || result.summary.cases !== suite.cases.length || result.summary.pass !== suite.cases.length) {
  throw new Error(`LiveTree lifecycle ownership failed: ${JSON.stringify(result.summary)}`);
}

console.log(JSON.stringify({
  suites: result.summary.suites,
  cases: result.summary.cases,
  pass: result.summary.pass,
}));
