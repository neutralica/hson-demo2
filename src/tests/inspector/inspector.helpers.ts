import type { LiveTree } from "hson-live";
import type { CaseReport } from "../../app/demos/demo-test/tests.types";
import { tick } from "../livetree-tests/livetree-03";
import type { Artifact } from "hson-live/diagnostics";

export async function flush_dom(): Promise<void> {
  await tick();
  await new Promise(r => requestAnimationFrame(r));
}

export const next_frame = (): Promise<void> =>
                new Promise((r) => requestAnimationFrame(() => r()));
// ---------------------------
// table helpers
// ---------------------------
export const clear_box = (box: LiveTree): LiveTree => box.empty();

export const mk_table = (parent: LiveTree, cls: string): { table: LiveTree; thead: LiveTree; tbody: LiveTree; } => {
  const table = parent.create.table().classlist.set(`insp-table ${cls}`);
  const thead = table.create.thead();
  const tbody = table.create.tbody();
  table.css.setMany({ width: "100%", borderCollapse: "collapse" });
  return { table, thead, tbody };
};

export const mk_tr = (parent: LiveTree, cls: string): LiveTree => parent.create.tr().classlist.set(cls);

export const mk_th = (row: LiveTree, cls: string, txt: string): LiveTree => {
  const th = row.create.th().classlist.set(cls);
  th.text.set(txt);
  return th;
};

export const mk_td = (row: LiveTree, cls: string, txt: string): LiveTree => {
  const td = row.create.td().classlist.set(cls);
  td.text.set(txt);
  return td;
};


export function get_final_artifacts(report: CaseReport): Readonly<{
  json?: Artifact;
  hson?: Artifact;
  html?: Artifact;
}> {
  const out: {
    json?: Artifact;
    hson?: Artifact;
    html?: Artifact;
  } = {};

  for (const step of report.steps) {
    if (!step.artifacts) continue;

    for (const a of step.artifacts) {
      if (a.fmt === "json") out.json = a;
      if (a.fmt === "hson") out.hson = a;
      if (a.fmt === "html") out.html = a;
    }
  }

  return out;
}