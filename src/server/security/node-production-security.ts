import { timingSafeEqual } from "node:crypto";
import {
  create_node_exact_origin_policy,
  type NodeApplicationSecurity,
  type NodeHostDeployment,
} from "hson-live/livehost/node";

/** Production security inputs for the public Node LiveHost server. */
export type NodeProductionSecurityOptions = Readonly<{
  allowedOrigins: readonly string[];
  bearerToken: string;
  cookieName?: string;
  trustedProxyPeers?: readonly string[];
  forwardedForHop?: "first" | "last";
}>;

function same_secret(candidate: string, expected: string): boolean {
  const left = Buffer.from(candidate);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

function cookie_value(header: string | undefined, name: string): string | undefined {
  if (header === undefined) return undefined;
  for (const item of header.split(";")) {
    const separator = item.indexOf("=");
    if (separator < 1) continue;
    if (item.slice(0, separator).trim() !== name) continue;
    return item.slice(separator + 1).trim();
  }
  return undefined;
}

export function create_node_production_security(
  options: NodeProductionSecurityOptions,
): Readonly<{ applicationSecurity: NodeApplicationSecurity; deployment: NodeHostDeployment; cookieName: string }> {
  if (options.allowedOrigins.length === 0) {
    throw new Error("Production LiveHost requires at least one exact allowed origin.");
  }
  if (options.bearerToken.length < 16) {
    throw new Error("Production LiveHost bearer token must contain at least 16 characters.");
  }
  const origin = create_node_exact_origin_policy({
    allowedOrigins: options.allowedOrigins,
    allowMissing: false,
    allowNull: false,
  });
  const cookieName = options.cookieName ?? "locus_auth";
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(cookieName)) {
    throw new Error("Production LiveHost authentication cookie name is invalid.");
  }
  const policy: NodeApplicationSecurity = {
    origin,
    authenticate(context) {
      const authorization = context.headers.get("authorization");
      const bearer = authorization?.startsWith("Bearer ")
        ? authorization.slice("Bearer ".length)
        : undefined;
      const cookie = cookie_value(context.headers.get("cookie"), cookieName);
      if (
        (bearer === undefined || !same_secret(bearer, options.bearerToken))
        && (cookie === undefined || !same_secret(cookie, options.bearerToken))
      ) {
        return { ok: false, status: 401, code: "NODE_HOST_AUTHENTICATION_REQUIRED" };
      }
      return {
        ok: true,
        value: Object.freeze({
          id: "deployment-principal",
          anonymous: false,
          value: Object.freeze({ source: bearer === undefined ? "cookie" : "bearer" }),
        }),
      };
    },
    authorize() {
      return { ok: true, value: undefined };
    },
  };
  const applicationSecurity = Object.freeze(policy);
  const trusted = new Set(options.trustedProxyPeers ?? []);
  const deployment: NodeHostDeployment = trusted.size === 0
    ? Object.freeze({ mode: "production" })
    : Object.freeze({
        mode: "production",
        proxy: Object.freeze({
          forwardedForHop: options.forwardedForHop ?? "first",
          trustImmediatePeer: (peerAddress: string) => trusted.has(peerAddress),
        }),
      });
  return Object.freeze({ applicationSecurity, deployment, cookieName });
}

/** Origin-gated anonymous admission used only by the public /session route. */
export function create_node_session_security(
  allowedOrigins: readonly string[],
): NodeApplicationSecurity {
  const origin = create_node_exact_origin_policy({
    allowedOrigins,
    allowMissing: false,
    allowNull: false,
  });

  const policy: NodeApplicationSecurity = {
    origin,
    authenticate() {
      return {
        ok: true,
        value: Object.freeze({
          id: "anonymous-browser",
          anonymous: true,
        }),
      };
    },
    authorize() {
      return { ok: true, value: undefined };
    },
  };

  return Object.freeze(policy);
}
