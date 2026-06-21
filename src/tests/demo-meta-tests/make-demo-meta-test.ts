// make-demo-meta-test.ts

import type { TestSuite } from "../../app/demos/demo-test/tests.types";
import { demo_meta_colors, demo_meta_diffing } from "./demo-meta-tests-1";

// make-demo-meta-test.ts

export function all_demo_meta(): readonly TestSuite[] {
  return [
    demo_meta_colors(),
    demo_meta_diffing(),
  ] as const
}

export type DemoMetaAssert = Readonly<{
  ok: (label: string, value: unknown) => void;
  eq: <T>(label: string, actual: T, expected: T) => void;
  notEq: <T>(label: string, actual: T, expected: T) => void;
  throws: (label: string, fn: () => unknown) => void;
}>;

export type DemoMetaCaseSpec<TContext = undefined> = Readonly<{
  suite?: string;
  name: string;
  arrange?: () => TContext | Promise<TContext>;
  act?: (ctx: TContext, t: DemoMetaAssert) => void | Promise<void>;
  assert: (ctx: TContext, t: DemoMetaAssert) => void | Promise<void>;
  cleanup?: (ctx: TContext) => void | Promise<void>;
  preview?: (ctx: TContext) => string | Promise<string>;
}>;

export type DemoMetaRunnableCase = Readonly<{
  suite: string;
  name: string;
  run: () => void | Promise<void>;
  preview?: () => string | Promise<string>;
}>;

export type DemoMetaSuite = Readonly<{
  suite: string;
  cases: readonly DemoMetaRunnableCase[];
}>;

function makeAssert(): DemoMetaAssert {
  return Object.freeze({
    ok(label, value) {
      if (!value) throw new Error(`${label}: expected truthy value`);
    },

    eq(label, actual, expected) {
      if (!Object.is(actual, expected)) {
        throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
      }
    },

    notEq(label, actual, expected) {
      if (Object.is(actual, expected)) {
        throw new Error(`${label}: expected value not to equal ${String(expected)}`);
      }
    },

    throws(label, fn) {
      let threw = false;

      try {
        fn();
      } catch {
        threw = true;
      }

      if (!threw) throw new Error(`${label}: expected function to throw`);
    },
  });
}

export function make_demo_meta_case<TContext = undefined>(
  suite: string,
  spec: DemoMetaCaseSpec<TContext>,
): DemoMetaRunnableCase {
  let lastContext: TContext | undefined;

  return Object.freeze({
    suite: spec.suite ?? suite,
    name: spec.name,

    async run() {
      const t = makeAssert();
      const ctx = spec.arrange
        ? await spec.arrange()
        : (undefined as TContext);

      lastContext = ctx;

      try {
        await spec.act?.(ctx, t);
        await spec.assert(ctx, t);
      } finally {
        await spec.cleanup?.(ctx);
      }
    },

    async preview() {
      if (!spec.preview) return "";
      if (lastContext === undefined) return "<demo-meta preview unavailable before run>";
      return spec.preview(lastContext);
    },
  });
}

export function make_demo_meta_suite<TContext = undefined>(
  suite: string,
  cases: readonly DemoMetaCaseSpec<TContext>[],
): DemoMetaSuite {
  return Object.freeze({
    suite,
    cases: cases.map((spec) => make_demo_meta_case(suite, spec)),
  });
}

