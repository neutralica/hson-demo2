import type { LiveTree } from "hson-live";

export interface Toggle {
    viewToggle: LiveTree;
    viewToggleRail: LiveTree;
    viewToggleKnob: LiveTree;
    viewToggleLabelText: LiveTree;
    viewToggleLabelNodes: LiveTree;
    viewMode: "text" | "nodes";
}