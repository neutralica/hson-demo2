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
    stackAlign: "center",
    bodyA: {
      kind: "text",
      text: "### Hypertext Structured Object Notation\na 'glue format' that can fully express any valid JSON and (almost any) valid HTML\n#HR#",
    },
    headerB: "hson-live",
    bodyB: {
      kind: "text",
      text: "a typescript library containing:\n• hson.transform: a transformer set for converting data to and from JSON, HTML, and HSON\n• hson.liveTree: a responsive web authoring surface built on top of a HsonNode graph\n#HR#",
    },
    footer: "HSON / hson-live",
  },
  {
    headerA: "why?",
    stackAlign: "center",
    bodyB: {
      kind: "text",
      text: "### why\n why.",
    },
    bodyA: {
      kind: "image",
      src: "/whah.jpg",
      alt: "whah?",
    },
    footer: "whah",
  },
  {
    headerA: "v1 — hson.transform",
    bodyA: {
      kind: "text",
      text: `
parsers and serializers: accept and output JSON, HTML*, XML, SVG, HSON, and HsonNodes 
      - tokenize_hson (HSON -> tokens)
      - parse_tokens (tokens -> HsonNode)
      - serialize_hson (HsonNode -> HSON)
      - parse_json (JSON -> HsonNode)
      - serialize_json (HsonNode -> JSON)
      - parse_html/parse_xml (HTML -> HsonNode)*
      - serialize_html (HsonNode -> HTML)
transformations are tested stable and lossless across repeated loops

#### (* hson-live requires xml-compatible html)
`
    },
    footer: "v1 / transform",
  },
  {
    headerA: "HTML <=> HSON",
    // stackAlign: "center",
    bodyA: {
      kind: "text",
      text: `
html: 
\`\`\`html
${htmlStub}
\`\`\`

hson:
\`\`\`hson
${htmlHson}
\`\`\`
`,
    },
    bodyB: {
      kind: "text",
      text: `
#HR#
HSON resembes a pared-down syntax of HTML.
Instead of separate tags to open and close, HSON contains all node data within a single tag.
HSON tags derived from HTML are closed with a slash-angle: "/>"
### HTML:  
<tag>content</tag>
### HSON:
<tag "content"/>
#HR#
      `,
    },
    footer: "transform pair / html + hson",
  },
  {
    headerA: "JSON <=> HSON",
    bodyA: {
      kind: "code",
      lang: "json",
      text: jsonStub,

    },
    bodyB: {
      kind: "code",
      lang: "hson",
      text: `${jsonHson}
HSON data sourced from JSON is structured identically to HTML-derived data, but is closed with a slash-angle:
\`\`\`
>
\`\`\`
      `,
    },
    footer: "transform / json + hson",
  },
  {
    headerA: "JSON => HSON => HTML",
    bodyA: {
      kind: "code",
      lang: "json",
      text: jsonStub,
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
    headerA: "v2 — hson.liveTree",
    bodyA: {
      kind: "text",
      text: "a web authoring platform built on the HsonNode graph.\n state and view data are united in a single source-of-truth",
    },
    footer: "hson.livetree",
  },
  {
    headerA: "LiveTree creation",
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
#HR#
1- query document.body and deep-parse it into HSON
2- re-render the HsonNode graph as identical html and project to the DOM via graft()
3- the LiveTree API enables rich DOM manipulation in a frictionless typed ecosystem
4- LiveTree methods act on the underlying node graph, which updates the DOM projection synchronously on mutation
5- event listeners and css animations allow for interactions to be scheduled without relying on stringly typing
#HR#
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
      text: "### explore working demos in the first site ever made entirely with hson-live\n- full hson-live docs & readme\n- over 1000 transformer, livetree, and unit tests\n- proof of concept for LiveTree as an authoring surface for complex interactive web content",
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
