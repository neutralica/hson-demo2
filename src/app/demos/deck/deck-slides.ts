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

export const htmlHson = hson.fromTrustedHtml(htmlStub).toHson().serialize();
export const htmlJson = hson.fromTrustedHtml(htmlStub).toJson().serialize();

export const jsonHson = hson.fromJson(jsonStub).toHson().serialize();
export const jsonHtml = hson.fromJson(jsonStub).toHtml().serialize();

export const SLIDES: readonly DeckSlideConfig[] = [
  {
    headerA: "HSON",
    stackAlign: "center",
    bodyA: {
      kind: "text",
      text: "### Hypertext Structured Object Notation\na 'glue format' that unites JSON and HTML",
    },
    headerB: "hson-live",
    bodyB: {
      kind: "text",
      text: "### a typescript library containing:\n• hson.transform: a transformer set for converting data to and from JSON, HTML, and HSON\n• hson.liveTree: a responsive web authoring surface built on top of a HsonNode graph",
    },
    footer: "HSON / hson-live",
  },
  {
    headerA: "why?",
    stackAlign:"center",
    bodyB: {
      kind: "text",
      text: "### why \n why.",
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
seven parsers and serializers that convert any json or xml-valid html to HsonNodes
      - tokenize_hson (HSON -> tokens)
      - parse_tokens (tokens -> HsonNode)
      - serialize_hson (HsonNode -> HSON)
      - parse_json (JSON -> HsonNode)
      - serialize_json (HsonNode -> JSON)
      - parse_html/parse_xml (HTML -> HsonNode) *
      - serialize_html (HsonNode -> HTML)
transformations are stable and lossless. data can loop through the full chain repeatedly without degradation or distortion of user data

(* hson can only parse xml-compatible html)
`
    },
    footer: "v1 / transform",
  },
  {
    headerA: "HSON — syntax and relation",
    bodyA: {
      kind: "text",
      text: `
### json input:
\`\`\`json
${jsonStub}
\`\`\`
### hson output:
\`\`\`hson
 ${jsonHson}
  \`\`\`
`,
    },
    bodyB: {
      kind: "text",
      text: `
### html input:
      \`\`\`html\n${htmlStub}\n\`\`\`
### hson output:
    \`\`\`hson\n${htmlHson}\n\`\`\`
`,
    },
    footer: "json / hson / html",
  },
  {
    headerA: "HTML <=> HSON",
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
      text: jsonHson,
    },
    footer: "transform / json + hson",
  },
  {
    headerA: "JSON <=> HSON <=> HTML",
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
    headerA: "HTML <=> HSON <=> JSON",
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
      text: "a web authoring platform built on the HsonNode graph\n state and view data are united in a single source-of-truth",
    },
    footer: "hson.livetree",
  },
  {
    headerA: "LiveTree - Internals",
    bodyA: {
      kind: "code",
      lang: "ts",
      text: "hson.liveTree.fromHTML()\nhson.liveTree.queryBody()",
    },
    bodyB: {
      kind: "text",
      text: "1: parse <body> and all child nodes to HsonNodes (must be xml compatible)\n2: replaces it with identical HTML projection projected from HsonNode graph\n3: return handle for node graph interface\n changes and mutations to the graph are reflected in realtime on-DOM",
    },
    footer: "livetree / internals",
  },
  {
    headerA: "LiveTree - example",
    bodyA: {
      kind: "code",
      lang: "ts",
      text: `
const tree = hson.queryBody() // document.body
.liveTree // initialize LiveTree creation
.graft(); // replace document.body with identical LiveTree projection

  // LiveTree extends many basic JS document methods
const branchDiv = tree.create.div()
    .setText("hello world")
     // methods return \`this\`, enabling complex chained operations
    .css.set.backgroundColor("pink");

// liveTree's ListenerManager exposes event listeners and handling
tree.listen
   // listener teardown/cleanup occurs automatically on node removal
  .once()
   // event listener options are fully represented in liveTree's .listen toolchain
  .onClick(() => {
       // changes to the node graph are rendered to the DOM in realtime
      branchDiv.setText("goodbye world")
          .css.set.backgroundColor("blue");
});
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
