hson-demo2

hson-demo2 is an interactive demonstration environment for hson-live, a system for representing HTML, JSON, SVG, and related formats in a shared intermediate representation.

The demo is intentionally lightweight. Most documentation lives inside the demo itself.

Live demo:
https://terminalgothic.com

Main project:
https://github.com/neutralica/hson-live

⸻

What this demo shows

The panels in the interface expose several parts of the system and demonstrate different capabilities of the architecture.

about

Displays the README and full documentation for hson-live and its subsystems.

Use this panel as the primary entry point for understanding the project architecture.

⸻

test

Runs an expanding suite of fixtures and verifies the results.

Demonstrates
	•	parser stability
	•	consistent round-trip transformations
	•	resilience across mixed HTML / JSON / SVG inputs

In short: this panel proves the transformation system behaves deterministically.

⸻

parse

Allows you to paste HTML or JSON strings and immediately view their equivalent representations in other supported formats.

Demonstrates
	•	the HSON syntax and structure
	•	the ability to ingest arbitrary valid strings
	•	round-trip stability across formats
	•	realtime updating as the input changes

This panel also hints at how the system could be used in interactive tooling.

⸻

build

The left panel contains an editable HSON document.

As valid input is produced, the right panel parses the document and renders the resulting HTML.

Demonstrates
	•	realtime parsing and rendering
	•	the viability of HSON as a markup format
	•	responsive document construction without templates or frameworks

⸻

mouse

A small diagnostic widget that tracks the mouse pointer across the document.

The panel displays:
	•	screen coordinates
	•	the current HTMLElement stack
	•	pointer position

All values update continuously.

Demonstrates
	•	realtime DOM updates
	•	simple access to pointer coordinates
	•	direct interaction with the node graph instead of traditional DOM queries

⸻

fleurs

Clears the interface and activates the flower generator.

This demo renders animated SVG structures that respond to pointer position.

Demonstrates
	•	SVG handling within the system
	•	realtime DOM mutation
	•	interactive graphics driven by the node graph

⸻

What is hson-live?

hson-live provides two core systems:

hson.transform

A set of transformers that convert HTML, JSON, SVG, XML, and HSON into a shared HsonNode intermediate representation and back again.

These conversions preserve structure, ordering, attributes, and mixed content so that repeated round-trip transformations do not drift.

LiveTree

An interface that projects live DOM elements from the HsonNode graph.

Mutations to the graph are synchronously reflected in the DOM, allowing documents to be created and manipulated without templates, reconciliation layers, or framework abstractions.

⸻

Purpose of this demo

The goal of liveDemo is not to present a polished UI, but to expose the mechanics of the system in a visible way.

Each panel demonstrates at least one of these properties:
• data integrity and stability within hson-live's system
• round-trip transformation fidelity
• locally-scoped and typed CSS without use of Shadow DOM
• realtime mutation of the DOM in reaction to IR changes
• unified representation of markup and data
• direct manipulation of document structure entirely with hson-live

Taken together, these demos sketch out a vision for a new way of building interactive web interfaces.