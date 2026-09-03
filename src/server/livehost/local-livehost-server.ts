import {
  start_node_application_host,
  type NodeApplicationHost,
  type NodeApplicationSecurity,
  type NodeHostDeployment,
  type NodeHostOperationalEvent,
} from "hson-live/livehost/node";
import { create_node_towl_application } from "../towl/node-towl-application";
import { create_node_circuit_verification_application } from "../circuit/node-circuit-verification-application";

export type LocalLiveHostServerOptions = Readonly<{
  host?: string;
  port?: number;
  shutdownTimeoutMs?: number;
  log?: (event: NodeHostOperationalEvent) => void;
  deployment?: NodeHostDeployment;
  security?: NodeApplicationSecurity;
  authorityLifecycle?: Readonly<{
    maxTowlRooms: number;
    towlIdleMs: number;
    sweepIntervalMs: number;
  }>;
}>;

export type LocalLiveHostServer = Readonly<{
  host: string;
  port: number;
  url: string;
  connectionCount(): number;
  connectionSnapshot(): Readonly<{ total: number; towl: number; circuitVerification: number }>;
  stop(): Promise<void>;
}>;

export async function start_local_livehost_server(
  options: LocalLiveHostServerOptions = {},
): Promise<LocalLiveHostServer> {
  const lifecycle = options.authorityLifecycle ?? Object.freeze({
    maxTowlRooms: 128,
    towlIdleMs: 30 * 60_000,
    sweepIntervalMs: 60_000,
  });
  const towl = create_node_towl_application({
    ...(options.security === undefined ? {} : { security: options.security }),
    lifecycle: {
      maxRooms: lifecycle.maxTowlRooms,
      idleMs: lifecycle.towlIdleMs,
      sweepIntervalMs: lifecycle.sweepIntervalMs,
    },
  });
  let circuitVerification;
  try {
    circuitVerification = await create_node_circuit_verification_application({
      ...(options.security === undefined ? {} : { security: options.security }),
    });
  } catch (error) {
    await towl.registration.dispose();
    throw error;
  }
  let host: NodeApplicationHost;
  try {
    host = await start_node_application_host({
      host: options.host ?? "127.0.0.1",
      port: options.port ?? 8787,
      shutdownTimeoutMs: options.shutdownTimeoutMs ?? 5_000,
      deployment: options.deployment ?? { mode: "development" },
      applications: [towl.registration, circuitVerification.registration],
      ...(options.security === undefined ? {} : {
        security: new Map([
          [towl.registration.name, options.security],
          [circuitVerification.registration.name, options.security],
        ]),
      }),
      ...(options.log === undefined ? {} : { log: options.log }),
    });
  } catch (error) {
    await towl.registration.dispose();
    await circuitVerification.registration.dispose();
    throw error;
  }
  return Object.freeze({
    host: host.host,
    port: host.port,
    url: host.url,
    connectionCount: host.connectionCount,
    connectionSnapshot: () => Object.freeze({
      total: host.connectionCount(),
      towl: towl.connectionCount(),
      circuitVerification: circuitVerification.connectionCount(),
    }),
    stop: host.dispose,
  });
}
