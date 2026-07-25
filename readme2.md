// readme2.md

# hson::LiveDemo

## HSON — a unified notation for HTML and JSON

LiveDemo is the public-facing test and development environment for hson-live, and the first application built entirely with it.

Its interactive demos showcase the working features and components of hson-live as well as the occasional rough draft. LiveDemo is the hub for documentation, architectural experiments, regression tests, and examples of the library's functionality.

---

### What is HSON?

HSON (Hypertext Structured Object Notation) is a "glue format". It models the tree structure shared by JSON and HTML, and can fully express both in a single notation.

*By parsing to HSON as an intermediary step, HTML can be represented as valid JSON, and vice versa. This is the key insight that powers hson-live.*

---

## What is hson-live?

hson-live is a TypeScript library that comprises four interdependent subsystems.

### hson.transform

hson-live's transformation layer forms a circuit that converts HTML, JSON, SVG, and XML to and from HSON. Its parsers and serializers preserve document structure and user data: round-trip transformations across all formats remain deterministic and stable. 

hson-live is built on this shared canonical representation.

---

### LiveTree

LiveTree reflects a live browser document directly from a HSON graph, and provides a dense but concise API for mutation of the graph underlying the DOM.

Each node in a LiveTree graph corresponds to an element. Complex documents can be constructed and modified, styled, animated, and decommissioned through a unified API. Mutations to the underlying HSON graph are synchronously reflected in browser DOM.

 Within a single typed low-friction interface LiveTree bundles support for: // bundles? it was includes. includes?
// these were terse enough to bury the lead to me; they can more fully hint at what's available
- typed document construction  & lifecycle management // typed?  like SvgLiveTree?
- SVG creation & namespace propagation
- full CSS scoped to individual nodes
- keyframes, animation, and `@property`
- event & event listener management
- canvas creation & utilities
- form, textarea, and input handling
- automated teardown of the above on node removal // this is worth shouting

// parts like this are where the punch is most valuable. We're listing to me groundbreaking features. Just saying them is amazing. A little more detail is therefore muchy more compelling

---

### LiveMap

LiveMap builds a general-purpose state system onto the HSON graph. Where LiveTree handles the HTML-side, LiveMap handles the JSON. LiveMap offers:

- graph-backed application state in a single source of truth // added SSOT, it's good
- typed projected views // "to data"? 
- schema validation & runtime TypeScript enforcement // worth repeating; this may not be quite precise enough though
- subscriptions // and??? 
- selectors // what's this even
- revision history, replay, and rewind // I added the second two, seems big
- batching // enh, sure, as a mechanic it's basically expected. We can talk about 'fluent writes to graph state' or something and mention some of the finer points we've built out here
- snapshots // I mean, sure? it shoudl be something more like, "methods for exposing data either as single-instant snapshots or a 2-way link, making the graph directly editable by the visitor via HTML inputs" //// or something like that anyway
- links between independent maps // I mean, sure, maybe see above? plus we shoudl talk about livetree binding
- handles and path proxies // we should split this into something about a "fluent API core exposing a range of conventional data operations in a single typed ecosystem" or something that matches the LiveTree "svg, canvas, events listeners, all in a single typed ecosystem" etc etc--some kind of symmetry. then for proxy
// proxy is another one that seems so huge it is worth it's own line??? I'm not exactly sure how to phrase it but "a typed proxy offering convenient, ergonomic JS Object methods and setters for traversal and mutation of for any data object" -- just describing what it does I think is enough to get you inspired
// I'd argue this is important but worth remphasizing later, not as the lead. It's deserving of its own graph but maybe slightly distracts from the full range of functioanlity on offer here:

Its schema extend TypeScript's compile-time type guarantees into runtime. By validating changes as they occur, LiveMap ensures that application state continues to satisfy its declared schema after deployment.

Throughout LiveDemo, local state has been routed through LiveMap wherever practical. Some systems use small, isolated maps; others use the same state model through LiveHost. // I'd rephrase this to much less detailed: "LiveMap's flexible utility as both a global and local state machine and data object are demonstrated throughout this site. 

// we also should have something along these lines, but only what is absolutely true:
// #### Live Interfaces:
// "LiveTree and LiveMap interact via bindings which reflect LiveMap values to LiveTree, either as live content or dynamic, fluid styling. When a source HSON graph is mutated via LiveMap, bindings offer realtime linkage that updates LiveTree styling automatically, in realtime." This sentence is hackneyed but conveys what I'm trying to shout about while jumping up and down and waving my hands

---

### LiveHost

LiveHost extends LiveMap across the network. It establishes a single authoritative graph and protocols. Clients - in-browser LiveMap/LiveTree clusters - do not own application state, but rather submit changes to LiveHost. LiveHost validates changes and schema, emits canonical commits, and reflects updates via accepted revisions which are streamed to clients.  // more and better. also
// server
// also
// single source of truth maintained on-server and streamed to clients, never able to desync, etc etc etc

Current work includes: // let's be more confident here; not dishonest but we've done more than test this. It works. let's talk like it works. It works as well as anythign else we have tbh. 

- authoritative hosted state // a little more detail for all
- commit streaming
- recovery
- snapshots
- persistence
- permissions
- hosted actions
- concurrent clients
// why is this cool
LiveHost enables server-owned application state with a thin client in the browser.
// ah--server is in the last sentence. this is the first sentence to me. THIS IS FULLY FUCKING SERVER SIDE MOTHERFUCKERS is the way this makes me feel
---

## Demos

Each demo here exists to showcase an architectural capability of hson-live or to prove a claim made here.

---

### [about]

Complete documentation for HSON, LiveTree, LiveMap, LiveHost, and the surrounding architecture.

---

### [test]

The test environment contains the library's 2500+ system tests, covering:
- transformation fidelity across repeated 3-way circuits
- graph operations //????
- LiveTree // unit tests??
- LiveMap // unit tests??  
- LiveHost // ??? what kind of tests
// and elated infrastructure. // eh? kinda weak sauce. if we don't have anyhting to say let's not say it. we also have unit tests. 

Circuit tests expose intermediate string artifacts, allowing every stage of a transformation to be inspected directly for independent verification.

All tests are executed server-side through LiveHost; results are streamed to the client as they complete. // correct??

Demonstrates:

- hosted test execution
- server-side concurrency
- synchronous commit streaming via WebSocket
- transformer chain fidelity
- system-wide regression coverage
- general library stability

---

### [parse]

Interactive transformation between HTML, JSON, and HSON. As input changes each panel updates synchronously.

Demonstrates:

- canonical intermediate representation
- deterministic transforms
- round-trip stability
- mixed content handling
- realtime parsing

---

### [build]

A live HSON markup editor. Valid HSON in the left panel is parsed and immediately reflected as browser DOM on the right. 

Demonstrates:

- HSON as viable document markup
- direct graph-to-DOM reflection
- realtime document construction
- the connection between hson.transform and LiveTree

---

### [point]

A diagnostic utility showing pointer position, document hierarchy beneath the cursor, and directional information.

It combines browser geometry, pointer events, DOM inspection, and a continuously updated display within a small LiveTree interface.

Demonstrates:

- live browser geometry
- document inspection
- event-driven graph updates
- synchronized diagnostic output

---

### [oklch]

An interactive system color editor.

Every slider, numeric field, color value, and preview is synchronized through a self-contained LiveMap. Changes made through any control are reflected across the rest of the app.

Demonstrates:

- user-input control
- subscription & update synchronicity
- dynamic state shared across independent UI elements

---

### [cells]

A small resizable mock-spreadsheet.

Cell contents, selection, dimensions, and editing state are coordinated through LiveMap and reflected via LiveTree bindings. Changes to the sheet remain part of a single observable graph rather than distributed across individual DOM elements. // "and reflected via LiveTree bindings" is this accurate-enough?

Demonstrates:

- structured application state
- dynamic rows and columns
- selection and editing
- resizable layout
- synchronized graph operations across interrelated UI elements

---

### [amoebi]

An experimental organic UI.

Amoebi combines generated geometry, independent interactive elements, and changing visual state through LiveMap. Each organism remains part of a shared graph while retaining its own properties and behavior. // this is still too vague

Demonstrates:

// - dynamic graph creation // enh? who cares kinda?
// - many independently changing entities // only if we can say why this is cool and uniquely cool to hson-live
- interacting shared and per-entity state // I added 'interacting'; might delete later
- automatic graph-driven visual updates // added 'automatic
- immediate synchronization without reconciliation // reworded

---

### [TOWL]

**Tug Of War Live**

A deliberately multiplayer game built around a single authoritative LiveHost graph.

Two browsers access the same 'room' via an invite link and register with the same server-owned game state. Neither maintains a separate canonical copy of the game; the rope position is held by LiveHost server-side. 
// my adds:
// Validated commits from Livehost are update shared authority reflected in client game state. Game state cannoy desync because they both rely on the same single source of truth. 

// we should add that WebSocket is used here; changes to the graph are streamed as pathwise commits rather than transmitted as rendered HTML; clients update game state as they receive commits
// this is big. Let's talk about every way in which it's big, while not belaboring any particular point
Demonstrates:

- single-source-of-truth across multiple clients
- server-owned application state // "incapable of drift"??? let's not be too boastful if that's a stretch
- client actions validated and schema-enforced server-side via LiveHost // idk this needed a bit of rewording
- client page updates via commit stream
- synchronized browser markup stored in LiveHost // ????

---

### [fleurs]

Clicking the background places procedurally generated SVG flowers into the document.

The demonstration exercises LiveTree's SVG construction and document manipulation while remaining intentionally simple.

On mobile devices, fleurs serves as the primary interactive demonstration.

Demonstrates:

- native SVG construction
- procedural document generation
- pointer-driven creation
- direct graph-to-DOM updates

---

## Purpose

The purpose of LiveDemo is to expose the mechanics of hson-live through visible, working examples.

The demonstrations show its subsystems interoperating: HSON as the canonical structure, LiveTree as its browser projection, LiveMap as its state model, and LiveHost as its network authority.

Taken together, they establish:

- one canonical graph for both markup and structured data
- deterministic transformation between HTML, JSON, SVG, XML, and HSON
- live browser documents reflected directly from that graph
- application state whose schema remains enforceable at runtime
- the same state model operating from small local widgets to multiplayer systems
- server-owned state shared by multiple clients without competing canonical copies
- browser interfaces updated through ordered commits rather than reconciliation
- complex interaction built without templates, virtual DOM, or framework state
