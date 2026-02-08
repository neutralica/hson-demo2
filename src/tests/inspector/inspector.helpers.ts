import type { LiveTree } from "hson-live";


/**
 *TO EXTRACT:
 1.	DOM table builders

   ~~•mkTable, mkTr, mkTd, mkTh~~
    •	clearBox
    •	kbOf / bytes_of / snip
    -->inspector.dom.ts.

    2.	Formatting and report rendering

    •	report_to_text
    •	render_report_html
    •	open_report_window (or “blob window” helper)
     -->inspector.report.ts.

    3.	State helpers

    •	groupKeyFor
    •	getExpandedSuites/getExpandedGroups/getExpandedCases
    •	any Map<string, Set<...>> helpers
    -->inspector.state.ts.
 
 **/
// ---------------------------
// tiny “table” helpers
// ---------------------------
export const clearBox = (box: LiveTree): LiveTree => box.empty();

export const mkTable = (parent: LiveTree, cls: string): { table: LiveTree; thead: LiveTree; tbody: LiveTree; } => {
  const table = parent.create.table().classlist.set(`insp-table ${cls}`);
  const thead = table.create.thead();
  const tbody = table.create.tbody();
  table.css.setMany({ width: "100%", borderCollapse: "collapse" });
  return { table, thead, tbody };
};

export const mkTr = (parent: LiveTree, cls: string): LiveTree => parent.create.tr().classlist.set(cls);

export const mkTh = (row: LiveTree, cls: string, txt: string): LiveTree => {
  const th = row.create.th().classlist.set(cls);
  th.setText(txt);
  return th;
};

export const mkTd = (row: LiveTree, cls: string, txt: string): LiveTree => {
  const td = row.create.td().classlist.set(cls);
  td.setText(txt);
  return td;
};
