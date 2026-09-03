import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, type Alias } from "vite";

type PackageExport = string | Readonly<{ import?: string }>;

export function prepared_hson_live_aliases(packageRoot: string | undefined): readonly Alias[] {
  if (packageRoot === undefined) return Object.freeze([]);
  const manifest = JSON.parse(readFileSync(resolve(packageRoot, "package.json"), "utf8")) as {
    name?: unknown;
    exports?: Readonly<Record<string, PackageExport>>;
  };
  if (manifest.name !== "hson-live" || manifest.exports === undefined) {
    throw new Error("VITE_HSON_LIVE_PREPARED_PACKAGE_INVALID");
  }
  return Object.freeze(Object.entries(manifest.exports).map(([key, value]) => {
    const target = typeof value === "string" ? value : value.import;
    if (target === undefined) throw new Error(`VITE_HSON_LIVE_IMPORT_EXPORT_MISSING:${key}`);
    const specifier = key === "." ? "hson-live" : `hson-live${key.slice(1)}`;
    return Object.freeze({ find: new RegExp(`^${specifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`), replacement: resolve(packageRoot, target) });
  }));
}

export default defineConfig({
  resolve: {
    alias: prepared_hson_live_aliases(process.env.HSON_LIVE_PREPARED_PACKAGE_ROOT),
  },
});
