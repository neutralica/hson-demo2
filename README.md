# hson::LiveDemo

## HSON — a unified notation for HTML and JSON

LiveDemo is an interactive showcase environment for HSON, and the first website built with hson-live. Its interactive demos, tests, and full documentation demonstrate the potential of HSON and hson-live. 


### What is HSON?

HSON (Hypertext Structured Object Notation) is a glue format. It is capable of fully expressing both JSON and HTML in a single notation. 
*By parsing to HSON as an intermediary step, HTML can be converted to JSON, and vice versa. These idempotent transformations are stable and lossless.  

### What is hson-live?

hson-live is a Typescript library with two main functions. 

### LiveDemo (this site)
`https://terminalgothic.com/hson`

### main project repository
`https://github.com/neutralica/hson-live`

### npm package
```
npm install hson-live
```

---


### hson.transform

hson-live is built around a core of 7 tokenizers, parsers, and serializers that accept and emit HTML, JSON, SVG, XML, and HSON. These transformations preserve structure, ordering, attributes, and mixed content. Repeated round-trip conversions do not drift, distort, or mutate user data.

LiveDemo's [test] showcase features more than 1000 system tests that prove the stability of hson-live's transformater chain across round-trip conversions.


### hson.liveTree

LiveTree is an interface based on HSON that projects live DOM elements from a HsonNode graph and extends DOM-manipulation methods via its API. By operating on a structure that both HTML and JSON share, HSON allows DOM HTML to be directly accessible in Typescript, enabling: 
- typed, element-scoped CSS without Shadow DOM
- managed event listener handling and teardown
- native SVG creation
- native support for keyframes, animation, and @property
- construction, manipulation, and cleanup of complex documents
- integration of JS, CSS, and HTML within a single frictionless ecosystem

Mutations to LiveTree's HsonNode graph are synchronously reflected in the DOM, allowing documents to be created, manipulated, and automatically re-rendered without reconciliation layers, templates, or framework abstractions. 

---

## LiveDemo

LiveDemo (www.terminalgothic.com/hson) has been built to prove the viability of HSON. The entire site is built using only the hson-live library and does not use any conventional DOM-creation methods except where e.g. test verification requires external confirmation of truth. 

The various demos in LiveDemo showcase the features and functionality that HSON enables:


### [about]

Full documentation for hson-live and its subsystems.

This section contains detailed information about the architecture, structural syntax decisions, and API.


---

### [test]

An expanding set of transform, liveTree, and unit tests. Transformation tests provide full string and node logs for inspection. 

Demonstrates

- parser stability  
- consistent round-trip transformations  
- resilience across mixed HTML / JSON / SVG inputs  

This panel shows that the transformation system behaves deterministically and preserves the integrity of user data.


---

### [parse]

Users may paste HTML, JSON, or HSON strings into their respective panels and immediately receive their equivalent representations in the other formats. With each change the parsing panels auto-update synchronously while input remains valid.

Demonstrates

- HSON syntax and structure  
- representation of other formats within HSON  
- the transform chain’s ability to work with any valid JSON or XML-compatible HTML  
- round-trip stability across formats  
- realtime updating as input changes  



---

### [build]

The left panel contains a textarea with an editable HSON document.

While input is valid, changes to the HSON are parsed and the resulting HTML is rendered in the right panel in realtime.

Demonstrates

- realtime parsing and rendering  
- HSON's viability as a markup format
- HsonNode graph as markup source of truth


---

### [mouse]

A diagnostic widget that tracks the mouse pointer while in the browser window.

The panel displays in realtime:

- screen coordinates  
- the current HTMLElement stack  
- a pointer indicating the direction of the cursor  

Demonstrates

- direct interaction with and mutation of the HsonNode graph
- simple access to pointer coordinates
- responsive DOM updates


---

### [fleurs]

This demo clears the interface and, when the background is clicked, renders an SVG flower at the current pointer position.

Demonstrates

- native typed SVG handling within liveTree
- realtime DOM mutation
- interactive graphics driven directly by the node graph
- dynamic markup and CSS integration

On mobile, only [fleurs] is available.

---

## Purpose of this demo

The goal of LiveDemo is expose the mechanics of the hson-live library in a visible way. Each demo proves at least one of these properties of hson-live:

- data integrity and stability within the transformation system across repeated loops
- locally scoped and typed CSS without Shadow DOM 
- realtime DOM creation and mutation in response to IR changes 
- unified representation of markup and data  
- HSON as viable markup format

Taken together, these demos sketch an approach for building lightweight interactive web interfaces by leveraging the unified representation of markup and data. 

LiveDemo will expand alongside future versions of hson-live.


© 2026 terminal_gothic. All rights reserved except as granted under the Public Parity License 7.0.