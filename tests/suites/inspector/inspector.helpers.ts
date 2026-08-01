import { tick } from "../livetree/livetree-03";

/** Historical location retained only for deterministic DOM scheduling fixtures. */
export async function flush_dom(): Promise<void> {
  await tick();
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

export const next_frame = (): Promise<void> =>
  new Promise((resolve) => requestAnimationFrame(() => resolve()));
