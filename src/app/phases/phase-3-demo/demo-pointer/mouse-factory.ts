import type { LiveTree } from "hson-live";
import { type Outcome, type OutcomeMaybeVoid, relay } from "intrastructure";
import { type MousePanelRig, mouse_init, DERIV_LABELS } from "./mouse";
import type { CssMap } from "hson-live/types";
import { mk_div_cls, mk_div_id } from "../../../utils/makers";
import { øCOLS } from "../../../core/consts/ui-consts";
import { ROW_GRIDcss, CELL_CLAMPcss, POINTER_TRACKERcss, MOUSE_COORDScss, MOUSE_ROOTcss, STACK_TABLEcss, MOUSE_POINTERcss, MOUSE_POINTER_ORIGINcss, ELEMENT_STACKcss, MOUSE_COORD_Xcss, MOUSE_COORD_Ycss, MOUSE_THETAcss } from "./mouse.css";

// ---- factory ----

export function mount_mouse_panel(host: LiveTree): OutcomeMaybeVoid {
  try {
    const mousePanel = mouse_factory(host);
    mouse_init(mousePanel);
    return relay.ok();
  } catch (err) {
    return relay.err(err instanceof Error ? err.message : "unknown error");
  }
}

function mouse_factory(host: LiveTree): MousePanelRig {
  // widget owns its own root container under host
  const old = host.find.byId("pointer-panel-root");
  if (old) old.removeSelf();

  const root = mk_div_id(host, "pointer-panel-root")
    .classlist.add("pointer-panel")
    .css.setMany(MOUSE_ROOTcss);

  // header row: coords + angle
  // pointer stage
  const tracker = mk_div_id(root, "pointer-tracker").css.setMany(POINTER_TRACKERcss);
  const coordbox = mk_div_id(root, "pointer-coords").css.setMany(MOUSE_COORDScss);

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
    .css.setMany(MOUSE_THETAcss)
    .text.set("θ: —°");


  // body: pointer + stack table
  const stackTable = mk_div_id(root, "stack-table").css.setMany(STACK_TABLEcss);

  const pointer = mk_div_id(tracker, "pointer-pointer")
    .classlist.add("pointer-pointer").css.setMany(MOUSE_POINTERcss);

  // center dot
  mk_div_id(tracker, "pointer-origin").css.setMany(MOUSE_POINTER_ORIGINcss);

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

  hdr.create.div().text.set("#").css.setMany({ ...CELL_CLAMPcss, opacity: "0.7" });
  hdr.create.div().text.set("element").css.setMany(CELL_CLAMPcss);

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
  for (let i = 0; i < DERIV_LABELS.length; i++) {
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
    readout: { x, y, angle, rows },
    dispose,
  };
}