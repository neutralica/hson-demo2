import type { LiveTree } from "hson-live";

export function must_el<T extends Element = HTMLElement>(lt: LiveTree): T {
  const el = lt.dom.el() as T | null;
  if (!el) throw new Error("Expected DOM element to exist");
  return el;
}

export function assert_attr_sync(lt: LiveTree, name: string, expected: string | null): void {
  const el = must_el(lt);
  const node = lt.node;
  const attrs = node.$_attrs ?? {};

  if (expected === null) {
    if (name in attrs) throw new Error(`Expected node attr removed: ${name}`);
    if (el.hasAttribute(name)) throw new Error(`Expected DOM attr removed: ${name}`);
    return;
  }

  if (attrs[name] !== expected) throw new Error(`Node attr mismatch ${name}: ${attrs[name]} != ${expected}`);
  if (el.getAttribute(name) !== expected) throw new Error(`DOM attr mismatch ${name}: ${el.getAttribute(name)} != ${expected}`);
}