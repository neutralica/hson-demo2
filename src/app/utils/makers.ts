import type { LiveTree } from "hson-live";

export const makeDivClass = (lt: LiveTree, cls: string | string[]) => lt.create.div().classlist.set(cls);
export const makeDivId = (lt: LiveTree, id: string) => lt.create.div().id.set(id);
export const makeDivIdTxt = (lt: LiveTree, id: string, txt: string) => lt.create.div().id.set(id).setText(txt);

export const makeSpanClass = (lt: LiveTree, cls: string | string[]) => lt.create.span().classlist.set(cls);
export const makeSpanId = (lt: LiveTree, id: string ) => lt.create.span().id.set(id);

export const makeSectionClass = (lt: LiveTree, cls: string | string[]) => lt.create.section().classlist.set(cls);
