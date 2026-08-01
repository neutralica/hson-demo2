import { format_hosted_test_duration } from "../../harness/reporting/hosted/hosted-test-timing";

const expected = new Map<number, string>([
  [0, "0.0 ms"],
  [64, "64.0 ms"],
  [640, "640.0 ms"],
  [1000, "1.00 s"],
  [6400, "6.40 s"],
  [27000, "27.0 s"],
]);
for (const [value, display] of expected) {
  if (format_hosted_test_duration(value) !== display) throw new Error(`timing ${value} expected ${display}`);
}
console.log("hosted test timing: ok");
