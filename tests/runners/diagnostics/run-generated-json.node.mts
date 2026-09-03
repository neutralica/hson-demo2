import { _circuit_test } from "hson-live/diagnostics";
import { with_hosted_dom_runtime } from "../../harness/runtimes/dom/hosted-dom-mutex";
import { run_test_suites } from "../../harness/core/test-runner";
import { make_json_fuzz_suite } from "../../tools/json-fuzzer/fuzzer-builder";
import { make_transform_test_suite } from "../../suites/transform/make-transform-suite";
import {
  DEFAULT_GENERATED_JSON_CASES,
  DEFAULT_GENERATED_JSON_SEED,
  GENERATED_JSON_COUNT_ENVIRONMENT,
  GENERATED_JSON_SEED_ENVIRONMENT,
} from "../../harness/hosted/generated-test-policy";

function positive_integer(name: string, fallback: number): number {
  const raw = process.env[name];
  const value = raw === undefined ? fallback : Number(raw);
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer.`);
  return value;
}

const seed = positive_integer(GENERATED_JSON_SEED_ENVIRONMENT, DEFAULT_GENERATED_JSON_SEED);
const cases = positive_integer(GENERATED_JSON_COUNT_ENVIRONMENT, DEFAULT_GENERATED_JSON_CASES);
const suite = make_transform_test_suite(
  { _circuit_test },
  make_json_fuzz_suite(cases, seed),
  `generated/json/seed_${seed}`,
);
const result = await with_hosted_dom_runtime(() => run_test_suites(
  [suite],
  () => undefined,
  { yieldEveryCases: 0, yieldBetweenSuites: false },
));
if (!result.ok || result.totals.cases !== cases) {
  throw new Error(`Generated JSON diagnostic failed ${result.totals.fail}/${result.totals.cases} cases.`);
}
console.log(JSON.stringify({ seed, cases, pass: result.totals.pass }));
