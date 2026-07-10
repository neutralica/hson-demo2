// quid-suite.ts

import {
  debug_livemap_quids,
  drop_livemap_quid,
  ensure_livemap_quid,
  get_livemap_owner,
  get_livemap_quid,
  reindex_livemap_quid,
  remint_livemap_quid,
} from "hson-live";
import type { TestSuite } from "../../app/demos/test/tests.types";
import { readCase } from "./handle-helpers";

const TEST_RUN_ID = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
let testQuidIndex = 0;

function make_test_livemap_quid(label: string): string {
  testQuidIndex += 1;
  return `lmq-test-${label}-${TEST_RUN_ID}-${testQuidIndex}`;
}

export function livemap_suites_quid(): TestSuite {
  const SUITE = "livemap/quid";

  return {
    suite: SUITE,
    cases: [
      readCase({
        suite: SUITE,
        name: "quid get returns undefined before ensure",
        input: {},
        act: () => {
          const owner = {};
          return get_livemap_quid(owner);
        },
        expected: undefined,
      }),
      readCase({
        suite: SUITE,
        name: "quid owner lookup returns undefined before ensure",
        input: {},
        act: () => get_livemap_owner("lmq-missing"),
        expected: undefined,
      }),
      readCase({
        suite: SUITE,
        name: "quid ensure mints stable owner identity",
        input: {},
        act: () => {
          const owner = {};
          const first = ensure_livemap_quid(owner);
          const second = ensure_livemap_quid(owner);

          return {
            stable: first === second,
            stored: get_livemap_quid(owner) === first,
            owned: get_livemap_owner(first) === owner,
            prefix: first.startsWith("lmq-"),
          };
        },
        expected: {
          stable: true,
          stored: true,
          owned: true,
          prefix: true,
        },
      }),
      readCase({
        suite: SUITE,
        name: "quid ensure accepts supplied identity",
        input: {},
        act: () => {
          const owner = {};
          const supplied = make_test_livemap_quid("supplied");
          const quid = ensure_livemap_quid(owner, supplied);

          return {
            accepted: quid === supplied,
            stored: get_livemap_quid(owner) === supplied,
            owned: get_livemap_owner(supplied) === owner,
          };
        },
        expected: {
          accepted: true,
          stored: true,
          owned: true,
        },
      }),
      readCase({
        suite: SUITE,
        name: "quid ensure keeps existing owner identity over supplied identity",
        input: {},
        act: () => {
          const owner = {};
          const existing = make_test_livemap_quid("existing");
          const ignored = make_test_livemap_quid("ignored");
          const first = ensure_livemap_quid(owner, existing);
          const second = ensure_livemap_quid(owner, ignored);

          return {
            firstMatches: first === existing,
            secondMatches: second === existing,
            ignoredUnowned: get_livemap_owner(ignored) === undefined,
          };
        },
        expected: {
          firstMatches: true,
          secondMatches: true,
          ignoredUnowned: true,
        },
      }),
      readCase({
        suite: SUITE,
        name: "quid ensure gives different objects different minted identities",
        input: {},
        act: () => {
          const firstOwner = {};
          const secondOwner = {};
          const first = ensure_livemap_quid(firstOwner);
          const second = ensure_livemap_quid(secondOwner);

          return {
            different: first !== second,
            firstOwned: get_livemap_owner(first) === firstOwner,
            secondOwned: get_livemap_owner(second) === secondOwner,
          };
        },
        expected: {
          different: true,
          firstOwned: true,
          secondOwned: true,
        },
      }),
      readCase({
        suite: SUITE,
        name: "quid ensure rejects supplied identity owned by another object",
        input: {},
        act: () => {
          const firstOwner = {};
          const secondOwner = {};
          const duplicate = make_test_livemap_quid("duplicate");
          let message = "";

          ensure_livemap_quid(firstOwner, duplicate);
          try {
            ensure_livemap_quid(secondOwner, duplicate);
          } catch (error) {
            message = error instanceof Error ? error.message : String(error);
          }

          return {
            rejected: message.includes("Duplicate LiveMap QUID"),
            includesQuid: message.includes(duplicate),
          };
        },
        expected: {
          rejected: true,
          includesQuid: true,
        },
      }),
      readCase({
        suite: SUITE,
        name: "quid reindex restores supplied identity for owner",
        input: {},
        act: () => {
          const owner = {};
          const quid = make_test_livemap_quid("reindex");
          reindex_livemap_quid(owner, quid);

          return {
            stored: get_livemap_quid(owner) === quid,
            owned: get_livemap_owner(quid) === owner,
          };
        },
        expected: {
          stored: true,
          owned: true,
        },
      }),
      readCase({
        suite: SUITE,
        name: "quid reindex is idempotent for same owner and identity",
        input: {},
        act: () => {
          const owner = {};
          const quid = make_test_livemap_quid("reindex-idempotent");

          reindex_livemap_quid(owner, quid);
          reindex_livemap_quid(owner, quid);

          return {
            stored: get_livemap_quid(owner) === quid,
            owned: get_livemap_owner(quid) === owner,
          };
        },
        expected: {
          stored: true,
          owned: true,
        },
      }),
      readCase({
        suite: SUITE,
        name: "quid reindex rejects identity owned by another object",
        input: {},
        act: () => {
          const firstOwner = {};
          const secondOwner = {};
          const duplicate = make_test_livemap_quid("reindex-duplicate");
          let message = "";

          ensure_livemap_quid(firstOwner, duplicate);
          try {
            reindex_livemap_quid(secondOwner, duplicate);
          } catch (error) {
            message = error instanceof Error ? error.message : String(error);
          }

          return {
            rejected: message.includes("Duplicate LiveMap QUID"),
            includesQuid: message.includes(duplicate),
          };
        },
        expected: {
          rejected: true,
          includesQuid: true,
        },
      }),
      readCase({
        suite: SUITE,
        name: "quid drop releases owner and quid lookup",
        input: {},
        act: () => {
          const owner = {};
          const quid = ensure_livemap_quid(owner, make_test_livemap_quid("drop"));
          drop_livemap_quid(owner);

          return {
            ownerLookup: get_livemap_quid(owner),
            quidLookup: get_livemap_owner(quid),
          };
        },
        expected: {
          ownerLookup: undefined,
          quidLookup: undefined,
        },
      }),
      readCase({
        suite: SUITE,
        name: "quid drop is idempotent",
        input: {},
        act: () => {
          const owner = {};
          const quid = ensure_livemap_quid(owner, make_test_livemap_quid("drop-idempotent"));
          drop_livemap_quid(owner);
          drop_livemap_quid(owner);

          return {
            ownerLookup: get_livemap_quid(owner),
            quidLookup: get_livemap_owner(quid),
          };
        },
        expected: {
          ownerLookup: undefined,
          quidLookup: undefined,
        },
      }),
      readCase({
        suite: SUITE,
        name: "quid drop removes owner from debug snapshot",
        input: {},
        act: () => {
          const owner = {};
          const quid = ensure_livemap_quid(owner, make_test_livemap_quid("debug-drop"));
          const before = debug_livemap_quids().some((ref) => ref.quid === quid && ref.owner === owner);

          drop_livemap_quid(owner);
          const after = debug_livemap_quids().some((ref) => ref.quid === quid || ref.owner === owner);

          return { before, after };
        },
        expected: { before: true, after: false },
      }),
      readCase({
        suite: SUITE,
        name: "quid dropped identity can be claimed by another owner",
        input: {},
        act: () => {
          const firstOwner = {};
          const secondOwner = {};
          const quid = make_test_livemap_quid("reclaim");
          ensure_livemap_quid(firstOwner, quid);
          drop_livemap_quid(firstOwner);
          const next = ensure_livemap_quid(secondOwner, quid);

          return {
            nextMatches: next === quid,
            firstLookup: get_livemap_quid(firstOwner),
            secondOwns: get_livemap_owner(quid) === secondOwner,
          };
        },
        expected: {
          nextMatches: true,
          firstLookup: undefined,
          secondOwns: true,
        },
      }),
      readCase({
        suite: SUITE,
        name: "quid remint replaces old owner identity",
        input: {},
        act: () => {
          const owner = {};
          const first = ensure_livemap_quid(owner, make_test_livemap_quid("remint"));
          const second = remint_livemap_quid(owner);

          return {
            changed: first !== second,
            oldOwner: get_livemap_owner(first),
            currentMatches: get_livemap_quid(owner) === second,
            newOwner: get_livemap_owner(second) === owner,
            prefix: second.startsWith("lmq-"),
          };
        },
        expected: {
          changed: true,
          oldOwner: undefined,
          currentMatches: true,
          newOwner: true,
          prefix: true,
        },
      }),
      readCase({
        suite: SUITE,
        name: "quid remint can mint identity for unclaimed owner",
        input: {},
        act: () => {
          const owner = {};
          const quid = remint_livemap_quid(owner);

          return {
            stored: get_livemap_quid(owner) === quid,
            owned: get_livemap_owner(quid) === owner,
            prefix: quid.startsWith("lmq-"),
          };
        },
        expected: {
          stored: true,
          owned: true,
          prefix: true,
        },
      }),
      readCase({
        suite: SUITE,
        name: "quid remint leaves other owner identity untouched",
        input: {},
        act: () => {
          const firstOwner = {};
          const secondOwner = {};
          const firstQuid = ensure_livemap_quid(firstOwner, make_test_livemap_quid("remint-other-first"));
          const secondQuid = ensure_livemap_quid(secondOwner, make_test_livemap_quid("remint-other-second"));

          const reminted = remint_livemap_quid(firstOwner);

          return {
            firstChanged: reminted !== firstQuid,
            firstOldDropped: get_livemap_owner(firstQuid) === undefined,
            firstNewOwned: get_livemap_owner(reminted) === firstOwner,
            secondStillStored: get_livemap_quid(secondOwner) === secondQuid,
            secondStillOwned: get_livemap_owner(secondQuid) === secondOwner,
          };
        },
        expected: {
          firstChanged: true,
          firstOldDropped: true,
          firstNewOwned: true,
          secondStillStored: true,
          secondStillOwned: true,
        },
      }),
      readCase({
        suite: SUITE,
        name: "quid debug snapshot includes registered owner",
        input: {},
        act: () => {
          const owner = {};
          const quid = make_test_livemap_quid("debug");
          ensure_livemap_quid(owner, quid);
          const entry = debug_livemap_quids().find((ref) => ref.quid === quid);

          return {
            found: entry !== undefined,
            owner: entry?.owner === owner,
          };
        },
        expected: {
          found: true,
          owner: true,
        },
      }),
    ] as const,
  };
}