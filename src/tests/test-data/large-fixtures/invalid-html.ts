
export const json_INVALID = {
  invalidJsonShouldFail: `{"a":1,}`,
}


export const html_INVALID = {
  simple: `<p>INVALID`,
  // Reserved meta on VSN 
  meta_quid_on_vsn: `<_hson_arr data-_quid="0000000000000001"><_hson_ii data-_index="0"><p>one</p></_hson_ii></_hson_arr>`,
  // Empty unquoted value (edge in HTML, observed in the wild)
  empty_unquoted: `<div data-flag=>e</div>`,
  // Valid array indices (contiguous 0..n)
  array_indices_ok: `<_hson_arr>
    <_hson_ii data-_index="0"><p>A</p></_hson_ii>
    <_hson_ii data-_index="1"><p>B</p></_hson_ii>
    <_hson_ii data-_index="2"><p>C</p></_hson_ii>
  </_hson_arr>`,

  // INVALID: non-contiguous indices (should throw)
  array_indices_gap_INVALID: `<_hson_arr>
    <_hson_ii data-_index="0"><p>A</p></_hson_ii>
    <_hson_ii data-_index="2"><p>C</p></_hson_ii>
  </_hson_arr>`,
  // INVALID: literal _hson_elem must not appear in HTML
  literal__elem_INVALID: `<_hson_elem><p>x</p></_hson_elem>`,

  // INVALID: VSN with _attrs (only _meta allowed on VSN; _hson_ii may carry index meta)
  vsn_with_attrs_INVALID: `<_hson_ii class="x" data-_index="0"><p>x</p></_hson_ii>`,

  // INVALID: unknown VSN-like tag (starts with '_' but not recognized)
  unknown_vsn_tag_INVALID: `<_hson_foo><p>x</p></_hson_foo>`,

  // Reserved meta “looks like attr” on standard tag: must map to _meta['data-index'] (not _attrs)
  malformed_attr: `<a href="https://ok" onclick="1" <b>>link</a>`,
  
  invalidSysPrefix: `
      <_-_-main id="root">
        <div id="t1" data-json='{"a":"b"}'></div>
      </_-_-main>
    `,
};
