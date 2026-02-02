import type { FixtureAtom, LoopOpts } from "../../../hson-live/dist/diagnostics/loop-3.test";
import { _freeze, FIXTURES_GENERATED } from "../fixtures/fixture-gen";
import type { Fixture } from "../fixtures/fixtures.types";
import { LOOP_FIXTURES } from "../fixtures/json-fixtures";
import type { TestRunMode, TestSuite } from "./tests.types";

type LoopReport = {
  ok: boolean;
  entry: string;
  failures: unknown[];
  trace?: unknown[];
  final?: { fmt: string; text: string };
};

export type HsonTestApi = Readonly<{
  _test_full_loop: (atom: FixtureAtom, opts?: Partial<LoopOpts>) => LoopReport;
}>;

export type LoopFixtureKey = keyof typeof LOOP_FIXTURES;

function fmt_report(r: LoopReport): string {
  const lines: string[] = [];
  lines.push(`ok: ${String(r.ok)}`);
  lines.push(`entry: ${r.entry}`);
  lines.push(`failures: ${r.failures?.length ?? 0}`);
  if (r.final) lines.push(`final: ${r.final.fmt}`);
  return lines.join("\n");
}

export function make_full_loop_suite(hson: HsonTestApi): TestSuite {
  const suite = "full_loop" as const; // CHANGED: matches your TestEvent.suite shape

  const cases = (Object.keys(LOOP_FIXTURES) as readonly LoopFixtureKey[]).map((k) => {
    const src = LOOP_FIXTURES[k];

    return _freeze({
      suite,                 // CHANGED: required by your TestCase type
      name: k,               // CHANGED: TestCase.name is the case name
      meta: { fixture: k },  // OK: Record<string,string>
      run: () => {
        const r = hson._test_full_loop(src);
        if (!r.ok) {
          throw new Error(`_test_full_loop failed for ${k}\n${fmt_report(r)}`);
        }
      },
    });
  });

  return _freeze({
    suite,                   // CHANGED: TestSuite.suite (not name)
    cases: _freeze(cases),
  });
}



export function make_generated_fixtures_suite(
  hson: HsonTestApi,
  fixtures: readonly Fixture[],
): TestSuite {
  const suite = "fixtures/generated";

  return _freeze({
    suite, // CHANGED: was `name`
    cases: _freeze(
      fixtures.map((fx) => {
        // CHANGED: avoid meta: undefined under exactOptionalPropertyTypes
        const base = {
          suite,              // CHANGED: required per-case
          name: fx.name,
          run: () => {
            const r = hson._test_full_loop(fx.atom, { entry: fx.fmt, dual: true, times: 3 });
            if (!r.ok) throw new Error(`fixture failed: ${fx.name}`);
          },
        } as const;

        const tags = fx.tags?.length ? fx.tags.join(",") : "";
        return _freeze(tags ? { ...base, meta: { tags } } : base);
      }),
    ),
  });
}


type FullLoopFn = (atom: FixtureAtom, opts?: Partial<LoopOpts>) => LoopReport;

export function build_suites_for_mode(
  mode: TestRunMode,
  h: Readonly<{ _test_full_loop: FullLoopFn }>,
): readonly TestSuite[] {
  return [
    make_full_loop_suite(h),
    make_generated_fixtures_suite(h, FIXTURES_GENERATED),
  ];
}