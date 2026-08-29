// build.factory.ts

import type { LiveTree } from "hson-live/livetree";
import { BUILD_PANEcss, BUILD_TITLEcss } from "./build.css";

// keep this parallel to pp_factory return shape: root + handles
export type BuildDemo = Readonly<{
  root: LiveTree;

  // two panes
  src: BuildPanel;
  out: BuildPanel;

  // shared controls
  tabs: {
    view: LiveTree;
  };

  // content handles
  input: {
    wrap: LiveTree;
    textarea: LiveTree;
    // wmFmt: LiveTree;
    // wmEmpty: LiveTree;
    status: LiveTree;
    // chip: LiveTree;
    copyBtn: LiveTree;
    clearBtn: LiveTree;
    // testBtn: LiveTree;
  };

  output: {
    wrap: LiveTree;
    previewHost: LiveTree;
    htmlBox: LiveTree;
  };
}>;

export type BuildPanel = Readonly<{
  panel: LiveTree;
  head: LiveTree;
  body: LiveTree;
  // spacer: LiveTree;
}>;

export type BuildFactoryOpts = Readonly<{
  // default starter Hson
  seed?: string;
}>;


