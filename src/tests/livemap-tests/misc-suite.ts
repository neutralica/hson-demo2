// misc-suite.ts

import { bind_path, bind_paths, derive_from_paths, make_microtask_scheduler, stop_all, subscribe_paths } from "hson-live/livemap";
import type { TestSuite } from "../../app/demos/test/tests.types";
import { read_case } from "./handle-helpers";

type CapturedMicrotaskResult<T> = Readonly<{
  queued: number;
  value: T;
}>;

function withCapturedMicrotasks<T>(act: (flush: () => void) => T): CapturedMicrotaskResult<T> {
  const queued: Array<() => void> = [];
  const originalQueueMicrotask = globalThis.queueMicrotask;

  globalThis.queueMicrotask = ((callback: VoidFunction) => {
    queued.push(callback);
  }) as typeof queueMicrotask;

  try {
    const flush = (): void => {
      const callbacks = queued.splice(0);
      for (const callback of callbacks) callback();
    };

    const value = act(flush);
    return { queued: queued.length, value };
  } finally {
    globalThis.queueMicrotask = originalQueueMicrotask;
  }
}

export function livemap_misc_suite(): TestSuite {
  const SUITE = "livemap/misc";

  return {
    suite: SUITE,
    cases: [
      read_case({
        suite: SUITE,
        name: "make_microtask_scheduler does not run synchronously",
        input: {},
        act: () => {
          let calls = 0;
          const schedule = make_microtask_scheduler(() => {
            calls += 1;
          });

          schedule();
          return calls;
        },
        expected: 0,
      }),
      read_case({
        suite: SUITE,
        name: "make_microtask_scheduler queues only one microtask before flush",
        input: {},
        act: () => withCapturedMicrotasks(() => {
          const schedule = make_microtask_scheduler(() => undefined);

          schedule();
          schedule();
          schedule();

          return undefined;
        }).queued,
        expected: 1,
      }),
      read_case({
        suite: SUITE,
        name: "make_microtask_scheduler coalesces queued calls",
        input: {},
        act: () => withCapturedMicrotasks((flush) => {
          let calls = 0;
          const schedule = make_microtask_scheduler(() => {
            calls += 1;
          });

          schedule();
          schedule();
          schedule();
          flush();

          return calls;
        }).value,
        expected: 1,
      }),
      read_case({
        suite: SUITE,
        name: "make_microtask_scheduler allows later queued run",
        input: {},
        act: () => withCapturedMicrotasks((flush) => {
          let calls = 0;
          const schedule = make_microtask_scheduler(() => {
            calls += 1;
          });

          schedule();
          flush();
          schedule();
          flush();

          return calls;
        }).value,
        expected: 2,
      }),
      read_case({
        suite: SUITE,
        name: "make_microtask_scheduler allows reentrant later run",
        input: {},
        act: () => withCapturedMicrotasks((flush) => {
          let calls = 0;
          const schedule = make_microtask_scheduler(() => {
            calls += 1;
            if (calls === 1) schedule();
          });

          schedule();
          flush();
          flush();

          return calls;
        }).value,
        expected: 2,
      }),
      read_case({
        suite: SUITE,
        name: "make_microtask_scheduler coalesces reentrant queued calls",
        input: {},
        act: () => withCapturedMicrotasks((flush) => {
          let calls = 0;
          const schedule = make_microtask_scheduler(() => {
            calls += 1;
            if (calls === 1) {
              schedule();
              schedule();
              schedule();
            }
          });

          schedule();
          flush();
          flush();

          return calls;
        }).value,
        expected: 2,
      }),
      read_case({
        suite: SUITE,
        name: "stop_all handles empty disposer list",
        input: {},
        act: () => {
          const stop = stop_all([]);
          stop();
          stop();
          return "stopped";
        },
        expected: "stopped",
      }),
      read_case({
        suite: SUITE,
        name: "stop_all runs disposers in insertion order",
        input: {},
        act: () => {
          const events: string[] = [];
          const stop = stop_all([
            () => events.push("a"),
            () => events.push("b"),
            () => events.push("c"),
          ]);

          stop();
          return events;
        },
        expected: ["a", "b", "c"],
      }),
      read_case({
        suite: SUITE,
        name: "stop_all is idempotent",
        input: {},
        act: () => {
          let calls = 0;
          const stop = stop_all([
            () => { calls += 1; },
            () => { calls += 1; },
          ]);

          stop();
          stop();
          stop();

          return calls;
        },
        expected: 2,
      }),
      read_case({
        suite: SUITE,
        name: "stop_all ignores recursive stop calls",
        input: {},
        act: () => {
          const events: string[] = [];
          let stop: () => void = () => undefined;

          stop = stop_all([
            () => {
              events.push("a");
              stop();
            },
            () => events.push("b"),
          ]);

          stop();
          stop();

          return events;
        },
        expected: ["a", "b"],
      }),
      read_case({
        suite: SUITE,
        name: "stop_all accepts iterable disposer source",
        input: {},
        act: () => {
          const events: string[] = [];

          function* makeStops(): Generator<() => void> {
            yield () => events.push("first");
            yield () => events.push("second");
          }

          const stop = stop_all(makeStops());
          stop();

          return events;
        },
        expected: ["first", "second"],
      }),
      read_case({
        suite: SUITE,
        name: "subscribe_paths handles empty path list",
        input: {},
        act: () => {
          let subscriptions = 0;
          const stop = subscribe_paths(
            (_path: string[], _listener: () => void) => {
              subscriptions += 1;
              return () => undefined;
            },
            [],
            () => undefined,
          );

          stop();
          return subscriptions;
        },
        expected: 0,
      }),
      read_case({
        suite: SUITE,
        name: "subscribe_paths subscribes each path",
        input: {},
        act: () => {
          const subscribed: string[][] = [];
          subscribe_paths(
            (path: string[], _listener: () => void) => {
              subscribed.push(path);
              return () => undefined;
            },
            [["cells"], ["ui", "selected"]],
            () => undefined,
          );

          return subscribed;
        },
        expected: [["cells"], ["ui", "selected"]],
      }),
      read_case({
        suite: SUITE,
        name: "subscribe_paths subscribes paths in insertion order",
        input: {},
        act: () => {
          const events: string[] = [];
          subscribe_paths(
            (path: string[], _listener: () => void) => {
              events.push(path.join("."));
              return () => undefined;
            },
            [["a"], ["b", "c"], ["d"]],
            () => undefined,
          );

          return events;
        },
        expected: ["a", "b.c", "d"],
      }),
      read_case({
        suite: SUITE,
        name: "subscribe_paths returns combined disposer",
        input: {},
        act: () => {
          const events: string[] = [];
          const stop = subscribe_paths(
            (path: string[], _listener: () => void) => {
              events.push(`sub:${path.join(".")}`);
              return () => events.push(`stop:${path.join(".")}`);
            },
            [["cells"], ["ui", "selected"]],
            () => undefined,
          );

          stop();
          stop();

          return events;
        },
        expected: [
          "sub:cells",
          "sub:ui.selected",
          "stop:cells",
          "stop:ui.selected",
        ],
      }),
      read_case({
        suite: SUITE,
        name: "subscribe_paths listeners share callback",
        input: {},
        act: () => {
          let calls = 0;
          const subscribed: Array<() => void> = [];
          subscribe_paths(
            (_path: string[], listener: () => void) => {
              subscribed.push(listener);
              return () => undefined;
            },
            [["cells"], ["ui", "selected"]],
            () => { calls += 1; },
          );

          for (const listener of subscribed) listener();
          return calls;
        },
        expected: 2,
      }),
      read_case({
        suite: SUITE,
        name: "subscribe_paths combined disposer detaches listeners",
        input: {},
        act: () => {
          let calls = 0;
          const listeners = new Map<string, () => void>();
          const subscribePath = (path: string[], listener: () => void): (() => void) => {
            const key = path.join(".");
            listeners.set(key, listener);
            return () => { listeners.delete(key); };
          };

          const stop = subscribe_paths(
            subscribePath,
            [["cells"], ["ui", "selected"]],
            () => { calls += 1; },
          );

          listeners.get("cells")?.();
          listeners.get("ui.selected")?.();
          stop();
          listeners.get("cells")?.();
          listeners.get("ui.selected")?.();

          return calls;
        },
        expected: 2,
      }),
      read_case({
        suite: SUITE,
        name: "subscribe_paths composes with microtask scheduler",
        input: {},
        act: () => withCapturedMicrotasks((flush) => {
          let calls = 0;
          const listeners: Array<() => void> = [];
          const schedule = make_microtask_scheduler(() => { calls += 1; });

          subscribe_paths(
            (_path: string[], listener: () => void) => {
              listeners.push(listener);
              return () => undefined;
            },
            [["cells"], ["ui", "selected"]],
            schedule,
          );

          for (const listener of listeners) listener();
          for (const listener of listeners) listener();
          flush();

          return calls;
        }).value,
        expected: 1,
      }),
      read_case({
        suite: SUITE,
        name: "subscribe_paths combined disposer is idempotent",
        input: {},
        act: () => {
          const events: string[] = [];
          const childStops: Array<() => void> = [];
          const stop = subscribe_paths(
            (path: string[], _listener: () => void) => {
              const childStop = () => events.push(`stop:${path.join(".")}`);
              childStops.push(childStop);
              return childStop;
            },
            [["cells"], ["ui", "selected"]],
            () => undefined,
          );

          stop();
          stop();

          return events;
        },
        expected: ["stop:cells", "stop:ui.selected"],
      }),
      read_case({
        suite: SUITE,
        name: "bind_path renders immediately by default",
        input: {},
        act: () => {
          let value = "a";
          const renders: string[] = [];

          bind_path({
            path: ["value"],
            subscribePath: (_path: string[], _listener: () => void) => () => undefined,
            read: () => value,
            render: (next) => { renders.push(next); },
          });

          value = "b";
          return renders;
        },
        expected: ["a"],
      }),
      read_case({
        suite: SUITE,
        name: "bind_path can skip immediate render",
        input: {},
        act: () => {
          const renders: string[] = [];

          bind_path({
            path: ["value"],
            subscribePath: (_path: string[], _listener: () => void) => () => undefined,
            read: () => "a",
            render: (next) => { renders.push(next); },
            immediate: false,
          });

          return renders;
        },
        expected: [],
      }),
      read_case({
        suite: SUITE,
        name: "bind_path renders latest read value on subscription event",
        input: {},
        act: () => {
          let value = "a";
          let listener: (() => void) | undefined;
          const renders: string[] = [];

          bind_path({
            path: ["value"],
            subscribePath: (_path: string[], nextListener: () => void) => {
              listener = nextListener;
              return () => undefined;
            },
            read: () => value,
            render: (next) => { renders.push(next); },
            immediate: false,
          });

          value = "b";
          listener?.();

          return renders;
        },
        expected: ["b"],
      }),
      read_case({
        suite: SUITE,
        name: "bind_path returns subscription disposer",
        input: {},
        act: () => {
          const events: string[] = [];
          const stop = bind_path({
            path: ["value"],
            subscribePath: (_path: string[], _listener: () => void) => () => { events.push("stop"); },
            read: () => "a",
            render: () => undefined,
          });

          stop();
          return events;
        },
        expected: ["stop"],
      }),
      read_case({
        suite: SUITE,
        name: "bind_path composes with microtask scheduler",
        input: {},
        act: () => withCapturedMicrotasks((flush) => {
          let value = "a";
          let listener: (() => void) | undefined;
          const renders: string[] = [];

          bind_path({
            path: ["value"],
            subscribePath: (_path: string[], nextListener: () => void) => {
              listener = nextListener;
              return () => undefined;
            },
            read: () => value,
            render: (next) => { renders.push(next); },
            schedule: make_microtask_scheduler,
            immediate: false,
          });

          value = "b";
          listener?.();
          value = "c";
          listener?.();
          flush();

          return renders;
        }).value,
        expected: ["c"],
      }),
      read_case({
        suite: SUITE,
        name: "bind_path immediate render bypasses scheduler",
        input: {},
        act: () => withCapturedMicrotasks(() => {
          const renders: string[] = [];

          bind_path({
            path: ["value"],
            subscribePath: (_path: string[], _listener: () => void) => () => undefined,
            read: () => "a",
            render: (next) => { renders.push(next); },
            schedule: make_microtask_scheduler,
          });

          return renders;
        }).value,
        expected: ["a"],
      }),
      read_case({
        suite: SUITE,
        name: "bind_path scheduled listener does not render before flush",
        input: {},
        act: () => withCapturedMicrotasks(() => {
          let listener: (() => void) | undefined;
          const renders: string[] = [];

          bind_path({
            path: ["value"],
            subscribePath: (_path: string[], nextListener: () => void) => {
              listener = nextListener;
              return () => undefined;
            },
            read: () => "a",
            render: (next) => { renders.push(next); },
            schedule: make_microtask_scheduler,
            immediate: false,
          });

          listener?.();
          return renders;
        }).value,
        expected: [],
      }),
      read_case({
        suite: SUITE,
        name: "bind_path disposer detaches subscribed listener",
        input: {},
        act: () => {
          let value = "a";
          let listener: (() => void) | undefined;
          const renders: string[] = [];
          const stop = bind_path({
            path: ["value"],
            subscribePath: (_path: string[], nextListener: () => void) => {
              listener = nextListener;
              return () => { listener = undefined; };
            },
            read: () => value,
            render: (next) => { renders.push(next); },
            immediate: false,
          });

          value = "b";
          listener?.();
          stop();
          value = "c";
          listener?.();

          return renders;
        },
        expected: ["b"],
      }),
      read_case({
        suite: SUITE,
        name: "bind_paths renders immediately by default",
        input: {},
        act: () => {
          let value = "a";
          const renders: string[] = [];

          bind_paths({
            paths: [["a"], ["b"]],
            subscribePath: (_path: string[], _listener: () => void) => () => undefined,
            read: () => value,
            render: (next) => { renders.push(next); },
          });

          value = "b";
          return renders;
        },
        expected: ["a"],
      }),
      read_case({
        suite: SUITE,
        name: "bind_paths can skip immediate render",
        input: {},
        act: () => {
          const renders: string[] = [];

          bind_paths({
            paths: [["a"], ["b"]],
            subscribePath: (_path: string[], _listener: () => void) => () => undefined,
            read: () => "a",
            render: (next) => { renders.push(next); },
            immediate: false,
          });

          return renders;
        },
        expected: [],
      }),
      read_case({
        suite: SUITE,
        name: "bind_paths subscribes all paths",
        input: {},
        act: () => {
          const subscribed: string[] = [];

          bind_paths({
            paths: [["a"], ["b", "c"], ["d"]],
            subscribePath: (path: string[], _listener: () => void) => {
              subscribed.push(path.join("."));
              return () => undefined;
            },
            read: () => undefined,
            render: () => undefined,
            immediate: false,
          });

          return subscribed;
        },
        expected: ["a", "b.c", "d"],
      }),
      read_case({
        suite: SUITE,
        name: "bind_paths renders latest read value on subscribed event",
        input: {},
        act: () => {
          let value = "a";
          const listeners: Array<() => void> = [];
          const renders: string[] = [];

          bind_paths({
            paths: [["a"], ["b"]],
            subscribePath: (_path: string[], listener: () => void) => {
              listeners.push(listener);
              return () => undefined;
            },
            read: () => value,
            render: (next) => { renders.push(next); },
            immediate: false,
          });

          value = "b";
          listeners[0]?.();
          value = "c";
          listeners[1]?.();

          return renders;
        },
        expected: ["b", "c"],
      }),
      read_case({
        suite: SUITE,
        name: "bind_paths composes with microtask scheduler",
        input: {},
        act: () => withCapturedMicrotasks((flush) => {
          let value = "a";
          const listeners: Array<() => void> = [];
          const renders: string[] = [];

          bind_paths({
            paths: [["a"], ["b"]],
            subscribePath: (_path: string[], listener: () => void) => {
              listeners.push(listener);
              return () => undefined;
            },
            read: () => value,
            render: (next) => { renders.push(next); },
            schedule: make_microtask_scheduler,
            immediate: false,
          });

          value = "b";
          listeners[0]?.();
          value = "c";
          listeners[1]?.();
          flush();

          return renders;
        }).value,
        expected: ["c"],
      }),
      read_case({
        suite: SUITE,
        name: "bind_paths scheduled listener does not render before flush",
        input: {},
        act: () => withCapturedMicrotasks(() => {
          const listeners: Array<() => void> = [];
          const renders: string[] = [];

          bind_paths({
            paths: [["a"], ["b"]],
            subscribePath: (_path: string[], listener: () => void) => {
              listeners.push(listener);
              return () => undefined;
            },
            read: () => "a",
            render: (next) => { renders.push(next); },
            schedule: make_microtask_scheduler,
            immediate: false,
          });

          listeners[0]?.();
          listeners[1]?.();
          return renders;
        }).value,
        expected: [],
      }),
      read_case({
        suite: SUITE,
        name: "bind_paths immediate render bypasses scheduler",
        input: {},
        act: () => withCapturedMicrotasks(() => {
          const renders: string[] = [];

          bind_paths({
            paths: [["a"], ["b"]],
            subscribePath: (_path: string[], _listener: () => void) => () => undefined,
            read: () => "a",
            render: (next) => { renders.push(next); },
            schedule: make_microtask_scheduler,
          });

          return renders;
        }).value,
        expected: ["a"],
      }),
      read_case({
        suite: SUITE,
        name: "bind_paths returns combined disposer",
        input: {},
        act: () => {
          const events: string[] = [];
          const stop = bind_paths({
            paths: [["a"], ["b"]],
            subscribePath: (path: string[], _listener: () => void) => {
              events.push(`sub:${path.join(".")}`);
              return () => { events.push(`stop:${path.join(".")}`); };
            },
            read: () => undefined,
            render: () => undefined,
          });

          stop();
          stop();

          return events;
        },
        expected: [
          "sub:a",
          "sub:b",
          "stop:a",
          "stop:b",
        ],
      }),
      read_case({
        suite: SUITE,
        name: "bind_paths handles empty path list",
        input: {},
        act: () => {
          let subscriptions = 0;
          const renders: string[] = [];

          const stop = bind_paths({
            paths: [],
            subscribePath: (_path: string[], _listener: () => void) => {
              subscriptions += 1;
              return () => undefined;
            },
            read: () => "a",
            render: (next) => { renders.push(next); },
          });

          stop();
          return { subscriptions, renders };
        },
        expected: { subscriptions: 0, renders: ["a"] },
      }),
      read_case({
        suite: SUITE,
        name: "derive_from_paths does not run immediately by default",
        input: {},
        act: () => {
          let calls = 0;

          derive_from_paths({
            paths: [["cells"]],
            subscribePath: (_path: string[], _listener: () => void) => () => undefined,
            derive: () => { calls += 1; },
          });

          return calls;
        },
        expected: 0,
      }),
      read_case({
        suite: SUITE,
        name: "derive_from_paths can run immediately",
        input: {},
        act: () => {
          let calls = 0;

          derive_from_paths({
            paths: [["cells"]],
            subscribePath: (_path: string[], _listener: () => void) => () => undefined,
            derive: () => { calls += 1; },
            immediate: true,
          });

          return calls;
        },
        expected: 1,
      }),
      read_case({
        suite: SUITE,
        name: "derive_from_paths subscribes input paths",
        input: {},
        act: () => {
          const subscribed: string[] = [];

          derive_from_paths({
            paths: [["cells"], ["ui", "selected"]],
            subscribePath: (path: string[], _listener: () => void) => {
              subscribed.push(path.join("."));
              return () => undefined;
            },
            derive: () => undefined,
          });

          return subscribed;
        },
        expected: ["cells", "ui.selected"],
      }),
      read_case({
        suite: SUITE,
        name: "derive_from_paths runs derive on subscribed event",
        input: {},
        act: () => {
          let calls = 0;
          const listeners: Array<() => void> = [];

          derive_from_paths({
            paths: [["cells"], ["ui", "selected"]],
            subscribePath: (_path: string[], listener: () => void) => {
              listeners.push(listener);
              return () => undefined;
            },
            derive: () => { calls += 1; },
          });

          listeners[0]?.();
          listeners[1]?.();

          return calls;
        },
        expected: 2,
      }),
      read_case({
        suite: SUITE,
        name: "derive_from_paths composes with microtask scheduler",
        input: {},
        act: () => withCapturedMicrotasks((flush) => {
          let calls = 0;
          const listeners: Array<() => void> = [];

          derive_from_paths({
            paths: [["cells"], ["ui", "selected"]],
            subscribePath: (_path: string[], listener: () => void) => {
              listeners.push(listener);
              return () => undefined;
            },
            derive: () => { calls += 1; },
            schedule: make_microtask_scheduler,
          });

          listeners[0]?.();
          listeners[1]?.();
          flush();

          return calls;
        }).value,
        expected: 1,
      }),
      read_case({
        suite: SUITE,
        name: "derive_from_paths immediate run uses scheduler when supplied",
        input: {},
        act: () => withCapturedMicrotasks((flush) => {
          let calls = 0;

          derive_from_paths({
            paths: [["cells"]],
            subscribePath: (_path: string[], _listener: () => void) => () => undefined,
            derive: () => { calls += 1; },
            schedule: make_microtask_scheduler,
            immediate: true,
          });

          const beforeFlush = calls;
          flush();

          return { beforeFlush, afterFlush: calls };
        }).value,
        expected: { beforeFlush: 0, afterFlush: 1 },
      }),
      read_case({
        suite: SUITE,
        name: "derive_from_paths scheduled immediate coalesces with event",
        input: {},
        act: () => withCapturedMicrotasks((flush) => {
          let calls = 0;
          let listener: (() => void) | undefined;

          derive_from_paths({
            paths: [["cells"]],
            subscribePath: (_path: string[], nextListener: () => void) => {
              listener = nextListener;
              return () => undefined;
            },
            derive: () => { calls += 1; },
            schedule: make_microtask_scheduler,
            immediate: true,
          });

          listener?.();
          flush();

          return calls;
        }).value,
        expected: 1,
      }),
      read_case({
        suite: SUITE,
        name: "derive_from_paths returns combined disposer",
        input: {},
        act: () => {
          const events: string[] = [];
          const stop = derive_from_paths({
            paths: [["cells"], ["ui", "selected"]],
            subscribePath: (path: string[], _listener: () => void) => {
              events.push(`sub:${path.join(".")}`);
              return () => { events.push(`stop:${path.join(".")}`); };
            },
            derive: () => undefined,
          });

          stop();
          stop();

          return events;
        },
        expected: [
          "sub:cells",
          "sub:ui.selected",
          "stop:cells",
          "stop:ui.selected",
        ],
      }),
    ] as const,
  };
}