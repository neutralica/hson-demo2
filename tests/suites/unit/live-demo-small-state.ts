import type { TestCase, TestSuite } from "../../harness/core/test-contracts";
import type { JsonValue } from "hson-live/types";
import {
  create_oklch_store,
  make_oklch_schema,
  type OklchCanonicalState,
} from "../../../src/app/demos/oklch/oklch.state";

const SUITE = "unit/livedemo-small-state";
const PATHS = ["txt.main", "txt.menu"] as const;

function initial(): OklchCanonicalState {
  return {
    activePath: PATHS[0],
    tokens: [
      { path: PATHS[0], value: { l: 80, c: 0.1, h: 120, a: 1 } },
      { path: PATHS[1], value: { l: 60, c: 0.2, h: 240, a: 0.8 } },
    ],
  };
}

function expect_valid(value: unknown, expected: boolean): void {
  const result = make_oklch_schema(PATHS).validateRoot(value as JsonValue);
  if (result.ok !== expected) {
    throw new Error(`expected schema validation ok=${expected}, received ${JSON.stringify(result)}`);
  }
}

export function live_demo_small_state_suite(): TestSuite {
  const cases: readonly TestCase[] = [
    {
      suite: SUITE,
      caseId: "oklch-exact-schema-accepts-one-complete-configured-token-set", name: "OKLCH exact schema accepts one complete configured token set",
      run: () => expect_valid(initial(), true),
    },
    {
      suite: SUITE,
      caseId: "oklch-exact-schema-rejects-unknown-and-missing-canonical-fields", name: "OKLCH exact schema rejects unknown and missing canonical fields",
      run: () => {
        expect_valid({ ...initial(), current: { l: 1, c: 0, h: 0, a: 1 } }, false);
        expect_valid({ tokens: initial().tokens }, false);
      },
    },
    {
      suite: SUITE,
      caseId: "oklch-schema-enforces-channel-ranges-and-configured-token-vocabulary", name: "OKLCH schema enforces channel ranges and configured token vocabulary",
      run: () => {
        const badLightness = initial();
        expect_valid({
          ...badLightness,
          tokens: [
            { ...badLightness.tokens[0]!, value: { ...badLightness.tokens[0]!.value, l: 101 } },
            badLightness.tokens[1]!,
          ],
        }, false);
        expect_valid({ ...initial(), activePath: "unknown" }, false);
        expect_valid({ ...initial(), tokens: [...initial().tokens].reverse() }, false);
      },
    },
    {
      suite: SUITE,
      caseId: "oklch-typed-locations-own-active-path-and-token-values", name: "OKLCH typed locations own active path and token values",
      run: () => {
        const store = create_oklch_store(initial(), PATHS);
        let activeNotifications = 0;
        let tokenNotifications = 0;
        const stopActive = store.locations.activePath.watch(() => { activeNotifications += 1; });
        const stopTokens = store.locations.tokens.watch(() => { tokenNotifications += 1; });

        store.locations.activePath.set(PATHS[1]);
        store.locations.tokens.set(store.locations.tokens.snap().map((token) => (
          token.path === PATHS[1]
            ? { ...token, value: { ...token.value, h: 180 } }
            : token
        )));

        if (store.locations.activePath.snap() !== PATHS[1]) throw new Error("active path did not commit");
        if (store.locations.tokens.snap()[1]?.value.h !== 180) throw new Error("token value did not commit");
        if (activeNotifications !== 1 || tokenNotifications !== 1) {
          throw new Error(`expected one notification per canonical location, received ${activeNotifications}/${tokenNotifications}`);
        }
        stopActive();
        stopTokens();
      },
    },
    {
      suite: SUITE,
      caseId: "oklch-attached-schema-rejects-invalid-direct-location-writes", name: "OKLCH attached schema rejects invalid direct location writes",
      run: () => {
        const store = create_oklch_store(initial(), PATHS);
        let rejected = false;
        try {
          store.locations.activePath.set("unknown");
        } catch {
          rejected = true;
        }
        if (!rejected) throw new Error("expected unknown active path to reject");
        if (store.locations.activePath.snap() !== PATHS[0]) throw new Error("rejected write changed canonical state");
      },
    },
  ];

  return { suite: SUITE, cases };
}
