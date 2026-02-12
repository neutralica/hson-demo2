// ui-panels.spec.ts
import type { LiveTree } from "hson-live";
import type { CssMap } from "hson-live/types";
import { bud_node, type BudFob, type BudSpec } from "../config/bud-config";
import { makeDivClass } from "../utils/makers";
import { $blu_, $cols_ } from "../consts/colors.consts";
import { $PANEL_HIDDEN } from "../consts/ui-consts";

type PanelSpecs = Readonly<{
    panel: BudSpec;     // grid item wrapper
    frame: BudSpec;     // the chrome
    head?: BudSpec;     // optional header area
    body: BudSpec;      // scroll/content
}>;

type PanelSpecArgs = Readonly<{
    key: string;              // "parse" | "test" | etc
    panelId: string;          // "parse-panel"
    panelCss?: CssMap;        // grid placement etc
    frameCss: CssMap;         // chrome
    bodyCss: CssMap;          // inner region
    headCss?: CssMap;         // optional
}>;

export function make_panel_specs(a: PanelSpecArgs): PanelSpecs {
    const { key, panelId, panelCss, frameCss, bodyCss, headCss } = a;

    const mk = (tag: "div" | "section"  | "span" = "div") =>
        (parent: LiveTree) => parent.create[tag]();

    return {
        panel: {
            name: `${key}.panel`,
            make: (parent) => mk("div")(parent).id.set(panelId),
            cls: `panel ${key}`,
            ...(panelCss ? { css: panelCss } : {}), // only attach when present
        },
        frame: {
            name: `${key}.frame`,
            make: (parent) => mk("div")(parent),
            cls: `panel-frame ${key}-frame`,
            css: frameCss,
        },

        ...(headCss !== undefined
            ? {
                head: {
                    name: `${key}.head`,
                    make: (parent: LiveTree) => mk("div")(parent),
                    cls: `panel-head ${key}-head`,
                    css: headCss,
                },
            }
            : {}),

        body: {
            name: `${key}.body`,
            make: (parent) => mk("div")(parent),
            cls: `panel-body ${key}-body`,
            css: bodyCss,
        },
    } as const;
}

export type BuiltPanel = Readonly<{
  // really these should all just return livetrees
    panel: BudFob;
  frame: BudFob;
  head?: BudFob | undefined;
    body: BudFob;
    tree: LiveTree;
}>;

export function mount_panel(parent: LiveTree, specs: PanelSpecs): BuiltPanel {
    const b = bud_node(parent);
    const panel = b.bud(specs.panel);
    const frame = panel.bud(specs.frame);
    const head = specs.head ? frame.bud(specs.head) : undefined;
    const body = frame.bud(specs.body);
  const closeButton = makeDivClass(frame.tree, "close-button")
    .setText('[ X ]')
    .css.setMany({
    position: "absolute",
    top: "0.5rem",
    left: "0.5rem",
    width: "4rem",
      height: "1rem",
    color:$blu_.pastel,
        border: $blu_.pastel,
        zIndex: 100,
    pointerEvents: "all"
    })
    .listen.onClick(() => {
      panel.tree.classlist.add($PANEL_HIDDEN);
  })
    return { panel, frame, head, body, tree: parent };
}