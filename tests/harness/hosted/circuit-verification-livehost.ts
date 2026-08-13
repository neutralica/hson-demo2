import { create_livehost } from "hson-live/livehost";
import type { JsonValue, LiveHost, LiveHostActions, LiveHostSchema } from "hson-live/types";
import {
  CIRCUIT_VERIFICATION_ACTION,
  CIRCUIT_VERIFICATION_PROGRESS_EVENT,
  decode_circuit_verification_request,
  type CircuitVerificationActions,
  type CircuitVerificationSubmitter,
} from "../../../src/shared/circuit-verification-contract";

/** Application-specific LiveHost action seam for the Node-owned verifier. */
export function create_circuit_verification_livehost(
  service: CircuitVerificationSubmitter,
): LiveHost<undefined, CircuitVerificationActions> {
  const actions: LiveHostActions<CircuitVerificationActions, undefined> = {
    [CIRCUIT_VERIFICATION_ACTION]: async (context, request) => {
      const result = await service.submit(request, (progress) => context.emit_event(
        CIRCUIT_VERIFICATION_PROGRESS_EVENT,
        progress as unknown as JsonValue,
      ));
      return JSON.parse(JSON.stringify(result)) as JsonValue;
    },
  };
  const schema: LiveHostSchema<undefined, CircuitVerificationActions> = {
    actions: {
      [CIRCUIT_VERIFICATION_ACTION]: { payload: decode_circuit_verification_request },
    },
  };
  return create_livehost<undefined, CircuitVerificationActions>({
    actions,
    schema,
    logicalMapId: "circuit-verifier",
  });
}
