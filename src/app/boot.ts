// bootstrap_root_tree.ts

import { LiveTree, hson } from "hson-live";



export function boot_livetree(): LiveTree {
    return hson.liveTree.queryBody().graft();

}