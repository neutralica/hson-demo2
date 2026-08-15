/** Authored canvas cases that require a real raster executor rather than the deterministic recorder. */
export const JSDOM_HOSTED_CANVAS_DEFERRED_CASE_KEYS = Object.freeze([
  "livetree/canvas-clear::canvas.clear-clears-full-backing-bitmap",
  "livetree/canvas-clear::canvas.clear-rectangle-clears-only-requested-region",
  "livetree/canvas-plot::canvas.plot-runs-callback-with-native-2d-context-when-mounted",
  "livetree/canvas-plot::canvas.must.plot-runs-callback-with-native-2d-context-when-mounted",
] as const);
