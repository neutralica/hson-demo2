import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { delimiter, dirname, posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { TestCapability } from "../../../../../src/shared/testing/test-contracts";
import type { TestSuite } from "../../../core/test-contracts";

const EVENT_PREFIX = "<LOCUS_BROWSER_EVENT>";
const EXECUTION_SOURCE_PREFIX = "playwright-test:";
export const PLAYWRIGHT_REPOSITORY_ROOT = resolve(import.meta.dirname, "../../../../..");
export const PLAYWRIGHT_BROWSER_REQUIREMENTS = Object.freeze([
  "javascript", "node", "process", "browser-dom", "browser", "chromium", "network", "local-server",
] as const satisfies readonly TestCapability[]);

export type PlaywrightDiscoveredTest = Readonly<{
  path: string;
  title: string;
  titlePath: readonly string[];
  project: string;
  line: number;
  column: number;
}>;

export type PlaywrightExecutionLocator = PlaywrightDiscoveredTest;

export function normalize_playwright_source_path(value: string): string {
  return value.replaceAll("\\", "/").replace(/^\.\//, "");
}

function id_segment(value: string): string {
  const normalized = value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return normalized || "test";
}

export function playwright_suite_id(test: Pick<PlaywrightDiscoveredTest, "path" | "project">): string {
  const file = posix.basename(normalize_playwright_source_path(test.path)).replace(/\.spec\.[^.]+$/, "");
  return `livedemo/browser/${id_segment(file)}${test.project === "chromium" ? "" : `-${id_segment(test.project)}`}`;
}

export function playwright_case_id(test: Pick<PlaywrightDiscoveredTest, "path" | "title" | "titlePath" | "project">): string {
  const identity = JSON.stringify([normalize_playwright_source_path(test.path), test.titlePath, test.project]);
  const hash = createHash("sha256").update(identity).digest("hex").slice(0, 10);
  return `${id_segment(test.title).slice(0, 48)}-${hash}`;
}

export function playwright_execution_source_ref(test: PlaywrightDiscoveredTest): string {
  return `${EXECUTION_SOURCE_PREFIX}${encodeURIComponent(JSON.stringify([
    normalize_playwright_source_path(test.path), test.title, test.titlePath, test.project, test.line, test.column,
  ]))}`;
}

export function playwright_execution_locator(sourceRef: string | undefined): PlaywrightExecutionLocator {
  if (sourceRef === undefined || !sourceRef.startsWith(EXECUTION_SOURCE_PREFIX)) {
    throw new Error(`BROWSER_EXECUTOR_SOURCE_INVALID:${sourceRef ?? "missing"}`);
  }
  let value: unknown;
  try { value = JSON.parse(decodeURIComponent(sourceRef.slice(EXECUTION_SOURCE_PREFIX.length))); }
  catch (cause) { throw new Error(`BROWSER_EXECUTOR_SOURCE_INVALID:${sourceRef}`, { cause }); }
  if (!Array.isArray(value) || value.length !== 6
    || typeof value[0] !== "string" || typeof value[1] !== "string"
    || !Array.isArray(value[2]) || !value[2].every((part) => typeof part === "string")
    || typeof value[3] !== "string" || !Number.isInteger(value[4]) || Number(value[4]) < 1
    || !Number.isInteger(value[5]) || Number(value[5]) < 1) {
    throw new Error(`BROWSER_EXECUTOR_SOURCE_INVALID:${sourceRef}`);
  }
  return Object.freeze({
    path: normalize_playwright_source_path(value[0]), title: value[1], titlePath: Object.freeze([...value[2]]),
    project: value[3], line: Number(value[4]), column: Number(value[5]),
  });
}

function decoded_test(line: string): PlaywrightDiscoveredTest | undefined {
  if (!line.startsWith(EVENT_PREFIX)) return undefined;
  const value = JSON.parse(line.slice(EVENT_PREFIX.length)) as Record<string, unknown>;
  if (value.t !== "discovered") return undefined;
  if (typeof value.path !== "string" || typeof value.title !== "string" || typeof value.project !== "string"
    || !Array.isArray(value.titlePath) || !value.titlePath.every((part) => typeof part === "string")
    || !Number.isInteger(value.line) || !Number.isInteger(value.column)) {
    throw new Error("PLAYWRIGHT_DISCOVERY_EVENT_INVALID");
  }
  return Object.freeze({
    path: normalize_playwright_source_path(value.path), title: value.title,
    titlePath: Object.freeze([...value.titlePath]), project: value.project,
    line: Number(value.line), column: Number(value.column),
  });
}

export function parse_playwright_discovery_output(stdout: string): readonly PlaywrightDiscoveredTest[] {
  const tests = stdout.split(/\r?\n/).flatMap((line) => {
    const decoded = decoded_test(line);
    return decoded === undefined ? [] : [decoded];
  });
  if (tests.length === 0) throw new Error("PLAYWRIGHT_DISCOVERY_EMPTY");
  const identities = new Set<string>();
  for (const test of tests) {
    const id = `${playwright_suite_id(test)}::${playwright_case_id(test)}`;
    if (identities.has(id)) throw new Error(`PLAYWRIGHT_DISCOVERY_DUPLICATE_ID:${id}`);
    identities.add(id);
  }
  return Object.freeze(tests);
}

export function discover_playwright_tests(): readonly PlaywrightDiscoveredTest[] {
  const stdout = execFileSync(process.execPath, [
    fileURLToPath(import.meta.resolve("@playwright/test/cli")), "test", "--config", resolve(PLAYWRIGHT_REPOSITORY_ROOT, "playwright.config.ts"), "--list",
  ], {
    cwd: PLAYWRIGHT_REPOSITORY_ROOT, encoding: "utf8", maxBuffer: 4 * 1024 * 1024,
    env: {
      ...process.env, LIVEHOST_PLAYWRIGHT: "1",
      PATH: `${dirname(process.execPath)}${delimiter}${process.env.PATH ?? ""}`,
    },
  });
  return parse_playwright_discovery_output(stdout);
}

export function playwright_browser_test_suites(tests: readonly PlaywrightDiscoveredTest[] = discover_playwright_tests()): readonly TestSuite[] {
  const groups = new Map<string, PlaywrightDiscoveredTest[]>();
  for (const test of tests) {
    const id = playwright_suite_id(test);
    groups.set(id, [...(groups.get(id) ?? []), test]);
  }
  return Object.freeze([...groups.entries()].map(([suite, entries], order) => {
    const first = entries[0]!;
    return Object.freeze({
      suite,
      descriptor: Object.freeze({
        title: `Playwright ${first.project}: ${posix.basename(first.path).replace(/\.spec\.[^.]+$/, "")}`,
        subject: "livedemo" as const,
        collections: Object.freeze(["dev"] as const),
        provenance: "hson-demo2" as const,
        order: 10_000 + order,
        requirements: PLAYWRIGHT_BROWSER_REQUIREMENTS,
        executionShape: "browser-journeys" as const,
        sourceRef: `playwright:${first.path}#${first.project}`,
      }),
      cases: Object.freeze(entries.map((test) => Object.freeze({
        suite,
        caseId: playwright_case_id(test),
        name: test.title,
        descriptor: Object.freeze({ sourceRef: playwright_execution_source_ref(test) }),
        run(): never { throw new Error("Browser journeys must be assigned to the supervised Playwright executor."); },
      }))),
    });
  }));
}
