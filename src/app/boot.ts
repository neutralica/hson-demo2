// bootstrap_root_tree.ts

import { hson, LiveTree } from "hson-live";

export function boot_livetree(): LiveTree {
    return hson.liveTree.queryBody().graft();

}