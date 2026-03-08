import type { FixtureAtom, LoopOpts, LoopReport, SourceFormat } from "../../../hson-live/dist/diagnostics/loop-3.test";
import type { BuildSuitesOpts, CaseKey, FixtureBundle, HsonTestApi, TestCase, TestRunMode, TestSuite } from "./tests.types";
import { JSON_FIXTURES_DEV, JSON_FIXTURES_LEGACY } from "../../data-old/data/json-fixtures"
import { _snip } from "../app/utils/helpers";
import { _is_Node, _test_full_loop } from "hson-live/diagnostics";
import { HTML_FIXTURES_LEGACY } from "../../data-old/data/html-fixtures";
import { make_html_generated_fixtures } from "./transform-tests/fixtures/generate-fixtures";
import { _freeze } from "./tests.consts";
import { make_generated_json_fixtures } from "./transform-tests/fixtures/generate-json";
import type { Fixture } from "./tests.types";
import {  all_livetree_suites } from "./livetree-tests/livetree-fixtures-1";

function preview_atom(atom: FixtureAtom): string {
  // small, safe, non-throwy preview for inspector.
  // We do NOT stringify huge objects or do deep serialization here.

  if (atom === null) return "null";

  const t = typeof atom;
  if (t === "string") return _snip(atom as string);
  if (t === "number" || t === "boolean") return String(atom);

  // HTMLElement
  if (typeof HTMLElement !== "undefined" && atom instanceof HTMLElement) {
    return _snip(atom.outerHTML);
  }

  // HsonNode / object (cheap tag hint if present)
  if (atom && t === "object") {
    const a = atom as Record<string, unknown>;
    if (typeof a["_tag"] === "string") return `[HsonNode ${a["_tag"]}]`;
    return "[object]";
  }

  return String(atom);
}

// add an explicit entryFmt param
export function make_legacy_test_suite(
  hson: HsonTestApi,
  fixtures: FixtureBundle,
  suite = "transform/legacy",
  captureMap?: Map<CaseKey, () => Promise<LoopReport>>,
  entryFmt: SourceFormat = "auto",
): TestSuite {
  const cases: TestCase[] = [];

  for (const [group, bundle] of Object.entries(fixtures)) {
    for (const [sub, atom] of Object.entries(bundle)) {
      const name = `${group}.${sub}`;

      // no guessing here
      const entry = entryFmt;

      const k = `${suite}::${name}` as const;

      if (captureMap) {
        captureMap.set(k, async () => {
          return hson._test_full_loop(atom, {
            entry,
            dual: true,
            times: 3,
            verbose: true,
            capture: true,
            stopOnFirstFail: false,
          });
        });
      }
      cases.push(_freeze({
        suite,
        name,
        meta: { fixture: group, sub, preview: preview_atom(atom) },
        run: () => {
          // ADDED: capture the *actual* input text we feed the loop
          const base = { entry, dual: true, times: 3, stopOnFirstFail: false } as const;
          // preserve strings as-is; stringify objects/arrays; stringify non-string .text
          const input =
            typeof atom === "string" ? atom :
              (typeof atom === "object" && atom && "text" in atom)
                ? JSON.stringify((atom as { text?: unknown }).text ?? "", null, 2)
                : JSON.stringify(atom, null, 2);

          const report = hson._test_full_loop(atom, { ...base, verbose: true, capture: true });

          // ADDED: propagate failure to runner/recorder
          if (!report.ok) {
            const f0 = report.failures?.[0];
            const msg =
              f0?.error
                ? `${f0.step}: ${f0.error}`
                : `loop failed (ok=false)`;
            throw new Error(msg);
          }

          return {
            metaPatch: _freeze({
              fixture: group,
              input,
              sub,
              preview: input.length ? _snip(input) : "—",
            }),
          };
        }
      }));
    }
  }

  return _freeze({ suite, cases: _freeze(cases) });
}

export function generate_fixture_suite(
  hson: HsonTestApi,
  fixtures: readonly Fixture[],
  captureMap?: Map<CaseKey, () => Promise<LoopReport>>,
  runMeta?: Readonly<{ seed: number; genHtmlCount: number; genJsonCount: number }>,
): TestSuite {
  const suite = "fixtures/generated";

  const seedStr = runMeta ? String(runMeta.seed >>> 0) : "";
  const genHtmlStr = runMeta ? String(runMeta.genHtmlCount) : "";
  const genJsonStr = runMeta ? String(runMeta.genJsonCount) : "";

  return _freeze({
    suite,
    cases: _freeze(
      fixtures.map((fx) => {
        const preview = preview_atom(fx.atom);
        const tags = fx.tags?.length ? fx.tags.join(",") : "";

        const meta: Record<string, string> = {
          fmt: fx.fmt,
          preview,
          ...(tags ? { tags } : {}),
          ...(runMeta ? { seed: seedStr, genHtmlCount: genHtmlStr, genJsonCount: genJsonStr } : {}),
        };

        const k = `${suite}::${fx.name}` as CaseKey;

        if (captureMap) {
          captureMap.set(k, async () => {
            return hson._test_full_loop(fx.atom, {
              entry: fx.fmt,
              dual: true,
              times: 3,
              verbose: false,
              capture: false,
              stopOnFirstFail: false,
            });
          });
        }

        return _freeze({
          suite,
          name: fx.name,
          meta,
          run: () => {
            // ADDED: capture the *actual* input text we feed the loop
            // preserve strings as-is; stringify non-string values; pretty-print objects
            const input =
              typeof fx.atom === "string" ? fx.atom :
                (typeof fx.atom === "object" && fx.atom && "text" in fx.atom)
                  ? JSON.stringify((fx.atom as { text?: unknown }).text ?? "", null, 2)
                  : JSON.stringify(fx.atom, null, 2);


            const report = hson._test_full_loop(fx.atom, {
              entry: fx.fmt,              // IMPORTANT: keep entry explicit here
              dual: true,
              times: 3,
              stopOnFirstFail: false,
              verbose: false,
              capture: false,
            });

            // ADDED: propagate failure to runner/recorder
            if (!report.ok) {
              const f0 = report.failures?.[0];
              const msg =
                f0?.error
                  ? `${f0.step}: ${f0.error}`
                  : `loop failed (ok=false)`;
              throw new Error(msg);
            }

            return {
              metaPatch: _freeze({
                input,
                preview: input.length ? _snip(input) : "—",
              }),
            };
          }
        });
      }),
    ),
  });
}

type FullLoopFn = (atom: FixtureAtom, opts?: Partial<LoopOpts>) => LoopReport;


export function build_suites_for_mode(
  mode: TestRunMode,
  h: Readonly<{ _test_full_loop: FullLoopFn }>,
  map?: Map<CaseKey, () => Promise<LoopReport>>,
  o: BuildSuitesOpts = {},
): readonly TestSuite[] {
  const seed = (o.seed ?? (Math.floor(Math.random() * 1e9) >>> 0)) >>> 0;

  const genHtmlCount = o.genHtmlCount ?? 2000;
  const genJsonCount = o.genJsonCount ?? 2000;

  // build generated fixtures here (so seed is part of suite identity)
  const generated: readonly Fixture[] = _freeze([
    ...make_html_generated_fixtures({ seed, count: genHtmlCount }),
    ...make_generated_json_fixtures({ seed, count: genJsonCount }),
  ]);


  if (mode === "legacy") {
    return _freeze([
      make_legacy_test_suite(h, JSON_FIXTURES_LEGACY, "fixtures/basic/json", map),
      make_legacy_test_suite(h, HTML_FIXTURES_LEGACY, "fixtures/basic/html", map),
    ]);
  }
  // if (mode === "generated") {
  //   return _freeze([
  //     generate_fixture_suite(h, generated, map, { seed, genHtmlCount, genJsonCount }),
  //   ]);
  // }
  if (mode === "dev") {
    return _freeze([
      // ADD:
      make_legacy_test_suite(h, { wikipedia: { annoying_required_wrapper: `${HTML_FIXTURES_LEGACY.html__largeFormat.html_wikipedia}` } }, "fixtures/dev/json", map)
    ])
  }
  if (mode === "livetree") {
    return _freeze([
      // ADD:
      ...all_livetree_suites(),
    ])
  }
  
  return _freeze([
    make_legacy_test_suite(h, JSON_FIXTURES_LEGACY, "transform/legacy/json", map),
    make_legacy_test_suite(h, HTML_FIXTURES_LEGACY, "transform/legacy/html", map),
    // generate_fixture_suite(h, generated, map, { seed, genHtmlCount, genJsonCount }),
    make_legacy_test_suite(h, JSON_FIXTURES_DEV, "transform/dev", map),
    ...all_livetree_suites(),
  ]);
}
