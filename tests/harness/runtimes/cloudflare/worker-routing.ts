export const HOSTED_TEST_DURABLE_OBJECT_NAME = "hson-demo2-hosted-tests-v1";

type HostedTestDurableObjectId = object;
type HostedTestDurableObjectStub = Readonly<{ fetch(request: Request): Promise<Response> }>;

export type HostedTestDurableObjectNamespace = Readonly<{
  idFromName(name: string): HostedTestDurableObjectId;
  get(id: HostedTestDurableObjectId): HostedTestDurableObjectStub;
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

export async function route_hosted_test_worker_request(
  request: Request,
  namespace: HostedTestDurableObjectNamespace,
): Promise<Response> {
  if (!is_websocket_upgrade(request)) {
    return request_error("Expected a WebSocket upgrade request.", 426);
  }
  if (locus_id(request) === undefined) {
    return request_error("Hosted-test WebSocket requests require a non-empty livehost query parameter.", 400);
  }
  const id = namespace.idFromName(HOSTED_TEST_DURABLE_OBJECT_NAME);
  return namespace.get(id).fetch(request);
}
