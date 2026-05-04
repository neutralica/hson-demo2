

LiveDemo TODO
03MAY2026

* test JSON keys:
	"a b"
	"_id"
	"__typename"
	""
	"000"
	"test:colon"
	"test...elps"
* test HSON more extensively
	<test+plus  "">
	<test:colon  "">
	<test...elps "">
	<...>
		these should not work

* unit tests--which did we do?  
	parser / serializer micro-seams
	selector/scoping helpers
	style parsing/serialization helpers
	DataManager
	ContentManager
	TreeSelector filter/removeAll
	applyAttrToNode
	search_nodes
	cloneBranch / QUID isolation
	listener attach/remove loops
	CSS + removal + reappend
	dataset + refind + clone

* Parsing panel / demo TODOs
	Node-view bug: Panel node view may show the wrong graph/source. Need per-format graph tracking, not one shared “last tree.”
	Validity checks potential improvement:
		parse source
		serialize target
		reparse target
		compare normalized node

* Parsing panel UI - Mostly closed except:
	node/text toggle clarity
	mode switch indicator
	per-panel node view
	styling polish




past; some incomplete:
⸻
<!-- 
A) Scheduling model (lightly covered)

tested:
	•	batching
	•	“after tick”

 not:
	•	multiple rapid writes collapsing into one flush
	•	interleaving reads/writes
	•	ordering guarantees

⸻
 -->

<!-- B) CSS lifecycle management

Missing:
	•	updating existing rules vs replacing
	•	removing CSS (unset / overwrite)
	•	rule deduplication
	•	memory growth (style element bloat)
⸻
 -->
<!-- 
C) Node lifecycle edge cases
	•	removing node with active CSS
	•	removing node with listeners
	•	orphan cleanup (CSS + listeners)

⸻ -->
<!-- 
D) Event system depth

Currently shallow. Missing:
	•	remove listeners
	•	reattach after refind
	•	event delegation vs direct binding
	•	listener identity / duplication

⸻ -->
<!-- 
E) Multi-root / isolation

Everything assumes one tree.

Not covered:
	•	multiple LiveTree instances
	•	CSS isolation between them
	•	selector collisions

⸻ -->
<!-- 
F) Error / invalid input behavior
	•	invalid selectors
	•	invalid tree operations
	•	malformed inputs to APIs

⸻ -->
<!-- 
G) Serialization / hydration edges
	•	IR → DOM → IR roundtrip not deeply tested
	•	partial DOM presence vs IR-only nodes

⸻ -->
<!-- 
H) Performance-sensitive invariants (behavioral, not benchmarks)

Not tested:
	•	“does not flush unnecessarily”
	•	batching actually reduces writes
	•	no duplicate rules


⸻
 -->

1) Stress / scale invariants
	•	1k nodes with CSS
	•	rapid churn (append/remove)
	•	listener attach/remove loops

2) Ordering guarantees
	•	CSS overrides order
	•	event ordering under batching
	•	sync vs async consistency

3) Cross-system interactions
	•	CSS + removal + reappend
	•	listeners + graft
	•	dataset + refind + clone

4) Serialization / projection integrity
	•	HSON ↔ DOM ↔ LiveTree roundtrips
	•	partial hydration edge cases



5. Recent API regression unit tests

• detached create: HTML vs SVG namespace dispatch
• find.byQuid subtree membership behavior
• dom.treeFromEl soft vs must behavior
• ambient listener owner cleanup registry behavior
• array CSS value normalization to comma lists
• owner registry add/remove/off behavior
• array CSS value normalization
• detached create dispatch logic if there are pure helpers underneath

1) fallback helpers
5) parser / serializer micro-seams TODO / verify