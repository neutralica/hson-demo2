// import type { LiveTree } from "hson-live";
// import type { SvgLiveTree } from "../../../../../hson-live/dist/types/svg.types";

// export type PrairieConfig = Readonly<{
//   width: number;
//   height: number;

//   // CHANGED: horizon is where the field "ends" visually
//   horizonY: number;

//   // CHANGED: number of horizontal grass strips
//   rowCount: number;

//   // CHANGED: row silhouette height near vs far
//   nearBladeHeight: number;
//   farBladeHeight: number;

//   // CHANGED: x sampling density near vs far
//   nearSampleStep: number;
//   farSampleStep: number;

//   // CHANGED: wind amplitude near vs fara
//   nearSwayAmp: number;
//   farSwayAmp: number;

//   // CHANGED: how aggressively rows compress toward horizon
//   curvePower: number;

//   // CHANGED: color tuning
//   hueBase: number;
//   hueJitter: number;
//   satNear: number;
//   satFar: number;
//   lightNear: number;
//   lightFar: number;

//   // CHANGED: deterministic seed
//   seed: number;

//   // flowers
//   flowerChance: number;
//   flowerRadiusNear: number;
//   flowerRadiusFar: number;
//   flowerSwayNear: number;
//   flowerSwayFar: number;
//   flowerBloomWindowSec: number;

// }>;

// export type PrairieRowStatic = Readonly<{
//   rowIndex: number;
//   t: number; // 0 = near, 1 = far

//   // CHANGED: baseline y for this row
//   yBase: number;

//   // CHANGED: blade/saw profile magnitude
//   bladeHeight: number;

//   // CHANGED: x sample spacing
//   sampleStep: number;

//   // CHANGED: wind params
//   swayAmp: number;
//   swayFreq: number;
//   swaySpeed: number;
//   phase: number;

//   // CHANGED: cached per-sample noise, one value per x point
//   jitter: readonly number[];

//   // CHANGED: cached x positions
//   xs: readonly number[];

//   // CHANGED: paint
//   fill: string;
// }>;


// export type PrairieRuntime = Readonly<{
//   host: LiveTree;
//   svg: SvgLiveTree;
//   paths: SvgLiveTree[];
//   flowerPaths: SvgLiveTree[]; // ADDED
//   rows: PrairieRowStatic[];
//   flowers: PrairieFlowerStatic[]; // ADDED
//   config: PrairieConfig;
//   stop: () => void;
// }>;

// export type PrairieFlowerBud = Readonly<{
//   dx: number;
//   dy: number;
//   rMul: number;
// }>;

// export type PrairieFlowerStatic = Readonly<{
//   rowIndex: number;
//   t: number;

//   xBase: number;
//   yBase: number;

//   radius: number;
//   color: string;
//   buds: readonly PrairieFlowerBud[];

//   bloomAtSec: number;
//   bloomDurSec: number;

//   // tiny independent wobble, layered on top of row wind
//   phase: number;
//   wobbleAmp: number;
//   wobbleSpeed: number;
// }>;