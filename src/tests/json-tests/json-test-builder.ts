import type { FixtureBundle, FixtureMap, Jsonish } from "../../app/phases/phase-3-demo/demo-test/tests.types";

export type JsonFixtureMap = Record<string, string>;
type JsonPrimitive = string | number | boolean | null;
type JsonObject = { [key: string]: Jsonish };
type JsonArray = Jsonish[];

type GenOpts = Readonly<{
    maxDepth: number;
    maxWidth: number;
}>;

type Rng = Readonly<{
    next: () => number;
    int: (min: number, max: number) => number;
    pick: <T>(xs: readonly T[]) => T;
    chance: (p: number) => boolean;
}>;

/**
 * Small deterministic RNG.
 *
 * Same seed => same generated fixture set.
 */
function make_rng(seed: number): Rng {
    let state = seed >>> 0;

    const next = (): number => {
        state = (state * 1664525 + 1013904223) >>> 0;
        return state / 0x100000000;
    };

    const int = (min: number, max: number): number => {
        return Math.floor(next() * (max - min + 1)) + min;
    };
    const pick = <T>(xs: readonly T[]): T => {
        if (xs.length === 0) {
            throw new Error("rng.pick() received an empty array");
        }

        const value = xs[int(0, xs.length - 1)];

        if (value === undefined) {
            throw new Error("rng.pick() selected an invalid index");
        }

        return value;
    };

    const chance = (p: number): boolean => {
        return next() < p;
    };

    return { next, int, pick, chance };
}

const WORDS = [
    "blue",
    "green",
    "violet",
    "yellow",
    "red",
    "plain",
    "sharp",
    "soft",
    "north",
    "south",
] as const;

const NORMAL_KEYS = [
    "name",
    "age",
    "value",
    "kind",
    "items",
    "children",
    "meta",
    "flag",
    "count",
    "note",
] as const;

const STRESS_KEYS = [
    "",
    "_id",
    "__typename",
    "a b",
    "snake_case",
    "camelCase",
    "SCREAMING",
    "000",
    "a+b",
    "x/y",
    "x.y",
    "x:y",
    "emoji 😀 key",
    "漢 字",
    "`quoted-ish`",
    `<tag attr="x">`,
    " leading",
    "trailing ",
    " both ",
      "feFuncR",
  "feGaussianBlur",
  "feImage",
  "feMerge",
  "feMergeNode",
  "feMorphology",
  "feOffset",
] as const;


const NUMS = [
    0,
    1,
    2,
    3,
    4,
    -1,
    1.2,
    4.5,
    3.7,
    8.9,
    6.6,
] as const;

function make_key(rng: Rng, used: Set<string>): string {
    const base: string = make_key_base(rng);
    let key: string = base;
    let ix = 2;

    while (used.has(key)) {
        key = `${base}${ix}`;
        ix += 1;
    }

    used.add(key);
    return key;
}

function make_primitive(rng: Rng): JsonPrimitive {
    const kind = rng.pick(["string", "number", "boolean", "null"] as const);

    if (kind === "string") {
        return rng.pick(WORDS);
    }

    if (kind === "number") {
        return rng.pick(NUMS);
    }

    if (kind === "boolean") {
        return rng.chance(0.5);
    }

    return null;
}

function make_array(
    rng: Rng,
    depth: number,
    opts: GenOpts,
): JsonArray {
    const length = rng.int(0, opts.maxWidth);
    const arr: JsonArray = [];

    for (let i = 0; i < length; i += 1) {
        arr.push(make_jsonish(rng, depth + 1, opts));
    }

    return arr;
}

function make_object(
    rng: Rng,
    depth: number,
    opts: GenOpts,
): JsonObject {
    const length = rng.int(0, opts.maxWidth);
    const obj: JsonObject = {};
    const used = new Set<string>();

    for (let i = 0; i < length; i += 1) {
        const key = make_key(rng, used);
        obj[key] = make_jsonish(rng, depth + 1, opts);
    }

    return obj;
}

function make_jsonish(
    rng: Rng,
    depth: number,
    opts: GenOpts,
): Jsonish {
    if (depth >= opts.maxDepth) {
        return make_primitive(rng);
    }

    const kind = rng.pick([
        "primitive",
        "array",
        "object",
    ] as const);

    if (kind === "primitive") {
        return make_primitive(rng);
    }

    if (kind === "array") {
        return make_array(rng, depth, opts);
    }

    return make_object(rng, depth, opts);
}

/**
 * Generate one deterministic JSON-ish fixture.
 */
export function make_json_fixture(
    seed: number,
    opts: GenOpts = {
        maxDepth: 4,
        maxWidth: 4,
    },
): Jsonish {
    const rng = make_rng(seed);
    const rootOpts: GenOpts = {
        ...opts,
        maxWidth: Math.max(1, opts.maxWidth),
    };
    return rng.chance(0.5)
        ? make_object(rng, 0, rootOpts)
        : make_array(rng, 0, rootOpts);
}
export function make_json_fixture_map(
    count: number,
    seedBase: number,
    opts: GenOpts = {
        maxDepth: 4,
        maxWidth: 4,
    },
): JsonFixtureMap {
    const fixtures: JsonFixtureMap = {};
    for (let i = 0; i < count; i += 1) {
        const seed = seedBase + i;
        const key = `seed_${seed}_ix_${String(i).padStart(3, "0")}`;
        const value = make_json_fixture(seed, opts);
        fixtures[key] = JSON.stringify(value, null, 2);
    }
    return fixtures;
}

export function random_seed(): number {
    return Math.floor(Math.random() * 1_000_000_000);
}


export function make_json_fixture_bundle(
  count: number,
  seedBase: number,
  opts: GenOpts = {
    maxDepth: 4,
    maxWidth: 4,
  },
): FixtureBundle {
  const bundle: Record<string, FixtureMap> = {};

  for (let i = 0; i < count; i += 1) {
    const seed = seedBase + i;
    const key = `seed_${seed}_ix_${String(i).padStart(3, "0")}`;
    const value = make_json_fixture(seed, opts);

    bundle[key] = {
      json: value,
    };
  }

  return bundle;
}

function make_key_base(rng: Rng): string {
    if (rng.chance(0.5)) {
        return rng.pick(NORMAL_KEYS);
    }

    return rng.pick(STRESS_KEYS);
}