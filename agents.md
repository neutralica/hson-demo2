# agents.md

This repository is a demo / integration surface for HSON + LiveTree + Intrastructure.
Agents working in this repo must follow the rules below.

## 1. Scope and intent

- This repo exists to *demonstrate* libraries, not redesign them.
- Do NOT modify library code in:
  - hson-live
  - intrastructure
  - any dependency
- Fix issues by correcting imports, wiring, configuration, or usage in this repo only.

## 2. DOM and rendering rules

- ❌ Do NOT use document.* APIs:
  - document.createElement
  - document.querySelector / querySelectorAll
  - appendChild / removeChild
  - innerHTML
- ❌ Do NOT call asDomElement().
- ✅ All DOM-visible structure must be created or mutated via LiveTree APIs only.
- Treat LiveTree as the sole authority for “data === view”.

## 3. Error and control-flow rules (Intrastructure)

- All meaningful success/failure must be represented as Outcome<T>.
- Use:
  - relay.data / relay.ok / relay.err for construction
  - try_* wrappers at *unit-of-work* boundaries only
- Do NOT wrap every LiveTree mutation in an Outcome.
- Do NOT invent new error-handling abstractions.
- Do NOT throw except inside approved “unwrap or crash” helpers.

## 4. LiveTree usage rules

- LiveTree fluent methods (returning LiveTree) are allowed and encouraged.
- Do NOT attempt to chain Outcomes.
- Use Outcomes only at uncertainty boundaries (bootstrap, find, IO, parsing).
- Assume LiveTree mutation methods are non-failing once a valid handle exists.

## 5. Imports and module identity (critical)

- Runtime values (LiveTree, hson, helpers) MUST be imported from:
  - "hson-live"
- Avoid importing runtime values from "hson-live/types".
- Avoid path aliases or local links to library source code.
- There must be exactly ONE runtime instance of hson-live.
- If methods appear “missing”, investigate module duplication or aliasing first.

## 6. Configuration hygiene

- Check tsconfig paths / bundler aliases before touching code.
- Prefer mechanical fixes over refactors.
- Keep diffs small and reversible.

## 7. Style and tone

- Prefer concise code over defensive verbosity.
- Avoid abstractions unless they clearly reduce steps.
- Do not “future-proof” unless explicitly instructed.
- Do not add features or widgets unless the task explicitly asks for it.

## 8. When in doubt

- Stop and report ambiguity rather than guessing.
- Provide a short diagnosis and proposed fix before making sweeping changes.