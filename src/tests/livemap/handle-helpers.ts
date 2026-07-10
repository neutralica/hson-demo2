import { make_livemap_core } from "hson-live";
import type { TestCase } from "../../app/demos/test/tests.types";
import { json_root_node } from "./all-livemap-suites";
import type { CommitCaseSpec, FeedCaseSpec, LinkCaseSpec, ThrowCaseSpec, ReadCaseSpec, HandleSnapCaseSpec, HandleSetCaseSpec, HandleSetManyCaseSpec, HandleSetManyFeedCaseSpec, HandleDeleteCaseSpec, HandleDeleteFeedCaseSpec, HandleUpdateCaseSpec, HandleUpdateFeedCaseSpec, HandlePathCopyCaseSpec, HandleOriginalPathStabilityCaseSpec } from "./handle.types";
import { preview_value, equal_row } from "./test-helpers";
import type { LiveMapFeedEventPreview } from "./types";

export function commitCase(spec: CommitCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const commit = spec.act(map);

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
export function feedCase(spec: FeedCaseSpec): TestCase {
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
      const events: LiveMapFeedEventPreview[] = [];

      handle.feed((event) => {
        events.push({
          path: event.path,
          value: event.value,
          opPath: event.op.path,
          opPrev: event.op.prev,
          opNext: event.op.next,
        });
      });

      spec.act(handle);

      return {
        assertRows: [
          equal_row(`${spec.name}: events`, events, spec.expectedEvents),
        ],
      };
    },
  };
}
export function linkCase(spec: LinkCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      sourcePath: preview_value(spec.sourcePath),
      targetPath: preview_value(spec.targetPath),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const source = map.at(spec.sourcePath);
      const target = map.at(spec.targetPath);

      source.linkTo(target);
      spec.act(source);

      return {
        assertRows: [
          equal_row(`${spec.name}: root`, map.snap(), spec.expectedRoot),
        ],
      };
    },
  };
}
export function throwCase(spec: ThrowCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      let message = "";

      try {
        spec.act(map);
      } catch (error) {
        message = error instanceof Error ? error.message : String(error);
      }

      return {
        assertRows: [
          equal_row(`${spec.name}: error`, message, spec.expectedMessage),
        ],
      };
    },
  };
}
export function readCase(spec: ReadCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const value = spec.act(map);

      return {
        assertRows: [
          equal_row(`${spec.name}: value`, value, spec.expected),
        ],
      };
    },
  };
}
export function snapCase(spec: HandleSnapCaseSpec): TestCase {
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
export function setCase(spec: HandleSetCaseSpec): TestCase {
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
          equal_row(`${spec.name}: changed`, commit.changed, spec.expectedChanged),
          equal_row(`${spec.name}: root`, map.snap(), spec.expectedRoot),
        ],
      };
    },
  };
}
export function setManyCase(spec: HandleSetManyCaseSpec): TestCase {
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
      const handle = map.at(spec.path);
      const commit = handle.setMany(spec.values);

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
export function setManyFeedCase(spec: HandleSetManyFeedCaseSpec): TestCase {
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
      const handle = map.at(spec.path);
      const events: LiveMapFeedEventPreview[] = [];

      handle.feed((event) => {
        events.push({
          path: event.path,
          value: event.value,
          opPath: event.op.path,
          opPrev: event.op.prev,
          opNext: event.op.next,
        });
      });

      handle.setMany(spec.values);

      return {
        assertRows: [
          equal_row(`${spec.name}: events`, events, spec.expectedEvents),
        ],
      };
    },
  };
}
export function deleteCase(spec: HandleDeleteCaseSpec): TestCase {
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
      const commit = handle.delete();

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
export function deleteFeedCase(spec: HandleDeleteFeedCaseSpec): TestCase {
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
      const events: LiveMapFeedEventPreview[] = [];

      handle.feed((event) => {
        events.push({
          path: event.path,
          value: event.value,
          opPath: event.op.path,
          opPrev: event.op.prev,
          opNext: event.op.next,
        });
      });

      handle.delete();

      return {
        assertRows: [
          equal_row(`${spec.name}: events`, events, spec.expectedEvents),
        ],
      };
    },
  };
}
export function updateCase(spec: HandleUpdateCaseSpec): TestCase {
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
      const commit = handle.update(spec.update);

      return {
        assertRows: [
          equal_row(`${spec.name}: changed`, commit.changed, spec.expectedChanged),
          equal_row(`${spec.name}: root`, map.snap(), spec.expectedRoot),
        ],
      };
    },
  };
}
export function updateFeedCase(spec: HandleUpdateFeedCaseSpec): TestCase {
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
      const events: LiveMapFeedEventPreview[] = [];

      handle.feed((event) => {
        events.push({
          path: event.path,
          value: event.value,
          opPath: event.op.path,
          opPrev: event.op.prev,
          opNext: event.op.next,
        });
      });

      handle.update(spec.update);

      return {
        assertRows: [
          equal_row(`${spec.name}: events`, events, spec.expectedEvents),
        ],
      };
    },
  };
}
export function pathCopyCase(spec: HandlePathCopyCaseSpec): TestCase {
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
export function originalPathCase(spec: HandleOriginalPathStabilityCaseSpec): TestCase {
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
