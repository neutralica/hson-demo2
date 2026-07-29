# hson::LiveDemo

## HSON — a unified notation for HTML and JSON

LiveDemo is the public-facing test and development environment for hson-live, and the first application built entirely with it.

Its interactive demos showcase the working features and components of hson-live as well as the occasional rough draft. LiveDemo is the hub for documentation, architectural experiments, regression tests, and examples of the library's functionality.

---

### What is HSON?

HSON (Hypertext Structured Object Notation) is a "glue format." It models the tree structure shared by JSON and HTML, and can fully express both in a single notation.

*By parsing to HSON as an intermediary step, HTML can be represented as valid JSON, and vice versa. This is the key insight that powers hson-live.*

---

## What is hson-live?

hson-live is a TypeScript library that comprises four interdependent subsystems.

### hson.transform

hson-live's transformation layer forms a circuit that converts HTML, JSON, SVG, and XML to and from HSON. Its parsers and serializers preserve document structure and user data: round-trip transformations across all formats remain deterministic and stable.

hson-live is built on this shared canonical representation.

---

### LiveTree

LiveTree reflects a live browser document directly from a HSON graph and provides a dense but concise API for mutating the graph underlying the DOM.

Each node in a LiveTree graph corresponds to an element. Complex documents can be constructed, modified, styled, animated, and decommissioned through a unified API. Mutations to the underlying HSON graph are synchronously reflected in browser DOM.

Within a single typed, low-friction interface, LiveTree provides:

- typed construction and lifecycle management across HTML, SVG, forms, and canvas
- native SVG creation with automatic namespace propagation
- complete CSS systems scoped to individual nodes
- keyframes, animation, custom properties, and `@property`
- managed events and event listeners
- canvas creation, context access, and drawing utilities
- typed form, textarea, select, and input handling
- automatic teardown of styles, listeners, bindings, and other resources when nodes are removed

---

### LiveMap

LiveMap builds a general-purpose state system onto the HSON graph. Where LiveTree handles the HTML side of HSON, LiveMap handles the JSON side.

LiveMap provides:

- graph-backed application state held as a single source of truth
- typed projections from canonical graph state into ordinary application data
- schema validation with runtime enforcement of TypeScript-defined contracts
- subscriptions to values, paths, selections, and structured change records
- selectors that derive and observe focused views of larger state
- revision history with replay, rewind, and recovery
- atomic batches and fluent writes across nested graph state
- immutable snapshots for fixed views of state
- live links between maps and two-way bindings between data and interface
- node handles exposing conventional object and array operations through one typed API
- typed path proxies for direct traversal, reading, and mutation through familiar JavaScript syntax

LiveMap schemas extend compile-time guarantees into the running application. Changes are validated before entering the canonical graph, keeping state within its declared contract after deployment.

LiveMap's flexibility as both local state machine and shared application store is demonstrated throughout LiveDemo.

#### Live interfaces

LiveMap values can be bound directly to LiveTree content, attributes, form controls, and styles. When the source graph changes, those bindings update the browser document immediately.

The same mechanism works in both directions: user input can update LiveMap state, and accepted state changes can flow back into the interface without a separate reconciliation layer.

---

### LiveHost

LiveHost moves the canonical graph to the server.

It extends LiveMap across the network, establishing a single authoritative state graph and the protocol used to access it. Browser clients do not own competing copies of application state. They submit actions to LiveHost, which validates permissions, payloads, schemas, and revisions before accepting a change.

Accepted mutations become ordered canonical commits. Those commits are streamed to connected clients, which apply the same pathwise changes to their local LiveMap and LiveTree interfaces.

LiveHost provides:

- authoritative server-owned graph state
- ordered commit streaming over persistent connections
- schema and permission enforcement at the authority boundary
- hosted actions that convert client intent into validated mutations
- concurrent access by multiple clients
- revision tracking, replay, and gap recovery
- snapshots for initial connection and recovery
- session resumption from the last confirmed revision
- persistence and restoration of hosted state
- path-scoped subscriptions and targeted state publication

LiveHost keeps the source of truth on the server while allowing the browser client to remain thin. Clients receive state changes rather than rendered pages and reflect accepted commits directly into their own HSON graphs.

---

## Demos

Each demo exists to showcase an architectural capability of hson-live or prove a claim made here.

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

Pointer data and inspected DOM state are continuously reflected into a LiveTree display, turning changing browser conditions into directly observable graph state.

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
- immediate synchronization without reconciliation

---

### [TOWL]
Tug Of War Live
A deliberately simple multiplayer proof of concept for LiveHost as a server-hosted state authority. The game state is an authoritative HSON graph which connected clients follow.

Players join the same 'lobby' via invite links. The players, teams, round status, scores, and rope position value exist and are managed in LiveHost. Each browser maintains a local LiveMap mirror of that hosted graph. 

Player input is sent to LiveHost as requests to change the state. There is no direct client-side mutation — LiveHost validates the change request and schema, applies the accepted change to the authoritative graph, assigns the next revision, and streams the resulting pathwise commit to every subscribed client.
Once accepted, the rope’s new position becomes part of the authoritative graph, and every subscribed interface reflects that same committed fact.

Both clients apply that same ordered stream to their local mirrors and their LiveTree interfaces update from the new graph state. The browsers stay aligned because they are not negotiating with each other or independently reproducing the game: they are continuously following the same canonical graph and revision history from LiveHost.

• one canonical game state graph shared by multiple clients
• browser-local LiveMap mirrors kept aligned with a hosted authority
• player input expressed as validated requests to mutate shared state
• ordered, revisioned, pathwise commits streamed over WebSocket
• server-owned schema, action, and game-rule enforcement
• synchronized LiveTree interfaces derived from the same accepted graph state
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