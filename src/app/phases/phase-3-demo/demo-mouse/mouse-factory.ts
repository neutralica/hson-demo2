import type { LiveTree } from "hson-live";
import { type Outcome, relay } from "intrastructure";
import { type MousePanelRig, mouse_init, DERIV_LABELS } from "./mouse";
import type { CssMap } from "hson-live/types";
import { make_div_class, make_div_id } from "../../../utils/makers";
import { $cols_, ACID_WASH_OKLCH, back_w_alpha } from "../../../consts/colors.consts";
import { MONOcss, ROW_GRIDcss, CELL_CLAMPcss, MOUSE_TRACKERcss, MOUSE_COORDScss, MOUSE_ROOTcss } from "./mouse.css";

// ---- factory ----

export function mount_mouse_panel(host: LiveTree): Outcome<MousePanelRig> {
  try {
    const rig = mouse_factory(host);
    mouse_init(rig);
    return relay.data(rig);
  } catch (err) {
    return relay.err(err instanceof Error ? err.message : "unknown error");
  }
}

function mouse_factory(host: LiveTree): MousePanelRig {
  // widget owns its own root container under host
  const old = host.find.byId("mouse-panel-root");
  if (old) old.removeSelf();

  const root = make_div_id(host, "mouse-panel-root")
    .classlist.add("mouse-panel")
    .css.setMany(MOUSE_ROOTcss);

  // header row: coords + angle
  // pointer stage
  const tracker = make_div_id(root, "mouse-tracker").css.setMany(MOUSE_TRACKERcss);
  const coordbox = make_div_id(root, "mouse-coords").css.setMany(MOUSE_COORDScss);

  const x = coordbox.create.div()
    .classlist.add("mouse-x")
    .css.setMany({
      ...MONOcss,
      color: "oklch(0.7 0.3 080)",
      whiteSpace: "pre",
      marginLeft: "1.5rem",
    })
    .text.set("x: —");
    
    const y = coordbox.create.div()
    .classlist.add("mouse-y")
    .css.setMany({
      ...MONOcss,
      color: "oklch(0.7 0.3 080)",
      whiteSpace: "pre",
      marginLeft: "1rem",
    })
    .text.set("y: —");
    
    const angle = coordbox.create.div()
    .classlist.add("mouse-angle")
    .css.setMany({
      ...MONOcss,
      color: "oklch(0.7 0.3 080)",
      whiteSpace: "pre",
      marginLeft: "0.1rem",
    })
    .text.set("θ: —°");


  // body: pointer + stack table
  const stackTable = make_div_id(root, "stack-table").css.setMany({
    display: "grid",
    // CHANGED: stack vertically instead of side-by-side
    gridTemplateRows: "auto 1fr",
    gridColumn: "1 / 3",
    gridRow: "2 / -1",
    gap: "12px",
    minWidth: "0",
    minHeight: "0",
    height: "100%",
  });

  const pointer = make_div_id(tracker, "mouse-pointer")
    .classlist.add("mouse-pointer").css.setMany({
      position: "absolute",
      left: "50%",
      top: "50%",
      width: "64px",
      height: "2px",
      background: "rgba(255,255,255,0.75)",
      transformOrigin: "0% 50%",
      transform: "translate(0, -50%) rotate(0deg)",
      boxShadow: "0 0 10px rgba(140,210,255,0.20)",
    });

  // center dot
  make_div_id(tracker, "pointer-origin").css.setMany({
    position: "absolute",
    left: "50%",
    top: "50%",
    width: "6px",
    height: "6px",
    borderRadius: "99px",
    background: "rgba(255,255,255,0.6)",
    transform: "translate(-50%, -50%)",
  });

  // table container
  const table = make_div_class(stackTable, "mouse-stack").css.setMany({
    position: "relative",
    display: "grid",
    gridAutoRows: "auto",
    gap: "6px",
    minWidth: "0",
    minHeight: "0",
    alignContent: "start",
    background: $cols_.bckdeep
  });

  const rows: Array<{
    ix: LiveTree;
    tag: LiveTree;
    /* quid: LiveTree; */
  }> = [];

  // header row (must match ROW_GRIDcss)
  const hdr = make_div_class(table, "mouse-stack-head")
    .css.setMany({
      ...ROW_GRIDcss,
      ...MONOcss,
      opacity: "0.7",
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
      .classlist.add("mouse-stack-row")
      .css.setMany({
        ...ROW_GRIDcss, // same grid as header
        ...MONOcss,
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