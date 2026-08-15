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
    headerA: "HSON",
    bodyA: {
      kind: "text", text: `
a 'glue format' that expresses both JSON and HTML
#HR#
      ` },
    headerB: "hson-live",
    bodyB: { kind: "text", text: "a TypeScript library with four subsystems:" },
    bodyC: { kind: "text", text: "# Transform • LiveTree • LiveMap • LiveHost" },
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
web-authoring & rendering interface via projection from canonical HSON markup
`,
    },
    bodyB: {
      kind: "text",
      text: `
### hson.liveMap
application state machine and HSON graph editor
#__#
### hson.liveHost
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
      text: htmlStub + "\n\n\n\n\n\n\n\n\n\n\n// notice the structural clutter in the json ->",
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

Used alone, LiveTree offers a complete local live-document runtime. Integrated with LiveMap, it gains a schema-enforced HSON graph editor and state layer with revisioned commit history, live bindings, and subscriptions.
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
LiveMap stores application state as a canonical HSON graph.

A LiveMap can contain:
- projected / JSON-shaped data
- document / HTML-shaped data
- arrays, objects, elements, fragments, and scalar values

#__#
LiveMap provides:
- traversal
- mutation
- schema validation
- observation
- revisions
- commits
- snapshots
- replay
- identity continuity
      `,
    },
    footer: "livemap / about",
  },

  {
    headerA: "LiveMap - two shapes",
    stackAlign: "center",
    bodyA: {
      kind: "text",
      text: `
### projected data

\`\`\`ts
const map = LiveMap.from({
  user: {
    name: "Mara",
    active: true
  }
});
\`\`\`

#__#
Ordinary application data:
- objects
- arrays
- strings
- numbers
- booleans
- null
      `,
    },
    bodyB: {
      kind: "text",
      text: `
### document data

\`\`\`hson
<main
  <h1 "hello"/>
  <button "continue"/>
/>
\`\`\`

#__#
Document state:
- elements
- text
- attributes
- flags
- fragments
- ordered content
      `,
    },
    footer: "livemap / projected + document",
  },

  {
    headerA: "LiveMap - locations",
    bodyA: {
      kind: "code",
      lang: "ts",
      text: `
const user = map.at(["user"]);
const name = map.at(["user", "name"]);
const thirdItem = map.at(["items", 2]);

name.snap();
name.path;
name.rev;
      `,
    },
    bodyB: {
      kind: "text",
      text: `
### a location is a typed position in a LiveMap

Locations can be:
- read
- watched
- passed around
- used as mutation targets
- traversed relative to another location

#__#
Paths remain positional.

A location refers to what is at that path in the current map.
      `,
    },
    footer: "livemap / locations",
  },

  {
    headerA: "LiveMap - document traversal",
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
Document traversal follows semantic document structure.

Internal HSON structural carriers are not exposed as routine traversal steps.

#__#
Document locations provide access to:
- content
- attributes
- flags
- relative locations
- canonical paths
      `,
    },
    footer: "livemap / document traversal",
  },

  {
    headerA: "LiveMap - mutation",
    bodyA: {
      kind: "text",
      text: `
LiveMap supports canonical graph operations including:

### set
replace the value at a projected location

### replace
replace a graph/document value

### delete
remove a value or member

### splice
modify ordered content or arrays

### batch
apply several operations as one accepted transition

#__#
Mutations are applied to the LiveMap rather than directly to a projected DOM or secondary cache.
      `,
    },
    footer: "livemap / mutation",
  },

  {
    headerA: "LiveMap - batch",
    bodyA: {
      kind: "code",
      lang: "ts",
      text: `
map.batch(batch => {
  batch.set(["user", "name"], "Mara");
  batch.set(["user", "online"], true);
  batch.splice(["messages"], 0, 0, newMessage);
});
      `,
    },
    bodyB: {
      kind: "text",
      text: `
A batch is one canonical state transition.

#__#
Observers receive the accepted result as one ordered commit rather than several unrelated intermediate states.
      `,
    },
    footer: "livemap / batch",
  },

  {
    headerA: "LiveMap - revisions",
    bodyA: {
      kind: "text",
      text: `
Every accepted LiveMap transition advances the map revision.

\`\`\`text
revision 41
    ↓
commit
    ↓
revision 42
\`\`\`

#__#
Revision identifies _when_ a state relationship is true.

Commits describe transitions between revisions.
      `,
    },
    footer: "livemap / revisions",
  },

  {
    headerA: "LiveMap - watch",
    bodyA: {
      kind: "code",
      lang: "ts",
      text: `
const status = map.at(["user", "status"]);

const stop = status.watch(next => {
  console.log(next.value);
});
      `,
    },
    bodyB: {
      kind: "text",
      text: `
Locations can observe future accepted state changes.

#__#
Watches:
- are location-based
- receive detached value evidence
- filter ordinary unchanged values
- distinguish explicit restore behavior
- can be disposed independently
      `,
    },
    footer: "livemap / watch",
  },

  {
    headerA: "LiveMap - history",
    bodyA: {
      kind: "text",
      text: `
LiveMap records canonical operations as commits.

Commits can be:
- captured
- applied
- replayed
- transmitted
- compared by revision

#__#
A snapshot represents current canonical state.

A commit represents a canonical transition.
      `,
    },
    footer: "livemap / history",
  },

  {
    headerA: "path / QUID / revision",
    stackAlign: "center",
    bodyA: {
      kind: "text",
      text: `
### path
where is it?

#__#

### QUID
which subject is it?

#__#

### revision
when is that relationship true?
      `,
    },
    bodyB: {
      kind: "text",
      text: `
These are separate coordinates.

#__#
A subject can move:
\`\`\`text
path changes
QUID remains
\`\`\`

A location can receive a replacement:
\`\`\`text
path remains
QUID changes
\`\`\`

QUIDs are sparse continuity markers, not general application IDs.
      `,
    },
    footer: "livemap / identity",
  },

  /* schema */
  {
    headerA: "schema.define()",
    bodyA: {
      kind: "code",
      lang: "ts",
      text: `
const Person = schema.define(s =>
  s.object.exact({
    name: s.string,
    age: s.number,
    active: s.boolean
  })
);
      `,
    },
    bodyB: {
      kind: "text",
      text: `
Schemas describe legal HSON values.

The same schema definition provides:
- runtime admission validation
- TypeScript type inference
- typed traversal
- typed mutation targets

#__#
A schema is an immutable reusable value.
      `,
    },
    footer: "schema / define",
  },

  {
    headerA: "schema - projected data",
    bodyA: {
      kind: "code",
      lang: "ts",
      text: `
schema.define(s =>
  s.object.exact({
    id: s.string,
    mode: s.literal("edit", "view"),
    tags: s.array(s.string),
    point: s.tuple(s.number, s.number),
    metadata: s.record(s.string)
  })
);
      `,
    },
    bodyB: {
      kind: "text",
      text: `
Projected schemas include:

- object
- exact object
- record
- array
- tuple
- literal
- alternatives
- optional values
- nullable values
- recursive structures
      `,
    },
    footer: "schema / projected",
  },

  {
    headerA: "schema - exact / open",
    stackAlign: "center",
    bodyA: {
      kind: "text",
      text: `
### open object

\`\`\`ts
s.object({
  name: s.string
})
\`\`\`

Requires \`name\`, while allowing additional members.
      `,
    },
    bodyB: {
      kind: "text",
      text: `
### exact object

\`\`\`ts
s.object.exact({
  name: s.string
})
\`\`\`

Requires \`name\` and rejects undeclared members.
      `,
    },
    footer: "schema / object shape",
  },

  {
    headerA: "schema - value constraints",
    bodyA: {
      kind: "code",
      lang: "ts",
      text: `
const Port = schema.define(s =>
  s.number.constrain(
    "valid port",
    value => value >= 1 && value <= 65535
  )
);

const Room = schema.define(s =>
  s.string.constrain(
    "room code",
    value => /^[a-z0-9-]+$/.test(value)
  )
);
      `,
    },
    bodyB: {
      kind: "text",
      text: `
Constraints add runtime admission rules to otherwise ordinary TypeScript values.

#__#
They validate values without transforming them.
      `,
    },
    footer: "schema / constraints",
  },

  {
    headerA: "schema - document",
    bodyA: {
      kind: "code",
      lang: "ts",
      text: `
const Card = schema.define(s =>
  s.article(
    s.h2(s.text),
    s.p(s.text),
    s.button(
      s.attrs({
        type: s.literal("button"),
        disabled: s.flag.optional
      }),
      s.text
    )
  )
);
      `,
    },
    bodyB: {
      kind: "text",
      text: `
Document schemas describe ordered document grammar.

They can constrain:
- element names
- text
- child order
- repeated structures
- alternatives
- attributes
- flags

Known HTML/SVG tags use the same tag catalog as LiveTree.
      `,
    },
    footer: "schema / document",
  },

  {
    headerA: "schema - repetition",
    bodyA: {
      kind: "code",
      lang: "ts",
      text: `
schema.define(s =>
  s.ul(
    s.repeat(
      s.li(s.text)
    )
  )
);
      `,
    },
    bodyB: {
      kind: "text",
      text: `
Document grammar can express repetition and alternatives.

#__#
\`s.repeat(Item)\`
zero or more occurrences

\`s.repeat(3, Item)\`
exactly three occurrences

\`s.pick(A, B)\`
one of several schema expressions
      `,
    },
    footer: "schema / document grammar",
  },

  {
    headerA: "schema - attributes",
    bodyA: {
      kind: "code",
      lang: "ts",
      text: `
schema.define(s =>
  s.button(
    s.attrs.exact({
      type: s.literal("button"),
      title: s.string.optional,
      disabled: s.flag.optional
    }),
    s.text
  )
);
      `,
    },
    bodyB: {
      kind: "text",
      text: `
Attribute schemas can be open or exact.

Attributes can be:
- required
- optional
- literal-valued
- constrained
- boolean-style flags

#__#
Typed document locations retain this attribute information.
      `,
    },
    footer: "schema / attributes",
  },

  {
    headerA: "LiveMap + schema",
    bodyA: {
      kind: "code",
      lang: "ts",
      text: `
const AppState = schema.define(s =>
  s.object.exact({
    user: s.object.exact({
      name: s.string,
      loggedIn: s.boolean
    })
  })
);

const map = LiveMap.from(initialState);

map.schema.use(AppState);
      `,
    },
    bodyB: {
      kind: "text",
      text: `
A LiveMap may permanently attach one schema.

#__#
Once attached:
- current state must satisfy the schema
- future accepted mutations must satisfy the schema
- traversal can retain inferred endpoint types

A distinct schema cannot later replace the attached schema.
      `,
    },
    footer: "livemap / schema ownership",
  },

  {
    headerA: "schema admission",
    stackAlign: "center",
    bodyA: {
      kind: "text",
      text: `
\`\`\`ts
map.at(["user", "loggedIn"]).set(true);
\`\`\`

### accepted
      `,
    },
    bodyB: {
      kind: "text",
      text: `
\`\`\`ts
map.at(["user", "loggedIn"]).set("yes");
\`\`\`

### TypeScript error

and, at runtime, invalid admitted state is rejected by the schema.
      `,
    },
    footer: "livemap / typed admission",
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
When the authoritative LiveMap document commits a structural change, Reflection reconciles the corresponding LiveTree.

#__#
Reflection can reconcile:
- insertions
- removals
- replacements
- moves
- attribute changes
- text/content changes

#__#
The DOM is updated from the resulting LiveTree projection.
      `,
    },
    footer: "reflection / reconciliation",
  },

  {
    headerA: "Reflection - continuity",
    bodyA: {
      kind: "text",
      text: `
QUID continuity allows Reflection to distinguish movement from replacement.

#__#
If the same subject remains active:
- compatible projected objects can be retained
- DOM objects can be retained
- subject-attached runtime resources can remain attached

If an incompatible runtime object is required:
- the exact DOM/LiveTree object is replaced
- canonical subject continuity can remain

#__#
A new owner epoch creates a fresh runtime projection.
      `,
    },
    footer: "reflection / identity",
  },

  {
    headerA: "authority / projection",
    stackAlign: "center",
    bodyA: {
      kind: "text",
      text: `
### LiveMap
canonical state
schema
paths
revisions
commits
history
      `,
    },
    bodyB: {
      kind: "text",
      text: `
### LiveTree
DOM projection
events
CSS
keyframes
canvas
runtime resources
      `,
    },
    bodyC: {
      kind: "text",
      text: `
### Reflection
correspondence
structural reconciliation
identity continuity
      `,
    },
    footer: "reflection / roles",
  },

  {
    headerA: "LiveTree - scoped resources",
    bodyA: {
      kind: "text",
      text: `
LiveTree's runtime tracks resources associated with live nodes.

These include:
- event listeners
- generated CSS
- scoped CSS rules
- keyframes
- lifecycle disposables
- DOM correspondence

#__#
Resources follow the runtime identity rules of the live subject.

Detach, reinsert, replacement, and terminal destruction have distinct lifecycle behavior.
      `,
    },
    footer: "livetree / runtime resources",
  },

  {
    headerA: "LiveTree - scoped CSS",
    bodyA: {
      kind: "text",
      text: `
LiveTree can create selector-based CSS associated with a live node.

#__#
Generated rules can:
- use ordinary CSS properties
- use JS values
- include pseudo-selectors
- include keyframes
- be updated during runtime
- be removed automatically with terminal lifecycle cleanup

#__#
CSS ownership is scoped to the LiveTree runtime rather than stored as global application state.
      `,
    },
    footer: "livetree / css",
  },

  /* LiveHost */
  {
    headerA: "hson.liveHost",
    bodyA: {
      kind: "text",
      text: `
### server-side LiveMap authority

LiveHost manages an authoritative LiveMap in a server environment.

It coordinates:
- client actions
- canonical mutations
- ordered commits
- revision history
- sessions
- subscriptions
- snapshots
- replay
- reconnect / recovery

#__#
LiveHost itself does not require a DOM or LiveTree.
      `,
    },
    footer: "livehost / about",
  },

  {
    headerA: "LiveHost - actions",
    bodyA: {
      kind: "text",
      text: `
Clients send actions to LiveHost.

An action can be:
- typed
- validated
- associated with a client/session
- applied by host-side application logic
- converted into one or more LiveMap mutations

#__#
Clients do not directly mutate the host's authoritative LiveMap.
      `,
    },
    footer: "livehost / actions",
  },

  {
    headerA: "LiveHost - flow",
    bodyA: {
      kind: "text",
      text: `
\`\`\`text
client interaction
        ↓
typed action
        ↓
LiveHost
        ↓
host application logic
        ↓
LiveMap validation + mutation
        ↓
canonical commit
        ↓
LiveHost record / publication
        ↓
client applies authoritative commit
\`\`\`
      `,
    },
    footer: "livehost / authority flow",
  },

  {
    headerA: "LiveHost - ordering",
    bodyA: {
      kind: "text",
      text: `
LiveHost assigns an order to accepted authoritative changes.

#__#
The host tracks:
- current revision
- accepted commits
- action chronology
- duplicate requests
- revision gaps

#__#
Clients apply authoritative commits in host order.
      `,
    },
    footer: "livehost / ordering",
  },

  {
    headerA: "LiveHost - commit authority",
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
### LiveHost

authorizes and coordinates the transition

\`\`\`text
accept
order
record
publish
recover
\`\`\`

LiveHost does not independently recreate LiveMap graph semantics.
      `,
    },
    footer: "livehost / commit authority",
  },

  {
    headerA: "LiveHost - snapshots",
    bodyA: {
      kind: "text",
      text: `
A LiveHost can provide a snapshot of current authoritative state.

#__#
A snapshot contains enough canonical graph state for a client to establish or replace its local mirror.

Snapshots are used for:
- initial attachment
- recovery
- state replacement when replay is not available or appropriate
      `,
    },
    footer: "livehost / snapshots",
  },

  {
    headerA: "LiveHost - replay",
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
    footer: "livehost / replay",
  },

  {
    headerA: "LiveHost - recovery",
    bodyA: {
      kind: "text",
      text: `
Reconnect does not create a new authoritative state.

A reconnecting client can provide its known recovery position.

LiveHost can then:
- resume from retained commits
- replace from a snapshot
- detect a revision gap
- reject contradictory recovery evidence

#__#
Recovery is based on authoritative host state rather than on reconstructing state from the client UI.
      `,
    },
    footer: "livehost / recovery",
  },

  {
    headerA: "LiveHost - duplicate requests",
    bodyA: {
      kind: "text",
      text: `
LiveHost tracks client request identity.

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
    footer: "livehost / deduplication",
  },

  {
    headerA: "LiveHost - sessions",
    bodyA: {
      kind: "text",
      text: `
LiveHost can associate clients with server-side sessions.

Sessions can preserve application identity across:
- socket replacement
- reconnect
- temporary transport loss

#__#
The transport connection and the logical session are separate lifetimes.
      `,
    },
    footer: "livehost / sessions",
  },

  {
    headerA: "LiveHost - subscriptions",
    bodyA: {
      kind: "text",
      text: `
Clients can subscribe to selected authoritative paths rather than treating every client as an observer of every part of the map.

#__#
Path subscriptions are tied to canonical LiveMap locations.

The host remains responsible for ordering the commits delivered through the subscription.
      `,
    },
    footer: "livehost / subscriptions",
  },

  {
    headerA: "LiveHost - reconnect",
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
    footer: "livehost / transport",
  },

  {
    headerA: "LiveHost - environments",
    bodyA: {
      kind: "text",
      text: `
LiveHost is not specific to one server platform.

Current authority/runtime work can operate in environments including:
- Node
- Cloudflare Workers

#__#
Environment-specific adapters provide transport and runtime capabilities.

LiveHost owns the authority model above those adapters.
      `,
    },
    footer: "livehost / runtime",
  },

  {
    headerA: "LiveHost + LiveTree",
    bodyA: {
      kind: "text",
      text: `
LiveHost and LiveTree do not require each other.

#__#
A LiveHost can manage authoritative state without rendering.

A LiveTree can render and manage a local live document without a server.

#__#
When combined:

\`\`\`text
LiveHost
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
    footer: "livehost / client projection",
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

### LiveHost
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
LiveHost      Reflection
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

### LiveHost
owns server-side ordering, coordination, and recovery
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

LiveHost

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
No LiveHost is required.

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
server LiveHost
      ↓
authoritative LiveMap
      ↓
ordered commits
      ↓
client LiveMap
      ↓
Reflection
      ↓
LiveTree / DOM
\`\`\`

#__#
The client retains a local canonical mirror while the host remains authoritative.
      `,
    },
    footer: "architecture / hosted",
  },

  {
    headerA: "same graph / different roles",
    bodyA: {
      kind: "text",
      text: `
HSON provides the common graph representation used across the stack.

That graph can participate in:

- parsing and serialization
- typed schema validation
- canonical application state
- document state
- identity continuity
- mutation history
- DOM projection
- server transport
- snapshot recovery
- replay

#__#
The subsystems remain separate even when they operate on the same graph model.
      `,
    },
    footer: "architecture / summary",
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
