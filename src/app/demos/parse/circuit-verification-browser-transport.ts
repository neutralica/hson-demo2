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

export const PARSING_VERIFICATION_CONFIGURATION_ERROR =
  "Parsing verification is unavailable because no Locus circuit verifier URL was configured.";

export type ParsingVerificationBuildEnvironment = Readonly<{
  DEV?: boolean;
  PROD?: boolean;
  VITE_CIRCUIT_VERIFICATION_WS_URL?: string;
  VITE_TOWL_WS_URL?: string;
  VITE_HOSTED_TEST_WS_URL?: string;
}>;

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

function current_environment(): ParsingVerificationBuildEnvironment {
  const environment = (import.meta as ImportMeta & { readonly env?: ParsingVerificationBuildEnvironment }).env;
  return Object.freeze({
    DEV: environment?.DEV ?? false,
    PROD: environment?.PROD ?? false,
    ...(environment?.VITE_CIRCUIT_VERIFICATION_WS_URL === undefined
      ? {}
      : { VITE_CIRCUIT_VERIFICATION_WS_URL: environment.VITE_CIRCUIT_VERIFICATION_WS_URL }),
    ...(environment?.VITE_TOWL_WS_URL === undefined ? {} : { VITE_TOWL_WS_URL: environment.VITE_TOWL_WS_URL }),
    ...(environment?.VITE_HOSTED_TEST_WS_URL === undefined
      ? {}
      : { VITE_HOSTED_TEST_WS_URL: environment.VITE_HOSTED_TEST_WS_URL }),
  });
}

export function resolve_parsing_verification_websocket_url(
  environment: ParsingVerificationBuildEnvironment,
  explicitUrl?: string,
): string {
  const configured = explicitUrl
    ?? environment.VITE_CIRCUIT_VERIFICATION_WS_URL
    ?? environment.VITE_TOWL_WS_URL
    ?? environment.VITE_HOSTED_TEST_WS_URL;
  if (configured === undefined || configured.trim() === "") {
    if (environment.PROD === true) throw new BrowserCircuitVerificationTransportError(
      "CIRCUIT_VERIFICATION_NOT_CONFIGURED",
      PARSING_VERIFICATION_CONFIGURATION_ERROR,
    );
    return "ws://127.0.0.1:8787";
  }
  let url: URL;
  try { url = new URL(configured); }
  catch {
    throw new BrowserCircuitVerificationTransportError(
      "CIRCUIT_VERIFICATION_URL_INVALID",
      "Parsing verification Locus URL is invalid.",
    );
  }
  if (url.protocol !== "ws:" && url.protocol !== "wss:") {
    throw new BrowserCircuitVerificationTransportError(
      "CIRCUIT_VERIFICATION_URL_INVALID",
      "Parsing verification Locus URL must use ws:// or wss://.",
    );
  }
  if (environment.PROD === true && url.protocol !== "wss:") {
    throw new BrowserCircuitVerificationTransportError(
      "CIRCUIT_VERIFICATION_URL_INSECURE",
      "Production parsing verification requires wss://.",
    );
  }
  url.searchParams.set("locus", CIRCUIT_VERIFICATION_HOST_ID);
  return url.toString();
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
      const url = new URL(resolve_parsing_verification_websocket_url(options.environment ?? current_environment(), options.url));
      url.pathname = "/circuit-verification";
      url.searchParams.set("locus", CIRCUIT_VERIFICATION_HOST_ID);
      const nextTransport = create_browser_locus_socket(url.toString(), options.WebSocketConstructor);
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
