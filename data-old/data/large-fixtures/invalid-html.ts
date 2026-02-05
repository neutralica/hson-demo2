// bulk-samples.mock.hson-showcase.ts

export const html_INVALID = {
  simple: `<p>INVALID`,
  // Reserved meta on VSN 
  meta_quid_on_vsn: `<_array data-_quid="qqq"><_ii data-_index="0"><p>one</p></_ii></_array>`,

  // Valid array indices (contiguous 0..n)
  array_indices_ok: `<_array>
    <_ii data-_index="0"><p>A</p></_ii>
    <_ii data-_index="1"><p>B</p></_ii>
    <_ii data-_index="2"><p>C</p></_ii>
  </_array>`,

  style_edge_values: `<div style="background-image:url('a&b.png'); content:'•' !important">x</div>`,

  // INVALID: non-contiguous indices (should throw)
  array_indices_gap_INVALID: `<_array>
    <_ii data-_index="0"><p>A</p></_ii>
    <_ii data-_index="2"><p>C</p></_ii>
  </_array>`,
  // INVALID: literal _elem must not appear in HTML
  literal__elem_INVALID: `<_elem><p>x</p></_elem>`,

  // INVALID: VSN with _attrs (only _meta allowed on VSN; _ii may carry index meta)
  vsn_with_attrs_INVALID: `<_ii class="x" data-_index="0"><p>x</p></_ii>`,

  // INVALID: unknown VSN-like tag (starts with '_' but not recognized)
  unknown_vsn_tag_INVALID: `<_foo><p>x</p></_foo>`,

  // Reserved meta “looks like attr” on standard tag: must map to _meta['data-index'] (not _attrs)
  meta_index_on_standard: `<div data-_index="7">x</div>`,

  // Attribute ordering shouldn’t matter; class tokens reorder too
  attr_order_irrelevant: `<a id="x" class="c b a" href="#">link</a>`,

  // Void handling (confirm serializer form and parse invariants)
  void_img_attrs: `<img src="logo.png" alt="Company Logo" />`,

  // Comment in the middle of inline content (ignored)
  comment_between_inline: `<span>a<!--c-->b</span>`,

  // Unquoted numeric attribute (HTML5-legal)
  unquoted_numeric_attr: `<input value=42>`,
  
  malformed_attr: `<a href="https://ok" onclick="1" <b>>link</a>`,
};