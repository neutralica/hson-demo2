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

LiveMap owns and manages both JSON and HTML. When integrated, LiveTree and LiveMap unify view and data in a system that reflects canonical app state in realtime, ensuring changes flow consistently between  hosted environments, local interfaces, and derived views.

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

---

### Locus and LiveHost

Locus is a server-side LiveMap that establishes distributed canonical application state. It manages authority and validation, graph history, recovery, sessions, synchronization, and map persistence. 

Locus accepts mutation requests from clients, validates them, and communicates changes via an ordered commit history. Clients do not own their state; they instead track graph changes streamed from Locus over WebSocket. 

---

LiveHost provides hson-live's application layer and HTTP + WebSocket implementations, managing requests, connections, sessions, readiness, and runtime boundaries to create an end-to-end full stack pipeline with a single source of application truth. 


The result is a shared system model where multiple clients remain synchronized to the same underlying graph, with revision tracking, recovery, and state coordination built in.

---

# Demos

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

A deliberately simple multiplayer "game" and proof of concept demonstrating Locus's authority over shared app state. Users share their room link url with another player via text or email; when both are joined in the same "room" they may compete in a hosted game of tug of war. 

Each browser maintains a local mirror of the room's authoritative game state — the simplest state object possible, containing a single value: rope position. 

As players press 'pull', input is sent to the server as a change request. Locus validates requests, applies mutation, increments revision, and streams changes to each client via commits. Rather than maintaining a separate game state, clients subscribe to the authoritative rope position; their LiveTree bindings update DOM as underlying graph state changes. 

Using Locus as the shared source of server truth, browsers stay aligned on a single canonical graph and revision history without complex synchronization, peer-to-peer coordination, or independent client simulation.

---

### [fleurs]

Clicking the background places randomly generated SVG flowers into the document. LiveTree applies generated JavaScript values directly as dynamic SVG and CSS properties without an intermediate class or custom-property layer.

This is how the author shows his mother what he is working on. 

---

## Purpose

The purpose of LiveDemo is to expose the mechanics of hson-live through visible, working examples. The demonstrations show its interoperating subsystems: 

- HSON - canonical structure 
- Transform - conversion engine
- LiveTree - browse projection 
- LiveMap - state model 
- Locus - one-map server authority
- LiveHost - network runtime.

Taken together, these establish:

- HTML and JSON joined in one canonical typed graph format
- stable, deterministic, lossless transformation between HTML, JSON, and HSON
- live browser documents projected directly from a single canonical graph state
- document structure, application data, styling, and interaction managed in one low-friction ecosystem
- TypeScript-compatible schema enforcement at runtime
- direct two-way linkage between application state and browser view
- server-owned authoritative single state, shared across clients
- browser updates driven by server-side graph commits across the network
- complex interactive documents built without templates, virtual or shadow DOM, frameworks, or reconciliation steps