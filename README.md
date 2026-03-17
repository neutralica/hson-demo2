# hson-LiveDemo
### hson-live — a unified format for HTML markup and JSON data

LiveDemo is an interactive demonstration environment for hson-live, a glue format that unifies HTML and JSON through a shared intermediate representation.

The demo is intentionally lightweight and exists primarily to provide documentation and interactive examples of hson-live's capabilities.

### Live demo
`https://terminalgothic.com/hson`

### Main project repository
`https://github.com/neutralica/hson-live`

### npm package
npm install hson-live


---

## Getting started

The fastest way to understand hson-live is to explore the interactive demo:

https://terminalgothic.com/hson

Each panel in the interface demonstrates a different property of the system and exposes parts of the architecture in a visible way.


---

## Demonstrated here

The menu options in the interface demonstrate different capabilities of the hson-live system.


### about

Displays the README and documentation for hson-live and its subsystems.

This section contains detailed information about the architecture, structural syntax decisions, and a complete LiveTree API reference.


---

### test

Runs an expanding suite of fixtures and verifies the results.

Demonstrates

- parser stability  
- consistent round-trip transformations  
- resilience across mixed HTML / JSON / SVG inputs  

This panel demonstrates that the transformation system behaves deterministically and preserves the integrity of user data.


---

### parse

Users may paste HTML, JSON, or HSON strings and immediately view their equivalent representations in the other formats.

Demonstrates

- HSON syntax and structure  
- representation of other formats within HSON  
- the transform chain’s ability to work with any valid JSON or XML-compatible HTML  
- round-trip stability across formats  
- realtime updating as input changes  

This panel also hints at the possibilities for interactive tooling built on top of the system.


---

### build

The left panel contains a textarea with an editable HSON document.

As valid input is produced, the HSON is parsed and the resulting HTML is rendered in the right panel.

Demonstrates

- realtime parsing and rendering  
- the viability of HSON as a markup format  
- responsive document construction without templates or frameworks  


---

### mouse

A diagnostic widget that tracks the mouse pointer across the browser window.

The panel displays and continuously updates:

- screen coordinates  
- the current HTMLElement stack  
- a pointer indicating the direction of the cursor  

Demonstrates

- realtime DOM updates  
- simple access to pointer coordinates  
- direct interaction with and mutation of the node graph without traditional DOM queries  


---

### fleurs

This demo clears the interface and, when the background is clicked, renders an SVG flower at the current pointer position.

Demonstrates

- SVG support within hson-live  
- realtime DOM mutation  
- interactive graphics driven directly by the node graph  


---

## What is hson-live?

hson-live provides two core systems.


### hson.transform

A set of transformers that convert HTML, JSON, SVG, XML, and HSON into a shared HsonNode intermediate representation and back again.

These transformations preserve structure, ordering, attributes, and mixed content so that repeated round-trip conversions do not drift.


### hson.liveTree

LiveTree is an interface that projects live DOM elements from the HsonNode graph.

Mutations to the graph are synchronously reflected in the DOM, allowing documents to be created and manipulated without templates, reconciliation layers, or framework abstractions.


---

## Purpose of this demo

The goal of LiveDemo is expose the mechanics of the hson-live library in a visible way, rather than showcase a polished UI; its styling is intentionally minimalist. 

Each demo proves at least one of these properties of hson-live:

- data integrity and stability within the transformation system  
- round-trip, repeated transformation fidelity
- locally scoped and typed CSS without Shadow DOM  
- realtime DOM mutation in response to IR changes  
- unified representation of markup and data  
- creation of document elements using hson as viable markup 

Taken together, these demos sketch an approach for building lightweight interactive web interfaces by leveraging the unified representation of markup and data.

LiveDemo will expand alongside future versions of hson-live.


© 2026 terminal_gothic LLC. All rights reserved except as granted under the Public Parity License 7.0.