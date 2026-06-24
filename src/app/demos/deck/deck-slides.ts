import { hson } from "hson-live";
import type { DeckSlideConfig } from "./deck.types";

export const jsonStub = `
{
  "user": {
    "name": "Mara Bell",
    "timezone": "America/Chicago",
    "notifications": true,
    "dailyLimit": 6,
    "favoriteColors": ["green", "black", "ivory"]
  }
}`;
export const htmlStub = `
<body id="main-page">
  <main class="landing-page open">
    <section data-status="mounted" id="first-section">
      <h1>first section</h1>
    </section>
    <section data-status="waiting" id="second-section">
      <h1>second section</h1>
    </section>
  </main>
</body>
`;

export const htmlHson = hson.fromTrustedHtml(htmlStub).toHson().spaced().serialize();
export const htmlJson = hson.fromTrustedHtml(htmlStub).toJson().serialize();

export const jsonHson = hson.fromJson(jsonStub).toHson().serialize();
export const jsonHtml = hson.fromJson(jsonStub).toHtml().serialize();

export const SLIDES: readonly DeckSlideConfig[] = [
  {
    headerA: "HSON",
    headerB: "hson-live",
    headerC: "LiveTree",
    stackAlign: "center",
  
    footer: "terminology",
  },
  {
    headerA: "HSON",
    stackAlign: "center",
    bodyA: {
      kind: "text",
      text: `
### Hypertext Structured Object Notation
HSON is a 'glue format' that can fully express both JSON and HTML in the same syntax. By parsing to HSON as intermediary step, HTML can be converted to JSON and vice versa.

#__#
Uniting the two non-interchangeable languages of the web suggests interesting new ways of creating interactive web content. hson-live is a Typescript library that explores these possibilities.
    `,
    },
    footer: "HSON",
  },

  /* hson-live */
  {
    headerA: "hson-live",
    bodyA: {
      kind: "text",
      text: `
hson-live is a Typescript library with two core components.
#__#
### hson.transform
a transformer set for converting data to and from HSON
#__#
### hson.liveTree
a web authoring surface built on top of the HsonNode graph`,
    },
    footer: "hson-live",
  },
  {
    headerA: "hson.transform",
    bodyA: {
      kind: "text",
      text: `
hson-live's core is a 7-part circuit of tokenizers, parsers, and serializers for converting data to and from HSON. Transformation integrity is verifiable with hson-live's diagnostic suite, which loops sample data repeatedly and diffs to catch drift.
hson-live supports these formats:
- JSON
- HTML *
- XML
- SVG
- HSON
- HsonNode
#### (* hson-live requires xml-compatible html)
`
    },
    footer: "hson.transform",
  },
  {
    headerA: "HTML <=> HSON",
    stackAlign: "center",
    // stackAlign: "center",
    bodyA: {
      kind: "text",
      text: `
### html: 
\`\`\`html
<div>hello world</div>
\`\`\`

#__#
### hson:
\`\`\`hson
<div "hello world"/>
\`\`\`
`,
    },
    bodyB: {
      kind: "text",
      text: `
#__#
HSON resembes a pared-down syntax of HTML. Instead of separate tags to open and close, HSON contains all node data within a single tag.
#__#
HSON tags derived from HTML are closed with a slash-angle:
### />
      `,
    },
    footer: "transform pair / html + hson",
  },
  
  /* json - hson */
  {
    headerA: "JSON <=> HSON",
    stackAlign: "center",
    bodyA: {
      kind: "text",
      text:`
### json:
\`\`\`json
{"name": "Hieronymous"}
\`\`\`
### hson:
\`\`\`hson
<name "Hieronymous">
\`\`\`
`
    },
    bodyB: {
      kind: "text",
      text: `
HSON derived from JSON is closed with an angle bracket:
>
      `,
    },
    footer: "transform / json + hson",
  },
  {
    headerA: "JSON => HSON => HTML",
    bodyA: {
      kind: "text",
      text: `
      \`\`\`json
      ${jsonStub}
      \`\`\`
      `,
    },
    bodyB: {
      kind: "code",
      lang: "hson",
      text: jsonHson,
    },
    bodyC: {
      kind: "code",
      lang: "html",
      text: jsonHtml,
    },
    footer: "derived projection / json",
  },
  {
    headerA: "HTML => HSON => JSON",
    bodyA: {
      kind: "code",
      lang: "html",
      text: htmlStub,
    },
    bodyB: {
      kind: "code",
      lang: "hson",
      text: htmlHson,
    },
    bodyC: {
      kind: "code",
      lang: "json",
      text: htmlJson,
    },
    footer: "derived projection / html",
  },
  {
    headerA: "hson.liveTree",
    bodyA: {
      kind: "text",
      text: "a web authoring platform built on the HsonNode graph.\n state and view data are united in a single source-of-truth",
    },
    footer: "hson.livetree",
  },
  {
    headerA: "LiveTree",
    bodyA: {
      kind: "code",
      lang: "ts",
      text: `
const tree = hson.queryBody() // (1)
  .liveTree 
  .graft(); // (2)

// (3)
const branchDiv = tree.create.div()
  .setText("hello world")
  // (4)
  .css.set.backgroundColor("pink");

// (5)
tree.listen
.once()
.onClick(() => {
branchDiv.setText("goodbye world")
.css.set.backgroundColor("blue");
});
`,
    },
    bodyB: {
      kind: "text",
      text: `
steps:
1- query document.body and deep-parse it into HSON
2- re-render the HsonNode graph as identical html and project to the DOM via graft()
3- the LiveTree API enables rich DOM manipulation in a frictionless typed ecosystem
4- LiveTree methods act on the underlying node graph, which updates the DOM projection synchronously on mutation
5- event listeners and css animations allow for interactions to be scheduled without relying on stringly typing
`,
    },
    footer: "livetree graft",
  },
  {
    headerA: "LiveTree",
    bodyA: {
      kind: "text",
      text: "### features:\n- node creation/removal, always synced to DOM\n- dynamic, typed CSS using standard JS variables\n- event listener management & teardown\n- animation, keyframes, and @property management & sequencing\n- automated teardown (CSS, listeners, keyframes)\n- native SVG support: creation, mutation, and animation\n- native <canvas> support\n- getComputedStyle, getBoundingClientRect, elementAtPoint (from liveTree.dom)",
    },
    footer: "livetree features",
  },
  {
    headerA: "a new way to create the web?",
    stackAlign: "center",
    bodyA: {
      kind: "text",
      text: "instead of \n\n### `ui = ƒ(state)`\n\n LiveTree proposes a new paradigm:",
    },
    headerB: "ui === state",
    footer: "view === state",
  },
  {
    headerA: "LiveDemo",
    bodyA: {
      kind: "text",
      text: "### the first site ever made entirely with hson-live, LiveDemo showcasing the various ",
    },
    footer: "about livedemo",
  },
  {
    headerA: "v3? LiveMap (WIP)",
    bodyA: {
      kind: "text",
      text: "### fulfilling the other half of the promise:\n state management that automatically links to LiveTree, updating css and content by editing the underlying node graph source-of-truth",
    },
    footer: "v3 / livemap - WIP",
  },
  {
    headerA: "",
    headerB: "",
    bodyA: {
      kind: "text",
      text: "",
    },
    bodyB: {
      kind: "text",
      text: "### ty\n\`\`\`hson\nhansonpw@gmail.com\nwww.terminalgothic.com\ngithub.com/neutralica/hson-live\ngithub.com/neutralica/hson-demo2\n\`\`\`",
    },
    footer: "acknowledgement / contact / links",
  },
];
