import { hson } from "hson-live";
import type { JsonValue } from "hson-live/types";
import type { TestSuite } from "../../harness/core/test-contracts";
import {
  create_towl_state,
  TOWL_SCHEMA,
  TOWL_WIN_POSITION,
} from "../../../src/app/demos/towl/index";
import { towl_case } from "./towl-test-helpers";

function schema_accepts(value: JsonValue): boolean {
  try {
    hson.liveMap.fromJson(value).schema.use(TOWL_SCHEMA);
    return true;
  } catch {
    return false;
  }
}

export function towl_state_suite(): TestSuite {
  const SUITE = "unit/towl-state";
  return {
    suite: SUITE,
    cases: [
      towl_case(SUITE, "initial state is canonical and JSON safe", () => create_towl_state(), {
        phase: "lobby",
        player1: { sessionId: null, connected: false, ready: false },
        player2: { sessionId: null, connected: false, ready: false },
        position: 0,
        winner: null,
        round: 1,
      }),
      towl_case(SUITE, "state factory returns independent frozen seats", () => {
        const first = create_towl_state();
        const second = create_towl_state();
        return {
          rootDistinct: first !== second,
          player1Distinct: first.player1 !== second.player1,
          player2Distinct: first.player2 !== second.player2,
          frozen: Object.isFrozen(first) && Object.isFrozen(first.player1) && Object.isFrozen(first.player2),
        };
      }, { rootDistinct: true, player1Distinct: true, player2Distinct: true, frozen: true }),
      towl_case(SUITE, "schema accepts the initial state", () => schema_accepts(create_towl_state()), true),
      towl_case(SUITE, "schema rejects unknown root keys", () => schema_accepts({
        ...create_towl_state(),
        extra: true,
      }), false),
      towl_case(SUITE, "schema rejects unknown seat keys", () => schema_accepts({
        ...create_towl_state(),
        player1: { ...create_towl_state().player1, extra: true },
      }), false),
      towl_case(SUITE, "schema rejects invalid phases and winners", () => ({
        phase: schema_accepts({ ...create_towl_state(), phase: "countdown" }),
        winner: schema_accepts({ ...create_towl_state(), winner: "spectator" }),
      }), { phase: false, winner: false }),
      towl_case(SUITE, "schema rejects noninteger and out-of-bound positions", () => ({
        fractional: schema_accepts({ ...create_towl_state(), position: 0.5 }),
        high: schema_accepts({ ...create_towl_state(), position: TOWL_WIN_POSITION + 1 }),
        low: schema_accepts({ ...create_towl_state(), position: -TOWL_WIN_POSITION - 1 }),
      }), { fractional: false, high: false, low: false }),
      towl_case(SUITE, "schema accepts both exact win boundaries", () => ({
        player1: schema_accepts({ ...create_towl_state(), position: TOWL_WIN_POSITION }),
        player2: schema_accepts({ ...create_towl_state(), position: -TOWL_WIN_POSITION }),
      }), { player1: true, player2: true }),
      towl_case(SUITE, "schema rejects nonpositive and fractional rounds", () => ({
        zero: schema_accepts({ ...create_towl_state(), round: 0 }),
        negative: schema_accepts({ ...create_towl_state(), round: -1 }),
        fractional: schema_accepts({ ...create_towl_state(), round: 1.5 }),
      }), { zero: false, negative: false, fractional: false }),
      towl_case(SUITE, "schema rejects malformed seat fields", () => ({
        session: schema_accepts({ ...create_towl_state(), player1: { sessionId: 1, connected: true, ready: false } }),
        connected: schema_accepts({ ...create_towl_state(), player1: { sessionId: "a", connected: "yes", ready: false } }),
        ready: schema_accepts({ ...create_towl_state(), player1: { sessionId: "a", connected: true, ready: 1 } }),
      }), { session: false, connected: false, ready: false }),
    ],
  };
}
