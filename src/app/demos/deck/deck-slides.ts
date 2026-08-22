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
### An introduction to HSON, hson-live, and related subsystems.
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
    headerA: "HSON",
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
    headerA: "HSON",
    stackAlign: "center",
    bodyA: {
      kind: "text",
      text: `
### Hypertext Structured Object Notation
HSON is a 'glue format'. Its syntax models the tree structure shared by JSON and HTML and can fully express both notations.
#HR#
### By parsing to HSON as intermediary step, HTML can be converted to JSON and vice versa.
#HR#
Uniting two non-interchangeable building blocks of the web suggests new ways of building web content. This is the key insight that powers hson-live.
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
### hson.transform
converts JSON and XML/HTML/SVG to and from HSON
#__#
### hson.liveTree
web-authoring & rendering interface via projection from canonical HSON document
`,
    },
    bodyB: {
      kind: "text",
      text: `
### hson.liveMap
application state machine and HSON graph editor
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
A circuit of parsers and serializers that convert data to and from HSON. Transformations are stable across multiple cycles, without structural drift or data loss. hson-live's _circuit_test() diagnostic allows independent verification of the transformer chain for any valid string.
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
HSON resembles pared-down HTML. Instead of opening and closing tags, HSON encloses nested content within a single tag.
#__#
HSON can express any XML-compliant HTML. HSON derived from HTML uses a slash-closer:
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
HSON can express any valid JSON. It shares JSON’s primitive types and numeric edges exactly, making conversion structurally direct and type-preserving.
#__#
JSON-derived HSON object values use an angle closer:
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
    headerA: "JSON => HSON => HTML",
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
LiveTree is a live web-authoring interface built on HSON. Web content is represented as a HSON node graph and projected to the DOM. Mutations are made to the HSON graph and reflected to the DOM in realtime.

LiveTree's chainable API brings markup, CSS, events, SVG, canvas, forms, input, and DOM traversal together in a low-friction typed interface.

Used alone, LiveTree offers a complete local live-document runtime. Integrated with LiveMap, it gains a schema-enforced HSON graph editor and state layer with revisioned commit history, "Reflection" (live bindings), and subscriptions.
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


const button = hson.queryBody()                    // Query document.body, deep-parse to HSON.
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
LiveMap owns, edits, and tracks HSON graphs for both application state and page markup. Via Reflection, application state can be directly linked to, and automatically update, DOM values in LiveTree.

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

Linked with LiveTree, LiveMap can maintain page markup alongside application state. Via Relection, changes to state push effects synchronously to LiveTree.

Via LiveMap's proxy, HTML and the DOM can be traversed using standard JS object and array methods. LiveMap makes bulk structural changes lightweight, compared with LiveTree's granular node-focused interface.

#__#
When integrated, LiveMap controls access and mutation to an application's styling, structure, and metadata. 
      `,
    },
    footer: "livemap / document",
  },

  /* Reflection */
  {
    headerA: "Reflection",
    bodyA: {
      kind: "text",
      text: `
Reflection connects a LiveMap document authority to a LiveTree projection.

\`\`\`text
LiveMap
canonical document state
        ↓
Reflection
correspondence + reconciliation
        ↓
LiveTree
runtime document graph
        ↓
DOM
\`\`\`

#__#
LiveMap remains authoritative.

LiveTree remains the rendering/runtime owner.
      `,
    },
    footer: "reflection / about",
  },

  {
    headerA: "Reflection - updates",
    bodyA: {
      kind: "text",
      text: `
When the authoritative LiveMap document commits a structural change, Reflection reconciles the corresponding LiveTree:
- insertions
- removals
- replacements
- moves
- attribute changes
- text/content changes

#__#
The DOM is updated from the resulting LiveTree projection in realtime.
      `,
    },
    footer: "reflection / reconciliation",
  },

  /* Locus */
  {
    headerA: "hson.locus",
    bodyA: {
      kind: "text",
      text: `
### server-side LiveMap authority

Locus manages an authoritative LiveMap in a server environment.

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
    headerA: "Locus - commit authority",
    stackAlign: "center",
    bodyA: {
      kind: "text",
      text: `
### LiveMap

creates the canonical graph transition

\`\`\`text
state n
  ↓
operation
  ↓
state n+1
\`\`\`
      `,
    },
    bodyB: {
      kind: "text",
      text: `
### Locus

authorizes and coordinates the transition

\`\`\`text
accept
order
record
publish
recover
\`\`\`

Locus does not independently recreate LiveMap graph semantics.
      `,
    },
    footer: "locus / commit authority",
  },

  {
    headerA: "Locus - snapshots",
    bodyA: {
      kind: "text",
      text: `
A Locus can provide a snapshot of current authoritative state.

#__#
A snapshot contains enough canonical graph state for a client to establish or replace its local mirror.

Snapshots are used for:
- initial attachment
- recovery
- state replacement when replay is not available or appropriate
      `,
    },
    footer: "locus / snapshots",
  },

  {
    headerA: "Locus - replay",
    bodyA: {
      kind: "text",
      text: `
When retained history is sufficient, a client can recover by replaying authoritative commits after a known revision.

\`\`\`text
client has revision 80

host has revision 84

replay:
81
82
83
84
\`\`\`

#__#
Replay preserves the same canonical transition semantics as ordinary publication.
      `,
    },
    footer: "locus / replay",
  },

  {
    headerA: "Locus - recovery",
    bodyA: {
      kind: "text",
      text: `
Reconnect does not create a new authoritative state.

A reconnecting client can provide its known recovery position.

Locus can then:
- resume from retained commits
- replace from a snapshot
- detect a revision gap
- reject contradictory recovery evidence

#__#
Recovery is based on authoritative host state rather than on reconstructing state from the client UI.
      `,
    },
    footer: "locus / recovery",
  },

  {
    headerA: "Locus - duplicate requests",
    bodyA: {
      kind: "text",
      text: `
Locus tracks client request identity.

#__#
A retried request can be recognized as the same request rather than applied twice.

This is distinct from:
- graph identity
- path identity
- session identity
- revision identity

#__#
Transport retry does not imply a second canonical mutation.
      `,
    },
    footer: "locus / deduplication",
  },

  {
    headerA: "Locus - sessions",
    bodyA: {
      kind: "text",
      text: `
Locus can associate clients with server-side sessions.

Sessions can preserve application identity across:
- socket replacement
- reconnect
- temporary transport loss

#__#
The transport connection and the logical session are separate lifetimes.
      `,
    },
    footer: "locus / sessions",
  },

  {
    headerA: "Locus - subscriptions",
    bodyA: {
      kind: "text",
      text: `
Clients can subscribe to selected authoritative paths rather than treating every client as an observer of every part of the map.

#__#
Path subscriptions are tied to canonical LiveMap locations.

The host remains responsible for ordering the commits delivered through the subscription.
      `,
    },
    footer: "locus / subscriptions",
  },

  {
    headerA: "Locus - reconnect",
    stackAlign: "center",
    bodyA: {
      kind: "text",
      text: `
### transport

\`\`\`text
socket A
   ×
socket B
\`\`\`

A network connection can be replaced.
      `,
    },
    bodyB: {
      kind: "text",
      text: `
### authority

\`\`\`text
session
revision
LiveMap
history
\`\`\`

Authoritative state continues independently of a particular connection.
      `,
    },
    footer: "locus / transport",
  },

  {
    headerA: "Locus - environments",
    bodyA: {
      kind: "text",
      text: `
Locus is not specific to one server platform.

Current authority/runtime work can operate in environments including:
- Node
- Cloudflare Workers

#__#
Environment-specific adapters provide transport and runtime capabilities.

Locus owns the authority model above those adapters.
      `,
    },
    footer: "locus / runtime",
  },

  {
    headerA: "Locus + LiveTree",
    bodyA: {
      kind: "text",
      text: `
Locus and LiveTree do not require each other.

#__#
A Locus can manage authoritative state without rendering.

A LiveTree can render and manage a local live document without a server.

#__#
When combined:

\`\`\`text
Locus
  ↓
authoritative LiveMap
  ↓
client LiveMap
  ↓
Reflection
  ↓
LiveTree
  ↓
DOM
\`\`\`
      `,
    },
    footer: "locus / client projection",
  },

  /* combined architecture */
  {
    headerA: "HSON graph layers",
    stackAlign: "center",
    bodyA: {
      kind: "text",
      text: `
### transform
representation

JSON / HTML / SVG / HSON / HsonNode

#__#

### LiveMap
canonical state

paths / schema / commits / revisions
      `,
    },
    bodyB: {
      kind: "text",
      text: `
### LiveTree
runtime projection

DOM / CSS / events / resources

#__#

### Locus
server authority

actions / order / history / recovery
      `,
    },
    footer: "architecture / layers",
  },

  {
    headerA: "one state flow",
    bodyA: {
      kind: "text",
      text: `
\`\`\`text
HSON / JSON / document input
          ↓
       LiveMap
          ↓
    schema admission
          ↓
 canonical revision
          ↓
        commit
       /      \\
      /        \\
Locus      Reflection
authority       ↓
              LiveTree
                ↓
               DOM
\`\`\`

Each subsystem has a separate ownership role.
      `,
    },
    footer: "architecture / state flow",
  },

  {
    headerA: "ownership",
    bodyA: {
      kind: "text",
      text: `
### Transform
owns conversion between representations

### LiveMap
owns canonical graph state

### Schema
defines admissible graph structure and values

### Reflection
owns correspondence between authority and projection

### LiveTree
owns live runtime / DOM resources

### Locus
owns server-side commit ordering, client coordination, and recovery
      `,
    },
    footer: "architecture / ownership",
  },

  {
    headerA: "state / projection / transport",
    stackAlign: "center",
    bodyA: {
      kind: "text",
      text: `
### state

LiveMap

canonical graph
schema
revision
identity
history
      `,
    },
    bodyB: {
      kind: "text",
      text: `
### projection

LiveTree + Reflection

DOM
events
CSS
canvas
runtime resources
      `,
    },
    bodyC: {
      kind: "text",
      text: `
### coordination

Locus

actions
sessions
ordering
subscriptions
recovery
      `,
    },
    footer: "architecture / roles",
  },

  {
    headerA: "local application",
    bodyA: {
      kind: "text",
      text: `
A local application can use:

\`\`\`text
LiveMap
   ↓
Reflection
   ↓
LiveTree
   ↓
DOM
\`\`\`

#__#
No Locus is required.

The authoritative map lives in the local application.
      `,
    },
    footer: "architecture / local",
  },

  {
    headerA: "hosted application",
    bodyA: {
      kind: "text",
      text: `
A hosted application can use:

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

#__#
The client retains a local mirror to the authoritative host.
      `,
    },
    footer: "architecture / hosted",
  },
  {
    headerA: "LiveDemo",
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
