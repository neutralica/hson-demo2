import type { TestCapability, TestSubject } from "../../../../../src/shared/testing/test-contracts";

export type BrowserJourneyManifestEntry = Readonly<{
  id: string;
  title: string;
}>;

export type BrowserSuiteManifestEntry = Readonly<{
  id: string;
  title: string;
  subject: TestSubject;
  path: `tests/integration/browser/${string}.spec.ts`;
  reportPath?: `tests/integration/browser/${string}.ts`;
  requirements: readonly TestCapability[];
  journeys: readonly BrowserJourneyManifestEntry[];
}>;

const BROWSER_DOM_REQUIREMENTS = Object.freeze([
  "javascript", "node", "process", "browser-dom", "browser", "chromium", "network", "local-server",
] as const);

function journeys(titles: readonly string[]): readonly BrowserJourneyManifestEntry[] {
  return Object.freeze(titles.map((title, index) => Object.freeze({
    id: `journey-${String(index + 1).padStart(2, "0")}`,
    title,
  })));
}

function browser_suite(
  name: string,
  titles: readonly string[],
  additionalRequirements: readonly TestCapability[] = Object.freeze([]),
): BrowserSuiteManifestEntry {
  return Object.freeze({
    id: `livedemo/browser/${name}`,
    title: `LiveDemo browser: ${name}`,
    subject: "livedemo",
    path: `tests/integration/browser/${name}.spec.ts`,
    requirements: Object.freeze([...BROWSER_DOM_REQUIREMENTS, ...additionalRequirements]),
    journeys: journeys(titles),
  });
}

export const BROWSER_SUITE_MANIFEST = Object.freeze([
  browser_suite("binary-hson", [
    "browser Binary HSON exact bytes and canonical decode/encode closure",
    "browser Binary HSON typed units preserve absent, undefined, empty, and px states",
    "browser Binary HSON preserves UTF-16 lone surrogates and negative zero",
    "browser Binary HSON SHA-256 equals browser WebCrypto over exact binary bytes",
    "browser HSON JSON and HTML SHA-256 equal browser WebCrypto over exact UTF-8 bytes",
  ]),
  browser_suite("app-boot", [
    "splash completes naturally without retaining work or disposed nodes",
    "application boot reaches one clean usable demo without auto-running hosted tests",
    "explicit TOWL entry and browser history remain distinct from the quiet root boot",
    "TOWL performs no room, storage, runtime, or socket work before activation",
    "an invalid ordinary room query keeps the fresh shell neutral and TOWL inert",
    "widget membership lazily mounts and recreates disposable widget instances",
    "keyboard Color Sudoku activation stays inside the canonical shell lifecycle",
    "hosted panel discovers curated categories and runs one canonical category",
  ], ["websocket"]),
  browser_suite("build", [
    "Build preview and HTML output recover across edits and navigation",
  ]),
  browser_suite("cellsheet-resize", [
    "Cellsheet detects every resize edge, preserves corner priority, and ignores the cell interior",
    "Cellsheet ordinary column resize clamps at 34px and 140px and shifts following geometry",
    "Cellsheet ordinary row resize clamps at 26px and 96px and shifts following geometry",
    "Cellsheet Shift resize preserves the pair total, enforces pair minimums, and preserves its max bypass",
    "Cellsheet Shift resize samples Shift at pointerdown and falls back to ordinary resize without a neighbor",
    "Cellsheet hover feedback uses the seven-pixel edge threshold",
    "Cellsheet capture owns resize routing and LiveTree owns all transient presentation",
    "Cellsheet pointercancel releases capture, clears presentation, and makes later movement inert",
    "Cellsheet dispose during capture releases the pointer and removes the retained panel",
  ]),
  browser_suite("cellsheet", [
    "Cellsheet preserves authored spelling while interpreting trimmed numeric and operator input",
    "Cellsheet performs horizontal numeric arithmetic",
    "Cellsheet plus concatenates every available non-all-numeric value pair",
    "Cellsheet discovers vertical operations and both directions independently",
    "Cellsheet keeps boundary and missing-operand expressions distinct from complete operations",
    "Cellsheet visibly errors every text operand position for numeric-only operators",
    "Cellsheet division by zero errors only the operator and leaves the target blank",
    "Cellsheet occupied targets remain authored and are marked blocked",
    "Cellsheet collision keeps the first row-major result and marks the later writer and target",
    "Cellsheet fixpoint resolves a producer scanned after its consumer",
    "Cellsheet does not propagate an occupied-target error into a downstream addition",
    "Cellsheet selection distinguishes no links, successful links, and multiple touching operations",
    "Cellsheet reset clears edits instead of restoring mount samples",
    "Cellsheet full remount restores samples, default layout, and no selection",
  ]),
  browser_suite("final-presentation", [
    "long clean run keeps one advancing Logger readout beside the local stopwatch",
    "Transform View renders the reproduced circuit in-app without changing the authoritative run",
    "bling switches one navigation model between amoebic and historical plain presentations",
  ], ["websocket"]),
  browser_suite("parse-verification-performance", [
    "measure Phase 3 edit-to-certificate stages without imposing a budget",
  ]),
  browser_suite("parse-verification", [
    "authored HSON reaches the Locus worker and browser certificate",
    "JSON is an editable explicit verification origin",
    "authored HTML is admitted by DOMParser and reaches the final certificate",
    "an immediate parse failure never dispatches verification",
    "rapid edits debounce to and certify only the newest revision",
    "verification progress is textual and bounded",
    "an unavailable verifier preserves the immediate local preview",
    "a browser DOMParser disagreement is distinct from universal failure",
    "switching authored origins increments once and does not create update loops",
  ], ["websocket"]),
  browser_suite("parse", [
    "Parsing Panels lazily seeds the Wikipedia HTML demonstration",
    "Parse transforms valid-invalid-valid input without duplicate surfaces",
    "HSON bare primitives preserve Demo and Transform semantic identity",
    "Demo accepts adjacent and empty element text items without collapsing order",
    "browser object parsing and serialization use one stable angle pair per object",
    "browser HSON parsing enforces authored names, duplicates, and escape grammars",
    "browser executes the portable strict Transform oracle and structured witness",
  ]),
  browser_suite("quid-selector", [
    "canonical QUID selectors schedule, apply, update, isolate, and clean up in HTML and SVG",
  ]),
  browser_suite("sanitizer-metadata", [
    "production browser and Worker sanitizers share HSON metadata admission",
  ]),
  browser_suite("shell-resource-lifecycle", [
    "Bar-Bar and Pointer cancel owned loops and ambient listeners before recreation",
    "OKLCH reverts instance-owned CSS projection and recreates cleanly",
    "Amoeba emits one shell intent and projects shell selection without local canonical state",
    "Cellsheet deactivation cancels an active resize while retaining authored state",
    "shell replacement cancels Deck and Amoeba scheduled work and leaves one Fireworks controller",
  ]),
  browser_suite("small-state-surfaces", [
    "About switches local topics, presents one selection, and resets on remount",
  ]),
  browser_suite("towl-direct-entry", [
    "two fresh phones share, play, recover, resume, and explicitly Leave one TOWL room",
    "invalid direct invite is inert until Create new room is chosen",
    "manual Reconnect uses the existing room after an exhausted opening transport",
    "portrait, landscape, and desktop-like resizing preserves one room, session, and socket",
    "desktop shell selection retains ordinary chrome and focus styles do not leak",
  ], ["websocket"]),
  browser_suite("towl-rooms", [
    "TOWL room URL shares one game, isolates another, and reattaches on refresh",
    "TOWL replaces a lost browser transport and restores the same session seat",
    "Share Room uses one canonical invite for native share, cancellation, and clipboard fallback",
    "Back resumes the same seat while Leave vacates it, clears the credential, and exits the room URL",
  ], ["websocket"]),
  browser_suite("visual-determinism-authority", [
    "Fleurs seed owns its complete semantic and LiveTree SVG result",
    "Deck animates retained LiveTree text handles and cancels interrupted work",
    "Fireworks projects flash and canvas presentation through LiveTree",
  ]),
] as const satisfies readonly BrowserSuiteManifestEntry[]);

export const BROWSER_RASTER_SUITE_MANIFEST: BrowserSuiteManifestEntry = Object.freeze({
  id: "livetree/browser-raster-fidelity",
  title: "LiveTree browser raster fidelity",
  subject: "livetree",
  path: "tests/integration/browser/visual-determinism-authority.spec.ts",
  reportPath: "tests/integration/browser/browser-raster-fidelity.ts",
  requirements: Object.freeze([
    ...BROWSER_DOM_REQUIREMENTS,
    "browser-raster",
  ] as const),
  journeys: Object.freeze([
    Object.freeze({ id: "canvas-clear-full-bitmap", title: "browser raster: canvas.clear clears full backing bitmap" }),
    Object.freeze({ id: "canvas-clear-rectangle", title: "browser raster: canvas.clear rectangle preserves pixels outside its region" }),
    Object.freeze({ id: "canvas-plot", title: "browser raster: canvas.plot receives a native 2D context" }),
    Object.freeze({ id: "canvas-must-plot", title: "browser raster: canvas.must.plot receives a native 2D context" }),
  ]),
});

export const ALL_BROWSER_SUITE_MANIFEST = Object.freeze([
  ...BROWSER_SUITE_MANIFEST,
  BROWSER_RASTER_SUITE_MANIFEST,
]);

export const BROWSER_JOURNEY_COUNT = BROWSER_SUITE_MANIFEST.reduce(
  (total, suite) => total + suite.journeys.length,
  0,
);
