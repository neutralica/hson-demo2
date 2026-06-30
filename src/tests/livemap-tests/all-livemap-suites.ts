import type { TestSuite } from "../../app/demos/test/tests.types";
import { livemap_suites_core } from "./suites-core";
import { livemap_suite_editor, } from "./suites-editor";
import { livemap_suite_feed } from "./suites-feed";
import { livemap_suites_link } from "./suites-link";
import { livemap_suites_path } from "./suites-path";


export function all_livemap_suites(): readonly TestSuite[] {
  return [
    livemap_suite_editor(),
    livemap_suites_core(),
    livemap_suite_feed(),
    livemap_suites_path(),
    livemap_suites_link(),



  ] as const;
}


