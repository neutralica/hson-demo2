import { run_test_suites } from "../../harness/core/test-runner";
import { with_hosted_dom_runtime } from "../../harness/runtimes/dom/hosted-dom-mutex";
import { livetree_lifecycle_public } from "../../suites/livetree/livetree-27-lifecycle-public";

const result = await with_hosted_dom_runtime(() => run_test_suites(
  [livetree_lifecycle_public()],
  () => undefined,
  { yieldEveryCases: 0, yieldBetweenSuites: false },
));

if (!result.ok || result.summary.suites !== 1 || result.summary.cases !== 5 || result.summary.pass !== 5) {
  throw new Error(`LiveTree public lifecycle failed: ${JSON.stringify(result.summary)}`);
}

console.log(JSON.stringify({
  suites: result.summary.suites,
  cases: result.summary.cases,
  pass: result.summary.pass,
}));
