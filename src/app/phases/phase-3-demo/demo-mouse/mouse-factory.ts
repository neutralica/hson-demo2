import type { LiveTree } from "hson-live";
import { type Outcome, relay } from "intrastructure";
import { type MousePanelRig, mouse_init, DERIV_LABELS } from "./mouse";
import type { CssMap } from "hson-live/types";
import { make_div_class, make_div_id } from "../../../utils/makers";
import { $cols_, back_w_alpha } from "../../../consts/colors.consts";

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

  // unify row layout (header + data rows) so columns line up
  const ROW_GRIDcss: CssMap = {
    display: "grid",
    gridTemplateColumns: "4ch 1fr", // 3 columns only (#, element, _QUID)
    columnGap: "12px",
    alignItems: "baseline",
    minWidth: "0",
  } as const;

  // reusable monospace baseline for this widget
  const MONOcss: CssMap = {
    fontFamily: "Monaco",
    fontSize: "12px",
    letterSpacing: "0.06em",
  } as const;

  // grid-cell clamp so long values don't push neighbors
  const CELL_CLAMPcss: CssMap = {
    minWidth: "0",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  } as const;

  const root = make_div_id(host, "mouse-panel-root")
    .classlist.add("mouse-panel")
    .css.setMany({
      position: "relative",

      display: "grid",
      gridTemplateRows: "auto 1fr",
      gap: "10px",

      minWidth: "0",
      minHeight: "0",
      maxHeight: "70vh",
      width: "100%",
      maxWidth: "28rem",
    }
    );

  // header row: coords + angle
  const head = root.create.div().css.setMany({
    display: "grid",
    gridTemplateRows: "1fr 1fr",
    gap: "10px",
    alignItems: "center",
    minWidth: "0",
  });

  const xy = head.create.div()
    .classlist.add("mouse-xy")
    .css.setMany({
      ...MONOcss,
      whiteSpace: "pre",
    })
    .text.set("x: —   y: —");

  const angle = head.create.span()
    .classlist.add("mouse-angle")
    .css.setMany({
      ...MONOcss,
      opacity: "0.78",
      whiteSpace: "pre",
      // justifySelf: "end",
    })
    .text.set("θ: —°");

  // body: pointer + stack table
  const body = root.create.div().css.setMany({
    display: "grid",

    // CHANGED: stack vertically instead of side-by-side
    gridTemplateRows: "auto 1fr",

    gap: "12px",
    minWidth: "0",
    minHeight: "0",
    height: "100%",
  });

  // pointer stage
  const tracker = make_div_id(body, "mouse-tracker").css.setMany({
    position: "relative",
    width: "140px",
    height: "140px",
    borderRadius: "999px",
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
    background: back_w_alpha(0.7),
    overflow: "hidden",
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
  const table = make_div_class(body, "mouse-stack").css.setMany({
    position: "relative",
    display: "grid",
    gridAutoRows: "auto",
    gap: "6px",
    minWidth: "0",
    minHeight: "0",
    alignContent: "start",
    background: $cols_.backdeep
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

    rows.push({ ix, tag, /* quid  */});
  }

  // placeholder dispose; init will replace
  const dispose = (): void => void 0;

  return {
    root,
    stage: tracker,
    pointer,
    readout: { xy, angle, rows },
    dispose,
  };
}