// main.ts

import type { LiveTree } from "hson-live";
import { boot_livetree as graft_livetree } from "./app/boot";
import { run_app } from "./app/app";


// --- boot glue ---
export function main(): boolean {
  const rootOc = graft_livetree();
  void run_app(rootOc);
  
  return true;
}


main();
