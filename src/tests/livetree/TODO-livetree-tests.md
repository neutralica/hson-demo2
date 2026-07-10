Highest priority
	•	find.byQuid / find.must.byQuid
	•	descendant lookup
	•	root lookup
	•	out-of-tree quid does not resolve
	•	must.byQuid throws clearly
	•	dom.doc / dom.must.doc
	•	mounted exists
	•	detached soft is undefined
	•	detached hard throws
	•	point-query surface exists and works where stable
	•	dom.treeFromEl
	•	resolves mounted root/descendant
	•	soft fails cleanly for foreign element
	•	hard throws for foreign element
	•	listen.document / listen.window / listen.element
	•	fire
	•	off() detaches
	•	once works
	•	ownership cleanup on tree removal

Medium priority
	•	dom.clientSize / dom.must.clientSize
	•	mounted HTML
	•	detached
	•	SVG behavior if intended
	•	detached hson.liveTree.create
	•	HTML tags
	•	SVG tags
	•	namespace correctness
	•	at() / prepend()
	•	tree-bound create fencing
	•	svgTree.create.path() works
	•	divTree.create.path absent/rejected

Lower priority
	•	indirect resolve_tree_el coverage via fixtures
	•	extra CSS pseudo/content edge cases
	•	CSS manager bookkeeping parity checks
	•	HSON highlighter tests
	•	prairie helper tests
    