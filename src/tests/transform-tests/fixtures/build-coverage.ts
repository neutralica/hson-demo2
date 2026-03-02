
import { make_rng, normalize_seed } from "../../../app/utils/rng";
import type { Named } from "../../tests.types";
import { _freeze } from "../../tests.consts";

type PickFn = <T>(xs: readonly T[]) => T;

function pick_with(rnd: () => number): PickFn {
  return <T>(xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)]!;
}

type Axis<T> = Readonly<{ axis: string; items: readonly Named<T>[] }>;

export type GenRunMeta = Readonly<{
  seed: number;
  count: number;
  gen: string;   // "json-fuzz-v1" / "html-fuzz-v2" etc
}>;

export function build_with_coverage(
  axes: readonly Axis<unknown>[],
  run: GenRunMeta,
  mkName: (parts: readonly string[], i: number) => string,
  mkAtom: (picked: Readonly<Record<string, unknown>>, rnd: () => number) => string,
  mkTags: (picked: Readonly<Record<string, unknown>>) => readonly string[],
): readonly Readonly<{ name: string; atom: string; tags: readonly string[]; meta: Record<string, string> }>[] {
  const seed = normalize_seed(run.seed);
  const rnd = make_rng(seed);
  const pick = pick_with(rnd);

  const out: Array<{ name: string; atom: string; tags: readonly string[]; meta: Record<string, string> }> = [];

  const base_meta = _freeze({
    seed: String(seed),
    gen: run.gen,
    count: String(run.count),
  });

  const sample_one = (forced?: Readonly<{ axis: string; item: Named<unknown> }>, i = 0): void => {
    const picked: Record<string, unknown> = Object.create(null);
    const nameParts: string[] = [];

    for (const ax of axes) {
      const item = (forced && forced.axis === ax.axis) ? forced.item : pick(ax.items);
      picked[ax.axis] = item.value;
      nameParts.push(`${ax.axis}:${item.name}`);
    }

    const atom = mkAtom(_freeze(picked), rnd);
    const tags = mkTags(_freeze(picked));
    const name = mkName(nameParts, i);

    out.push(_freeze({
      name,
      atom,
      tags,
      meta: _freeze({ ...base_meta, i: String(i) }),
    }));
  };

  // coverage pass
  let i = 0;
  for (const ax of axes) {
    for (const item of ax.items) {
      sample_one(_freeze({ axis: ax.axis, item }), i++);
      if (i >= run.count) return _freeze(out);
    }
  }

  // fuzz pass
  for (; i < run.count; i++) sample_one(undefined, i);

  return _freeze(out);
}