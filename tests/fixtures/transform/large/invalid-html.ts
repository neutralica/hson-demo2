
export const json_INVALID = {
  invalidJsonShouldFail: `{"a":1,}`,
}


export const html_INVALID = {
  simple: `<p>INVALID`,
  // Reserved meta on VSN 
  meta_quid_on_vsn: `<_hson_arr hson:quid="000000001"><_hson_ii hson:index="0"><p>one</p></_hson_ii></_hson_arr>`,
  // Empty unquoted value (edge in HTML, observed in the wild)
  empty_unquoted: `<div data-flag=>e</div>`,
  // Valid array indices (contiguous 0..n)
  array_indices_ok: `<_hson_arr>
    <_hson_ii hson:index="0"><p>A</p></_hson_ii>
    <_hson_ii hson:index="1"><p>B</p></_hson_ii>
    <_hson_ii hson:index="2"><p>C</p></_hson_ii>
  </_hson_arr>`,

  // INVALID: non-contiguous indices (should throw)
  array_indices_gap_INVALID: `<_hson_arr>
    <_hson_ii hson:index="0"><p>A</p></_hson_ii>
    <_hson_ii hson:index="2"><p>C</p></_hson_ii>
  </_hson_arr>`,
  // INVALID: VSN with _attrs (only _meta allowed on VSN; _hson_ii may carry index meta)
  vsn_with_attrs_INVALID: `<_hson_ii class="x" hson:index="0"><p>x</p></_hson_ii>`,

  // INVALID: unknown VSN-like tag (starts with '_' but not recognized)
  unknown_vsn_tag_INVALID: `<_hson_foo><p>x</p></_hson_foo>`,

  // Reserved metadata is not valid on a standard tag.
  malformed_attr: `<a href="https://ok" onclick="1" <b>>link</a>`,
  
  invalidSysPrefix: `
      <_-_-main id="root">
        <div id="t1" data-json='{"a":"b"}'></div>
      </_-_-main>
    `,
  meta_index_on_standard: `<div hson:index="7">x</div>`,
};
