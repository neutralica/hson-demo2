const PREFIX = "<HSON_LIVE_TEST_COMPLETION>";
const [, , scenario, launcherId, countText] = process.argv;
const count = Number(countText);

function completion(
  id = launcherId,
  executed = count,
  passed = executed,
  failed = 0,
) {
  process.stdout.write(`${PREFIX}${JSON.stringify({
    version: 1,
    launcherId: id,
    executed,
    passed,
    failed,
  })}\n`);
}

async function write(stream, value) {
  if (stream.write(value)) return;
  await new Promise((resolve) => stream.once("drain", resolve));
}

switch (scenario) {
  case "valid":
    process.stdout.write("ordinary diagnostic\n");
    completion();
    break;
  case "missing":
    process.stdout.write("ordinary diagnostic only\n");
    break;
  case "zero":
    completion(launcherId, 0, 0, 0);
    break;
  case "fewer":
    completion(launcherId, count - 1, count - 1, 0);
    break;
  case "more":
    completion(launcherId, count + 1, count + 1, 0);
    break;
  case "wrong-id":
    completion("wrong.launcher", count, count, 0);
    break;
  case "malformed":
    process.stdout.write(`${PREFIX}{not-json}\n`);
    break;
  case "duplicate":
    completion();
    completion();
    break;
  case "failed":
    completion(launcherId, count, count - 1, 1);
    break;
  case "nonzero":
    completion();
    process.exitCode = 7;
    break;
  case "graceful-timeout":
    process.on("SIGTERM", () => process.exit(0));
    setInterval(() => undefined, 1_000);
    break;
  case "resistant-timeout":
    process.on("SIGTERM", () => undefined);
    setInterval(() => undefined, 1_000);
    break;
  case "large-stdout":
    await write(process.stdout, `stdout-head\n${"o".repeat(600_000)}\nstdout-tail\n`);
    completion();
    break;
  case "large-stderr":
    await write(process.stderr, `stderr-head\n${"e".repeat(600_000)}\nstderr-tail\n`);
    completion();
    break;
  default:
    throw new Error(`Unknown external launcher protocol fixture scenario: ${scenario}`);
}
