// ui-panels.spec.ts
import type { LiveTree } from "hson-live";
import type { CssMap } from "hson-live/types";
import { make_bud_node, type BudFob, type BudSpec } from "../config/bud-config";

type PanelParts = Readonly<{
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

export function make_panel_specs(a: PanelSpecArgs): PanelParts {
    const { key, panelId, panelCss, frameCss, bodyCss, headCss } = a;

    const mk = (tag: "div" | "section" = "div") =>
        (parent: LiveTree) => parent.create[tag]();

    return {
        panel: {
            name: `${key}.panel`,
            make: (parent) => mk("div")(parent).id.set(panelId),
            cls: `panel ${key}`,
            ...(panelCss ? { css: panelCss } : {}), // CHANGED: only attach when present
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
  panel: BudFob;
  frame: BudFob;
  head?: BudFob | undefined;
    body: BudFob;
    tree: LiveTree;
}>;

export function build_panel(parent: LiveTree, specs: PanelParts): BuiltPanel {
  const b = make_bud_node(parent);
  const panel = b.bud(specs.panel);
  const frame = panel.bud(specs.frame);
  const head = specs.head ? frame.bud(specs.head) : undefined;
  const body = frame.bud(specs.body);
  return { panel, frame, head, body, tree: parent };
}