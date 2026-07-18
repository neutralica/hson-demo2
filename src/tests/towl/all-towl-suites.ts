import type { TestSuite } from "../../app/demos/test/tests.types";
import { towl_runtime_suite } from "./towl-runtime-suite";
import { towl_state_suite } from "./towl-state-suite";
import { towl_transition_suite } from "./towl-transition-suite";



export function all_towl_suites(): readonly TestSuite[] {
  return [
    towl_state_suite(),
    towl_transition_suite(),
    towl_runtime_suite(),
  ] as const;
}
