# hson::LiveDemo
### HSON — a unified notation for HTML and JSON

LiveDemo is an interactive showcase environment for HSON and the hson-live library. It is the first website built with hson-live; its purpose is to demonstrate the features and functionality that HSON enables.


### LiveDemo (this site)
`https://terminalgothic.com/hson`

### main project repository
`https://github.com/neutralica/hson-live`

### npm package
```
npm install hson-live
```

---

## What is HSON?

HSON stands for Hypertext Structured Object Notation. It expresses both JSON and HTML in a single notation, allowing these formats to be faithfully converted to the other and back.

HSON suggests an alternative to "view = f(state)":

`view ≡ state`

hson-live is a runtime built on that equivalence.


## What is hson-live?

hson-live is a Typescript library that transforms data from JSON or HTML to HSON and, leveraging the union of data and markup, extends an API for a new approach to DOM authoring. 

hson-live provides two core systems:

### hson.transform

hson-live's core is a set of 7 transformers that accept and emit HTML, JSON, SVG, XML, and HSON. These transformations preserve structure, ordering, attributes, and mixed content. Repeated round-trip conversions do not drift, distort, or mutate user data.

LiveDemo's test suites demonstrate the stability of hson-live's transformater chain across multiple round-trip conversions (see: [test]).


### hson.liveTree

LiveTree is an interface that projects live DOM elements from a HsonNode graph. It extends many conventional DOM-creation operations in its API, enabling: 
- typed, element-scoped CSS without Shadow DOM
- managed event listener handling and teardown
- native SVG creation
- native support for keyframes, animation, and @property
- complex document construction and manipulation 
- integration of JS, CSS, and HTML within a single frictionless ecosystem

Mutations to LiveTree's HsonNode graph are synchronously reflected in the DOM, allowing documents to be created and manipulated without templates, reconciliation layers, or framework abstractions.

LiveDemo has been built to prove the viability of LiveTree. It is entirely built using the hson-live library and does not call any conventional DOM-creation methods. Its various demos showcase the features and functionality that HSON enables:


### [about]

Builds and renders from markdown the README and other documentation for hson-live and its subsystems.

This section contains detailed information about the architecture, structural syntax decisions, and a complete LiveTree API reference (may be out of date).


---

### [test]

Runs test suites for hson.transform and hson.livetree. Each transformation step is captures and serialized for inspection.

Demonstrates

- parser stability  
- consistent round-trip transformations  
- resilience across mixed HTML / JSON / SVG inputs  

This panel shows that the transformation system behaves deterministically and preserves the integrity of user data.


---

### [parse]

Users may paste HTML, JSON, or HSON strings and immediately view their equivalent representations in the other formats.

Demonstrates

- HSON syntax and structure  
- representation of other formats within HSON  
- the transform chain’s ability to work with any valid JSON or XML-compatible HTML  
- round-trip stability across formats  
- realtime updating as input changes  



---

### [build]

The left panel contains a textarea with an editable HSON document.

As valid input is produced, the HSON is parsed and the resulting HTML is rendered in the right panel.

Demonstrates

- realtime parsing and rendering  
- HSON's viability as a markup format  
- fine-grained document construction without templates or frameworks  


---

### [mouse]

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

### [fleurs]

This demo clears the interface and, when the background is clicked, renders an SVG flower at the current pointer position.

Demonstrates

- native typed SVG handling within liveTree
- realtime DOM mutation
- interactive graphics driven directly by the node graph  

On mobile, only [fleurs] is available

---

## Purpose of this demo

The goal of LiveDemo is expose the mechanics of the hson-live library in a visible way; its styling is intentionally minimalist. 

Each demo proves at least one of these properties of hson-live:

- data integrity and stability within the transformation system  
- round-trip, repeated transformation fidelity
- locally scoped and typed CSS without Shadow DOM  
- realtime DOM creation and mutation in response to IR changes  
- unified representation of markup and data  
- HSON as viable markup format

Taken together, these demos sketch an approach for building lightweight interactive web interfaces by leveraging the unified representation of markup and data.

LiveDemo will expand alongside future versions of hson-live.


© 2026 terminal_gothic. All rights reserved except as granted under the Public Parity License 7.0.