export type TestConvergenceBoundary = Readonly<{
  id: string;
  adapter: string;
  deletionGate: string;
}>;

/** The only cross-repository adapter is the real hson-live executable-source boundary. */
export const TEST_CONVERGENCE_BOUNDARIES: readonly TestConvergenceBoundary[] = Object.freeze([
  Object.freeze({
    id: "hson-live-executable-source",
    adapter: "static HSON_LIVE_TEST_METADATA declarations are normalized into canonical suite descriptors and source-file executor bindings",
    deletionGate: "hson-live publishes directly consumable canonical suite descriptors with executable bindings",
  }),
]);
