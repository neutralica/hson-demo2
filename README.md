# hson::LiveDemo

## HSON — a unified notation for HTML and JSON

LiveDemo is the public-facing test and development environment for hson-live, and the first application built entirely with it.

Its interactive demos showcase the working features and components of hson-live as well as the occasional rough draft. LiveDemo is the hub for documentation, architectural experiments, regression tests, and examples of the library's functionality.

---

### What is HSON?

HSON (Hypertext Structured Object Notation) is a "glue format." It models the tree structure shared by JSON and HTML, and can fully express both in a single notation.

#### By parsing to HSON as an intermediary step, HTML can be represented as valid JSON, and vice versa. This is the key insight that powers hson-live.

---

## What is hson-live?

hson-live is a TypeScript library that comprises four interdependent subsystems.

### hson.transform

hson-live's transformation layer forms a circuit that converts HTML, JSON, SVG, and XML to and from HSON. Its parsers and serializers preserve document structure and user data: round-trip transformations across all formats remain deterministic and stable.

hson-live is built on this shared canonical representation.

---

### LiveTree

LiveTree creates live browser documents, projecting to the DOM from the source graph and providing a unified API for creating, modifying, styling, and interacting with graph-backed markup.

Element creation, SVG and canvas support, animations, and events are managed through LiveTree. Structure, CSS, events, and interaction all operate through the same model with changes reflected directly in the browser.

LiveTree owns DOM, CSS, event, and runtime projection resources. It does not share canonical application-state authority with LiveMap.

(LiveTree "is" HTML.)

---

### LiveMap

LiveMap turns the graph model into application state.

State, schemas, history, subscriptions, derived views, and bindings all operate directly on the same graph structure. LiveMap edits the graph and emits changes via commits.

Graph commits become the shared language of the system, allowing state changes to flow consistently between local interfaces, derived views, and hosted environments. LiveMap remains the sole authority for canonical revisioned state.

An interface may optionally connect that state to a view through Reflect:

```text
LiveMap
  owns canonical revisioned state
      ↓
Reflect
  observes commits and reconciles projection state
      ↓
LiveTree
  owns DOM, CSS, event, and runtime projection resources
```

Reflect is an optional projection and reconciliation layer, not an automatic part of every LiveMap.

(LiveMap "is" JSON.)

---

### LiveHost

LiveHost extends the graph into an authoritative server runtime.

LiveMap-LiveTree browser clients interact via server requests over HTTP or WebSocket

Validated actions become ordered commits, updating the canonical state and distributing changes to connected clients.

The result is a shared application model where multiple clients remain synchronized through the same underlying graph, with revision tracking, recovery, and state coordination built into the system.

---

## Demos

---

### [about]

Complete documentation for HSON, LiveTree, LiveMap, LiveHost, and the surrounding architecture.

---

### [test]

The test environment contains more than 2,500 system and unit tests covering:

- repeated three-format transformation circuits
- parser and serializer fidelity
- HSON graph invariants
- system-wide regression coverage
- LiveTree construction, mutation, styling, events, SVG, canvas, and forms
- LiveMap paths, schemas, subscriptions, history, batching, proxies, links, and node operations
- LiveHost actions, commits, recovery, permissions, sessions, snapshots, and protocol behavior

Circuit tests expose intermediate string and node artifacts, allowing every stage of a transformation to be inspected directly.

Test execution is hosted through LiveHost. Independent suites run concurrently on the server, while ordered progress and results are streamed to the browser as they complete.

- server-side concurrency
- hosted test execution
- progressive result streaming

---

### [parse]

Interactive transformation between HTML, JSON, and HSON. As input changes, each panel updates synchronously.

- canonical IR expressed in all formats
- deterministic transforms
- mixed-content handling
- realtime parsing & DOM updates 

---

### [build]

A live HSON markup editor. Valid HSON in the left panel is parsed and immediately reflected as browser DOM in the right panel.

- HSON as viable document markup
- direct graph-to-DOM reflection
- realtime document construction
- the connection between hson.transform and LiveTree

---

### [point]

A diagnostic interface for pointer position, browser geometry, document hierarchy, and direction.

Pointer data and inspected DOM state are continuously reflected in a LiveTree display, turning dynamic browser conditions into directly observable graph state.

Demonstrates:

- live browser geometry
- pointer and document inspection
- continuously updated shared state
- event-driven graph mutation
- bound diagnostic output

---

### [oklch]

An interactive system color editor.

Sliders, numeric fields, resolved color values, CSS variables, and previews share a self-contained LiveMap. A change made through any control enters the same canonical state and is reflected throughout the application.

Demonstrates:

- user-controlled local state
- multiple controls bound to one value
- derived and normalized color data
- subscription-driven updates
- dynamic styling reflected from graph state

---

### [cells]

A small resizable mock spreadsheet.

Cell contents, selection, dimensions, and editing state are held in one LiveMap and reflected into the sheet through LiveTree. Rows and columns remain ordinary structured graph data even while the user edits and resizes their browser representation.

Demonstrates:

- structured application state
- dynamic rows and columns
- selection and inline editing
- resizable layout
- coordinated operations across interrelated data
- direct binding between graph state and interactive markup

---

### [amoebi]

An experimental organic interface built from generated HSON structures.

Each amoeba combines its own geometry, controls, styling, and behavioral state while remaining part of the larger LiveMap. Shared controls can affect the population as a whole, while individual organisms retain independently addressable state.

The result is a fluid interface assembled from ordinary graph operations rather than isolated component state.

Demonstrates:

- generated interactive structures
- shared state interacting with per-entity state
- independent mutation within a common graph
- automatic visual updates from data changes
- optional state-to-view reflection with explicit reconciliation

---

### [TOWL - Tug Of War Live]

A deliberately simple multiplayer proof of concept demonstrating LiveHost as a server-hosted state authority. The game state is an authoritative HSON graph which client connect to via 'room'-scoped invite links. Player status, rounds, scores, and rope position exist and are managed in LiveHost. Each browser maintains a local LiveMap mirror of that hosted graph. 

Player input is sent to LiveHost as requests to change the state. There is no direct client-side mutation — LiveHost validates the change request and schema, applies the accepted change to the authoritative graph, assigns the next revision, and streams the resulting pathwise commit to every subscribed client.
Once accepted, the rope’s new position becomes part of the authoritative graph.

Subscribed clients apply that same ordered commit stream to local LiveMap mirrors;  LiveTree bindings update per changes in graph state. The browsers stay aligned because they are following the same canonical graph and revision history from LiveHost.

• LiveHost server-owned schema, action, and game-rule enforcement
• one canonical game state graph shared by multiple clients
• browser-local LiveMap mirrors kept aligned with a hosted authority
• player input expressed as validated requests to mutate shared state
• ordered, revisioned, pathwise graph changes streamed over WebSocket 
• LiveTree interfaces derived from the same accepted graph state, synchronized across client
• multiplayer consistency without peer-to-peer coordination or independent client simulation

---

### [fleurs]

Clicking the background places procedurally generated SVG flowers into the document.

The demonstration exercises LiveTree's SVG construction and document manipulation while remaining intentionally simple.

On mobile devices, fleurs serves as the primary interactive demonstration.

Demonstrates:

- native SVG construction
- automatic namespace handling
- procedural document generation
- pointer-driven creation
- direct graph-to-DOM updates

---

## Purpose

The purpose of LiveDemo is to expose the mechanics of hson-live through visible, working examples.

The demonstrations show its subsystems interoperating: HSON as the canonical structure, hson.transform as its conversion circuit, LiveTree as its browser projection, LiveMap as its state model, and LiveHost as its network authority.

Taken together, they establish:

- HTML and JSON represented within one canonical typed graph
- deterministic transformation among HTML, JSON, SVG, XML, and HSON
- live browser documents projected directly from canonical graph state
- document structure, application data, styling, and interaction operating within one model
- TypeScript-shaped contracts enforced after compilation at runtime
- the same state system scaling from one local widget to a hosted multiplayer application
- direct two-way linkage between structured data and browser interfaces
- server-owned state shared across clients without competing canonical copies
- ordered graph commits driving browser updates over the network
- complex interactive documents built without templates, virtual DOM, framework state, or reconciliation
