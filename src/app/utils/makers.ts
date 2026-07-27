import type { LiveTree } from "hson-live/livetree";

export const mk_div = (lt: LiveTree) => lt.create.div();
export const mk_div_cls = (lt: LiveTree, cls: string | string[]) => lt.create.div().classlist.set(cls);
export const mk_div_cls_txt = (lt: LiveTree, cls: string | string[], txt: string) => lt.create.div().classlist.set(cls).text.set(txt);
export const mk_div_id = (lt: LiveTree, id: string) => lt.create.div().id.set(id);
export const mk_div_id_txt = (lt: LiveTree, id: string, txt: string) => lt.create.div().id.set(id).text.set(txt);
export const mk_div_id_cls = (lt: LiveTree, id: string, cls: string) => lt.create.div().id.set(id).classlist.set(cls);

export const mk_span_cls = (lt: LiveTree, cls: string | string[]) => lt.create.span().classlist.set(cls);
export const mk_span_cls_txt = (lt: LiveTree, cls: string | string[], txt: string) => lt.create.span().classlist.set(cls).text.set(txt);
export const mk_span_id = (lt: LiveTree, id: string ) => lt.create.span().id.set(id);

export const mk_section = (lt: LiveTree) => lt.create.section();
export const mk_section_cls = (lt: LiveTree, cls: string | string[]) => lt.create.section().classlist.set(cls);
