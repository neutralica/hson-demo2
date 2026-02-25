import type { LiveTree } from "hson-live";
import { type Outcome, relay } from "intrastructure";
import { type MousePanelRig, mouse_init, DERIV_LABELS } from "./mouse";
import type { CssMap } from "hson-live/types";

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
  // CHANGED: widget owns its own root container under host
  const old = host.find.byId("mouse-panel-root");
  if (old) old.removeSelf();

  // CHANGED: unify row layout (header + data rows) so columns line up
  const ROW_GRIDcss: CssMap = {
    display: "grid",
    gridTemplateColumns: "3ch 22ch 1fr", // CHANGED: 3 columns only (#, element, _QUID)
    columnGap: "12px",
    alignItems: "baseline",
    minWidth: "0",
  } as const;

  // CHANGED: reusable monospace baseline for this widget
  const MONOcss: CssMap = {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: "12px",
    letterSpacing: "0.06em",
  } as const;

  // CHANGED: grid-cell clamp so long values don't push neighbors
  const CELL_CLAMPcss: CssMap = {
    minWidth: "0", // CRITICAL: allows overflow/ellipsis inside grid cells
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  } as const;

  const root = host.create.div()
    .id.set("mouse-panel-root")
    .classlist.add("mouse-panel")
    .css.setMany({
      display: "grid",
      gridTemplateRows: "auto 1fr",
      gap: "10px",
      minWidth: "0",
      minHeight: "0",
      height: "100%",
      width: "500px",
    });

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

  const angle = head.create.div()
    .classlist.add("mouse-angle")
    .css.setMany({
      ...MONOcss,
      opacity: "0.78",
      whiteSpace: "pre",
      justifySelf: "end",
    })
    .text.set("θ: —°");

  // body: pointer + stack table
  const body = root.create.div().css.setMany({
    display: "grid",
    gridTemplateColumns: "140px 1fr",
    gap: "12px",
    minWidth: "0",
    minHeight: "0",
    height: "100%",
  });

  // pointer stage
  const tracker = body.create.div().css.setMany({
    position: "relative",
    minWidth: "0",
    minHeight: "0",
    maxHeight: "140px",
    maxWidth: "140px",
    borderRadius: "999px",
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
    background: "rgba(255,255,255,0.03)",
    overflow: "hidden",
  });

  const pointer = tracker.create.div()
    .classlist.add("mouse-pointer")
    .css.setMany({
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
  tracker.create.div().css.setMany({
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
  const table = body.create.div()
    .classlist.add("mouse-stack")
    .css.setMany({
      display: "grid",
      gridAutoRows: "auto",
      gap: "6px",
      minWidth: "0",
      minHeight: "0",
      alignContent: "start",
    });

  const rows: Array<{
    ix: LiveTree;
    tag: LiveTree;
    quid: LiveTree;
  }> = [];

  // header row (must match ROW_GRIDcss)
  const hdr = table.create.div()
    .classlist.add("mouse-stack-head")
    .css.setMany({
      ...ROW_GRIDcss, // CHANGED
      ...MONOcss,
      opacity: "0.7",
      letterSpacing: "0.04em",
    });

  hdr.create.div().text.set("#").css.setMany({ ...CELL_CLAMPcss, opacity: "0.7" });
  hdr.create.div().text.set("element").css.setMany(CELL_CLAMPcss);
  hdr.create.div().text.set("_QUID").css.setMany(CELL_CLAMPcss);

  // cell helper
  const makeCell = (row: LiveTree, css?: CssMap): LiveTree => {
    const c = row.create.div();
    c.css.setMany({
      ...CELL_CLAMPcss,
      ...(css ?? {}),
    });
    return c;
  };

  // CHANGED: rows count matches your rig rows (keep using DERIV_LABELS length as "max stack lines")
  for (let i = 0; i < DERIV_LABELS.length; i++) {
    const row = table.create.div()
      .classlist.add("mouse-stack-row")
      .css.setMany({
        ...ROW_GRIDcss, // CHANGED: same grid as header
        ...MONOcss,
      });

    const ix = makeCell(row, { opacity: "0.7" });
    const tag = makeCell(row);
    const quid = makeCell(row, { opacity: "0.85" });

    rows.push({ ix, tag, quid });
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