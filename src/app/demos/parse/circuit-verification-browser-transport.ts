import {
  create_browser_locus_socket,
  create_locus_client,
  type BrowserLocusSocket,
  type BrowserWebSocketConstructor,
} from "hson-live/locus";
import type { LiveMap, LocusClient } from "hson-live/types";
import {
  CIRCUIT_VERIFICATION_ACTION,
  CIRCUIT_VERIFICATION_HOST_ID,
  CIRCUIT_VERIFICATION_PROGRESS_EVENT,
  decode_circuit_verification_progress,
  decode_circuit_verification_result,
  type CircuitVerificationActions,
  type CircuitVerificationProgress,
  type CircuitVerificationRequest,
  type CircuitVerificationResult,
} from "../../../shared/circuit-verification-contract";
import type { ParsingVerificationTransport } from "./parsing-verification-coordinator";
import {
  current_livehost_build_environment,
  bootstrap_livehost_browser_session,
  derive_livehost_application_websocket_url,
  LiveHostWebSocketConfigurationError,
  resolve_livehost_websocket_base_url,
  type LiveHostBuildEnvironment,
} from "../../livehost/browser-livehost-websocket";

export const PARSING_VERIFICATION_CONFIGURATION_ERROR =
  "Parsing verification is unavailable because no Locus circuit verifier URL was configured.";

export type ParsingVerificationBuildEnvironment = LiveHostBuildEnvironment;

export type BrowserCircuitVerificationTransportOptions = Readonly<{
  url?: string;
  environment?: ParsingVerificationBuildEnvironment;
  WebSocketConstructor?: BrowserWebSocketConstructor;
}>;

export class BrowserCircuitVerificationTransportError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "BrowserCircuitVerificationTransportError";
    this.code = code;
  }
}

export function resolve_parsing_verification_websocket_url(
  environment: ParsingVerificationBuildEnvironment,
  explicitUrl?: string,
): string {
  try {
    return derive_livehost_application_websocket_url(
      resolve_livehost_websocket_base_url(environment, explicitUrl),
      "/circuit-verification",
      CIRCUIT_VERIFICATION_HOST_ID,
    );
  } catch (error) {
    if (!(error instanceof LiveHostWebSocketConfigurationError)) throw error;
    if (error.code === "LIVEHOST_WS_NOT_CONFIGURED") {
      throw new BrowserCircuitVerificationTransportError(
        "CIRCUIT_VERIFICATION_NOT_CONFIGURED",
        PARSING_VERIFICATION_CONFIGURATION_ERROR,
      );
    }
    if (error.code === "LIVEHOST_WS_URL_INSECURE") {
      throw new BrowserCircuitVerificationTransportError(
        "CIRCUIT_VERIFICATION_URL_INSECURE",
        "Production parsing verification requires wss://.",
      );
    }
    throw new BrowserCircuitVerificationTransportError(
      "CIRCUIT_VERIFICATION_URL_INVALID",
      "Parsing verification Locus URL is invalid.",
    );
  }
}

export function create_browser_circuit_verification_transport(
  options: BrowserCircuitVerificationTransportOptions = {},
): ParsingVerificationTransport {
  let disposed = false;
  let transport: BrowserLocusSocket | undefined;
  let client: LocusClient<LiveMap<undefined>, CircuitVerificationActions> | undefined;
  let opening: Promise<LocusClient<LiveMap<undefined>, CircuitVerificationActions>> | undefined;

  async function open(): Promise<LocusClient<LiveMap<undefined>, CircuitVerificationActions>> {
    if (disposed) throw new BrowserCircuitVerificationTransportError(
      "CIRCUIT_VERIFICATION_TRANSPORT_DISPOSED",
      "Parsing verification transport is disposed.",
    );
    if (client !== undefined) return client;
    if (opening !== undefined) return opening;
    opening = (async () => {
      const environment = options.environment ?? current_livehost_build_environment();
      await bootstrap_livehost_browser_session(environment, options.url);
      const url = resolve_parsing_verification_websocket_url(
        environment,
        options.url,
      );
      const nextTransport = create_browser_locus_socket(url, options.WebSocketConstructor);
      try {
        await nextTransport.ready;
        if (disposed) throw new BrowserCircuitVerificationTransportError(
          "CIRCUIT_VERIFICATION_TRANSPORT_DISPOSED",
          "Parsing verification transport was disposed while connecting.",
        );
        const nextClient = create_locus_client<undefined, CircuitVerificationActions>({ socket: nextTransport.socket });
        nextClient.connect();
        transport = nextTransport;
        client = nextClient;
        nextTransport.socket.onClose(() => {
          if (transport !== nextTransport) return;
          nextClient.disconnect();
          nextClient.session.dispose();
          nextClient.recovery.dispose();
          client = undefined;
          transport = undefined;
          nextTransport.dispose();
        });
        return nextClient;
      } catch (error) {
        nextTransport.dispose();
        if (error instanceof BrowserCircuitVerificationTransportError) throw error;
        throw new BrowserCircuitVerificationTransportError(
          "CIRCUIT_VERIFICATION_CONNECTION_FAILED",
          "The parsing verification authority could not be reached.",
        );
      }
    })().finally(() => { opening = undefined; });
    return opening;
  }

  return Object.freeze({
    async submit(
      request: CircuitVerificationRequest,
      onProgress: (progress: CircuitVerificationProgress) => void,
    ): Promise<CircuitVerificationResult> {
      const current = await open();
      const stopEvents = current.on_event((event) => {
        if (event.event !== CIRCUIT_VERIFICATION_PROGRESS_EVENT) return;
        const decoded = decode_circuit_verification_progress(event.payload);
        if (!decoded.ok) return;
        if (decoded.value.panelId !== request.panelId || decoded.value.inputRevision !== request.inputRevision) return;
        onProgress(decoded.value);
      });
      try {
        const response = await current.action(CIRCUIT_VERIFICATION_ACTION, request);
        if (response.type !== "ack") {
          throw new BrowserCircuitVerificationTransportError(
            response.error.code ?? "CIRCUIT_VERIFICATION_ACTION_REJECTED",
            "The parsing verification action was rejected.",
          );
        }
        const decoded = decode_circuit_verification_result(response.result);
        if (!decoded.ok) throw new BrowserCircuitVerificationTransportError(
          "CIRCUIT_VERIFICATION_RESULT_INVALID",
          "The parsing verifier returned an invalid result.",
        );
        return decoded.value;
      } catch (error) {
        if (error instanceof BrowserCircuitVerificationTransportError) throw error;
        throw new BrowserCircuitVerificationTransportError(
          "CIRCUIT_VERIFICATION_ACTION_FAILED",
          "The parsing verification action could not complete.",
        );
      } finally {
        stopEvents();
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      client?.disconnect();
      client?.session.dispose();
      client?.recovery.dispose();
      client = undefined;
      transport?.dispose();
      transport = undefined;
    },
  });
}
