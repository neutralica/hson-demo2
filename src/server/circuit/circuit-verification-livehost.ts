import { create_locus } from "hson-live/locus";
import type { LiveMap } from "hson-live/livemap";
import { HsonData } from "hson-live/hson";
import type { Locus, LocusActions, LocusSchema } from "hson-live/locus";
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
    [CIRCUIT_VERIFICATION_ACTION]: async (context, payload) => {
      const request = require_circuit_request(payload);
      const result = await service.submit(request, (progress) => context.emitEvent(
        CIRCUIT_VERIFICATION_PROGRESS_EVENT,
        progress,
      ));
      return result;
    },
  };
  const schema: LocusSchema<undefined, CircuitVerificationActions> = {
    actions: {
      [CIRCUIT_VERIFICATION_ACTION]: { payload: decode_circuit_payload },
    },
  };
  return create_locus<undefined, CircuitVerificationActions>({
    actions,
    schema,
    logicalMapId: "circuit-verifier",
  });
}

function decode_circuit_payload(payload: unknown) {
  return !(payload instanceof HsonData)
    ? { ok: false as const, issues: ["circuit.verify requires a payload."] }
    : decode_circuit_verification_request(payload.materialize());
}

function require_circuit_request(payload: HsonData | undefined) {
  const decoded = decode_circuit_payload(payload);
  if (!decoded.ok) throw new Error(decoded.issues.join(" "));
  return decoded.value;
}
