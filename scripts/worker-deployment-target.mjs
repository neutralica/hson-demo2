import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export const WORKER_TARGET_FILE = "deployment/towl-worker-target.json";

function require_object(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value;
}

async function read_json(path, label) {
  let value;
  try { value = JSON.parse(await readFile(path, "utf8")); }
  catch (cause) { throw new Error(`${label} is missing or malformed at ${path}.`, { cause }); }
  return require_object(value, label);
}

function public_origin(value, variable) {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${variable} is required and must identify the intended production TOWL Worker origin.`);
  let url;
  try { url = new URL(value.trim()); }
  catch (cause) { throw new Error(`${variable} must be a valid URL.`, { cause }); }
  if (url.protocol !== "wss:" || url.pathname !== "/" || url.username !== "" || url.password !== "" || url.search !== "" || url.hash !== "") {
    throw new Error(`${variable} must be a credential-free wss:// origin without a path, query, or fragment.`);
  }
  return url.origin;
}

export async function load_worker_deployment_target(options = {}) {
  const repositoryRoot = resolve(options.repositoryRoot ?? resolve(import.meta.dirname, ".."));
  const environment = options.environment ?? process.env;
  const descriptorPath = resolve(repositoryRoot, options.targetFile ?? WORKER_TARGET_FILE);
  const descriptor = await read_json(descriptorPath, "TOWL Worker deployment target");
  if (descriptor.schemaVersion !== 1 || typeof descriptor.wranglerConfig !== "string" || descriptor.wranglerConfig.length === 0) {
    throw new Error("TOWL Worker deployment target has an invalid shape.");
  }
  if (descriptor.wranglerEnvironment !== null && (typeof descriptor.wranglerEnvironment !== "string" || descriptor.wranglerEnvironment.length === 0)) {
    throw new Error("TOWL Worker Wrangler environment must be null (default) or a non-empty string.");
  }
  if (typeof descriptor.publicWebSocketOriginEnvironmentVariable !== "string" || !/^[A-Z][A-Z0-9_]*$/.test(descriptor.publicWebSocketOriginEnvironmentVariable)) {
    throw new Error("TOWL Worker public-origin environment variable is invalid.");
  }
  if (!Array.isArray(descriptor.productionStaticOrigins) || descriptor.productionStaticOrigins.length === 0
    || descriptor.productionStaticOrigins.some((origin) => typeof origin !== "string" || new URL(origin).origin !== origin || !origin.startsWith("https://"))) {
    throw new Error("TOWL Worker production static origins are invalid.");
  }
  const wranglerPath = resolve(repositoryRoot, descriptor.wranglerConfig);
  const wrangler = await read_json(wranglerPath, "Wrangler configuration");
  if (typeof wrangler.name !== "string" || wrangler.name.length === 0 || typeof wrangler.main !== "string" || wrangler.main.length === 0) {
    throw new Error("Wrangler configuration must identify the Worker name and entrypoint.");
  }
  const origin = public_origin(environment[descriptor.publicWebSocketOriginEnvironmentVariable], descriptor.publicWebSocketOriginEnvironmentVariable);
  return Object.freeze({
    name: wrangler.name,
    entrypoint: wrangler.main,
    wranglerConfig: descriptor.wranglerConfig,
    wranglerEnvironment: descriptor.wranglerEnvironment,
    publicWebSocketOrigin: origin,
    publicWebSocketOriginEnvironmentVariable: descriptor.publicWebSocketOriginEnvironmentVariable,
    productionStaticOrigins: Object.freeze([...descriptor.productionStaticOrigins]),
  });
}
