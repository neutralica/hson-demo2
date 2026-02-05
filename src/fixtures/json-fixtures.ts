// json-fixtures.ts

import { _freeze } from "./generate-fixtures";
import type { Fixture } from "./fixtures.types";


export type JsonAuthor = unknown;
export type JsonAuthorMap = Readonly<Record<string, JsonAuthor>>;

function assert_jsonable(v: unknown, path: string): void {
  const t = typeof v;

  if (t === "undefined") throw new Error(`JSON fixture contains undefined at ${path}`);
  if (t === "function") throw new Error(`JSON fixture contains function at ${path}`);
  if (t === "symbol") throw new Error(`JSON fixture contains symbol at ${path}`);
  if (t === "bigint") throw new Error(`JSON fixture contains bigint at ${path}`);

  if (v && t === "object") {
    if (Array.isArray(v)) {
      for (let i = 0; i < v.length; i++) assert_jsonable(v[i], `${path}[${i}]`);
      return;
    }
    // plain object walk (fine for fixtures)
    for (const [k, vv] of Object.entries(v as Record<string, unknown>)) {
      assert_jsonable(vv, `${path}.${k}`);
    }
  }
}

export function json_author_to_fixtures(
  m: JsonAuthorMap,
  tags: readonly string[] = [],
): readonly Fixture[] {
  const out: Fixture[] = [];

  for (const [name, value] of Object.entries(m)) {
    assert_jsonable(value, name);

    const atom = JSON.stringify(value);

    const base = _freeze({ name, fmt: "json", atom } as const);
    out.push(_freeze(tags.length ? { ...base, tags: _freeze([...tags]) } : base));
  }

  return _freeze(out.map(_freeze));
}

