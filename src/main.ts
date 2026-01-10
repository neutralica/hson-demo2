// main.ts


// intrastructure

// TODO: replace this with your real hson-live bootstrap entry.
// The only rule: it must NOT require document.* usage in this file.

import type { LiveTree } from "hson-live";
import {  void_sync, type Outcome } from "intrastructure";
import { bootstrap_root_tree as boot_livetree } from "./app/bootstrap";
import { run_app } from "./app/app";

export function run_demo(root: LiveTree): boolean {
  // Single boundary: normalize unexpected throws into Outcome.
  // Inside, use fluent LiveTree mutations freely.
    // wipe + rebuild (no DOM methods; this is canonical tree mutation)
    root.empty();

    // ultra-minimal “app shell”
    const app = root.create.div().id.set("app").classlist.set("app");

    // placeholder region where widgets will live
    app.create.div().id.set("stage").classlist.add("stage");

  // success = “demo constructed”
  return true;
}

// --- bootstrap glue ---
// keep it tiny and dumb: get root tree -> run_demo -> render outcome
export function main(): boolean {
  const rootOc = boot_livetree();
  run_app(rootOc);
  return true;


}

// --- rendering helpers ---
// These are intentionally not Outcome-wrapped; they should be “best effort”.
function render_err(root: LiveTree, err: unknown): void {
  // root.empty();

  const box = root.create.pre().classlist.set(["errbox"]);
  box.setText(String(err)); // ErrReport likely has better stringification; refine later.
}

// kick off immediately (or export main() for your bundler to call)

main();
