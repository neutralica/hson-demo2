import type { JsonValue } from "hson-live/types";
import { assert_json_eq, LOG_HR_PART } from "../state-helpers";
import type { NodeStateSlot, StateSmokeResult, StateSmokeRow } from "../state.types";

type SmokeCtx = {
  steps: string[];
  rows: StateSmokeRow[];

  eq: (label: string, actual: JsonValue, expected: JsonValue) => void;
  ok: (label: string, cond: boolean, detail?: string) => void;
  step: (label: string, fn: () => void) => void;
  slot: (label: string, slot: NodeStateSlot, expected: JsonValue) => void;
};

export class StateSmokeError extends Error {
  readonly steps: readonly string[];
  readonly rows: readonly StateSmokeRow[];

  constructor(message: string, steps: readonly string[], rows: readonly StateSmokeRow[]) {
    super(message);
    this.name = "StateSmokeError";
    this.steps = [...steps];
    this.rows = [...rows];
  }
}

function asSmokeMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function pushOk(steps: string[], rows: StateSmokeRow[], label: string): void {
  rows.push({ ok: true, label });
  steps.push(`• ${label}: vv`);
  steps.push("OK");
  steps.push(LOG_HR_PART);
}

function pushFail(
  steps: string[],
  rows: StateSmokeRow[],
  label: string,
  detail?: string,
  actual?: JsonValue,
  expected?: JsonValue,
): never {
  rows.push({
    ok: false,
    label,
    ...(detail !== undefined ? { detail } : {}),
    ...(actual !== undefined ? { actual } : {}),
    ...(expected !== undefined ? { expected } : {}),
  });
  throw new StateSmokeError(
    `[state smoke] ${label}${detail ? `\n${detail}` : ""}`,
    steps,
    rows,
  );
}

export function state_smoke_test(name: string, body: (t: SmokeCtx) => void): StateSmokeResult {
  const steps: string[] = [];
  const rows: StateSmokeRow[] = [];

  const t: SmokeCtx = {
    steps,
    rows,

    eq(label, actual, expected) {
      try {
        assert_json_eq(label, actual, expected, steps);
        rows.push({ ok: true, label, actual, expected });
      } catch (err) {
        pushFail(steps, rows, label, asSmokeMessage(err), actual, expected);
      }
    },

    ok(label, cond, detail) {
      if (!cond) {
        pushFail(steps, rows, label, detail);
      }

      pushOk(steps, rows, label);
    },

    step(label, fn) {
      try {
        fn();
        pushOk(steps, rows, label);
      } catch (err) {
        if (err instanceof StateSmokeError) {
          throw new StateSmokeError(`[state smoke] ${label}\n${err.message}`, err.steps, err.rows);
        }

        pushFail(steps, rows, label, asSmokeMessage(err));
      }
    },

    slot(label, slot, expected) {
      t.eq(label, slot.get() as JsonValue, expected);
    },
  };

  body(t);

  return {
    ok: true,
    steps: [`run - ${name}`, ...steps],
    rows: [{ ok: true, label: `run - ${name}` }, ...rows],
  };
}

