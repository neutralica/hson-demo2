import type { LiveTree } from "hson-live";
import { type Outcome, relay_data, relay } from "intrastructure";
import { debug_state_path_test, debug_state_find_test, debug_state_intentional_fail_test, debug_state_remove_test, debug_state_replace_test, debug_store_facade_test } from "../../app/state/smoke-tests/state-path-test";
import { debug_state_smoke_test } from "../../app/state/smoke-tests/state-smoke-test";
import { tp_factory } from "./tp-factory";
import { TP_ROOTcss } from "./tp.css";
import type { TestPanels } from "./tp.types";


export function mount_test_panels(host: LiveTree): Outcome<TestPanels> {
    try {
        const old = host.find.byId("test-panels-root");
        if (old) old.removeSelf();

        const root = host.create.div()
            .id.set("test-panels-root")
            .css.setMany(TP_ROOTcss);

        const tp = relay_data(tp_factory());
        tp.mount(root);
        try {
            tp.setLog("#=-=-=-=-=-=-=-=-=-=-=#");
            tp.setLog("=- init: smoke test -=#");
            tp.setLog("#=-=-=-=-=-=-=-=-=-=-=#");
            const stateSmoke = debug_state_smoke_test();
            for (const line of stateSmoke.steps) tp.setLog(line);

            const statePath = debug_state_path_test();
            for (const line of statePath.steps) tp.setLog(line);

            const stateFind = debug_state_find_test();
            for (const line of stateFind.steps) tp.setLog(line);

            const removeFind = debug_state_remove_test();
            for (const line of removeFind.steps) tp.setLog(line);

            const replaceFind = debug_state_replace_test();
            for (const line of replaceFind.steps) tp.setLog(line);

            const storeFind = debug_store_facade_test();
            for (const line of storeFind.steps) tp.setLog(line);
            
            tp.setLog("#=-=-=-=-=-=-=-=-=-=-=#");
            tp.setLog("=-   smoke negative  -=");
            tp.setLog("=    (fail is good)   =");
            tp.setLog("#=-=-=-=-=-=-=-=-=-=-=#");
            
            const fail = debug_state_intentional_fail_test();
            for (const line of fail.steps) {
                tp.setLog(line);
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            tp.setLog(`FAIL - ${msg}`);
            tp.setLog("=== state - smoke test failed ===");
        }
        return relay.data({
            root,
            tp,
            inspector: tp.inspector,
            inspectorSurface: tp.inspectorSurface,
            testSurface: tp.branch,
        });
    } catch (err) {
        return relay.err(err instanceof Error ? err.message : "unknown error:", err);
    }
}
