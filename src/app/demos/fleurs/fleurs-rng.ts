import { make_rng } from "../../utils/rng";

export type Rng = () => number;

export function make_flower_rng(seed: number, stream = 0): Rng {
  return make_rng(seed + Math.imul(stream, 0x9e3779b9));
}
