import type { LiveHostApplication } from "hson-live/livehost";
import {
  start_node_application_host,
  type NodeApplicationHost,
  type NodeHostOperationalEvent,
} from "hson-live/livehost/node";
import { create_node_circuit_verification_application } from "../../tests/harness/runtimes/node/server/node-circuit-verification-application";
import { create_node_towl_application } from "../../tests/harness/runtimes/node/server/node-towl-application";
import {
  create_node_production_security,
  create_node_session_security,
} from "../../tests/harness/runtimes/node/server/node-production-security";

export const PUBLIC_SESSION_APPLICATION_NAME = "session";

export type PublicLiveHostEnvironment = Readonly<{
  HOST?: string;
  PORT?: string;
  SHUTDOWN_TIMEOUT_MS?: string;
  LOCUS_DEPLOYMENT?: string;
  LOCUS_ALLOWED_ORIGINS?: string;
  LOCUS_BEARER_TOKEN?: string;
  LOCUS_AUTH_COOKIE_NAME?: string;
  LOCUS_TRUSTED_PROXY_PEERS?: string;
  LOCUS_FORWARDED_FOR_HOP?: string;
  LOCUS_MAX_TOWL_ROOMS?: string;
  LOCUS_TOWL_IDLE_MS?: string;
  LOCUS_AUTHORITY_SWEEP_INTERVAL_MS?: string;
}>;

export type PublicLiveHostServer = Readonly<{
  url: string;
  stop(): Promise<void>;
  applicationNames: readonly string[];
}>;

function list(value: string | undefined): readonly string[] {
  return Object.freeze((value ?? "").split(",").map((item) => item.trim()).filter(Boolean));
}

function positive(value: string | undefined, fallback: number, name: string): number {
  const raw = value ?? String(fallback);
  if (!/^\d+$/.test(raw) || Number(raw) <= 0 || !Number.isSafeInteger(Number(raw))) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return Number(raw);
}

function bind(environment: PublicLiveHostEnvironment): Readonly<{ host: string; port: number; shutdownTimeoutMs: number }> {
  const host = environment.HOST ?? "127.0.0.1";
  if (host.trim() === "") throw new Error("HOST must be a non-empty bind address.");
  const port = positive(environment.PORT, 8787, "PORT");
  if (port > 65_535) throw new Error("PORT must be an integer from 1 through 65535.");
  return Object.freeze({ host, port, shutdownTimeoutMs: positive(environment.SHUTDOWN_TIMEOUT_MS, 5_000, "SHUTDOWN_TIMEOUT_MS") });
}

function session_application(token: string, cookieName: string): LiveHostApplication {
  const cookie = `${cookieName}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/`;
  return Object.freeze({
    name: PUBLIC_SESSION_APPLICATION_NAME,
    requests: Object.freeze([Object.freeze({
      method: "GET",
      path: "/session",
      handle(request: Request) {
        const origin = request.headers.get("origin");
        // The host policy has already accepted only an exact configured origin.
        return new Response(null, {
          status: 204,
          headers: {
            "set-cookie": cookie,
            "access-control-allow-origin": origin ?? "",
            "access-control-allow-credentials": "true",
            "vary": "Origin",
            "cache-control": "no-store",
          },
        });
      },
    })]),
    ready: () => true,
    dispose() {},
  });
}

export async function start_public_livehost_server(
  environment: PublicLiveHostEnvironment = process.env,
  log?: (event: NodeHostOperationalEvent) => void,
): Promise<PublicLiveHostServer> {
  if (environment.LOCUS_DEPLOYMENT !== undefined && environment.LOCUS_DEPLOYMENT !== "production") {
    throw new Error("LOCUS_DEPLOYMENT must be production for the public LiveHost runtime.");
  }
  const allowedOrigins = list(environment.LOCUS_ALLOWED_ORIGINS);
  const trustedProxyPeers = list(environment.LOCUS_TRUSTED_PROXY_PEERS);
  const forwardedForHop = environment.LOCUS_FORWARDED_FOR_HOP;
  if (forwardedForHop !== undefined && forwardedForHop !== "first" && forwardedForHop !== "last") {
    throw new Error("LOCUS_FORWARDED_FOR_HOP must be first or last.");
  }
  const production = create_node_production_security({
    allowedOrigins,
    bearerToken: environment.LOCUS_BEARER_TOKEN ?? "",
    ...(environment.LOCUS_AUTH_COOKIE_NAME === undefined ? {} : { cookieName: environment.LOCUS_AUTH_COOKIE_NAME }),
    trustedProxyPeers,
    ...(forwardedForHop === undefined ? {} : { forwardedForHop }),
  });
  const towlIdleMs = positive(environment.LOCUS_TOWL_IDLE_MS, 30 * 60_000, "LOCUS_TOWL_IDLE_MS");
  const sweepIntervalMs = positive(environment.LOCUS_AUTHORITY_SWEEP_INTERVAL_MS, 30_000, "LOCUS_AUTHORITY_SWEEP_INTERVAL_MS");
  if (towlIdleMs < 30_000 || sweepIntervalMs > towlIdleMs) {
    throw new Error("TOWL lifecycle settings must retain the 30000ms session grace and a bounded sweep interval.");
  }
  const session = session_application(environment.LOCUS_BEARER_TOKEN ?? "", production.cookieName);
  const towl = create_node_towl_application({ lifecycle: {
    maxRooms: positive(environment.LOCUS_MAX_TOWL_ROOMS, 128, "LOCUS_MAX_TOWL_ROOMS"), idleMs: towlIdleMs, sweepIntervalMs,
  } });
  let circuit;
  try { circuit = await create_node_circuit_verification_application(); }
  catch (error) { await towl.registration.dispose(); throw error; }
  let host: NodeApplicationHost;
  try {
    host = await start_node_application_host({
      ...bind(environment), deployment: production.deployment,
      applications: [session, towl.registration, circuit.registration],
      security: new Map([
        [session.name, create_node_session_security(allowedOrigins)],
        [towl.registration.name, production.applicationSecurity],
        [circuit.registration.name, production.applicationSecurity],
      ]),
      ...(log === undefined ? {} : { log }),
    });
  } catch (error) {
    await Promise.all([towl.registration.dispose(), circuit.registration.dispose()]);
    throw error;
  }
  return Object.freeze({ url: host.url, stop: host.dispose, applicationNames: host.applicationNames });
}
