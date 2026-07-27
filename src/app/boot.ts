// bootstrap_root_tree.ts

import {  hson } from "hson-live";
import { LiveTree } from "hson-live/livetree";


export function boot_livetree(): LiveTree {
    return hson.liveTree.queryBody().graft();

}