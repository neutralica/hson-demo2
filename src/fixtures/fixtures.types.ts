// fixtures.types

import type { FixtureAtom } from "../../../hson-live/dist/diagnostics/loop-3.test";

export type Named<T> = Readonly<{ name: string; value: T; }>;

export type FixtureFmt = "html" | "json" | "hson";

export type Fixture = Readonly<{
    name: string;
    fmt: FixtureFmt;
    atom: FixtureAtom;
    tags?: readonly string[];
}>;

export type FixtureBag = Readonly<Record<string, Fixture>>;
export type JPrim = null | boolean | number | string;

export interface JObj {
    readonly [k: string]: Jsonish;
}

export interface JArr extends ReadonlyArray<Jsonish> { }

export type Jsonish = JPrim | JArr | JObj;

export type Rng = () => number;

export type Gen<T> = Readonly<{
    name: string;
    sample: (rnd: Rng) => T;
}>;
