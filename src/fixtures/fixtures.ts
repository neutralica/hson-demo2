
// ---------- HTML building helpers ----------

import type { HsonAttrs } from "hson-live/types";
import type { Fixture, J, Named } from "./fixtures.types";
import { _freeze, product3 } from "./fixture-gen";


export function named<const T>(name: string, value: T): Named<T> {
  return _freeze({ name, value });
}

function attrs_to_html(attrs: HsonAttrs): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(attrs)) {
    if (v === true) parts.push(` ${k}`);
    else if (v === false || v == null) continue;
    else parts.push(` ${k}="${escape_attr(String(v))}"`);
  }
  return parts.join("");
}

function escape_attr(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function el(tag: string, attrs: HsonAttrs, inner: string): string {
  return `<${tag}${attrs_to_html(attrs)}>${inner}</${tag}>`;
}

function void_el(tag: string, attrs: HsonAttrs): string {
  // if you require explicit closing, tweak here to match your policy
  return `<${tag}${attrs_to_html(attrs)}>`;
}

function mixed(tag: string): string {
  return `<${tag}>a<span>mix</span>b</${tag}>`;
}

// ---------- JSON helpers ----------

// IMPORTANT: Keep JSON fixtures as JSON TEXT if you want to exercise fromJson parsing.
// If you want both, keep separate tags or suites.
function json_text(v: J): string {
  return JSON.stringify(v);
}

// ---------- Fixture constructors ----------
function fx_html(name: string, atom: string, tags: readonly string[]): Fixture {
  return _freeze({ name, fmt: "html", atom, tags });
}
function fx_json(name: string, atom: string, tags: readonly string[]): Fixture {
  return _freeze({ name, fmt: "json", atom, tags });
}

// ---------- Core shape sets ----------

const TXT = _freeze({
  plain: "basic paragraph",
  empty: "",
  whitespace: "   ",
  unicode_tricky: `e\u0301 = é; ZWJ: 👩‍💻; ZWNJ:\u200Cbetween`,
  angle_amp: `He said "hi" & left <soon>`,
});

const TAGS = [
  named("p", "p"),
  named("div", "div"),
  named("header", "header"),
  named("section", "section"),
] as const;

const ATTR_SETS = [
  named("none", {} as HsonAttrs),
  named("multi", { class: "  a\tb\nb  a  ", lang: "en" } as HsonAttrs),
  named("boolean", { disabled: true, required: true } as HsonAttrs),
  named("quotes", { title: TXT.angle_amp, "data-json": `{"a":1,"b":"2"}` } as HsonAttrs),
  named("data_unquoted_like", { "data-x": "a:b,c.d/e?f=g&h=i#j" } as HsonAttrs),
] as const;

const CONTENTS = [
  named("plain", TXT.plain),
  named("empty", TXT.empty),
  named("unicode", TXT.unicode_tricky),
  named("mixed", mixed("header")),
  named("angle_amp", TXT.angle_amp),
] as const;

// ---------- HTML fixtures ----------
function gen_html_shapes(): readonly Fixture[] {
  const out: Fixture[] = [];

  // Rudiments / explicit edge cases (shape buckets)
  out.push(fx_html("html__basic_text", `<p>${TXT.plain}</p>`, ["html", "shape:rudiment"]));
  out.push(fx_html("html__siblings", `<h2>t</h2><p>p</p>`, ["html", "shape:siblings"]));
  out.push(fx_html("html__nested", `<div><p>${TXT.plain}</p></div>`, ["html", "shape:nested"]));
  out.push(fx_html("html__mixed_content", mixed("header"), ["html", "shape:mixed"]));
  out.push(fx_html("html__void_hr", `<p>one<hr/>two</p>`, ["html", "shape:void"]));
  out.push(fx_html("html__class_tokenize_whitespace", `<div class="  a\tb\nb  a  ">x</div>`, ["html", "shape:class_ws"]));
  out.push(fx_html("html__textarea_newlines", `<textarea>Line1\r\nLine2\nLine3</textarea>`, ["html", "shape:textarea_nl"]));
  out.push(fx_html("html__unicode_tricky_text", `<p>${TXT.unicode_tricky}</p>`, ["html", "shape:unicode"]));

  // Generated combos: tag × attrs × content
  const combos = product3(TAGS, ATTR_SETS, CONTENTS);
  for (const c of combos) {
    out.push(
      fx_html(
        `html__gen__${c.name}`,
        el(c.a, c.b, c.c),
        ["html", "generated", "shape:tag_attr_content"],
      ),
    );
  }

  // A couple “policy probes” (duplicate attrs etc.) — keep separate because behavior is defined-by-you
  out.push(fx_html("html__duplicate_attrs_policy", `<div class="a" class="b">dup</div>`, ["html", "shape:policy", "policy:dup_attrs"]));
  out.push(fx_html("html__uppercase_tags_attrs", `<DIV CLASS="X" data-FOO="Bar">Up</DIV>`, ["html", "shape:policy", "policy:case"]));

  return _freeze(out);
}

// ---------- JSON fixtures ----------
function gen_json_shapes(): readonly Fixture[] {
  const out: Fixture[] = [];

  // primitives: exercise parsing + falsey + number-ish strings
  out.push(fx_json("json__null", json_text(null), ["json", "shape:prim"]));
  out.push(fx_json("json__true", json_text(true), ["json", "shape:prim"]));
  out.push(fx_json("json__false", json_text(false), ["json", "shape:prim"]));
  out.push(fx_json("json__zero", json_text(0), ["json", "shape:prim", "shape:falsey"]));
  out.push(fx_json("json__neg_zero", json_text(-0), ["json", "shape:prim", "shape:falsey"]));
  out.push(fx_json("json__int", json_text(12), ["json", "shape:prim"]));
  out.push(fx_json("json__float", json_text(1.25), ["json", "shape:prim"]));
  out.push(fx_json("json__sci", json_text(1e6), ["json", "shape:prim"]));
  out.push(fx_json("json__empty_str", json_text(""), ["json", "shape:prim", "shape:falsey"]));
  out.push(fx_json("json__ws_str", json_text(" "), ["json", "shape:prim"]));
  out.push(fx_json("json__num_str_0", json_text("0"), ["json", "shape:prim", "shape:num_like_str"]));
  out.push(fx_json("json__num_str_01", json_text("01"), ["json", "shape:prim", "shape:num_like_str"]));
  out.push(fx_json("json__unicode_str", json_text(TXT.unicode_tricky), ["json", "shape:prim", "shape:unicode"]));

  // arrays
  out.push(fx_json("json__arr_empty", json_text([]), ["json", "shape:arr"]));
  out.push(fx_json("json__arr_prims", json_text([0, "0", false, null, true, "x"]), ["json", "shape:arr", "shape:mixed"]));

  // THIS is the “stringified number” class of bug you described:
  // number next to string-number inside an array vs a standalone number property
  out.push(fx_json(
    "json__arr_num_and_numstr",
    json_text([1, "1", 2, "2"]),
    ["json", "shape:arr", "shape:num_vs_str"],
  ));

  out.push(fx_json(
    "json__obj_num_vs_str",
    json_text({ n: 1, s: "1", arr: [1, "1"] }),
    ["json", "shape:obj", "shape:num_vs_str"],
  ));

  // objects
  out.push(fx_json("json__obj_empty", json_text({}), ["json", "shape:obj"]));
  out.push(fx_json("json__obj_falsey_mix", json_text({ a: "", b: 0, c: false, d: null }), ["json", "shape:obj", "shape:falsey"]));
  out.push(fx_json("json__obj_arr", json_text({ a: [1, "2", null] }), ["json", "shape:obj", "shape:arr"]));
  out.push(fx_json("json__obj_obj", json_text({ a: { b: { c: 1 } } }), ["json", "shape:obj", "shape:deep_obj"]));

  // tricky keys
  out.push(fx_json("json__obj_tricky_keys", json_text({
    "sp ace": 1,
    "dash-key": 2,
    "0": "zero",
    "01": "leading",
    "1e3": "sci_key",
    "unicodé": "ok",
  }), ["json", "shape:obj", "shape:keys"]));

  // nested combos
  out.push(fx_json("json__arr_obj_arr", json_text([{ a: 1 }, { b: [2, { c: 3 }] }]), ["json", "shape:nested_combo"]));
  out.push(fx_json("json__deep_combo", json_text({ a: [{ b: { c: [1, 2, { d: "x" }] } }] }), ["json", "shape:nested_combo", "shape:deep"]));

  // “wide” once
  out.push(fx_json("json__wide_obj", json_text({
    a: 1, b: "2", c: true, d: null, e: [1, 2], f: { g: "h" }, i: "", j: false, k: 0, l: "01",
  }), ["json", "shape:wide"]));

  return _freeze(out);
}

// ---------- exported entrypoint ----------
export function gen_transformer_fixtures(): readonly Fixture[] {
  return _freeze([
    ...gen_html_shapes(),
    ...gen_json_shapes(),
  ]);
}