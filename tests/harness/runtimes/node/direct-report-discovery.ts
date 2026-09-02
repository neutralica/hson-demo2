import type { TestCatalog } from "../../../../src/shared/testing/test-catalog-contract";
import type { TestSelection } from "../../../../src/shared/testing/test-selection";
import type { TestExecutorRegistry } from "../../core/test-executor";
import { make_test_executor_discovery } from "../../core/test-discovery";
import { make_node_livehost_hosted_test_executor_registry } from "./livehost-node-executor";
import { resolve_external_library_launchers, type ExternalLibraryLauncherAvailability } from "./external-library-launchers";

export type DirectReportDiscovery = Readonly<{
  registry: TestExecutorRegistry;
  catalog: TestCatalog;
  external: ExternalLibraryLauncherAvailability;
}>;

export async function discover_direct_report_executables(): Promise<DirectReportDiscovery> {
  const registry = make_node_livehost_hosted_test_executor_registry();
  const external = await resolve_external_library_launchers();
  const discovery = make_test_executor_discovery(registry, external.targets);
  return Object.freeze({ registry, catalog: discovery.catalog, external });
}

function executable_ids(catalog: TestCatalog): readonly string[] {
  return Object.freeze([
    ...catalog.tests.map((test) => test.id),
    ...catalog.suites.filter((suite) => suite.provenance === "hson-live").map((suite) => suite.id),
  ]);
}

/** Exact-ID selection over executable discovery, independent of request order. */
export function select_direct_report_executable_ids(catalog: TestCatalog, requestedIds: readonly string[]): readonly string[] {
  const duplicate = requestedIds.find((id, index) => requestedIds.indexOf(id) !== index);
  if (duplicate !== undefined) throw new Error(`DIRECT_REPORT_DUPLICATE_SELECTION:${duplicate}`);
  const requested = new Set(requestedIds);
  const available = executable_ids(catalog);
  for (const id of requested) if (!available.includes(id)) throw new Error(`DIRECT_REPORT_UNKNOWN_SELECTION:${id}`);
  return Object.freeze(available.filter((id) => requested.has(id)));
}

export function select_direct_report_ids(catalog: TestCatalog, selection: TestSelection): readonly string[] {
  const ids = executable_ids(catalog).filter((id) => {
    const test = catalog.tests.find((candidate) => candidate.id === id);
    const suite = catalog.suites.find((candidate) => candidate.id === (test?.suiteId ?? id));
    if (suite === undefined) return false;
    return (selection.subject === undefined || suite.subject === selection.subject)
      && (selection.collection === undefined || (test?.collections ?? suite.collections).includes(selection.collection))
      && (selection.suite === undefined || suite.id === selection.suite)
      && (selection.test === undefined || test?.id === selection.test);
  });
  if (selection.test !== undefined && !catalog.tests.some((test) => test.id === selection.test)) {
    throw new Error(`DIRECT_REPORT_UNKNOWN_SELECTION:${selection.test}`);
  }
  if (selection.suite !== undefined && !catalog.suites.some((suite) => suite.id === selection.suite)) {
    throw new Error(`DIRECT_REPORT_UNKNOWN_SELECTION:${selection.suite}`);
  }
  return Object.freeze(ids);
}
