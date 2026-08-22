# hson::LiveDemo

## HSON — a unified notation for HTML and JSON

LiveDemo is the public-facing test and development environment for hson-live, and the first application built entirely with it.

Its interactive demos showcase the working features and components of hson-live as well as the occasional rough draft. LiveDemo is the hub for documentation, architectural experiments, regression tests, and examples of the library's functionality.

---

## What is HSON?

HSON (Hypertext Structured Object Notation) is a "glue format." It models the tree structure shared by JSON and HTML, and can fully express both in a single notation.

#### By parsing to HSON as an intermediary step, HTML can be represented as valid JSON, and vice versa. This is the key insight that powers hson-live.

---

## What is hson-live?

hson-live is a web authoring environment built on top of HSON.

### hson.transform

hson-live's transformation layer forms a circuit that converts HTML, JSON, SVG, and XML to and from HSON. Its parsers and serializers preserve document structure and user data: round-trip transformations across all formats remain deterministic and stable.

hson-live is built on this shared canonical representation.

---

### LiveTree

LiveTree is a responsive HTML interface that replaces the DOM with a live projection from a canonical HSON source graph. It renders live browser documents to the DOM and provides a rich API for creating, modifying, styling, and interacting with page markup.

By editing the the underlying HSON graph, LiveTree offers an editing surface for markup content, styling, and interaction. Alone, it provides a self-contained document runtime for the browser. When integrated with LiveMap it becomes a projection endpoint for responsive, "live" user interfaces that respond to state changes in realtime.


---

### LiveMap

LiveMap manages application data via a HSON graph-based state machine. It provides graph editing, schema enforcement, subscriber updates, LiveTree bindings, and commit history. 

LiveMap owns and manages both JSON and HTML. When integrated with LiveTree, LiveMap unifies view and data in a single system that reflects canonical app state in realtime, ensuring changes flow consistently between local interfaces, derived views, and hosted environments

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

### Locus and LiveHost

Locus is a server-side LiveMap that establishes distributed canonical application state. It manages authority and validation, graph history, recovery, sessions, synchronization, and map persistence. 

Locus accepts mutation requests from clients, validates them, and communicates changes via an ordered commit history. Clients do not own their state; they instead track graph changes streamed from Locus over WebSocket. 

#__#

LiveHost provides hson-live's application layer and HTTP + WebSocket implementations, managing requests, connections, sessions, readiness, and runtime boundaries to create an end-to-end full stack pipeline with a single source of application truth. 


The result is a shared system model where multiple clients remain synchronized to the same underlying graph, with revision tracking, recovery, and state coordination built in.

---

## Demos

---

### [about]

Complete documentation for HSON, hson-live, and related subsystems.

---

### [test]

hson-live's full test harness of over 5500 cases is publicly accessible for independent verification. These tests cover all aspects of the system:

- repeated three-format transformation circuits
- parser and serializer fidelity
- HSON graph invariants
- system-wide regression coverage
- LiveTree construction, mutation, styling, events, SVG, canvas, and forms
- LiveMap paths, schemas, subscriptions, history, batching, proxies, links, and node operations
- Locus actions, commits, recovery, permissions, sessions, snapshots, and protocol behavior

All tests are executed server-side by Locus, which streams results to the browser as each test completes.

---

### [parse]

[parse] offers 3-way conversion from HTML, JSON, or HSON. Panels update synchronously as valid input is entered. [parse] is a useful way to obtain canonical HSON from any valid JSON or HTML string.

---

### [build]

A live editor demonstrating HSON's viability as a markup notation. Visitors edit the HSON in the left panel; if valid, it is parsed and immediately reflected as browser DOM in the right panel.

---

### [point]

A reference interface that turns dynamic browser conditions — pointer position, browser geometry, and document hierarchy — into directly observable graph state that updates synchronously with mouse cursor movement.


---

### [oklch]

An interactive color picker directly that edits the underlying color system state (an HSON graph), with changes updated synchronously throughout the application.

---

### [cells]

A mock spreadsheet app. Cell contents, selection, dimensions, and editing state are held in LiveMap and reflected through LiveTree. User changes to cell contents are validated and updated across the spreadsheet, demonstrating the bidirectional control of graph state between LiveMap and LiveTree.

---

### [amoebi]

An experimental organic interface built from generated HSON structures.

Each amoeba combines its own geometry, controls, styling, and behavioral state while remaining part of the larger LiveMap. Shared controls affect the population as a whole, while individual organisms retain independently addressable state. 

The result is a fluid, automatically-updating interface assembled and orchestrated via canonical graph operations rather than isolated component state.

---

### [TOWL - Tug Of War Live]

A deliberately simple multiplayer "game" and proof of concept demonstrating a Locus as
authority over one game state LiveMap. 

The application interprets room-scoped
invite links and acquires the corresponding Locus. Player status, rounds,
scores, and rope position live in that authoritative graph. Each browser
maintains a local LiveMap mirror.

Player input is sent as a Locus action. There is no direct client-side mutation:
the application supplies game semantics and authorization, while Locus admits
the action, applies accepted canonical mutation, assigns the next revision, and
streams the resulting pathwise commit to subscribed clients.
Once accepted, the rope’s new position becomes part of the authoritative graph.

Subscribed clients apply that same ordered commit stream to local LiveMap
mirrors; LiveTree bindings update with graph state. The browsers stay aligned
because they follow one Locus's canonical graph and revision history.

• application-owned game rules with Locus action and schema enforcement
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

The demonstrations show its subsystems interoperating: HSON as the canonical
structure, hson.transform as its conversion circuit, LiveTree as its browser
projection, LiveMap as its state model, Locus as one-map authority, the
application as semantic/topology owner, and Node LiveHost as the network runtime.

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
