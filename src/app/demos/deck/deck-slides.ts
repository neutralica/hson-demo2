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
export const jsonHtml = hson.fromJson(jsonStub).toHtml().spaced().serialize();

export const SLIDES: readonly DeckSlideConfig[] = [
  {
    headerA: "view === state",
    // headerB: "hson-live / LiveTree",
    // headerC: "LiveTree",
    bodyC: {
      kind: "text",
      text: `
#__#
#__#
### An introduction to HSON, hson-live, and related subsystems.
#__#
#__#
#_50# 24JUN2026     
#_50# Pip Hanson
#_50# www.terminalgothic.com

    `},
    footer: "introduction",
  },
  {
    headerA: "HSON",
    headerB: "hson-live",
    headerC: "LiveTree",
    footer: "terminology",
  },
  {
    headerA: "HSON",
    stackAlign: "center",
    bodyA: {
      kind: "text",
      text: `
### Hypertext Structured Object Notation
HSON is a 'glue format'. By modeling the tree structure shared by JSON and HTML, HSON's syntax can fully express both notations.
#HR#
### By parsing to HSON as intermediary step, HTML can be converted to JSON and vice versa.
#HR#
Uniting two non-interchangeable building blocks of the web suggests new ways of building web content. hson-live demonstrates the potential.
    `,
    },
    footer: "about / HSON",
  },

  /* hson-live */
  {
    headerA: "hson-live",
    bodyA: {
      kind: "text",
      text: `
hson-live is a Typescript library with two core components:
#__#
### hson.transform
converts data to and from HSON
#__#
### hson.liveTree
a web authoring interface built on HSON
`,
    },
    footer: "about / hson-live",
  },
  {
    headerA: "hson.transform",
    bodyA: {
      kind: "text",
      text: `
### The core of hson-live.
A chain of 7 tokenizers, parsers, and serializers convert data to and from HSON. Transformations remain stable across multiple cycles, without structural drift or data loss. hson-live's _circuit_test() diagnostic allows independent verification of the transformer chain for any valid string.
#__#
hson-live supports:
- JSON
- HTML*
- XML
- SVG
- HSON
- HsonNode
#### (* hson-live requires xml-compatible html)
`
    },
    footer: "about / transform",
  },
  {
    headerA: "HTML <=> HSON",
    stackAlign: "center",
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
HSON resembles a pared-down HTML. Instead of opening and closing tags, HSON encloses nested content within a single tag.
#HR#
HSON derived from HTML uses a slash-close:
### />
      `,
    },
    footer: "html -> hson",
  },

  /* json - hson */
  {
    headerA: "JSON <=> HSON",
    stackAlign: "center",
    bodyA: {
      kind: "text",
      text: `
### json:
\`\`\`json
{"name": "Hieronymous"}
\`\`\`
#__#
### hson:
\`\`\`hson
<name "Hieronymous">
\`\`\`
`
    },
    bodyB: {
      kind: "text",
      text: `
  #__#
  HSON can express any valid JSON, usually in a smaller file size.
#HR#
JSON-derived HSON tags use an angle close:
### >
      `,
    },
    footer: "json -> hson",
  },
  {
    headerA: "HTML => HSON => JSON",
    bodyA: {
      kind: "code",
      lang: "html",
      text: htmlStub + "\n\n\n\n\n\n\n\n\n\n\n !!! notice the presence of structural clutter in the json ->",
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
    footer: "html -> json",
  },
  {
    headerA: "JSON => HSON => HTML",
    bodyA: {
      kind: "text",
      text: `
      \`\`\`json
      ${jsonStub}
      \n\n\n\n\n\n\n\n\n\n\n !!! notice the presence of structural clutter in the html ->
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
      text: `
<_-obj>
  <user>
    <_-obj>
    <name>
      <_-obj>
        Mara Bell
      </_-obj>
    </name>
    <timezone>
      <_-obj>
        America/Chicago
      </_-obj>
    </timezone>
    <notifications>
      <_-obj>
        <_-val>true</_-val>
      </_-obj>
    </notifications>
      <_-_-daily_x4c-imit>
        <_-obj>
          <_-val>6</_-val>
        </_-obj>
      </_-_-daily_x4c-imit>
      <_-_-favorite_x43-olors>
        <_-arr>
          <_-ii data-_index="0">green</_-ii>
          <_-ii data-_index="1">black</_-ii>
          <_-ii data-_index="2">ivory</_-ii>
        </_-arr>
      </_-_-favorite_x43-olors>
    </_-obj>
  </user>
</_-obj>
`,
    },
    footer: "json -> html",
  },
  {
    headerA: "hson.liveTree",
    bodyA: {
      kind: "text",
      text: `
### markup + state + styling in a single source of truth
LiveTree is a live web-authoring interface built on HSON. Web content is stored as a HSON node graph, serialized to html, and projected to the DOM. Mutations are made to the underlying node graph and are synced to the DOM in realtime.
LiveTree's chainable API brings markup, CSS, events, SVG, canvas, forms, input, and DOM traversal together in a low-friction typed interface.
`,
    },
    footer: "livetree / about",
  },
  {
    headerA: "LiveTree - example",
    bodyA: {
      kind: "code",
      lang: "ts",
      text: `
const tree = hson.queryBody()                    // Query document.body, deep-parse to HSON.
  .liveTree                                      // Initialize LiveTree creation.
  .graft();                                      // Replace DOM with a projection from the node graph.
                 
const branchDiv = tree.create.div()              // LiveTree offers rich namespace-aware creation methods.
  .setText("hello world")                        // Changes to node graph are immediately updated on-DOM.
  .css.set.backgroundColor("pink");              // Styling available via CSS or inline style attribute.

tree.listen                                      // LiveTree offers listener and event management with options baked-in.
  .once()                                        // Listener teardown is managed automatically upon node removal.
  .onAnimationEnd(() => {                        // Sequenced events and animations are easy to schedule in LiveTree.
    branchDiv.setText("goodbye world")           // Text content, DOM structure, CSS, animations, and event management
      .css.set.backgroundColor(                  //    are all managed in a unified, typed ecosystem.
        liveTree.dom.rect().width > 500          // LiveTree wraps many DOMRect and viewport methods in its API.
        ? "red"                                  // CSS can be dynamically created from JS variables.
        : "blue"                                 
      );                                         // (Conventional selector-based styling is also fully supported.)
  });
`,
    },
    footer: "livetree graft",
  },
  {
    headerA: "LiveTree - features",
    bodyA: {
      kind: "text",
      text: "- node creation/removal, always synced to DOM\n- dynamic, typed CSS using standard JS variables\n- event listener management & teardown\n- animation, keyframes, and @property management & sequencing\n- automated teardown (CSS, listeners, keyframes)\n- native SVG support: creation, mutation, and animation\n- native <canvas> support\n- getComputedStyle, getBoundingClientRect, elementAtPoint (from liveTree.dom)",
    },
    footer: "livetree features",
  },
  {
    headerA: "LiveDemo",
    bodyB: {
      kind: "text",
      text: `
### the first site made entirely with hson-live:
### www.terminalgothic.com

LiveDemo is a test and development environment for hson-live. LiveDemo is a proof-of-concept and demonstration of the claims made here. LiveDemo provides a growing menu of interactive demos showcasing hson-live's capabilities. visitors may run the 1000+ system tests and verify the results for themselves.
LiveDemo is intentionally minimalist in styling.
      `,
    },
    footer: "livedemo",
  },
  {
    headerA: "ty JSMN",
    bodyB: {
      kind: "text",
      text: "### Pip Hanson\nhansonpw@gmail.com\nwww.terminalgothic.com\ngithub.com/neutralica/hson-live\ngithub.com/neutralica/hson-demo2\n",
    },
    footer: "contact / links",
  },
];
