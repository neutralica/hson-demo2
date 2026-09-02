const EVENT_PREFIX = "<HSON_TEST_EVENT>";
const [, , scenario, suiteId] = process.argv;

function event(value) { process.stdout.write(`${EVENT_PREFIX}${JSON.stringify(value)}\n`); }
function begin(caseId, title = caseId) { event({ t: "case_begin", caseId, title }); }
function end(caseId, status = "pass") { event({ t: "case_end", caseId, status }); }
function terminal(status = "pass", id = suiteId) { event({ t: "terminal", suiteId: id, status }); }
function valid_cases(statuses = ["pass", "pass"]) {
  statuses.forEach((status, index) => { const id = `case-${index + 1}`; begin(id, `Case ${index + 1}`); end(id, status); });
  terminal(statuses.includes("fail") ? "fail" : statuses.includes("pass") ? "pass" : "skip");
}
async function write(stream, value) { if (stream.write(value)) return; await new Promise((resolve) => stream.once("drain", resolve)); }

switch (scenario) {
  case "valid":
    process.stdout.write("ordinary diagnostic\n"); valid_cases();
    break;
  case "invalid-json": process.stdout.write(`${EVENT_PREFIX}{not-json}\n`); break;
  case "invalid-control": process.stdout.write(`${EVENT_PREFIX}[]\n`); break;
  case "unknown-event": event({ t: "mystery" }); break;
  case "duplicate-case-id": begin("same"); begin("same"); break;
  case "end-without-begin": end("orphan"); break;
  case "double-end": begin("same"); end("same"); end("same"); break;
  case "invalid-diagnostic": event({ t: "diagnostic", caseId: "absent", kind: "assertion", message: "no active case" }); break;
  case "double-terminal": valid_cases(["pass"]); terminal(); break;
  case "missing-terminal": begin("only"); end("only"); break;
  case "truncated-control": process.stdout.write(`${EVENT_PREFIX}{"t":"terminal"`); break;
  case "after-terminal": valid_cases(["pass"]); begin("late"); break;
  case "wrong-suite": begin("only"); end("only"); terminal("pass", "wrong.suite"); break;
  case "contradiction": begin("failed"); end("failed", "fail"); terminal("pass"); break;
  case "failed": valid_cases(["pass", "fail"]); process.exitCode = 1; break;
  case "nonzero": valid_cases(["pass"]); process.exitCode = 7; break;
  case "signal": valid_cases(["pass"]); process.kill(process.pid, "SIGTERM"); break;
  case "graceful-timeout": process.on("SIGTERM", () => process.exit(0)); process.stdout.write("ready\n"); setInterval(() => undefined, 1_000); break;
  case "resistant-timeout": process.on("SIGTERM", () => undefined); process.stdout.write("ready\n"); setInterval(() => undefined, 1_000); break;
  case "completed-then-wait": valid_cases(["pass"]); process.on("SIGTERM", () => process.exit(0)); setInterval(() => undefined, 1_000); break;
  case "large-stdout": await write(process.stdout, `stdout-head\n${"o".repeat(600_000)}\nstdout-tail\n`); valid_cases(["pass"]); break;
  case "large-stderr": await write(process.stderr, `stderr-head\n${"e".repeat(600_000)}\nstderr-tail\n`); valid_cases(["pass"]); break;
  default: throw new Error(`Unknown external launcher protocol fixture scenario: ${scenario}`);
}
