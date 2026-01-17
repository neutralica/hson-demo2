import type { LiveTree } from "hson-live";
import type { LetterKey } from "../types/core.types";

export const makeDivClass = (lt: LiveTree, cls: string | string[]) => lt.create.div().classlist.set(cls);
export const makeDivId = (lt: LiveTree, id: string) => lt.create.div().id.set(id);
export const makeSpanClass = (lt: LiveTree, cls: string | string[]) => lt.create.span().classlist.set(cls);
export const makeSection = (lt: LiveTree, cls: string | string[]) => lt.create.section().classlist.set(cls);
