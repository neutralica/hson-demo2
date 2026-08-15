export type TestConvergenceBoundary = Readonly<{
  id: string;
  adapter: string;
  deletionGate: string;
}>;

/** The only surviving pre-epoch adapter is the real hson-live repository boundary. */
export const TEST_CONVERGENCE_BOUNDARIES: readonly TestConvergenceBoundary[] = Object.freeze([
  Object.freeze({
    id: "hson-live-launcher-manifest",
    adapter: "hson-live launcher manifest entries are normalized into canonical suite descriptors and sourceRef executor bindings",
    deletionGate: "hson-live publishes directly consumable canonical suite descriptors with executable bindings",
  }),
]);
