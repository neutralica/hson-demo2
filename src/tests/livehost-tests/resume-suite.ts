// resume-suite.ts

import { make_livehost_resume_log } from "hson-live/livehost";
import type { TestCase, TestSuite } from "../../app/demos/test/tests.types";
import { preview_value, equal_row } from "../livemap-tests/test-helpers";


type LiveHostResumeReadCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: unknown;
  act: () => unknown | Promise<unknown>;
  expected: unknown;
}>;

function livehost_resume_read_case(spec: LiveHostResumeReadCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
    },
    run: async () => {
      const value = await spec.act();

      return {
        assertRows: [
          equal_row(`${spec.name}: value`, value, spec.expected),
        ],
      };
    },
  };
}

export function livehost_resume_suite(): TestSuite {
  const SUITE = "livehost/resume";

  return {
    suite: SUITE,
    cases: [
      livehost_resume_read_case({
        suite: SUITE,
        name: "records sync messages for replay",
        input: {},
        act: () => {
          const resume = make_livehost_resume_log();

          resume.record_sync({
            type: "sync",
            seq: 1,
            path: ["user", "name"],
            value: "Ada",
          });

          return {
            entries: resume.debug_entries(),
            replay: resume.replay_after(0),
          };
        },
        expected: {
          entries: [{ seq: 1, path: ["user", "name"], value: "Ada" }],
          replay: [{ type: "sync", seq: 1, path: ["user", "name"], value: "Ada" }],
        },
      }),
      livehost_resume_read_case({
        suite: SUITE,
        name: "replay after excludes already seen seq",
        input: {},
        act: () => {
          const resume = make_livehost_resume_log();

          resume.record_sync({ type: "sync", seq: 1, path: ["count"], value: 1 });
          resume.record_sync({ type: "sync", seq: 2, path: ["count"], value: 2 });
          resume.record_sync({ type: "sync", seq: 3, path: ["count"], value: 3 });

          return resume.replay_after(1).map((message) => ({
            seq: message.seq,
            path: message.path,
            value: message.value,
          }));
        },
        expected: [
          { seq: 2, path: ["count"], value: 2 },
          { seq: 3, path: ["count"], value: 3 },
        ],
      }),
      livehost_resume_read_case({
        suite: SUITE,
        name: "can replay after empty log",
        input: {},
        act: () => {
          const resume = make_livehost_resume_log();

          return {
            canReplayZero: resume.can_replay_after(0),
            canReplayLarge: resume.can_replay_after(100),
            replay: resume.replay_after(0),
          };
        },
        expected: {
          canReplayZero: true,
          canReplayLarge: true,
          replay: [],
        },
      }),
      livehost_resume_read_case({
        suite: SUITE,
        name: "bounded log evicts oldest sync entries",
        input: {},
        act: () => {
          const resume = make_livehost_resume_log({ maxEntries: 2 });

          resume.record_sync({ type: "sync", seq: 1, path: ["count"], value: 1 });
          resume.record_sync({ type: "sync", seq: 2, path: ["count"], value: 2 });
          resume.record_sync({ type: "sync", seq: 3, path: ["count"], value: 3 });

          return {
            entries: resume.debug_entries(),
            canReplayFromZero: resume.can_replay_after(0),
            canReplayFromOne: resume.can_replay_after(1),
            replayFromOne: resume.replay_after(1),
          };
        },
        expected: {
          entries: [
            { seq: 2, path: ["count"], value: 2 },
            { seq: 3, path: ["count"], value: 3 },
          ],
          canReplayFromZero: false,
          canReplayFromOne: true,
          replayFromOne: [
            { type: "sync", seq: 2, path: ["count"], value: 2 },
            { type: "sync", seq: 3, path: ["count"], value: 3 },
          ],
        },
      }),
      livehost_resume_read_case({
        suite: SUITE,
        name: "zero max entries disables replay storage",
        input: {},
        act: () => {
          const resume = make_livehost_resume_log({ maxEntries: 0 });

          resume.record_sync({ type: "sync", seq: 1, path: ["count"], value: 1 });

          return {
            entries: resume.debug_entries(),
            canReplay: resume.can_replay_after(0),
            replay: resume.replay_after(0),
          };
        },
        expected: {
          entries: [],
          canReplay: true,
          replay: [],
        },
      }),
      livehost_resume_read_case({
        suite: SUITE,
        name: "recorded path and value are cloned",
        input: {},
        act: () => {
          const resume = make_livehost_resume_log();
          const path: Array<string | number> = ["user", "prefs"];
          const value = { theme: "dark" };

          resume.record_sync({
            type: "sync",
            seq: 1,
            path,
            value,
          });

          path.splice(0, path.length, "mutated");
          value.theme = "light";

          const [entry] = resume.debug_entries();
          const [replay] = resume.replay_after(0);

          return {
            entry,
            replay,
          };
        },
        expected: {
          entry: { seq: 1, path: ["user", "prefs"], value: { theme: "dark" } },
          replay: { type: "sync", seq: 1, path: ["user", "prefs"], value: { theme: "dark" } },
        },
      }),
      livehost_resume_read_case({
        suite: SUITE,
        name: "debug entries are cloned",
        input: {},
        act: () => {
          const resume = make_livehost_resume_log();

          resume.record_sync({
            type: "sync",
            seq: 1,
            path: ["user", "prefs"],
            value: { theme: "dark" },
          });

          const entries = resume.debug_entries() as unknown as Array<{ path: Array<string | number>; value: { theme: string } }>;
          const entry = entries[0];
          if (!entry) return [];

          entry.path.splice(0, entry.path.length, "mutated");
          entry.value.theme = "light";

          return resume.debug_entries();
        },
        expected: [
          { seq: 1, path: ["user", "prefs"], value: { theme: "dark" } },
        ],
      }),
      livehost_resume_read_case({
        suite: SUITE,
        name: "replay messages are cloned",
        input: {},
        act: () => {
          const resume = make_livehost_resume_log();

          resume.record_sync({
            type: "sync",
            seq: 1,
            path: ["user", "prefs"],
            value: { theme: "dark" },
          });

          const replayEntries = resume.replay_after(0) as unknown as Array<{ path: Array<string | number>; value: { theme: string } }>;
          const replay = replayEntries[0];
          if (!replay) return [];

          replay.path.splice(0, replay.path.length, "mutated");
          replay.value.theme = "light";

          return resume.replay_after(0);
        },
        expected: [
          { type: "sync", seq: 1, path: ["user", "prefs"], value: { theme: "dark" } },
        ],
      }),
      livehost_resume_read_case({
        suite: SUITE,
        name: "replay after latest seq returns empty",
        input: {},
        act: () => {
          const resume = make_livehost_resume_log();

          resume.record_sync({ type: "sync", seq: 1, path: ["count"], value: 1 });
          resume.record_sync({ type: "sync", seq: 2, path: ["count"], value: 2 });

          return {
            replayAfterTwo: resume.replay_after(2),
            replayAfterFuture: resume.replay_after(99),
            canReplayAfterFuture: resume.can_replay_after(99),
          };
        },
        expected: {
          replayAfterTwo: [],
          replayAfterFuture: [],
          canReplayAfterFuture: true,
        },
      }),
      livehost_resume_read_case({
        suite: SUITE,
        name: "multiple syncs at same seq preserve insertion order",
        input: {},
        act: () => {
          const resume = make_livehost_resume_log();

          resume.record_sync({ type: "sync", seq: 1, path: ["a"], value: "A" });
          resume.record_sync({ type: "sync", seq: 1, path: ["b"], value: "B" });
          resume.record_sync({ type: "sync", seq: 2, path: ["c"], value: "C" });

          return resume.replay_after(0).map((message) => ({
            seq: message.seq,
            path: message.path,
            value: message.value,
          }));
        },
        expected: [
          { seq: 1, path: ["a"], value: "A" },
          { seq: 1, path: ["b"], value: "B" },
          { seq: 2, path: ["c"], value: "C" },
        ],
      }),
    ] as const,
  };
}