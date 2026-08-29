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
    headerA: "view == state",
    // headerB: "hson-live / LiveTree",
    // headerC: "LiveTree",
    stackAlign: "center",
    bodyC: {
      kind: "text",
      text:
        `
#__#
#__#
### An introduction to Hson, hson-live, and related subsystems.
#__#
#__#
#_50# 24JUN2026
#_50# Pip Hanson
#_50# www.terminalgothic.com

`
    },
    footer: "introduction",
  },
  {
    // stackAlign: "center",
    stackAlign: "center",
    headerA: "Hson",
    bodyA: {
      kind: "text", text: `
### a 'glue format' that expresses both JSON and HTML
#HR#
      ` },
    headerB: "hson-live",
    bodyB: { kind: "text", text: "### a TypeScript library with four subsystems:" },
    bodyC: { kind: "text", text: "### Transform • LiveTree • LiveMap • Locus" },
    footer: "terminology",
  },
  {
    headerA: "Hson",
    stackAlign: "center",
    bodyA: {
      kind: "text",
      text: `
### Hypertext Structured Object Notation
Hson is a 'glue format'. Its syntax models the tree structure shared by JSON and HTML and can fully express both notations.
#HR#
### By parsing to Hson as intermediary step, HTML can be converted to JSON and vice versa.
#HR#
Uniting two non-interchangeable building blocks of the web suggests new ways of building web content. This is the key insight that powers hson-live.
    `,
    },
    footer: "about / Hson",
  },

  /* hson-live */
  {
    headerA: "hson-live",
    bodyA: {
      kind: "text",
      text: `
### hson.transform
converts JSON and XML/HTML/SVG to and from Hson
#__#
### hson.liveTree
web-authoring & rendering interface via projection from canonical Hson document
`,
    },
    bodyB: {
      kind: "text",
      text: `
### hson.liveMap
application state machine and Hson graph editor
#__#
### hson.locus
server-side authority, coordination, history, and recovery
`,
    },
    footer: "about / hson-live",
  },
  {
    stackAlign: "center",
    headerA: "hson.transform",
    bodyA: {
      kind: "text",
      text: `
### The core of hson-live
A circuit of parsers and serializers that convert data to and from Hson. Transformations are stable across multiple cycles, without structural drift or data loss. hson-live's _circuit_test() diagnostic allows independent verification of the transformer chain for any valid string.
hson-live supports:
- JSON
- HTML*
- XML
- SVG
- Hson
- HsonNode
#### (* hson-live requires xml-compatible html)
`
    },
    footer: "about / transform",
  },
  {
    headerA: "HTML <=> Hson",
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
Hson resembles pared-down HTML. Instead of opening and closing tags, Hson encloses nested content within a single tag.
#__#
Hson can express any XML-compliant HTML. Hson derived from HTML uses a slash-closer:
### />
      `,
    },
    footer: "html -> hson",
  },

  /* json - hson */
  {
    headerA: "JSON <=> Hson",
    stackAlign: "center",
    bodyA: {
      kind: "text",
      text: `
### json:
\`\`\`json
{"display name": "Hieronymous"}
\`\`\`
#__#
### hson:
\`\`\`hson
<'display name' "Hieronymous">
\`\`\`
`
    },
    bodyB: {
      kind: "text",
      text: `
  #__#
Hson can express any valid JSON. It shares JSON’s primitive types and numeric edges exactly, making conversion structurally direct and type-preserving.
#__#
JSON-derived Hson object values use an angle closer:
### >
      `,
    },
    footer: "json -> hson",
  },
  {
    headerA: "HTML => Hson => JSON",
    bodyA: {
      kind: "code",
      lang: "html",
      text: htmlStub + "\n\n\n\n\n\n\n\n\n\n\n<!-- notice the structural clutter in the json -->",
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
    headerA: "JSON => Hson => HTML",
    bodyA: {
      kind: "text",
      text: `
      \`\`\`json
      ${jsonStub}
      \n\n\n\n\n\n\n\n\n\n\n// notice the structural clutter in the html ->
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
<_hson_obj>
  <user>
    <_hson_obj>
    <name>
      <_hson_obj>
        Mara Bell
      </_hson_obj>
    </name>
    <timezone>
      <_hson_obj>
        America/Chicago
      </_hson_obj>
    </timezone>
    <notifications>
      <_hson_obj>
        <_hson_val>true</_hson_val>
      </_hson_obj>
    </notifications>
      <_-_-daily_x4c-imit>
        <_hson_obj>
          <_hson_val>6</_hson_val>
        </_hson_obj>
      </_-_-daily_x4c-imit>
      <_-_-favorite_x43-olors>
        <_hson_arr>
          <_hson_ii hson:index="0">green</_hson_ii>
          <_hson_ii hson:index="1">black</_hson_ii>
          <_hson_ii hson:index="2">ivory</_hson_ii>
        </_hson_arr>
      </_-_-favorite_x43-olors>
    </_hson_obj>
  </user>
</_hson_obj>
`,
    },
    footer: "json -> html",
  },
  {
    headerA: "hson.liveTree",
    bodyA: {
      kind: "text",
      text: `
### markup + styling + interaction in one live graph
LiveTree is a live web-authoring interface built on Hson. Web content is represented as a Hson node graph and projected to the DOM. Mutations are made to the Hson graph and reflected to the DOM in realtime.

LiveTree's chainable API brings markup, CSS, events, SVG, canvas, forms, input, and DOM traversal together in a low-friction typed interface.

Used alone, LiveTree offers a complete local live-document runtime. Integrated with LiveMap, it gains a schema-enforced Hson graph editor and state layer with revisioned commit history, "Reflection" (live bindings), and subscriptions.
`,
    },
    footer: "livetree / about",
  },

  {
    headerA: "LiveTree API",
    bodyB: {
      kind: "code",
      lang: "ts",
      text: `
// this example wraps DOM creation, EventListeners, CSS, inline style, and box-property geometry into a single chained call


const button = hson.queryBody()                    // Query document.body, deep-parse to Hson.
  .liveTree                                        // Initialize LiveTree creation.
  .graft()                                         // Replace DOM with a projection from the node graph.
  .create.div()                                    // LiveTree offers rich namespace-aware creation methods.
  .setText("hello world")                          // Changes to node graph are immediately updated on-DOM.
  .css.set.backgroundColor("pink");                // Styling available via CSS or inline style attribute.
  .listen                                          // LiveTree offers listener and event management with options baked-in.
    .once()                                        // Listener teardown is managed automatically upon node removal.
    .onAnimationEnd(() => {                        // Sequenced events and animations are easy to schedule in LiveTree.
      branchDiv.setText("goodbye world")           // Text, DOM traversal, CSS, events, inline style,
        .style.set.backgroundColor(                //   are all managed in a unified, typed ecosystem.
          liveTree.dom.rect().width > 500          // LiveTree wraps many DOMRect and viewport methods in its API.
          ? "red"                                  // CSS can be dynamically created from JS variables.
          : "blue"                                 // (Conventional selector-based styling is also fully supported.)
      );
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
  /* LiveMap */
  {
    headerA: "hson.liveMap",
    bodyA: {
      kind: "text",
      text: `
### canonical application state
LiveMap owns, edits, and tracks Hson graphs for both application state and page markup. It manages changes to the state graph, enforcing schema, creating commits, and updating subscribers.
LiveMap can manage document and styling properties such as color values, geometry, and text content.
Via Reflection, application state can be directly linked to, and automatically update, DOM values in LiveTree.

#__#
LiveMap provides:
- graph traversal and editing
- schema validation & runtime Typescript enforcement
- commits, revisions, and replay
- state snapshots, streams, and bindings
      `,
    },
    footer: "livemap / about",
  },

  {
    headerA: "LiveMap - document",
    bodyA: {
      kind: "code",
      lang: "ts",
      text: `
const main = map.document.at([]);
const heading = main.at([0]);
const button = main.at([1]);

heading.snap();
button.attrs.get("disabled");
button.flags.has("disabled");
      `,
    },
    bodyB: {
      kind: "text",
      text: `
Integrated with LiveTree, LiveMap manages page markup alongside application state, controling access and mutation to an application's styling, structure, and metadata.

Changes to state push effects synchronously to the DOM via Reflection.

LiveMap makes bulk structural changes to documents or data lightweight, relative to LiveTree's granular, node-scoped interface.

      `,
    },
    footer: "livemap / document",
  },

  /* Locus */
  {
    headerA: "hson.locus",
    bodyA: {
      kind: "text",
      text: `
### server-side LiveMap authority

Locus manages an authoritative LiveMap in a server environment. It holds app state in a single location and streams commit changes to clients via WebSocket.

It coordinates:
- canonical mutations
- ordered commits
- revision history
- sessions
- client actions
- subscriptions
- snapshots
- replay
- reconnect / recovery

#__#
Locus itself does not require a DOM or LiveTree.
      `,
    },
    footer: "locus / about",
  },

  {
    headerA: "Locus - flow",
    bodyA: {
      kind: "text",
      text: `
\`\`\`text
client interaction
        ↓
typed action
        ↓
Locus
        ↓
host application logic
        ↓
LiveMap validation + mutation
        ↓
canonical commit
        ↓
Locus record / publication
        ↓
client applies authoritative commit
\`\`\`
      `,
    },
    footer: "locus / authority flow",
  },

  {
    headerA: "use case - local application",
    bodyA: {
      kind: "text",
      text: `
For an interactive CSR or SPA, A local application can use:

\`\`\`text
LiveMap
   ↓
Reflection
   ↓
LiveTree
   ↓
DOM
\`\`\`

The authoritative map lives in the local application.
      `,
    },
    footer: "architecture / local",
  },

  {
    headerA: "use case - hosted application",
    bodyA: {
      kind: "text",
      text: `
A hosted application could use:

\`\`\`text
server-side Locus,
authoritative LiveMap
      ↓
ordered commits
      ↓
client LiveMap mirror
      ↓
Reflection
      ↓
LiveTree / DOM
\`\`\`

The client retains a local mirror to the authoritative Locus and all changes are server-driven.

      `,
    },
    footer: "architecture / hosted",
  },
  {
    headerA: "LiveDemo (this site)",
    bodyB: {
      kind: "text",
      text: `
### the first site made entirely with hson-live:
### www.terminalgothic.com

LiveDemo is a testing and development environment for hson-live. Its collection of interactive applications showcases hson-live's capabilities. System test suites are publicly available for verification.
      `,
    },
    footer: "livedemo",
  },
  {
    headerA: "ty",
    bodyB: {
      kind: "text",
      text: "### Pip Hanson\nwww.terminalgothic.com\ngithub.com/neutralica/hson-live\ngithub.com/neutralica/hson-demo2\n",
    },
    footer: "contact / links",
  },
];
