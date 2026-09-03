import type { LoopReport } from "hson-live/diagnostics";
import type { SourceFormat } from "../../../../hson-live/dist/types/diagnostics.types";
import { _snip } from "../../../src/app/utils/helpers";
import { freeze as _freeze } from "../../helpers/freeze";
import type { HsonTestApi, FixtureBundle, CaseKey, TestSuite, TestCase } from "../../harness/core/test-contracts";

// add an explicit entryFmt param


export function make_transform_test_suite(
  hson: HsonTestApi,
  fixtures: FixtureBundle,
  suite = "transform/",
  captureMap?: Map<CaseKey, () => Promise<LoopReport>>,
  entryFmt: SourceFormat = "auto",
  expected: "pass" | "fail" = "pass"
): TestSuite {
  const cases: TestCase[] = [];

  for (const [group, bundle] of Object.entries(fixtures)) {
    for (const [sub, atom] of Object.entries(bundle)) {
      const caseId = `${group}.${sub}`.toLowerCase();
      const name = `${group}.${sub}`;
      const entry = entryFmt;
      const k = `${suite}::${caseId}` as const;

      if (captureMap) {
        captureMap.set(k, async () => {
          return hson._circuit_test(atom, {
            entry,
            dual: true,
            times: 3,
            verbose: true,
            capture: true,
            stopOnFirstFail: false,
          });
        });
      }

      const input = typeof atom === "string"
        ? atom
        : (typeof atom === "object" && atom && "text" in atom)
          ? JSON.stringify((atom as { text?: unknown; }).text ?? "", null, 2)
          : JSON.stringify(atom, null, 2);

      cases.push(_freeze({
        suite,
        caseId,
        name,
        meta: {
          fixture: group,
          input,
          sub,
          preview: input.length ? _snip(input) : "—",
          expected,
        },


        run: () => {
          const base = {
            entry,
            dual: true,
            times: 3,
            stopOnFirstFail: false,
          } as const;

          const report = hson._circuit_test(atom, {
            ...base,
            verbose: true,
            capture: false,
          });

          const didPass = report.ok;
          const shouldPass = expected === "pass";

          if (didPass !== shouldPass) {
            const f0 = report.failures?.[0];
            const msg = expected === "pass"
              ? (f0?.error ? `${f0.step}: ${f0.error}` : `loop failed (ok=false)`)
              : `expected failure, but loop passed`;
            return {
              metaPatch: _freeze({
                fixture: group,
                input,
                sub,
                preview: input.length ? _snip(input) : "—",
                expected,
              }),
              assertRows: _freeze([{ ok: false, label: msg, actual: didPass, expected: shouldPass }]),
            };
          }

          return {
            metaPatch: _freeze({
              fixture: group,
              input,
              sub,
              preview: input.length ? _snip(input) : "—",
              expected,
            }),
          };
        },
      }));
    }
  }


  return _freeze({ suite, cases: _freeze(cases) });
}
