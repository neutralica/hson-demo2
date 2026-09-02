import { relative, resolve, sep } from "node:path";
const text_limit = (value: string, limit: number): Readonly<{ value: string; truncated: boolean }> => {
  if (value.length <= limit) return { value, truncated: false };
  const marker = `\n<TRUNCATED ${value.length - limit} characters>\n`; const room = Math.max(0, limit - marker.length);
  return { value: `${value.slice(0, Math.ceil(room / 2))}${marker}${value.slice(value.length - Math.floor(room / 2))}`, truncated: true };
};
export type LocalRedactor = Readonly<{ text(value: string, limit?: number): Readonly<{ value: string; truncated: boolean }>; path(value: string): string; diagnostic(kind: string, error: unknown): Readonly<{ kind: string; message: string; stack?: string; truncated: boolean }> }>;
export function create_local_redactor(repositoryRoot: string, home = process.env.HOME ?? ""): LocalRedactor {
  const replace = (input: string): string => input
    .replaceAll(home, "<home>").replaceAll(repositoryRoot, "<repo>")
    .replace(/(authorization|cookie|set-cookie)\s*:\s*[^\r\n]+/gi, "$1: <redacted>")
    .replace(/\bBearer\s+[A-Za-z0-9._~+\/-]+=*/gi, "Bearer <redacted>")
    .replace(/\b(token|secret|password|credential)\s*=\s*[^\s,;]+/gi, "$1=<redacted>")
    .replace(/([?&#](?:token|secret|password|credential|access_token)=)[^&#\s]+/gi, "$1<redacted>");
  return Object.freeze({
    text(value, limit = 8 * 1024) { const bounded = text_limit(replace(value), limit); return bounded; },
    path(value) { const absolute = resolve(value); const rel = relative(repositoryRoot, absolute); return rel && !rel.startsWith(".." + sep) && rel !== ".." ? rel.split(sep).join("/") : replace(value); },
    diagnostic(kind, error) { const e = error instanceof Error ? error : new Error(String(error)); const message = this.text(e.message, 8 * 1024); const stack = e.stack ? this.text(e.stack, 32 * 1024) : undefined; return { kind, message: message.value, ...(stack ? { stack: stack.value } : {}), truncated: message.truncated || stack?.truncated === true }; },
  });
}
