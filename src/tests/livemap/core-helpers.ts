import { make_livemap_core, type LiveMapFeedEvent } from "hson-live";
import type { TestCase } from "../../app/demos/test/tests.types";
import type { CoreAtSnapCaseSpec, CoreAtSetCaseSpec, CoreAtFeedCaseSpec, CoreAtPathCopyCaseSpec, CoreAtOriginalPathStabilityCaseSpec, CoreNodeTagCaseSpec, CoreNodeMissingCaseSpec, CoreNodePathCopyCaseSpec, CoreNodeOriginalPathStabilityCaseSpec, CoreSetPathCopyCaseSpec, CoreSetManyCaseSpec, CoreSetManyFeedCaseSpec, CoreSetManyPathCopyCaseSpec, CoreDeleteCaseSpec, CoreDeleteFeedCaseSpec, CoreDeletePathCopyCaseSpec, CoreDeleteThrowCaseSpec } from "./core.types";
import { preview_value, equal_row } from "./test-helpers";
import { json_root_node } from "./json-root-node";
import type { LiveMapFeedEventPreview, LiveMapFeedCaseSpec } from "./types";

export function make_core_at_snap_case(spec: CoreAtSnapCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const handle = map.at(spec.path);

      return {
        assertRows: [
          equal_row(`${spec.name}: snap`, handle.snap(), spec.expected),
          equal_row(`${spec.name}: path`, handle.path(), spec.path),
        ],
      };
    },
  };
}
export function make_core_at_set_case(spec: CoreAtSetCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
      value: preview_value(spec.value),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const handle = map.at(spec.path);
      const commit = handle.set(spec.value);

      return {
        assertRows: [
          equal_row(`${spec.name}: changed`, commit.changed, spec.expectedCommitChanged),
          equal_row(`${spec.name}: root`, map.snap(), spec.expectedRoot),
        ],
      };
    },
  };
}
export function make_core_at_feed_case(spec: CoreAtFeedCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
      value: preview_value(spec.value),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const handle = map.at(spec.path);
      const events: LiveMapFeedEventPreview[] = [];

      handle.feed((event) => {
        events.push(preview_core_feed_event(event));
      });

      handle.set(spec.value);

      return {
        assertRows: [
          equal_row(`${spec.name}: events`, events, spec.expectedEvents),
        ],
      };
    },
  };
}
export function make_core_at_path_copy_case(spec: CoreAtPathCopyCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
      mutateReturnedPathTo: preview_value(spec.mutateReturnedPathTo),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const handle = map.at(spec.path);
      const returnedPath = handle.path() as (string | number)[];

      returnedPath.splice(0, returnedPath.length, ...spec.mutateReturnedPathTo);

      return {
        assertRows: [
          equal_row(`${spec.name}: returned path mutation`, handle.path(), spec.expectedHandlePath),
        ],
      };
    },
  };
}
export function make_core_at_original_path_stability_case(spec: CoreAtOriginalPathStabilityCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
      mutateOriginalPathTo: preview_value(spec.mutateOriginalPathTo),
      value: preview_value(spec.value),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const originalPath = [...spec.path];
      const handle = map.at(originalPath);

      originalPath.splice(0, originalPath.length, ...spec.mutateOriginalPathTo);
      handle.set(spec.value);

      return {
        assertRows: [
          equal_row(`${spec.name}: root`, map.snap(), spec.expectedRoot),
          equal_row(`${spec.name}: handle path`, handle.path(), spec.path),
        ],
      };
    },
  };
}
export function make_core_node_tag_case(spec: CoreNodeTagCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const handle = map.node(spec.path);
      const node = handle.get();

      return {
        assertRows: [
          equal_row(`${spec.name}: path`, handle.path(), spec.path),
          equal_row(`${spec.name}: get tag`, node?.$_tag, spec.expectedTag),
          equal_row(`${spec.name}: must tag`, handle.must().$_tag, spec.expectedTag),
          equal_row(`${spec.name}: tag`, handle.tag(), spec.expectedTag),
          equal_row(`${spec.name}: attrs`, handle.attrs(), node?.$_attrs),
          equal_row(`${spec.name}: meta`, handle.meta(), node?.$_meta),
          equal_row(`${spec.name}: content`, handle.content(), node?.$_content),
        ],
      };
    },
  };
}
export function make_core_node_missing_case(spec: CoreNodeMissingCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const handle = map.node(spec.path);
      let message = "";

      try {
        handle.must();
      } catch (error) {
        message = error instanceof Error ? error.message : String(error);
      }

      return {
        assertRows: [
          equal_row(`${spec.name}: get`, handle.get(), undefined),
          equal_row(`${spec.name}: tag`, handle.tag(), undefined),
          equal_row(`${spec.name}: attrs`, handle.attrs(), undefined),
          equal_row(`${spec.name}: meta`, handle.meta(), undefined),
          equal_row(`${spec.name}: content`, handle.content(), undefined),
          equal_row(`${spec.name}: must error`, message, spec.expectedMessage),
        ],
      };
    },
  };
}
export function make_core_node_path_copy_case(spec: CoreNodePathCopyCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
      mutateReturnedPathTo: preview_value(spec.mutateReturnedPathTo),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const handle = map.node(spec.path);
      const returnedPath = handle.path() as (string | number)[];

      returnedPath.splice(0, returnedPath.length, ...spec.mutateReturnedPathTo);

      return {
        assertRows: [
          equal_row(`${spec.name}: returned path mutation`, handle.path(), spec.expectedHandlePath),
        ],
      };
    },
  };
}
export function make_core_node_original_path_stability_case(spec: CoreNodeOriginalPathStabilityCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
      mutateOriginalPathTo: preview_value(spec.mutateOriginalPathTo),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const originalPath = [...spec.path];
      const handle = map.node(originalPath);

      originalPath.splice(0, originalPath.length, ...spec.mutateOriginalPathTo);

      return {
        assertRows: [
          equal_row(`${spec.name}: tag`, handle.tag(), spec.expectedTag),
          equal_row(`${spec.name}: handle path`, handle.path(), spec.path),
        ],
      };
    },
  };
}
export function make_core_set_path_copy_case(spec: CoreSetPathCopyCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
      mutateOriginalPathTo: preview_value(spec.mutateOriginalPathTo),
      value: preview_value(spec.value),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const originalPath = [...spec.path];
      const commit = map.set(originalPath, spec.value);

      originalPath.splice(0, originalPath.length, ...spec.mutateOriginalPathTo);

      return {
        assertRows: [
          equal_row(`${spec.name}: commit path`, commit.ops[0]?.path, spec.expectedCommitPath),
          equal_row(`${spec.name}: root`, map.snap(), spec.expectedRoot),
        ],
      };
    },
  };
}
export function make_core_set_many_case(spec: CoreSetManyCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
      values: preview_value(spec.values),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const commit = map.setMany(spec.path, spec.values);

      return {
        assertRows: [
          equal_row(`${spec.name}: changed`, commit.changed, spec.expectedChanged),
          equal_row(`${spec.name}: ops`, commit.ops, spec.expectedOps),
          equal_row(`${spec.name}: root`, map.snap(), spec.expectedRoot),
        ],
      };
    },
  };
}
export function make_core_set_many_feed_case(spec: CoreSetManyFeedCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      feedPath: preview_value(spec.feedPath),
      setPath: preview_value(spec.setPath),
      values: preview_value(spec.values),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const events: LiveMapFeedEventPreview[] = [];

      map.feed(spec.feedPath, (event) => {
        events.push(preview_core_feed_event(event));
      });

      map.setMany(spec.setPath, spec.values);

      return {
        assertRows: [
          equal_row(`${spec.name}: events`, events, spec.expectedEvents),
        ],
      };
    },
  };
}
export function make_core_set_many_path_copy_case(spec: CoreSetManyPathCopyCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
      mutateOriginalPathTo: preview_value(spec.mutateOriginalPathTo),
      values: preview_value(spec.values),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const originalPath = [...spec.path];
      const commit = map.setMany(originalPath, spec.values);

      originalPath.splice(0, originalPath.length, ...spec.mutateOriginalPathTo);

      return {
        assertRows: [
          equal_row(`${spec.name}: commit paths`, commit.ops.map((op) => op.path), spec.expectedCommitPaths),
          equal_row(`${spec.name}: root`, map.snap(), spec.expectedRoot),
        ],
      };
    },
  };
}
export function make_core_delete_case(spec: CoreDeleteCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const commit = map.delete(spec.path);

      return {
        assertRows: [
          equal_row(`${spec.name}: changed`, commit.changed, spec.expectedChanged),
          equal_row(`${spec.name}: ops`, commit.ops, spec.expectedOps),
          equal_row(`${spec.name}: root`, map.snap(), spec.expectedRoot),
        ],
      };
    },
  };
}
export function make_core_delete_feed_case(spec: CoreDeleteFeedCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      feedPath: preview_value(spec.feedPath),
      deletePath: preview_value(spec.deletePath),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const events: LiveMapFeedEventPreview[] = [];

      map.feed(spec.feedPath, (event) => {
        events.push(preview_core_feed_event(event));
      });

      map.delete(spec.deletePath);

      return {
        assertRows: [
          equal_row(`${spec.name}: events`, events, spec.expectedEvents),
        ],
      };
    },
  };
}
export function make_core_delete_path_copy_case(spec: CoreDeletePathCopyCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
      mutateOriginalPathTo: preview_value(spec.mutateOriginalPathTo),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const originalPath = [...spec.path];
      const commit = map.delete(originalPath);

      originalPath.splice(0, originalPath.length, ...spec.mutateOriginalPathTo);

      return {
        assertRows: [
          equal_row(`${spec.name}: commit path`, commit.ops[0]?.path, spec.expectedCommitPath),
          equal_row(`${spec.name}: root`, map.snap(), spec.expectedRoot),
        ],
      };
    },
  };
}
export function make_core_delete_throw_case(spec: CoreDeleteThrowCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      let message = "";

      try {
        map.delete(spec.path);
      } catch (error) {
        message = error instanceof Error ? error.message : String(error);
      }

      return {
        assertRows: [
          equal_row(`${spec.name}: error`, message, spec.expectedMessage),
          equal_row(`${spec.name}: root`, map.snap(), spec.expectedRoot),
        ],
      };
    },
  };
}
export function make_core_feed_case(spec: LiveMapFeedCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      feedPath: preview_value(spec.feedPath),
      setPath: preview_value(spec.setPath),
      value: preview_value(spec.value),
    },
    run: () => {
      const root = json_root_node(spec.input);
      const map = make_livemap_core(root);
      const events: LiveMapFeedEventPreview[] = [];

      map.feed(spec.feedPath, (event) => {
        events.push(preview_core_feed_event(event));
      });

      map.set(spec.setPath, spec.value);

      return {
        assertRows: [
          equal_row(`${spec.name}: events`, events, spec.expectedEvents),
        ],
      };
    },
  };
}
export function make_core_feed_dispose_case(spec: LiveMapFeedCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      feedPath: preview_value(spec.feedPath),
      setPath: preview_value(spec.setPath),
      value: preview_value(spec.value),
    },
    run: () => {
      const root = json_root_node(spec.input);
      const map = make_livemap_core(root);
      const events: LiveMapFeedEventPreview[] = [];

      const dispose = map.feed(spec.feedPath, (event) => {
        events.push(preview_core_feed_event(event));
      });

      dispose();
      map.set(spec.setPath, spec.value);

      return {
        assertRows: [
          equal_row(`${spec.name}: events`, events, spec.expectedEvents),
        ],
      };
    },
  };
}
export function preview_core_feed_event(event: LiveMapFeedEvent): LiveMapFeedEventPreview {
  return {
    path: event.path,
    value: event.value,
    opPath: event.op.path,
    opPrev: event.op.prev,
    opNext: event.op.next,
  };
}
export { json_root_node } from "./json-root-node";
