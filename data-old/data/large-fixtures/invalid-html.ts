
export const json_INVALID = {
  invalidJsonShouldFail: `{"a":1,}`,
}


export const html_INVALID = {
  simple: `<p>INVALID`,
  // Reserved meta on VSN 
  meta_quid_on_vsn: `<_-arr data-_quid="qqq"><_-ii data-_index="0"><p>one</p></_-ii></_-arr>`,
  // Empty unquoted value (edge in HTML, observed in the wild)
  empty_unquoted: `<div data-flag=>e</div>`,
  // Valid array indices (contiguous 0..n)
  array_indices_ok: `<_-arr>
    <_-ii data-_index="0"><p>A</p></_-ii>
    <_-ii data-_index="1"><p>B</p></_-ii>
    <_-ii data-_index="2"><p>C</p></_-ii>
  </_-arr>`,

  // INVALID: non-contiguous indices (should throw)
  array_indices_gap_INVALID: `<_-arr>
    <_-ii data-_index="0"><p>A</p></_-ii>
    <_-ii data-_index="2"><p>C</p></_-ii>
  </_-arr>`,
  // INVALID: literal _-elem must not appear in HTML
  literal__elem_INVALID: `<_-elem><p>x</p></_-elem>`,

  // INVALID: VSN with _attrs (only _meta allowed on VSN; _-ii may carry index meta)
  vsn_with_attrs_INVALID: `<_-ii class="x" data-_index="0"><p>x</p></_-ii>`,

  // INVALID: unknown VSN-like tag (starts with '_' but not recognized)
  unknown_vsn_tag_INVALID: `<_-foo><p>x</p></_-foo>`,

  // Reserved meta “looks like attr” on standard tag: must map to _meta['data-index'] (not _attrs)
  malformed_attr: `<a href="https://ok" onclick="1" <b>>link</a>`,
  
  invalidSysPrefix: `
      <_-_-main id="root">
        <div id="t1" data-json='{"a":"b"}'></div>
      </_-_-main>
    `,
};
