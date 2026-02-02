import type { HsonAttrs } from "hson-live/types";
import type { Gen, J, Fixture, FixtureBag, Named } from "./fixtures.types";
import {json_ALL} from "../../_data-old/data/json-fixtures"


function el(tag: string, attrs: HsonAttrs, inner: string): string {
  return `<${tag}${attrs_to_html(attrs)}>${inner}</${tag}>`;
}

export const g_str = (name: string, s: string): Gen<string> => ({
  name,
  sample: () => s,
});

export const g_choice = <T>(name: string, xs: readonly T[]): Gen<T> => ({
  name,
  sample: (rnd) => xs[Math.floor(rnd() * xs.length)]!,
});

export const g_arr = (inner: Gen<J>, min = 0, max = 4): Gen<readonly J[]> => ({
  name: `arr(${inner.name})`,
  sample: (rnd) => {
    const n = min + Math.floor(rnd() * (max - min + 1));
    return Array.from({ length: n }, () => inner.sample(rnd));
  },
});

export const g_obj = (inner: Gen<J>, keys: readonly string[]): Gen<Readonly<Record<string, J>>> => ({
  name: `obj(${inner.name})`,
  sample: (rnd) => {
    const out: Record<string, J> = {};
    for (const k of keys) out[k] = inner.sample(rnd);
    return out;
  },
});

export type ShapeOpts = Readonly<{
  maxDepth: number;
  keys: readonly string[];
  arrMax: number;
}>;

export function make_json_shape(inner: Gen<J>, o: ShapeOpts): Gen<J> {
  const base = inner;

  const step = (g: Gen<J>, depth: number): Gen<J> => {
    if (depth >= o.maxDepth) return g;

    const wrapped: readonly Gen<J>[] = [
      g,
      {
        name: `arr(${g.name})`,
        sample: (rnd) => g_arr(g, 0, o.arrMax).sample(rnd),
      },
      {
        name: `obj(${g.name})`,
        sample: (rnd) => g_obj(g, o.keys).sample(rnd),
      },
    ];

    return {
      name: `shape[d${depth}]`,
      sample: (rnd) => {
        const pick = wrapped[Math.floor(rnd() * wrapped.length)]!;
        return pick.sample(rnd);
      },
    };
  };

  // fold depth times, but the *choice* happens per-sample, so you get variety
  let out: Gen<J> = base;
  for (let d = 0; d < o.maxDepth; d++) out = step(out, d);
  return out;
}

export type H = string; // serialized text input

export type Wrap = Readonly<{
  name: string;
  apply: (inner: H) => H;
}>;

export const w_div = (name: string, attrs: string) : Wrap => ({
  name,
  apply: (inner) => `<div ${attrs}>${inner}</div>`,
});

export const w_btn_disabled: Wrap = {
  name: "btn_disabled",
  apply: (inner) => `<button disabled>${inner}</button>`,
};

export function compose(base: Gen<H>, wraps: readonly Wrap[]): Gen<H> {
  return {
    name: `${wraps.map(w => w.name).join("∘")}∘${base.name}`,
    sample: (rnd) => {
      let s = base.sample(rnd);
      for (const w of wraps) s = w.apply(s);
      return s;
    },
  };
}



export function attrs_to_html(attrs: HsonAttrs): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(attrs)) {
    if (v === true) parts.push(k);                   // boolean attr
    else parts.push(`${k}="${escape_attr(typeof v==="string" ? v : String(v))}"`);     // quoted
  }
  return parts.length ? " " + parts.join(" ") : "";
}

function escape_attr(s: string): string {
  // minimal HTML escaping for attrs
  return s
    .replaceAll("&", "&amp;")
    .replaceAll(`"`, "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function make_bag(items: readonly Fixture[]): FixtureBag {
  const out: Record<string, Fixture> = Object.create(null);

  for (const f of items) {
    if (out[f.name]) {
      throw new Error(`Fixture name collision: ${f.name}`);
    }
    out[f.name] = f;
  }

  return _freeze(out);
}

export function product(
  ...axes: readonly (readonly Named<unknown>[])[] // CHANGED
): readonly Readonly<{ name: string; values: readonly unknown[] }>[] { // CHANGED
  let acc: Array<{ name: string; values: unknown[] }> = [{ name: "", values: [] }];

  for (const axis of axes) {
    const next: Array<{ name: string; values: unknown[] }> = [];
    for (const base of acc) {
      for (const item of axis) {
        next.push({
          name: base.name ? `${base.name}__${item.name}` : item.name,
          values: [...base.values, item.value],
        });
      }
    }
    acc = next;
  }

  return acc.map((x) => _freeze({ name: x.name, values: _freeze([...x.values]) }));
}

// CHANGED: typed freeze wrapper preserves generics
export const _freeze = <T>(x: T): Readonly<T> => Object.freeze(x);

export function product2<A, B>(
  a: readonly Named<A>[],
  b: readonly Named<B>[],
): readonly Readonly<{ name: string; a: A; b: B }>[] {
  const out: Array<{ name: string; a: A; b: B }> = [];

  for (const aa of a) for (const bb of b) {
    out.push({
      name: `${aa.name}__${bb.name}`,
      a: aa.value,
      b: bb.value,
    });
  }

  // CHANGED: use freeze wrapper, not Object.freeze directly
  return out.map((row) => _freeze(row));
}

export function product3<A, B, C>(
  a: readonly Named<A>[],
  b: readonly Named<B>[],
  c: readonly Named<C>[],
): readonly Readonly<{ name: string; a: A; b: B; c: C }>[] {
  const out: Array<{ name: string; a: A; b: B; c: C }> = [];

  for (const aa of a) for (const bb of b) for (const cc of c) {
    out.push({
      name: `${aa.name}__${bb.name}__${cc.name}`,
      a: aa.value,
      b: bb.value,
      c: cc.value,
    });
  }

  // CHANGED: use freeze wrapper, not Object.freeze directly
  return out.map((row) => _freeze(row));
}


// CHANGED: extra helper(s) for shape building
type HtmlShape = Readonly<{
  name: string;
  apply: (tag: string, attrs: HsonAttrs, inner: string) => string;
}>;

export function make_html_generated_fixtures(): readonly Fixture[] {
  const TAGS = [
    { name: "p", value: "p" },
    { name: "div", value: "div" },
    { name: "header", value: "header" },
  ] as const;

  const ATTR_SETS = [
    { name: "none", value: {} as HsonAttrs },
    { name: "multi", value: { class: "a\tb\nb  a", lang: "en" } as HsonAttrs },
    { name: "boolean", value: { disabled: true, required: true } as HsonAttrs },
    { name: "quotes", value: { title: `He said "hi" & left <soon>` } as HsonAttrs },

    // ADDED: empty-string + zero-ish values (often exposes “stringified number” bugs downstream)
    { name: "empty_attr", value: { title: "" } as HsonAttrs },
    { name: "numish_attr", value: { "data-n": 0 } as unknown as HsonAttrs }, // if your HsonAttrs forbids numbers, remove
  ] as const;

  const CONTENTS = [
    { name: "plain", value: "basic paragraph" },
    { name: "unicode", value: `e\u0301 = é; ZWJ: 👩‍💻; ZWNJ:\u200Cbetween` },

    // NOTE: this is “inner HTML” content; great for mixed-content testing
    { name: "mixed_inline", value: `paragraph with <span>mixed content</span> inside` },

    // ADDED: text + element + text (classic mixed-node edge)
    { name: "txt_span_txt", value: `alpha <span>mid</span> omega` },

    // ADDED: empty-ish content
    { name: "empty", value: "" },
    { name: "spaces", value: "   " },
  ] as const;

  // ADDED: shape axis (tree topology)
  const SHAPES: readonly HtmlShape[] = [
    {
      name: "single",
      apply: (tag, attrs, inner) => el(tag, attrs, inner),
    },
    {
      name: "wrapped_div",
      apply: (tag, attrs, inner) => el("div", {} as HsonAttrs, el(tag, attrs, inner)),
    },
    {
      name: "siblings_h2_p",
      apply: (tag, attrs, inner) =>
        `<h2>sib</h2>${el(tag, attrs, inner)}`,
    },
    {
      name: "mixed_text_nodes",
      apply: (tag, attrs, inner) =>
        el(tag, attrs, `pre ${inner} post`),
    },
    {
      name: "void_hr_between",
      apply: (tag, attrs, inner) =>
        `<p>line one</p><hr>${el(tag, attrs, inner)}<p>line two</p>`,
    },
    {
      name: "optional_end_li",
      apply: (_tag, _attrs, inner) =>
        `<ul><li>one<li>${inner}<li>three</ul>`,
    },
  ] as const;

  const combos = product2(TAGS, ATTR_SETS);

  const out: Fixture[] = [];
  for (const ta of combos) {
    for (const c of CONTENTS) {
      for (const s of SHAPES) {
        out.push({
          name: `html__${ta.name}__${c.name}__${s.name}`,
          fmt: "html",
          atom: s.apply(ta.a, ta.b, c.value),
          tags: ["generated", "html", `shape:${s.name}`],
        });
      }
    }
  }

  return _freeze(out.map(_freeze));
}

export const FIXTURES_GENERATED: readonly Fixture[] = _freeze([
  ...make_html_generated_fixtures(),

    /// make_json_fixtures
    ]);