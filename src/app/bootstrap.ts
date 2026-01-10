// bootstrap_root_tree.ts

import { hson, LiveTree } from "hson-live";

export function bootstrap_root_tree(): LiveTree {
    return hson.
        queryDOM("#app").
        liveTree().
        graft();

}