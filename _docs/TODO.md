
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

You covered:
	•	remove + reappend

But not:
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