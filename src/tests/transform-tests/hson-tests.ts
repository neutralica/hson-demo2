
const hsonTestsA = {
    a: `<img alt="x" style="
color: red; font-size: 10px
"/>`,
    1: `<figure
  <img alt="x" src="x.png"/>
/>`,
    c: `<img alt="x" style="color: red;
font-size: 10px
"/>`,
    2: `<figure
  <img alt="x" style="color: red; font-size: 10px"/>
/>`,
    3: `<figure
  <img alt="x" style="color: red;
  font-size: 10px
  "/>
/>`,
    4: `<figure
  <img alt="x" style="
  color: red; font-size: 10px"/>
/>`,
    5: `<figure
  <img alt="x" style="
  color: red;
  font-size: 10px"/>
/>`,
    6: `<figure
  <img alt="x" style="
  color: red;
  font-size: 10px
  "/>
/>`,
};

const hsonShouldFail: Record<string, string> = {
  // ----------------------------
  // bare structural garbage
  // ----------------------------

  just_angles: `><`,
  lone_open_angle: `<`,
  lone_close_angle: `>`,
//   empty_tag_open: `<>`,
  empty_tag_close: `</>`,

  // ----------------------------
  // malformed tag names
  // ----------------------------

  missing_tag_name: `< />`,
  space_after_open_before_name: `< div/>`,
  equals_as_tag_name: `<=>`,
  quote_as_tag_name: `<"x"/>`,

  // ----------------------------
  // bad attribute assignment
  // ----------------------------

  empty_assignment: `<div id=/>`,
  empty_assignment_spaced: `<div id= />`,
  double_equals: `<div id==\"x\"/>`,
  assignment_no_name: `<div =\"x\"/>`,
  assignment_no_value_then_attr: `<div id= class=\"x\"/>`,

  // ----------------------------
  // bad quoting
  // ----------------------------

  single_quoted_text: `<div 'hi'/>`,
  single_quoted_attr: `<div id='x'/>`,
  unclosed_double_quote_attr: `<div id="x/>`,
  mismatched_quotes_attr: `<div id="x'/>`,
  stray_quote_run: `<div """"""/>`,

  // ----------------------------
  // stray text in tag header
  // ----------------------------

  bare_word_in_header: `<div hello/>`,
  quoted_word_in_header: `<div "hello"/>`,
  stray_text_after_attr: `<div id="x" hello/>`,

  // ----------------------------
  // malformed closing / self-close
  // ----------------------------

  bad_self_close: `<div //>`,
  split_self_close: `<div / >`,
  extra_close_marker: `<div />>`,
  extra_open_marker: `<<div/>`,
  extra_close_angle: `<div/>>`,

  // ----------------------------
  // malformed nesting
  // ----------------------------

  child_before_header_closed: `<div <span/>/>`,
  attr_then_child_before_close: `<div id="x" <span/>/>`,
  orphan_child_close: `</span>`,
  extra_parent_close: `<div/></div>`,

  // ----------------------------
  // bad text/content placement
  // ----------------------------

  content_then_header_attr: `<div "hi" id="x"/>`,
  content_then_flag: `<div "hi" disabled/>`,
  content_then_second_content: `<div "a" "b"/>`,

  // ----------------------------
  // newline/termination variants
  // ----------------------------

  newline_after_equals: `<div id=\n/>`,
  newline_inside_unclosed_quote: `<div id="x\n/>`,
};









export const HSON_FIXTURES = {
    hson: hsonTestsA,
    negative: hsonShouldFail
};

