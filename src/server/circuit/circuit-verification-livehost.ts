import { create_locus } from "hson-live/locus";
import type { JsonValue, LiveMap, Locus, LocusActions, LocusSchema } from "hson-live/types";
import {
  CIRCUIT_VERIFICATION_ACTION,
  CIRCUIT_VERIFICATION_PROGRESS_EVENT,
  decode_circuit_verification_request,
  type CircuitVerificationActions,
  type CircuitVerificationSubmitter,
} from "../../shared/circuit-verification-contract";

/** Application-specific Locus action seam for the Node-owned verifier. */
export function create_circuit_verification_livehost(
  service: CircuitVerificationSubmitter,
): Locus<LiveMap<undefined>, CircuitVerificationActions> {
  const actions: LocusActions<CircuitVerificationActions, LiveMap<undefined>> = {
    [CIRCUIT_VERIFICATION_ACTION]: async (context, request) => {
      const result = await service.submit(request, (progress) => context.emit_event(
        CIRCUIT_VERIFICATION_PROGRESS_EVENT,
        progress as unknown as JsonValue,
      ));
      return JSON.parse(JSON.stringify(result)) as JsonValue;
    },
  };
  const schema: LocusSchema<undefined, CircuitVerificationActions> = {
    actions: {
      [CIRCUIT_VERIFICATION_ACTION]: { payload: decode_circuit_verification_request },
    },
  };
  return create_locus<undefined, CircuitVerificationActions>({
    actions,
    schema,
    logicalMapId: "circuit-verifier",
  });
}
