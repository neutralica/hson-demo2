// splash-anim.helpers.ts
import type { LiveTree } from "hson-live";
import type { AnimSpec } from "hson-live/types"; 

type WaitAnimOpts = Readonly<{
    // If multiple animations are running, only resolve when THIS name ends.
    name?: string;
    // Clear animation props after the animation ends (optional cleanup).
    clear?: boolean;
}>;

// 1) grab the sub so we can detach if we ever switch away from .once()
// 2) if we clear, clear after we resolve (so callers can still read styles if they want)
export function anim_begin_and_wait(
  node: LiveTree,
  spec: AnimSpec,
  opts: WaitAnimOpts = {}
): Promise<void> {
  const nameWanted = opts.name ?? spec.name;

  return new Promise<void>((resolve) => {
    const sub = node.listen
      .once()
      .onAnimationEnd((ev) => {
        if (ev.animationName !== nameWanted) return;

        resolve();

        if (opts.clear) node.css.anim.end("clear-all");
        // sub.off(); // only if we drop .once() later
      });

    node.css.anim.restart(spec);
  });
}