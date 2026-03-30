# hson-LiveDemo
### hson-live — a unified format for HTML markup and JSON data

LiveDemo is an interactive demonstration environment for HSON, a "glue format" that unifies HTML and JSON through a shared intermediate representation, and hson-live, a library that explores the possibilities this unlocks. 

LiveDemo is the first website built entirely with hson-live. Its interactive demos showcase the features and functionality of the hson-live library and propose a new way of authoring the web.


### Live demo (this site)
`https://terminalgothic.com/hson`

### Main project repository
`https://github.com/neutralica/hson-live`

### npm package
```
npm install hson-live
```

---

## What is HSON?

HSON stands for Hypertext Structured Object Notation. Its syntax expresses both JSON and HTML in a single notation, allowing each format to be faithfully converted to the other and back.

In HSON, UI is not a function of state. By combining markup and data in a single bilingual syntax, HSON proposes a new paradigm: 
```

view ≡ data

```

hson-live explores this paradigm.


## What is hson-live?

hson-live is a Typescript library that transforms from JSON or HTML to HSON and, leveraging the unity of data and markup, extends an API for a new way of DOM authoring. 

hson-live provides two core systems:

## hson.transform

hson-live's core is a set of 7 transformers that accept and emit HTML, JSON, SVG, XML, and HSON. These transformations preserve structure, ordering, attributes, and mixed content. Repeated round-trip conversions do not drift, distort, or mutate user data.

LiveDemo offers a growing set of test fixtures that showcase hson-live's transformation chain and prove its stability (see: [test]).


## hson.liveTree

LiveTree is an interface that projects live DOM elements from the HsonNode graph. It extends many conventional DOM-creation operations in its API, enabling: 
- typed, element-scoped CSS 
- managed event listener handling and teardown
- native SVG creation
- native support for keyframes, animation, and @property
- complex document construction and manipulation 
- integration of JS, CSS, and HTML all within a single frictionless ecosystem

Mutations to LiveTree's HsonNode graph are synchronously reflected in the DOM, allowing documents to be created and manipulated without templates, reconciliation layers, or framework abstractions.

LiveDemo is built to prove the viability of liveTree's web authoring potential. 

---

## Getting started

The fastest way to understand hson-live is to explore the interactive showcase, LiveDemo:

`https://terminalgothic.com/hson`

Each demo demonstrates various features and properties of HSON and LiveTree.


### about

Displays the README and comprehensive documentation for hson-live and its subsystems.

This section contains detailed information about the architecture, structural syntax decisions, and a complete LiveTree API reference.


---

### test

Runs test suites for hson.transform and hson.livetree. Each transformation step is captures and serialized for inspection.

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



---

### build

The left panel contains a textarea with an editable HSON document.

As valid input is produced, the HSON is parsed and the resulting HTML is rendered in the right panel.

Demonstrates

- realtime parsing and rendering  
- HSON's viability as a markup format  
- fine-grained document construction without templates or frameworks  


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

- native typed SVG handling within liveTree
- realtime DOM mutation
- interactive graphics driven directly by the node graph  

---

## Purpose of this demo

The goal of LiveDemo is expose the mechanics of the hson-live library in a visible way; its styling is intentionally minimalist. 

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