import { run_livemap_replay_suite } from "./run-replay-suite";

type OnEvent = NonNullable<Parameters<typeof run_livemap_replay_suite>[0]>;
type ReplayEvent = Parameters<OnEvent>[0];

function expect_node_replay(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`node replay runner: ${message}`);
}

function event_key(event: Extract<ReplayEvent, { t: "case_begin" | "case_end" }>): string {
  return `${event.suite}::${event.name}`;
}

async function test_node_replay_runner(): Promise<void> {
  expect_node_replay(typeof document === "undefined", "document must be unavailable");
  expect_node_replay(typeof window === "undefined", "window must be unavailable");
  expect_node_replay(typeof DOMParser === "undefined", "DOMParser must be unavailable");
  expect_node_replay(typeof HTMLElement === "undefined", "HTMLElement must be unavailable");
  expect_node_replay(typeof Element === "undefined", "Element must be unavailable");
  expect_node_replay(
    typeof globalThis.requestAnimationFrame === "undefined",
    "requestAnimationFrame must be unavailable",
  );

  const events: ReplayEvent[] = [];
  const result = await run_livemap_replay_suite(
    (event) => events.push(event),
    {
      yieldEveryCases: 0,
      yieldBetweenSuites: false,
    },
  );

  const suiteBegins = events.filter((event) => event.t === "suite_begin");
  const suiteEnds = events.filter((event) => event.t === "suite_end");
  expect_node_replay(suiteBegins.length === 1, "expected exactly one suite_begin");
  expect_node_replay(suiteEnds.length === 1, "expected exactly one suite_end");

  const suiteBegin = suiteBegins[0];
  const suiteEnd = suiteEnds[0];
  expect_node_replay(suiteBegin?.suite === "livemap/replay", "unexpected suite_begin name");
  expect_node_replay(suiteEnd?.suite === "livemap/replay", "unexpected suite_end name");
  expect_node_replay(events[0] === suiteBegin, "suite_begin must be the first event");
  expect_node_replay(events.at(-1) === suiteEnd, "suite_end must be the last event");

  const openCases = new Set<string>();
  const caseBegins = new Map<string, number>();
  const caseEnds = new Map<string, number>();

  for (const event of events) {
    if (event.t === "case_begin") {
      const key = event_key(event);
      expect_node_replay(!openCases.has(key), `case began twice before ending: ${key}`);
      openCases.add(key);
      caseBegins.set(key, (caseBegins.get(key) ?? 0) + 1);
      continue;
    }

    if (event.t === "case_end") {
      const key = event_key(event);
      expect_node_replay(openCases.has(key), `case ended before beginning: ${key}`);
      openCases.delete(key);
      caseEnds.set(key, (caseEnds.get(key) ?? 0) + 1);
    }
  }

  expect_node_replay(openCases.size === 0, "every case_begin must have a case_end");
  expect_node_replay(caseBegins.size === caseEnds.size, "case begin/end key counts must match");

  for (const [key, beginCount] of caseBegins) {
    expect_node_replay(beginCount === 1, `expected one case_begin for ${key}`);
    expect_node_replay(caseEnds.get(key) === 1, `expected one case_end for ${key}`);
  }

  expect_node_replay(result.ok === true, "RunResult.ok must be true");
  expect_node_replay(result.summary.fail === 0, "summary.fail must be zero");
  expect_node_replay(
    result.summary.cases === suiteBegin.totalPlanned,
    "summary.cases must equal the replay suite case count",
  );
  expect_node_replay(
    result.summary.cases === caseBegins.size,
    "summary.cases must equal emitted case_begin count",
  );
}

await test_node_replay_runner();
