import target from "../../../deployment/towl-worker-target.json";

export const TOWL_WORKER_PATH = "/towl";
export const TOWL_WORKER_SESSION_PATH = "/session";

// Keep the existing named Durable Object instance so deployed TOWL state stays
// attached to the provider identity created before hosted testing was retired.
export const TOWL_DURABLE_OBJECT_INSTANCE_NAME = "hson-demo2-hosted-tests-v1";

const PUBLIC_TOWL_ORIGINS = new Set(target.productionStaticOrigins);

type TowlDurableObjectId = object;
type TowlDurableObjectStub = Readonly<{ fetch(request: Request): Promise<Response> }>;

export type TowlDurableObjectNamespace = Readonly<{
  idFromName(name: string): TowlDurableObjectId;
  get(id: TowlDurableObjectId): TowlDurableObjectStub;
}>;

export function request_error(message: string, status: number): Response {
  return new Response(message, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

export function locus_id(request: Request): string | undefined {
  const value = new URL(request.url).searchParams.get("locus");
  return value === null || value.trim() === "" ? undefined : value;
}

export function is_websocket_upgrade(request: Request): boolean {
  return request.headers.get("Upgrade")?.toLowerCase() === "websocket";
}

function is_local_development_origin(origin: URL): boolean {
  return origin.protocol === "http:"
    && (origin.hostname === "localhost" || origin.hostname === "127.0.0.1" || origin.hostname === "[::1]");
}

function accepted_towl_browser_origin(request: Request): string | undefined {
  const value = request.headers.get("Origin");
  if (value === null) return undefined;
  let origin: URL;
  try { origin = new URL(value); }
  catch { return undefined; }
  return PUBLIC_TOWL_ORIGINS.has(origin.origin) || is_local_development_origin(origin)
    ? origin.origin
    : undefined;
}

function towl_session_response(request: Request): Response {
  const origin = accepted_towl_browser_origin(request);
  if (origin === undefined) return request_error("TOWL browser origin is not allowed.", 403);
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-credentials": "true",
      "access-control-allow-origin": origin,
      "cache-control": "no-store",
      "vary": "Origin",
    },
  });
}

/** Public compatibility surface: anonymous bootstrap plus TOWL WebSockets only. */
export async function route_towl_worker_request(
  request: Request,
  namespace: TowlDurableObjectNamespace,
): Promise<Response> {
  const url = new URL(request.url);
  if (request.method === "GET" && url.pathname === TOWL_WORKER_SESSION_PATH && !is_websocket_upgrade(request)) {
    return towl_session_response(request);
  }
  if (url.pathname !== TOWL_WORKER_PATH) return request_error("Not found.", 404);
  if (!is_websocket_upgrade(request)) return request_error("Expected a WebSocket upgrade request.", 426);
  const origin = request.headers.get("Origin");
  if (origin !== null && accepted_towl_browser_origin(request) === undefined) {
    return request_error("TOWL browser origin is not allowed.", 403);
  }
  const hostId = locus_id(request);
  if (hostId === undefined || !hostId.startsWith("towl:")) {
    return request_error("TOWL WebSocket requests require a TOWL locus selector.", 400);
  }
  const id = namespace.idFromName(TOWL_DURABLE_OBJECT_INSTANCE_NAME);
  return namespace.get(id).fetch(request);
}
