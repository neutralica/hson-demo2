// bud-config.ts

import type { LiveTree } from "hson-live";
import type { CssMap, KeyframesInput, AnimSpec } from "hson-live/types";
import type { PropertyRegistration } from "../../../../../hson-live/dist/types/at-property.types";

export type BudList = Record<string, BudSpec>;

export type BudSpec = Readonly<{
  name: string;
  // create+append under the provided parent
  make: (parent: LiveTree) => LiveTree;

  id?: string;
  cls?: string;
  txt?: string;

  css?: CssMap;
  at?: readonly PropertyRegistration[];
  kf?: readonly KeyframesInput[];
  anim?: readonly AnimSpec[] | AnimSpec;
}>;

export type BudFob = Readonly<{
  tree: LiveTree;
  bud: (spec: BudSpec) => BudFob; // child rooted at node
  animate: () => void;
}>;

export function bud_node(parent: LiveTree) {
  const newBud = (spec: BudSpec): BudFob => {
    const node = spec.make(parent);

    if (spec.id) node.id.set(spec.id);
    if (spec.cls) node.classlist.set(spec.cls);
    if (spec.txt !== undefined) node.text.set(spec.txt);

    if (spec.css) node.css.setMany(spec.css);
    spec.at?.forEach(at => node.css.atProperty.register(at));
    spec.kf?.forEach(kf => node.css.keyframes.set(kf));

    const animate = (): void => {
      const ani = Array.isArray(spec.anim) ? spec.anim : [spec.anim];
      if (!ani || ani.length === 0) return;
      queueMicrotask(() => {
        for (const a of ani) node.css.anim.begin(a);
      });
    };

    // return a new bud rooted at this node (chainable)
    const budlet = bud_node(node);

    return {
      tree: node,
      bud: budlet.bud,
      animate,
    };
  };

  return { bud: newBud } as const;
}
// export const mk_div = (parent: LiveTree): LiveTree => parent.create.div();
// export const mk_section = (parent: LiveTree): LiveTree => parent.create.section();
