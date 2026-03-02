import type { HsonAttrs } from "hson-live/types";
import type { Gen, Jsonish, Fixture, FixtureBag, Named } from "../../tests.types";
import { make_rng } from "../../../app/utils/rng";
import { _freeze } from "../../tests.consts";


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

export const g_arr = (inner: Gen<Jsonish>, min = 0, max = 4): Gen<readonly Jsonish[]> => ({
  name: `arr(${inner.name})`,
  sample: (rnd) => {
    const n = min + Math.floor(rnd() * (max - min + 1));
    return Array.from({ length: n }, () => inner.sample(rnd));
  },
});

export const g_obj = (inner: Gen<Jsonish>, keys: readonly string[]): Gen<Readonly<Record<string, Jsonish>>> => ({
  name: `obj(${inner.name})`,
  sample: (rnd) => {
    const out: Record<string, Jsonish> = {};
    for (const k of keys) out[k] = inner.sample(rnd);
    return out;
  },
});

export type ShapeOpts = Readonly<{
  maxDepth: number;
  keys: readonly string[];
  arrMax: number;
}>;

export function make_json_shape(inner: Gen<Jsonish>, o: ShapeOpts): Gen<Jsonish> {
  const base = inner;

  const step = (g: Gen<Jsonish>, depth: number): Gen<Jsonish> => {
    if (depth >= o.maxDepth) return g;

    const wrapped: readonly Gen<Jsonish>[] = [
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
  let out: Gen<Jsonish> = base;
  for (let d = 0; d < o.maxDepth; d++) out = step(out, d);
  return out;
}

export type H = string; // serialized text input

export type Wrap = Readonly<{
  name: string;
  apply: (inner: H) => H;
}>;

export const w_div = (name: string, attrs: string): Wrap => ({
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
    else parts.push(`${k}="${escape_attr(typeof v === "string" ? v : String(v))}"`);     // quoted
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
  ...axes: readonly (readonly Named<unknown>[])[] 
): readonly Readonly<{ name: string; values: readonly unknown[] }>[] { 
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

export function product2<A, B>(
  a: readonly Named<A>[],
  b: readonly Named<B>[],
): readonly Readonly<{ name: string; a: A; b: B }>[] {
  const out: Array<{ name: string; a: A; b: B }> = [];

  for (const aa of a) for (const bb of b) {
    out.push({
      name: `${aa.name}_|_${bb.name}`,
      a: aa.value,
      b: bb.value,
    });
  }

  // use freeze wrapper, not Object.freeze directly
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
      name: `${aa.name}_|_${bb.name}_|_${cc.name}`,
      a: aa.value,
      b: bb.value,
      c: cc.value,
    });
  }

  // use freeze wrapper, not Object.freeze directly
  return out.map((row) => _freeze(row));
}


// extra helper(s) for shape building
type HtmlShape = Readonly<{
  name: string;
  apply: (tag: string, attrs: HsonAttrs, inner: string) => string;
}>;


export function make_html_generated_fixtures(o?: Readonly<{ seed: number; count: number }>): readonly Fixture[] {
  const TAGS = [
    { name: "p", value: "p" },
    { name: "div", value: "div" },
    { name: "section", value: "section" },
    { name: "custom-name", value: "custom-name" },

    //  inline element
    { name: "span", value: "span" },

    //  “preformatted” text context (serializer/parsing often differs)
    { name: "pre", value: "pre" },

    //  semantic but normal
    { name: "article", value: "article" },

    //  namespaces-ish / colon tag name (your XML path should accept this)
    { name: "xlinkish", value: "x:tag" },
    { name: "svga", value: "svga" },

    //  underscore tag name (VSN-style); should be skipped by optional_endtag_preflight but still parse
    // Only include if this is allowed by your entry policy for HTML fixtures.
    { name: "vsn_like", value: "_vsn" },
  ] as const;

  //  XML-safe attrs (no tabs/newlines; boolean attrs valued form is handled elsewhere)
  const ATTR_SETS = [
    { name: "none", value: {} as HsonAttrs },
    { name: "id", value: { id: "one-attr" } as HsonAttrs },
    { name: "class_lang", value: { class: "a b b a", lang: "en" } as HsonAttrs },
    { name: "boolean", value: { disabled: true, required: true } as HsonAttrs },
    { name: "quotes", value: { title: `"no"` } as HsonAttrs },
    { name: "empty_attr", value: { title: "" } as HsonAttrs },
    { name: "data_num", value: { "data-n": "0" } as HsonAttrs },

    //  multiple data attrs (ordering + escaping)
    { name: "data_multi", value: { "data-a": "1", "data-b": "two", "data-c": "III" } as HsonAttrs },

    //  “weird but legal” attr names
    { name: "attr_punct", value: { "aria-label": "ok", "data_x.y": "dot", "data_x:y": "colon" } as HsonAttrs },

    //  mix of boolean true/false (tests your boolean policy; false should probably omit)
    { name: "bool_mix", value: { disabled: true, required: false, readonly: true } as unknown as HsonAttrs },

    //  ampersand in attr value (should force entity/amp gating if you serialize to XML-ish)
    { name: "attr_amp", value: { title: "A & B" } as HsonAttrs },

    //  angle brackets in attr value (should trigger escape_attr_angles gating)
    { name: "attr_angles", value: { title: "x < y > z" } as HsonAttrs },

    //  whitespace-heavy attr value (tests normalization decisions)
    { name: "attr_spaces", value: { title: "  lead  mid   tail  " } as HsonAttrs },
  ] as const;

  //  content that won’t trigger XML weirdness (no raw markup, no control chars)
  const CONTENTS = [
    { name: "plain", value: "basic paragraph" },
    { name: "unicode", value: `e\u0301 = é; 漢字✓` },
    { name: "amp_lt_gt", value: `A & B < C > D` },
    { name: "quotes", value: `He said "hi"` },
    { name: "empty", value: "" },
    { name: "spaces", value: "   " },

    // NEW: LF newlines
    { name: "lf", value: "line1\nline2" },

    // NEW: CRLF newlines (directly hits your CRLF mismatch issue)
    { name: "crlf", value: "line1\r\nline2" },

    // NEW: leading/trailing newline
    { name: "edge_newlines", value: "\nline\n" },

    // NEW: tabs (should be safe as text content; attrs are the danger zone)
    { name: "tabs", value: "a\tb\tc" },

    // NEW: lots of spaces with text (serializer may wrap/inline differently)
    { name: "spaced_text", value: "  a   b    c  " },
  ] as const;

  //  remove HTML-only optional-end-tag case; keep shapes that are XML-safe
  const SHAPES: readonly HtmlShape[] = [
    { name: "single", apply: (tag, attrs, inner) => el(tag, attrs, inner) },
    { name: "wrapped_div", apply: (tag, attrs, inner) => el("div", {} as HsonAttrs, el(tag, attrs, inner)) },
    { name: "siblings_h2_p", apply: (tag, attrs, inner) => `<root><h2>sib</h2>${el(tag, attrs, inner)}</root>` },
    { name: "mixed_text_nodes", apply: (tag, attrs, inner) => el(tag, attrs, `pre ${inner} post`) },
    { name: "void_hr_between", apply: (tag, attrs, inner) => `<root><p>line one</p><hr />${el(tag, attrs, inner)}<p>line two</p></root>` },

    // NEW: deep nesting (tests recursion + indent policy)
    {
      name: "deep_nest_3", apply: (tag, attrs, inner) =>
        `<root>${el("div", {} as HsonAttrs,
          el("section", {} as HsonAttrs,
            el(tag, attrs, inner)
          )
        )}</root>`
    },

    // NEW: two siblings of the same tag (tests sibling handling + root wrapping stability)
    {
      name: "two_siblings_same", apply: (tag, attrs, inner) =>
        `<root>${el(tag, attrs, inner)}${el(tag, attrs, inner)}</root>`
    },

    // NEW: include a void tag (tests void expansion + mismatch handling)
    // (wrap in <root> to avoid “extra content” err at the same time)
    {
      name: "void_embed_adjacent", apply: (tag, attrs, inner) =>
        `<root>${el(tag, attrs, inner)}<embed src="x.swf" /></root>`
    },
  ] as const;

  // ---- base deterministic cartesian set (your current behavior)
  const combos = product2(TAGS, ATTR_SETS);

  const base: Fixture[] = [];
  for (const ta of combos) {
    for (const c of CONTENTS) {
      for (const s of SHAPES) {
        base.push(_freeze({
          name: `html__${ta.name}__${c.name}__${s.name}`,
          fmt: "html",
          atom: s.apply(ta.a, ta.b, c.value),
          tags: _freeze(["generated", "html", "base", `shape:${s.name}`]),
        } as const));
      }
    }
  }

  // ---- optional seeded fuzz extension / truncation
  if (!o) return _freeze(base);

  const want = Math.max(0, o.count | 0);
  const seed = (o.seed >>> 0);

  if (want <= base.length) {
    return _freeze(base.slice(0, want));
  }

  //  add fuzz fixtures beyond base size
  const extraCount = want - base.length;

  const rnd = make_rng(seed); // use your seeded RNG helper
  const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)]!;

  const extra: Fixture[] = [];
  for (let i = 0; i < extraCount; i++) {
    const tag = pick(TAGS);
    const attrs = pick(ATTR_SETS);
    const content = pick(CONTENTS);
    const shape = pick(SHAPES);

    extra.push(_freeze({
      name: `html__fuzz__${seed}__${String(i).padStart(4, "0")}__${tag.name}__${attrs.name}__${content.name}__${shape.name}`,
      fmt: "html",
      atom: shape.apply(tag.value, attrs.value, content.value),
      tags: _freeze(["generated", "html", "fuzz", `seed:${seed}`, `shape:${shape.name}`]),
    } as const));
  }

  return _freeze([...base, ...extra].map(_freeze));
}