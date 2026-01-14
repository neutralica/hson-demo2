// await-anim-end.ts

export function waitForAnimationEnd(el: HTMLElement): Promise<void> {
  return new Promise(resolve => {
    const onEnd = () => {
      el.removeEventListener("animationend", onEnd);
      resolve();
    };
    el.addEventListener("animationend", onEnd, { once: true });
  });
}