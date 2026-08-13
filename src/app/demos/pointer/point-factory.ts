import type { LiveTree } from "hson-live/livetree";
import { type PointPanelRig, point_init } from "./point";
import type { CssMap } from "hson-live/types";

import { ROW_GRIDcss, CELL_CLAMPcss, POINTER_TRACKERcss, POINTER_COORDScss, POINT_ROOTcss, STACK_TABLEcss, TRACKERcss, TRACKER_ORIGINcss, ELEMENT_STACKcss, MOUSE_COORD_Xcss, MOUSE_COORD_Ycss, TRACKER_THETAcss } from "./point.css";
import { mk_div_cls, mk_div_id } from "../../utils/makers";

// ---- factory ----

export type PointPanelController = Readonly<{
  root: LiveTree;
  dispose(): void;
}>;

export function mount_point_panel(host: LiveTree): PointPanelController {
  const mousePanel = point_factory(host);
  const stopTracking = point_init(mousePanel);
  let disposed = false;

  return Object.freeze({
    root: mousePanel.root,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      stopTracking();
      if (!mousePanel.root.isDisposed) mousePanel.root.remove();
    },
  });
}

function point_factory(host: LiveTree): PointPanelRig {
  // widget owns its own root container under host
  const old = host.find.byId("pointer-panel-root");
  if (old) old.remove();

  const root = mk_div_id(host, "pointer-panel-root")
    .classlist.add("pointer-panel")
    .css.setMany(POINT_ROOTcss);

  // header row: coords + angle
  // pointer stage
  const tracker = mk_div_id(root, "pointer-tracker").css.setMany(POINTER_TRACKERcss);
  const coordbox = mk_div_id(root, "pointer-coords").css.setMany(POINTER_COORDScss);

  const x = coordbox.create.div()
    .classlist.add("pointer-x")
    .css.setMany(MOUSE_COORD_Xcss)
    .text.set("x: —");
    
    const y = coordbox.create.div()
    .classlist.add("pointer-y")
    .css.setMany(MOUSE_COORD_Ycss)
    .text.set("y: —");
    
    const angle = coordbox.create.div()
    .classlist.add("pointer-angle")
    .css.setMany(TRACKER_THETAcss)
    .text.set("θ: —°");


  // body: pointer + stack table
  const stackTable = mk_div_id(root, "stack-table").css.setMany(STACK_TABLEcss);

  const pointer = mk_div_id(tracker, "mouse-pointer")
    .classlist.add("pointer-pointer").css.setMany(TRACKERcss);

  // center dot
  const origin = mk_div_id(tracker, "pointer-origin").css.setMany(TRACKER_ORIGINcss);

  // table container
  const table = mk_div_cls(stackTable, "pointer-stack").css.setMany(ELEMENT_STACKcss);

  const rows: Array<{
    ix: LiveTree;
    tag: LiveTree;
    /* quid: LiveTree; */
  }> = [];

  // header row (must match ROW_GRIDcss)
  const hdr = mk_div_cls(table, "pointer-stack-head")
    .css.setMany({
      ...ROW_GRIDcss,
      opacity: "0.8",
      // letterSpacing: "12px",
    });

  hdr.create.div().text.set("#").css.setMany({ ...CELL_CLAMPcss, opacity: "0.6" });
  hdr.create.div().text.set("elementsAtPoint").css.setMany(CELL_CLAMPcss);

  // cell helper
  const makeCell = (row: LiveTree, css?: CssMap): LiveTree => {
    const c = row.create.div();
    c.css.setMany({
      ...CELL_CLAMPcss,
      ...(css ?? {}),
    });
    return c;
  };

  // rows count matches your rig rows (keep using DERIV_LABELS length as "max stack lines")
  for (let i = 0; i < 8; i++) {
    const row = table.create.div()
      .classlist.add("pointer-stack-row")
      .css.setMany({
        ...ROW_GRIDcss, // same grid as header
      });

    const ix = makeCell(row, { opacity: "0.7" });
    const tag = makeCell(row);

    rows.push({ ix, tag, /* quid  */ });
  }

  // placeholder dispose; init will replace
  const dispose = (): void => void 0;

  return {
    root,
    stage: tracker,
    pointer,
    origin,
    readout: { x, y, angle, rows },
    dispose,
  };
}
