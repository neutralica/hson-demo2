// main.ts

import type { LiveTree } from "hson-live";
import {  void_sync, type Outcome } from "intrastructure";
import { boot_root_tree as graft_livetree } from "./app/boot";
import { run_app } from "./app/app";


// --- boot glue ---
export function main(): boolean {
  const rootOc = graft_livetree();
  run_app(rootOc);
  return true;


}

// --- rendering helpers ---
function render_err(root: LiveTree, err: unknown): void {
  // root.empty();

  const box = root.create.pre().classlist.set(["errbox"]);
  box.setText(String(err)); 
}


main();
