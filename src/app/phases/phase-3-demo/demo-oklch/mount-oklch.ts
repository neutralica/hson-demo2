import type { LiveTree } from "hson-live";
import { oklch_impl } from "./oklch";


type OklchDemoOpts = {

}

export function mount_oklch(stage: LiveTree, opts: OklchDemoOpts){

    oklch_factory();
    oklch_init();
    /* stage.append(oklch) */
    return;
}

export function oklch_factory() {
    

}

export function oklch_init() {
    oklch_impl();

}