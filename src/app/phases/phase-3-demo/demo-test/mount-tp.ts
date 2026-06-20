import type { LiveTree } from "hson-live";
import { type Outcome, relay_data, relay } from "intrastructure";
import { debug_state_path_test, debug_state_find_test, debug_state_intentional_fail_test, debug_state_remove_test, debug_state_replace_test, debug_store_facade_test, debug_state_set_test, debug_state_public_path_test, debug_state_public_path_edges_test, debug_schema_context_exports_smoke_test, smoke_demo_store_schema_impl } from "../../../state/smoke-tests/smoke-test-1";
import { debug_schema_path_smoke_test, debug_schema_smoke_test, debug_state_smoke_test } from "../../../state/smoke-tests/smoke-test-1";
import { tp_factory } from "./tp-factory";
import type { TestPanels } from "./tp.types";
import { TP_ROOTcss } from "./tp.css";


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
            const runSmoke = (label: string, fn: () => { steps: string[] }): void => {
                try {
                    const result = fn();
                    for (const line of result.steps) tp.setLog(line);
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    tp.setLog(`FAIL - ${label}: ${msg}`);
                }
            };

            runSmoke("state smoke", debug_state_smoke_test);
            runSmoke("state path parsing", debug_state_path_test);
            runSmoke("state path lookup", debug_state_find_test);
            runSmoke("state remove path", debug_state_remove_test);
            runSmoke("state replace", debug_state_replace_test);
            runSmoke("store facade", debug_store_facade_test);
            runSmoke("state set path", debug_state_set_test);
            runSmoke("state public path", debug_state_public_path_test);
            runSmoke("state public path edges", debug_state_public_path_edges_test);
            runSmoke("schema validation", debug_schema_smoke_test);
            runSmoke("schema path validation", debug_schema_path_smoke_test);
            runSmoke("schema context exports", debug_schema_context_exports_smoke_test);
            runSmoke("smoke impl?", smoke_demo_store_schema_impl);

            tp.setLog("#=-=-=-=-=-=-=-=-=-=-=#");
            tp.setLog("=-   smoke negative  -=");
            tp.setLog("=    (fail is good)   =");
            tp.setLog("#=-=-=-=-=-=-=-=-=-=-=#");
            runSmoke("intentional failure", debug_state_intentional_fail_test);
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
