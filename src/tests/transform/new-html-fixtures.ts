// new-fixtures.ts

import { _freeze } from "../../app/demos/test/tests.consts";


const htmlStructureCases: { [key: string]: string } = {
  singleLeaf: `<p>hello</p>`,
  singleNested: `<div><p>hello</p></div>`,
  twoSiblings: `<h2>title</h2><p>body</p>`,
  threeSiblings: `<h1>title</h1><p>one</p><p>two</p>`,
  nestedSiblings: `<section><h2>title</h2><p>one</p><p>two</p></section>`,
  deepNest: `<div><section><article><p>deep</p></article></section></div>`,
  mixedInlineBlock: `<div><p>before <span>inline</span> after</p></div>`,
  listSimple: `<ul><li>one</li><li>two</li></ul>`,
  listNested: `<ul><li>one<ul><li>inner</li></ul></li><li>two</li></ul>`,
  tableSimple: `<table><tr><td>a</td><td>b</td></tr></table>`,
  tableNestedInline: `<table><tr><td><strong>a</strong></td><td><em>b</em></td></tr></table>`,
  headerFooter: `<article><header><h1>x</h1></header><footer><p>y</p></footer></article>`,
  navLinks: `<nav><a href="/a">A</a><a href="/b">B</a></nav>`,
  figureFigcaption: `<figure><img src="x.png"><figcaption>caption</figcaption></figure>`,
  formBasic: `<form><label>Name <input name="n"></label></form>`,
  buttonWithInline: `<button><span>click</span> <strong>me</strong></button>`,
  nestedSectioning: `<main><section><aside><p>note</p></aside></section></main>`,
  emptyElementChild: `<div><span></span><p>after</p></div>`,
  mixedTextNodes: `<p>alpha <strong>beta</strong> gamma <em>delta</em> epsilon</p>`,
  repeatedTagDepth: `<div><div><div><div>deep box</div></div></div></div>`,
};

const htmlAttributeCases: { [key: string]: string } = {
  oneAttr: `<div data-test-id="x">ok</div>`,
  manyAttrs: `<span class="a b" lang="en" dir="ltr" title="hello">text</span>`,
  booleanDisabled: `<button disabled>click</button>`,
  booleanMultiple: `<input type="checkbox" checked disabled required>`,
  emptyAttrValue: `<input value="">`,
  numericAttr: `<ol start="7"><li>seven</li></ol>`,
  dashedAttr: `<div data-user-id="123">user</div>`,
  camelLikeData: `<div data-userName="ph">name</div>`,
  ariaAttrs: `<button aria-label="Close" aria-expanded="false">x</button>`,
  roleAttr: `<nav role="navigation">links</nav>`,
  styleAttrSimple: `<div style="color:red;">red</div>`,
  styleAttrMulti: `<div style="color:red; opacity:.5; --x:12px;">styled</div>`,
  classWhitespace: `<div class="  a   b  c  ">classes</div>`,
  duplicateClassLike: `<div class="a a b">dup classes</div>`,
  quotedSingle: `<input type='text' value='single quotes'>`,
  quotedDouble: `<input type="text" value="double quotes">`,
  attrWithEntity: `<div title="Tom &amp; Jerry">cartoon</div>`,
  attrWithPunctuation: `<div data-note="a,b;c:d/e?f">punct</div>`,
  hrefQuery: `<a href="/search?q=one&amp;lang=en">search</a>`,
  idClassCombo: `<section id="hero" class="panel wide">hero</section>`,
};

const htmlTextEntityCases: { [key: string]: string } = {
  plainText: `<p>basic paragraph</p>`,
  leadingSpace: `<p>  leading</p>`,
  trailingSpace: `<p>trailing  </p>`,
  internalRuns: `<p>a   b   c</p>`,
  newlineInside: `<p>line one
line two</p>`,
  tabInside: `<p>a\tb\tc</p>`,
  entityAmp: `<p>Tom &amp; Jerry</p>`,
  entityLtGt: `<p>&lt;tag&gt;</p>`,
  entityNbsp: `<p>a&nbsp;b</p>`,
  entityQuote: `<p>&quot;quoted&quot;</p>`,
  decimalEntity: `<p>&#169;</p>`,
  hexEntity: `<p>&#x2603;</p>`,
  mixedEntities: `<p>&lt; &amp; &gt; &quot; &#169;</p>`,
  emojiLiteral: `<p>snowman ☃ and sparkles ✨</p>`,
  unicodeAccent: `<p>café naïve jalapeño</p>`,
  textAroundInline: `<p>before <span>middle</span> after</p>`,
  textAroundVoid: `<p>alpha<br>beta</p>`,
  punctuationHeavy: `<p>[a]{b}(c)!?;:"'.,</p>`,
  entityInAttrAndText: `<a href="/?q=fish&amp;chips">fish &amp; chips</a>`,
  mixedWhitespaceInline: `<p>a <strong> b </strong> c</p>`,
};

const htmlVoidCommentCases: { [key: string]: string } = {
  brBare: `<p>one<br>two</p>`,
  brSelfClosing: `<p>one<br/>two</p>`,
  hrBare: `<div>top<hr>bottom</div>`,
  hrExplicitClosed: `<div>top<hr></hr>bottom</div>`,
  imgSimple: `<figure><img src="x.png" alt="x"></figure>`,
  inputSimple: `<form><input name="n"></form>`,
  metaLike: `<div><meta charset="utf-8"><p>after</p></div>`,
  linkLike: `<div><link rel="stylesheet" href="x.css"><p>after</p></div>`,
  commentBefore: `<!-- comment --><p>after</p>`,
  commentAfter: `<p>before</p><!-- comment -->`,
  commentBetween: `<p>one</p><!-- middle --><p>two</p>`,
  commentNestedArea: `<div><!-- inner --><span>x</span></div>`,
  multipleComments: `<!-- a --><!-- b --><p>x</p><!-- c -->`,
  emptyComment: `<!----><p>x</p>`,
  commentWithMarkupText: `<!-- <div>fake</div> --><p>real</p>`,
  imgInMixed: `<p>alpha <img src="x.png" alt="x"> omega</p>`,
  inputInLabel: `<label>name <input name="n"></label>`,
  voidRunTogether: `<div><br><hr><img src="x.png" alt="x"></div>`,
  commentBetweenInline: `<p>a<!-- c -->b<span>x</span><!-- d -->c</p>`,
  voidAtEdges: `<div><br><p>x</p><hr></div>`,
};

const htmlNormalizationCases: { [key: string]: string } = {
  uppercaseTags: `<DIV><P>caps</P></DIV>`,
  mixedCaseTags: `<DiV><SpAn>mixed</SpAn></DiV>`,
  uppercaseAttrs: `<div DATA-ID="x" CLASS="y">caps attrs</div>`,
  selfClosingNonVoid: `<div/>`,
  explicitlyClosedVoid: `<img src="x.png"></img>`,
  optionalCloseP: `<div><p>one<p>two</div>`,
  optionalCloseLi: `<ul><li>one<li>two</ul>`,
  nestedAnchorInvalid: `<a href="/a">outer <a href="/b">inner</a></a>`,
  blockInsideP: `<p>before<div>block</div>after</p>`,
  duplicateAttrName: `<div class="a" class="b">dup attr</div>`,
  missingQuoteRecovery: `<div data-x=test>bare attr</div>`,
  extraWhitespaceAttrs: `<div   class="a"    id="b" >spacey</div>`,
  emptyContainer: `<div></div>`,
  emptySectioning: `<section><article></article></section>`,
  whitespaceOnlyText: `<p>   </p>`,
  siblingRoots: `<p>one</p><p>two</p>`,
  nestedMalformedButCommon: `<table><tr><td>one<td>two</tr></table>`,
  scriptLikeTextButNotScript: `<p>if (a < b && c > d) ok</p>`,
};

const htmlRawTextCases: { [key: string]: string } = {
  scriptSimple: `<script>console.log("x")</script>`,
  scriptWithLt: `<script>if (a < b) console.log("lt");</script>`,
  scriptWithHtmlLike: `<script>const s = "<div>fake</div>";</script>`,
  styleSimple: `<style>body { color: red; }</style>`,
  styleWithComment: `<style>/* x */ .a { opacity: .5; }</style>`,
  textareaSimple: `<textarea>plain text</textarea>`,
  textareaWithEntities: `<textarea>&lt;not markup&gt;</textarea>`,
  textareaWithNewlines: `<textarea>line one
line two</textarea>`,
  preSimple: `<pre>  indented
  lines</pre>`,
  codeInlineLike: `<code>&lt;div&gt;</code>`,
  scriptAdjacent: `<div>before</div><script>1+1</script><div>after</div>`,
  styleAdjacent: `<div>before</div><style>.x{color:red}</style><div>after</div>`,
  textareaAdjacent: `<label>msg<textarea>hello</textarea></label>`,
  preWithInlineChars: `<pre><code>&lt;x&gt;</code></pre>`,
  scriptEmpty: `<script></script>`,
  styleEmpty: `<style></style>`,
  textareaEmpty: `<textarea></textarea>`,
  preEmpty: `<pre></pre>`,
  scriptWithCommentSyntax: `<script>// comment
const x = 1;</script>`,
  styleWithAtRule: `<style>@media screen { .x { display:block; } }</style>`,
};

const HTML_ATTR_ESCAPE_FIXTURES = _freeze({
  plainJsonAttr: `
      <main id="root">
        <div id="t1" data-json='{"token":"abc123"}'></div>
      </main>
    `,

  quotedJsonAttr: `
      <main id="root">
        <div id="t2" data-json="{&quot;token&quot;:&quot;abc123&quot;}"></div>
      </main>
    `,

  cfBeaconLike: `
      <main id="root">
        <script
          id="t3"
          data-cf-beacon='{"token":"216309cffb464db4b0e02daf0b8e8060"}'
        ></script>
      </main>
    `,

  cfBeaconLikeEscaped: `
      <main id="root">
        <script
          id="t4"
          data-cf-beacon="{&quot;token&quot;: &quot;216309cffb464db4b0e02daf0b8e8060&quot;}"
        ></script>
      </main>
    `,

  backslashQuoteRuns: `
      <main id="root">
        <div
          id="t5"
          data-payload='{\"a\":\"x\",\"b\":\"y\"}'
        ></div>
      </main>
    `,

  mixedSlashes: `
      <main id="root">
        <div
          id="t6"
          data-payload='{"path":"C:\\\\temp\\\\file.txt","quote":"\\"hi\\""}'
        ></div>
      </main>
    `,

  rawScriptTextPlusAttr: `
      <main id="root">
        <script
          id="t7"
          data-cf-beacon='{"token":"abc123"}'
        >console.log("x")</script>
      </main>
    `,
});

export const HTML_FIXTURES_NEW = {
  htmlStructureCases,
  htmlNormalizationCases,
  htmlAttributeCases,
  htmlRawTextCases,
  htmlTextEntityCases,
  htmlVoidCommentCases,
  HTML_ATTR_ESCAPE_FIXTURES
}

