import { make_rng } from "../../../app/utils/rng";
import type { Rng, Jsonish, Gen, JArr, JObj, Fixture } from "../../tests.types";
import { _freeze } from "../../tests.consts";

const JSON_KEYS_SMALL = ["a", "b", "c", "d"] as const;
const JSON_KEYS_MED = ["id", "name", "meta", "data", "tags"] as const;

const STRINGS = [
  "",
  "alpha",
  "two words",
  "quote: \"hi\"",
  "backslash: \\",
  "newline:\nline2",
  "tab:\tone",
  "unicode: 漢字✓",
] as const;

function pick<T>(rnd: Rng, xs: readonly T[]): T {
  return xs[Math.floor(rnd() * xs.length)]!;
}

function json_stringify(v: Jsonish): string {
  return JSON.stringify(v, null, 2);
}

// small atom gens
const g_null: Gen<Jsonish> = { name: "null", sample: () => null };
const g_bool: Gen<Jsonish> = { name: "bool", sample: (rnd) => (rnd() < 0.5) };

const g_num: Gen<Jsonish> = {
  name: "num",
  sample: (rnd) => {
    // small ints + a few floats
    const pickN = Math.floor(rnd() * 6);
    if (pickN <= 3) return Math.floor(rnd() * 20) - 10;
    return Math.round((rnd() * 200 - 100) * 100) / 100;
  },
};

const g_str: Gen<Jsonish> = {
  name: "str",
  sample: (rnd) => pick(rnd, STRINGS),
};

// recursive wrappers
export const g_arr = (inner: Gen<Jsonish>, min = 0, max = 4): Gen<Jsonish> => ({
  name: `arr(${inner.name})`,
  sample: (rnd) => {
    const n = min + Math.floor(rnd() * (max - min + 1));
    const a: Jsonish[] = [];
    for (let i = 0; i < n; i++) a.push(inner.sample(rnd));
    return a as JArr;
  },
});

export const g_obj = (inner: Gen<Jsonish>, keys: readonly string[]): Gen<Jsonish> => ({
  name: `obj(${inner.name})`,
  sample: (rnd) => {
    const o: Record<string, Jsonish> = {};
    for (const k of keys) o[k] = inner.sample(rnd);
    return o as JObj;
  },
});

export type ShapeOpts = Readonly<{
  maxDepth: number;
  keys: readonly string[];
  arrMax: number;
}>;

export function make_json_shape(inner: Gen<Jsonish>, o: ShapeOpts): Gen<Jsonish> {
  const step = (g: Gen<Jsonish>, depth: number): Gen<Jsonish> => {
    if (depth >= o.maxDepth) return g;

    const wrapped: readonly Gen<Jsonish>[] = depth === 0
      ? [
        { name: `arr(${g.name})`, sample: (rnd) => g_arr(g, 0, o.arrMax).sample(rnd) },
        { name: `obj(${g.name})`, sample: (rnd) => g_obj(g, o.keys).sample(rnd) },
      ]
      : [
        g,
        { name: `arr(${g.name})`, sample: (rnd) => g_arr(g, 0, o.arrMax).sample(rnd) },
        { name: `obj(${g.name})`, sample: (rnd) => g_obj(g, o.keys).sample(rnd) },
      ];

    return {
      name: `shape[d${depth}]`,
      sample: (rnd) => pick(rnd, wrapped).sample(rnd),
    };
  };

  let out: Gen<Jsonish> = inner;
  for (let d = 0; d < o.maxDepth; d++) out = step(out, d);
  return out;
}

// presets = big coverage without big LOC
const SHAPES: readonly Readonly<{ name: string; o: ShapeOpts }>[] = [
  { name: "d1-s", o: { maxDepth: 1, keys: JSON_KEYS_SMALL, arrMax: 3 } },
  { name: "d2-s", o: { maxDepth: 2, keys: JSON_KEYS_SMALL, arrMax: 3 } },
  { name: "d2-m", o: { maxDepth: 2, keys: JSON_KEYS_MED, arrMax: 4 } },
  { name: "d3-m", o: { maxDepth: 3, keys: JSON_KEYS_MED, arrMax: 4 } },
] as const;

const BASE_ATOMS: readonly Gen<Jsonish>[] = [g_str, g_num, g_bool, g_null];

export function make_generated_json_fixtures(o: Readonly<{ seed: number; count: number }>): readonly Fixture[] {
  const seed = (o.seed >>> 0);
  const count = Math.max(0, o.count | 0);

  const rnd = make_rng(seed);

  const out: Fixture[] = [];

  for (let i = 0; i < count; i++) {
    // vary “shape” and “atom” per case but deterministically
    const atom = pick(rnd, BASE_ATOMS);
    const shape = pick(rnd, SHAPES);

    const g = make_json_shape(atom, shape.o);
    const value = g.sample(rnd);

    const text = json_stringify(value);

    out.push(_freeze({
      name: `json__gen__${seed}__${String(i).padStart(4, "0")}__${atom.name}__${shape.name}`,
      fmt: "json",
      atom: text,
      tags: _freeze(["generated", "json", `seed:${seed}`, `atom:${atom.name}`, `shape:${shape.name}`]),
    } as const));
  }

  return _freeze(out.map(_freeze));
}