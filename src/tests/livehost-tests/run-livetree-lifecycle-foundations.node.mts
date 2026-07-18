import { run_test_suites } from "../../hosted-test/test-runner";
import { with_hosted_dom_runtime } from "../../hosted-test/dom/hosted-dom-mutex";
import { livetree_lifecycle_foundations } from "../livetree-tests/livetree-26-lifecycle-foundations";

const result = await with_hosted_dom_runtime(() => run_test_suites(
  [livetree_lifecycle_foundations()],
  () => undefined,
  { yieldEveryCases: 0, yieldBetweenSuites: false },
));

if (!result.ok || result.summary.suites !== 1 || result.summary.cases !== 12 || result.summary.pass !== 12) {
  throw new Error(`LiveTree lifecycle foundations failed: ${JSON.stringify(result.summary)}`);
}

console.log(JSON.stringify({
  suites: result.summary.suites,
  cases: result.summary.cases,
  pass: result.summary.pass,
}));
