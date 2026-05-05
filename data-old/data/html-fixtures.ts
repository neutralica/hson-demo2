// html-fixtures.ts

// import { html_mdn } from "./html-mdn";

import type { FixtureBundle } from "../../src/tests/tests.types";
import { _freeze } from "../../src/tests/tests.consts";
import { html_gwern } from "./large-fixtures/html-gwern.mock";
import { html_hackerNews } from "./large-fixtures/html-hackernews.mock";
import { html_wikipedia } from "./large-fixtures/html-wikipedia.mock";
import { html_INVALID, json_INVALID } from "./large-fixtures/invalid-html";
import { html_homepage } from "./large-fixtures/json-homepage-string.mock";



const htmlRudiments: { [key: string]: string } = {
  basic: `<p>basic paragraph</p>`,
  withAttribute: `<div data-test-id="attribute-test">div with attribute</div>`,
  withMultipleAttributes: `<span class="multi-attr-test" lang="en">span with multiple attributes</span>`,
  withFlag: `<button class="flag-test" disabled>button with flag</button>`,
  nested: `<div><p>nested paragraph</p></div>`,
  siblings: `<h2>sibling title</h2><p>sibling paragraph</p>`,
  voidSelfClosing: `<p>line one<hr/>line two</p>`,
  voidExplicitlyClosed: `<p>line one<hr></hr>line two</p>`,
  comment: `<!-- comment test --><p>paragraph after comment</p>`,
  mixedContent: `<header>paragraph with <span>mixed content</span> inside</header>`
};


const htmlPlus = {
  elemSimple: `<p>this is body text</p>`,
  container: `<div id="container">
    <p>A paragraph inside a div.</p>
  </div>`,
  siblings: `<article>
    <h2>Title</h2>
    <p>First paragraph.</p>
    <p>Second paragraph.</p>
  </article>`,
  mixed: `<section>
    Intro text <strong>important</strong> followed by more text.
  </section>`,
  void: `<img src="logo.png" alt="Company Logo" data-type="logo"/>`,
  voidSimple: `<img />`,
  void2: `<button></button>`,
  randomAttrs: `<section id="randomAttrs">
  <div randomAttr1="present"></div>
  </section>`,
  randomAttrs2: `<section id="randomAttrs2">
  <div _randomAttr2="uncertain"></div>
  </section>`,

}

const htmlLosesAttrs = {
  elem: `<p class="greeting" active-flag>Hello HSON!</p>`,

  escapedTitle: `
  <section id="profile" data-role="container" style="color:#333; font-size:16px; border-radius:8px; box-shadow:0 4px 6px rgba(0,0,0,.1);">
  <h1 title="He said &quot;hi&quot; — and left">User “Profile” & <> </h1>
  <div class="card">
  <img src="logo.png" alt="Company Logo">
  <input type="checkbox" checked required disabled>
  <br>
  <hr>
  <p data-info="linebreaks&#10;and&#10;tabs">Line 1<br>Line 2</p>
  </div>
  </section>
  `,

  flags: `<section flag1>
    Intro text <strong flag2>important</strong> followed by more text.
  </section>`,
  
  numbers: `<numbers attrskey="just for fun" ok>
    <h2>value numbers:</h2>
    <p>1</p>
    <p>2</p>
    <p>string numbers:
    <string-numbers>
    "1"</string-numbers>
    <string-numbers>
    "2"</string-numbers>
    <string-numbers>
    "3"</string-numbers>
    </p>
  </numbers>`,
}


const htmlLevel3: { [name: string]: string } = {
  // Flags & variants (equivalent forms)
  flagsEquivA: `<input type="text" disabled required checked>`,
  flagsEquivB: `<input type="text" disabled="" required="required" checked="checked">`,

  // Flags that are NOT equivalent (literal value, not equality-style)
  flagLiteralString: `<input type="text" disabled="true">`,

  // Class token dedupe/sort
  classOrderDedupe: `<div class="b a a">x</div>`,

  // Entities in text and attribute
  entitiesTextAndAttr: `<div title="Tom &amp; Jerry &lt;3">Tom &amp; Jerry &lt;3</div>`,

  // Whitespace significance around inline elements
  inlineWhitespace: `<span> a <b>b</b> c </span>`,

  // Reserved meta on standard tag → must land in _meta, not _attrs
  quidTest: `<section data-_quid="abc123">x</section>`,

};

const html_edge_cases: { [name: string]: string } = {
  // 1) Optional end tags + implicit <tbody>, nested lists
  optional_end_tags1: `
    <ul><li>one<li>two<li>three</ul>
  `,
  optional_end_tags2: `
    <table><tr><td>A<td>B</table>
  `,

  // 2) Class tokenization: tabs/newlines/dupes/leading/trailing
  class_tokenize_whitespace: `<div class="  a\tb\nb  a  ">x</div>`,

  // 3) Unquoted attr with tricky chars (allowed in HTML)
  unquoted_attr_ok: `<div data-x=a:b,c.d/e?f=g&h=i#j>y</div>`,

  // 4.5) Attr needing HTML entities vs HSON backslashes
  double_attribute: `<div title="once" titls="twkce">three times a ladyyyyy</div>`,

  // 5) Newlines/tabs in attr (normalize to HTML semantics)
  attr_with_controls: `<p data-info="line1&#10;line2&#9;tabbed">t</p>`,

  // 10) Declarative Shadow DOM / template content
  template_shadow: `<div id="host"><template shadowrootmode="open"><style>h1{color:red}</style><h1>Hi</h1></template></div>`,

  // 11) <template> inert content (should not be parsed as siblings)
  template_inert: `<template id="t"><span data-x="1 &amp; 2">&not-parsed</span></template>`,

  // 14) <noscript> raw-text semantics (when scripting enabled)
  // noscript_raw: `<noscript><div title="&quot;no&quot;">&lt;kept&gt;</div></noscript>`,

  // 15) Boolean attrs variants + literal string false
  boolean_attr_mix: `<input required REQUIRED required="" required="required" required="false">`,

  // 16) Duplicate attrs (seen in the wild; define your policy)
  duplicate_attrs: `<div class="a" class="b" class="a b c">dup</div>`,

  // 17) Uppercase tag/attr names (HTML should lowercase, but content stays)
  uppercase_tags_attrs: `<DIV CLASS="X" data-FOO="Bar">Up</DIV>`,

  // 18) Zero-width & combining characters in text (must round-trip)
  unicode_tricky_text: `<p>e\u0301 = é; ZWJ: 👩‍💻; ZWNJ:\u200Cbetween</p>`,

  // 19) Textarea newline normalization (CRLF vs LF)
  textarea_crlf: `<textarea>Line1\r\nLine2\nLine3</textarea>`,

  style_edge_values: `<div style="background-image:url('a&b.png'); content:'•' !important">x</div>`,
 meta_index_on_standard: `<div data-_index="7">x</div>`,

  // Attribute ordering shouldn’t matter; class tokens reorder too
  attr_order_irrelevant: `<a id="x" class="c b a" href="#">link</a>`,

  // Void handling (confirm serializer form and parse invariants)
  void_img_attrs: `<img src="logo.png" alt="Company Logo" />`,

  // Comment in the middle of inline content (ignored)
  comment_between_inline: `<span>a<!--c-->b</span>`,

  // Unquoted numeric attribute (HTML5-legal)
  unquoted_numeric_attr: `<input value=42>`,
};


const htmlSanitizeFail: { [key: string]: string } = {

  // SVG in HTML (foreign content; camelCase attrs; colon legacy)
  svg_foreign_content: `
    <svg viewBox="0 0 10 10" preserveAspectRatio="xMidYMid meet">
      <use href="#icon"/><!-- legacy: --><use xlink:href="#icon2"/>
      <text xml:space="preserve">A  B</text>
    </svg>
  `,
  badAttrs: `
              <!-- Cloudflare Web Analytics -->
              <script defer="" src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon="{&quot;token&quot;: &quot;216309cffb464db4b0e02daf0b8e8060&quot;}">
              test
              </script>
              <!-- End Cloudflare Web Analytics -->
          `,
  //  CSS custom properties (must stay verbatim with leading --)
  style_custom_props: `<div style="--brand: #0a0; color: var(--brand); --WeIrD-Name: 1">c</div>`,
  //  CSS value edge cases: url(), quotes, !important
  style_edge_values_2: `<div style="background:url('a&b.png?q=1,2'); content: '\\'•\\'' !important">s</div>`,
  //  Script raw-text: contains </script> sequence (must be neutralized on emit)
  script_early_close: `<script>var x = "</scr" + "ipt>"; // keep literal</script>`,
  // Style raw-text: preserve whitespace/indentation exactly
  style_raw_whitespace: `
      <style>
        :root {
          --x: 1;
          /* keep tabs */\t.tab { color: red }
        }
        </style>
  `,
  // SVG/MathML entry (kept forbidden unless you later add a strict subset)
  svg_with_script: `<svg><script>alert(1)</script></svg>`,
  mathml_root: `<math><mi>x</mi></math>`,
  // srcset with commas/spaces (tokenization pitfalls)
  img_srcset: `<img srcset="a-1x.png 1x, a-2x.png 2x, a 3x.png 3x" sizes="(max-width: 600px) 480px, 800px">`,
  // Style attribute with semicolons, url(), parentheses
  style_complex: `<div style="background:url(data:image/svg+xml;utf8,<svg></svg>); border:1px solid #000; padding:0 10px;">s</div>`,
  //  MathML in HTML
  mathml_basic: `<math><mrow><mi>a</mi><mo>=</mo><msqrt><mi>b</mi></msqrt></mrow></math>`,
  // Style normalization: mixed casing, kebab vs camel, order
  styleMixedKeys: `<div style="borderRadius:8px; FONT-SIZE:16px; box-shadow:0 1px 2px #000">x</div>`,
  // Style edge values: url with &, quoted content, !important
  styleEdgeValues: `<div style="background-image:url('a&amp;b.png'); content:'•' !important">x</div>`,

  // SVG path — spaced, conservative (should pass everywhere)
  svg_path_spaced: `
    <svg viewBox="-50 -50 100 100" xmlns="http://www.w3.org/2000/svg">
      <path id="p1" d="M 0 -28 C 10 -12 10 8 0 22 C -10 8 -10 -12 0 -28 Z" fill="red"/>
    </svg>
  `,

  // SVG path — commas + spaces (also safe)
  svg_path_commas: `
    <svg viewBox="-50 -50 100 100" xmlns="http://www.w3.org/2000/svg">
      <path id="p2" d="M 0,-28 C 10,-12 10,8 0,22 C -10,8 -10,-12 0,-28 Z" fill="green"/>
    </svg>
  `,

  //  SVG path — compact “sign as separator” (valid SVG, stresses tokenizer)
  svg_path_compact_signsep: `
    <svg viewBox="-50 -50 100 100" xmlns="http://www.w3.org/2000/svg">
      <path id="p3" d="M0-28C10-12108 022C-108-10-120-28Z" fill="blue"/>
    </svg>
  `,

  // SVG path — decimals without leading zero
  svg_path_leadingless_decimals: `
    <svg viewBox="-1 -1 2 2" xmlns="http://www.w3.org/2000/svg">
      <path d="M .5 -.5 L -.25 .25 Z" stroke="black" fill="none"/>
    </svg>
  `,

  // SVG path — scientific notation
  svg_path_exponent: `
    <svg viewBox="-120 -120 240 240" xmlns="http://www.w3.org/2000/svg">
      <path d="M 1e2 -1e2 L 5e-1 -5e-1 Z" stroke="black" fill="none"/>
    </svg>
  `,
  // Namespaced attribute (xlink:href); legacy but still seen in the wild
  svg_namespaced_attr: `
    <svg viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <defs><circle id="dot" r="1"/></defs>
      <use xlink:href="#dot" x="5" y="5" fill="purple"/>
    </svg>
  `,

  trickyEscapes: `
    <main>
    <div>
    here\/\n is a th\ing\/ wi/t/h not quotes
    </div>
    <div>
    'here is a thing with quotes'
    </div>
    </main>`,
  style: `
             <div id="profile-card" style="color: #333; font-size: 16px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    User Profile
  </div>
          `,

  form: `
    <form action="/register" method="post" enctype="multipart/form-data" novalidate>
    <fieldset>
      <legend>User Registration</legend>
  
      <label for="username">Username:</label>
      <input type="text" id="username" name="username" placeholder="At least 8 characters" required>
  
      <label for="country">Country:</label>
      <select id="country" name="country">
        <optgroup label="North America">
          <option value="us">United States</option>
          <option value="ca" selected>Canada</option>
        </optgroup>
        <optgroup label="Europe" disabled>
          <option value="gb">United Kingdom</option>
        </optgroup>
      </select>
  
      <label for="bio">Biography:</label>
      <textarea id="bio" name="bio" rows="4">A default biography.
  With a line break.</textarea>
  
      <fieldset>
        <legend>Account Type</legend>
        <input type="radio" id="type_free" name="account_type" value="free" checked>
        <label for="type_free">Free</label>
        <input type="radio" id="type_premium" name="account_type" value="premium">
        <label for="type_premium">Premium</label>
      </fieldset>
  
      <label>
        <input type="checkbox" name="terms" required checked>
        I agree to the terms and conditions.
      </label>
  
      <input type="hidden" name="session_token" value="abc123xyz">
      
      <button type="submit" disabled>Register</button>
    </fieldset>
  </form>
  `,



}

// ✅ SHOULD PASS: preserved/normalized by sanitize_external + CSSOM-at-runtime
const html_should_pass: { [name: string]: string } = {
  // 1) Unknown-but-benign tags (arbitrary schema-ish/keys)
  arbitrary_keys_1: `<brand><name>ACME</name><line>Series X</line></brand>`,

  // 2) Custom UI elements you use
  custom_elements_ui: `<sky-back><cloudy-sky><cloud id="c1"></cloud></cloudy-sky></sky-back>`,

  // 3) Modern HTML tags that aren’t always in tiny allowlists
  details_summary: `<details open><summary>More</summary><p>Hidden text</p></details>`,

  // 4) data-* passthrough + aria attributes
  data_and_aria: `<div data-x="1" data-user="alice" role="button" aria-expanded="false">x</div>`,

  // 5) Safe URL schemes
  safe_urls: `<div><a href="https://example.com">go</a><a href="mailto:a@b">mail</a><a href="tel:+123">call</a></div>`,

  // 6) Safe data URL for images
  data_image_ok: `<img alt="dot" src="data:image/png;base64,iVBORw0KGgo=" loading="lazy">`,

  // 7) srcset with multiple image candidates
  img_srcset_ok: `<img src="https://cdn.site/a.png" srcset="https://cdn.site/a@2x.png 2x, https://cdn.site/a@3x.png 3x" alt="">`,

  // 8) target=_blank will be normalized at runtime to add rel (your setter ensures it)
  target_blank_ok: `<a href="https://example.com" target="_blank">new tab</a>`,

  // 9) Boolean attributes normalize to presence/absence
  boolean_attrs: `<input type="checkbox" checked> <button disabled>btn</button>`,

  // 10) Nested lists + optional end tags (parser quirks)
  optional_end_tags2: `<ul><li>one<li>two<li>three<ul><li>sub</ul></ul>`,

  // 11) Class tokenization edge cases (duplicates/whitespace)
  class_tokenize_whitespace: `<div class="  a\tb\nb  a  ">x</div>`,

  // 12) Unquoted attribute with special chars (valid HTML)
  unquoted_attr_ok: `<div data-x=a:b,c.d/e?f=g&h=i#j>y</div>`,

  // 13) Unknown tags mixed with standard
  mixed_unknown_standard: `<info><status>ok</status><meta2>noop</meta2><p>para</p></info>`,

  // 14) Benign inline <span> with safe attrs (no style, no handlers)
  harmless_inline: `<p>hello <span id="s" title="t">world</span></p>`
};

// ❌ SHOULD FAIL: stripped/blocked by sanitize_external and/or set_attrs_safe
const html_problematic: { [name: string]: string } = {
  // 1) Script tag outright
  script_tag: `<div>hi</div><script>alert(1)</script>`,

  // 2) Inline event handler
  onclick_handler: `<button onclick="alert(1)">click</button>`,

  // 3) javascript: URL in href
  js_url_href: `<a href="javascript:alert(1)">x</a>`,

  // 4) javascript: token inside srcset
  js_in_srcset: `<img src="x" srcset="javascript:alert(1) 1x">`,

  // 5) style attribute (blocked at attribute layer; runtime styling must use CSSOM)
  inline_style_attr: `<div style="color:red;transform:rotate(45deg)">x</div>`,

  // 6) style attribute with url()
  inline_style_url: `<div style="background:url(//evil.example/x)">x</div>`,

  // 7) Dangerous platform containers
  iframe_with_src: `<iframe src="https://evil.example/x"></iframe>`,
  object_embed: `<object data="https://evil.example/x"></object><embed src="y.swf">`,

  // 8) Base/meta/link injection (rewrites/affects document)
  base_tag: `<base href="https://evil.example/">`,
  meta_injection: `<meta http-equiv="refresh" content="0;url=https://evil.example/">`,
  link_injection: `<link rel="preload" as="script" href="https://evil.example/x.js">`,

  // 9) srcdoc attribute (inline HTML inside an iframe)
  iframe_srcdoc: `<iframe srcdoc="<p>hi</p>"></iframe>`,


  // 11) Malformed + handler


  // 12) Protocol-relative URL in style (should be blocked along with style attr)
  style_protocol_relative: `<div style="background-image:url(//cdn.example/a.png)">x</div>`,

  // 13) Form surface (if you keep form in hard-forbid)
  form_injection: `<form action="/do"><input name="x" value="1"></form>`,

  // 14) Video/audio tags (if you keep them in hard-forbid for now)
  media_tags: `<video src="movie.mp4" controls></video><audio src="a.ogg" controls></audio>`
};

const htmlAttributeCases: { [key: string]: string } = {
  // 1) Unquoted attr with many legal chars (HTML rules)
  unquoted_attr_symbols: `<div data-x=a:b,c.d/e?f=g&h=i#j>ok</div>`,

  // 2) Mixed quoting and spaces around '='; empty value; entity inside
  // mixed_quotes_spaces: `<input  data-a = "A &amp; B"  data-b='B "quote"'  data-empty=""  placeholder='say "hi"' >`,

  // 3) Boolean/flag attributes (present = true)
  boolean_attrs: `<button disabled autofocus>go</button>`,

  // 4) Class tokenization: tabs/newlines/dupes/leading/trailing
  class_tokenize: `<div class="  a\tb\nb  a  ">x</div>`,

  // 6) Attribute with '>' inside quoted value
  gt_in_value: `<div data-text="2 > 1 &amp; 3 > 2">y</div>`,

  // 7) Attribute with single-quoted JSON-like string
  jsonish_in_attr: `<div data-json="{'ok':'true','n':3,'s':'a:b;c'}">z</div>`,

  // 14) Attribute with escaped quotes via entity (robust quoted-value scan)
  // quote_entities: `<div data-q="&quot;hello&quot; 'world'">q</div>`,

  // 15) Upper/lower/duplicate attribute names (first-wins semantics)
  duplicate_attrs_first_wins: `<input TYPE="text" type="password" value="x">`,

  // 16) Weird-but-allowed spacing in tags/attrs
  weird_spacing: `<div    data-a =  "1"    data-b=2    data-c =3  >w</div>`,

  // 17) Attribute containing commas/semicolons/colons that should not split
  punctuation_value: `<meta http-equiv="refresh" content="0; url=https://example.com?a=1,2;mode:x">`,


  // 18) Unicode in attribute names and values
  unicode_attrs: `<div data–en-dash="–" lang="ja" title="ひらがな">u</div>`,

  // 19) Entity + URL mix inside quoted attribute
  attr_url_mix: `<a href="https://example.com/?q=Tom&amp;Jerry&ref=mail">link</a>`
};



export const HTML_FIXTURES_LEGACY = _freeze({
  html__rudiments: htmlRudiments,
  html_plus: htmlPlus,
  html__level3: htmlLevel3,
  html__edgeCases: html_edge_cases,
  html__shouldPass: html_should_pass,
  html__attributeCases: htmlAttributeCases,
  html__problematic:html_problematic,
  html__largeFormat: {
    html_homepage,
    html_wikipedia,
    html_hackerNews,
    html_gwern,
  },
  
} satisfies FixtureBundle);

export const TRANSFORM_FAILS = {
  html_INVALID, // expect errors
  json_INVALID,  
}