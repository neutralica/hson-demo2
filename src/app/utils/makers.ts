import type { LiveTree } from "hson-live";

export const make_div_class = (lt: LiveTree, cls: string | string[]) => lt.create.div().classlist.set(cls);
export const make_div_id = (lt: LiveTree, id: string) => lt.create.div().id.set(id);
export const make_div_id_text = (lt: LiveTree, id: string, txt: string) => lt.create.div().id.set(id).text.set(txt);

export const make_span_class = (lt: LiveTree, cls: string | string[]) => lt.create.span().classlist.set(cls);
export const make_span_id = (lt: LiveTree, id: string ) => lt.create.span().id.set(id);

export const make_section_class = (lt: LiveTree, cls: string | string[]) => lt.create.section().classlist.set(cls);
