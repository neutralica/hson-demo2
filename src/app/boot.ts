// bootstrap_root_tree.ts

import { hson, LiveTree } from "hson-live";

export function boot_root_tree(): LiveTree {
    return hson
        .queryBody()
        .liveTree()
        .graft();

}