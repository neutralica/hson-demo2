import type { JsonValue } from "hson-live/types";
import { assert_json_eq } from "../state-helpers";
import type { NodeStateSlot, StateSmokeResult } from "../state.types";

type SmokeCtx = {
    steps: string[];

    eq: (label: string, actual: JsonValue, expected: JsonValue) => void;
    ok: (label: string, cond: boolean, detail?: string) => void;
    step: (label: string, fn: () => void) => void;
    slot: (label: string, slot: NodeStateSlot, expected: JsonValue) => void
};


export function run_state_smoke(name: string, body: (t: SmokeCtx) => void): StateSmokeResult {
    const steps: string[] = [];

    const t: SmokeCtx = {
        steps,

        eq(label, actual, expected) {
            assert_json_eq(label, actual, expected, steps);
        },

        ok(label, cond, detail) {
            if (!cond) {
                throw new Error(
                    `[state smoke] ${label}${detail ? `\n${detail}` : ""}`
                );
            }

            steps.push(`>> ${label}: `);
            steps.push(`OK `);
steps.push("|=•=-~-");

        },

        step(label, fn) {
            try {
                fn();
                steps.push(`>> ${label}: `);
                steps.push(`OK `);
steps.push("|=•=-~-");
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                throw new Error(`[state smoke] ${label}\n${msg}`);
            }
        },
        slot(label: string, slot: NodeStateSlot, expected: JsonValue) {
            assert_json_eq(label, slot.get() as JsonValue, expected, steps);
        },
    };
    body(t);

    return {
        ok: true,
        steps: [`run - ${name}`, ...steps],
    };
}