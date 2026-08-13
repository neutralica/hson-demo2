import type { Rng } from "./fleurs-rng";




export function randSigned(rng: Rng): number {
    return (rng() * 2) - 1;
}
// ---------------------------------------------
// HELPERS
// ---------------------------------------------

// TODO - consolidate all lerps clamps hashes and picks
export function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

export function clamp(n: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, n));
}

export function trimNum(n: number, places: number): string {
    return Number(n.toFixed(places)).toString();
}
export function pickOne<T>(arr: readonly T[], rng: Rng): T {
    const ix = Math.floor(rng() * arr.length);
    const v = arr[ix];
    if (v === undefined) {
        throw new Error("pick_one: empty array");
    }
    return v;
}
