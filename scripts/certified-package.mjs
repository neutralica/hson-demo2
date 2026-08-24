import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const PACK_STAGES = Object.freeze([
  "verify-source",
  "verify-package-surfaces",
  "capture",
  "materialize",
  "assemble-explorer",
]);

function is_deployment_root(path) {
  if (!existsSync(join(path, "package.json")) || !existsSync(join(path, "scripts", "capture-deployment-tests.mts"))) return false;
  try { return JSON.parse(readFileSync(join(path, "package.json"), "utf8")).name === "terminal-gothic-deploy"; }
  catch { return false; }
}

export function resolve_deployment_root(applicationRoot, environment = process.env) {
  const configured = environment.HSON_DEPLOY_ROOT?.trim();
  const candidates = [configured, resolve(applicationRoot, ".."), resolve(applicationRoot, "..", "hson-deploy")].filter(Boolean);
  const deploymentRoot = candidates.find(is_deployment_root);
  if (deploymentRoot === undefined) {
    throw new Error("PACK_DEPLOYMENT_WORKSPACE_NOT_FOUND: set HSON_DEPLOY_ROOT to the clean hson-deploy workspace");
  }
  return resolve(deploymentRoot);
}

export function canonical_package_locations(deploymentRoot) {
  const root = resolve(deploymentRoot);
  return Object.freeze({
    workRoot: join(root, ".deployment-work"),
    explorerArtifact: join(root, "static-production"),
  });
}

export function parse_json_output(output, label) {
  for (let index = output.indexOf("{"); index >= 0; index = output.indexOf("{", index + 1)) {
    try { return JSON.parse(output.slice(index)); }
    catch { /* npm may have printed a command banner before the final JSON value. */ }
  }
  throw new Error(`PACK_${label}_OUTPUT_INVALID`);
}

export function last_output_line(output, label) {
  const line = output.trim().split(/\r?\n/).at(-1)?.trim();
  if (!line) throw new Error(`PACK_${label}_OUTPUT_MISSING`);
  return line;
}

export function run_command(command, arguments_, options = {}) {
  const output = execFileSync(command, arguments_, {
    cwd: options.cwd,
    env: options.env,
    encoding: "utf8",
    stdio: ["inherit", "pipe", "inherit"],
  });
  if (output) process.stdout.write(output);
  return output;
}

function npm(run, cwd, arguments_, environment = process.env) {
  return run("npm", arguments_, { cwd, env: environment });
}

export function run_selected_tests({ applicationRoot, arguments_: selection, run = run_command }) {
  console.log("stage: selected-tests");
  const output = npm(run, applicationRoot, ["run", "test:canonical-node", "--", ...selection]);
  console.log("pass: selected tests completed");
  return output;
}

export function execute_pack({ deploymentRoot, run = run_command, environment = process.env }) {
  const locations = canonical_package_locations(deploymentRoot);
  let stage = PACK_STAGES[0];
  let captureCandidate;
  let evidencePackage;
  try {
    console.log(`stage: ${stage}`);
    npm(run, deploymentRoot, ["run", "verify"], environment);

    stage = PACK_STAGES[1];
    console.log(`stage: ${stage}`);
    npm(run, deploymentRoot, ["run", "verify:package-surface"], environment);

    stage = PACK_STAGES[2];
    console.log(`stage: ${stage}`);
    captureCandidate = last_output_line(npm(run, deploymentRoot, ["run", "capture:deployment-tests"], environment), "CAPTURE");

    stage = PACK_STAGES[3];
    console.log(`stage: ${stage}`);
    const materialized = parse_json_output(npm(run, deploymentRoot, ["run", "materialize:test-evidence", "--", captureCandidate], environment), "MATERIALIZATION");
    evidencePackage = materialized.candidate;
    if (typeof evidencePackage !== "string" || typeof materialized.publicRoot !== "string") throw new Error("PACK_MATERIALIZATION_CONTRACT_INVALID");
    const acceptanceFile = join(evidencePackage, "accepted.json");

    stage = PACK_STAGES[4];
    console.log(`stage: ${stage}`);
    npm(run, deploymentRoot, ["run", "prepare:static-production"], {
      ...environment,
      VITE_TEST_EVIDENCE_ROOT: materialized.publicRoot,
      TEST_EVIDENCE_ACCEPTANCE_FILE: acceptanceFile,
    });

    const result = Object.freeze({
      pass: true,
      stage: "complete",
      outputDirectory: locations.explorerArtifact,
      explorerArtifact: locations.explorerArtifact,
      evidencePackage,
      acceptanceFile,
      captureCandidate,
    });
    console.log(JSON.stringify(result, null, 2));
    return result;
  } catch (cause) {
    const failure = Object.freeze({
      pass: false,
      stage,
      outputDirectory: locations.explorerArtifact,
      evidencePackage: evidencePackage ?? null,
      failureLocation: evidencePackage ?? captureCandidate ?? locations.workRoot,
    });
    console.error(JSON.stringify(failure, null, 2));
    throw cause;
  }
}

export function execute_certification(options) {
  const run = options.run ?? run_command;
  const environment = options.environment ?? process.env;
  const locations = canonical_package_locations(options.deploymentRoot);
  let stage = "verify-source";
  try {
    console.log(`stage: ${stage}`);
    npm(run, options.deploymentRoot, ["run", "verify"], environment);
    stage = "certification-authority";
    console.log(`stage: ${stage}`);
    npm(run, options.deploymentRoot, ["-w", "hson-demo2", "run", "test:inclusive-library-node"], environment);
  } catch (cause) {
    console.error(JSON.stringify({ pass: false, stage, outputDirectory: locations.explorerArtifact, evidencePackage: null, failureLocation: locations.workRoot }, null, 2));
    throw cause;
  }
  return execute_pack(options);
}

export function inspect_report(path) {
  const absolute = resolve(path);
  const value = JSON.parse(readFileSync(absolute, "utf8"));
  const result = value.run && value.summary
    ? { pass: value.run.status === "passed", stage: value.run.status, report: absolute, summary: value.summary }
    : value.accepted === true
      ? { pass: true, stage: "materialized", report: absolute, evidencePackage: dirname(absolute), evidenceRoot: value.evidenceRoot }
      : { pass: (value.categories ?? []).every((category) => category.status === "passed"), stage: "frozen-index", report: absolute, categories: value.categories?.map((category) => ({ id: category.id, status: category.status })) };
  console.log(JSON.stringify(result, null, 2));
  return result;
}

function usage() {
  console.error("usage: certified-package <run [selection]|pack|certify|location|inspect <json-file>>");
  process.exitCode = 2;
}

export function main(arguments_ = process.argv.slice(2), environment = process.env) {
  const applicationRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const [command, ...rest] = arguments_;
  if (command === "run") return run_selected_tests({ applicationRoot, arguments_: rest });
  if (command === "inspect" && rest.length === 1) return inspect_report(rest[0]);
  if (command === "pack" || command === "certify" || command === "location") {
    const deploymentRoot = resolve_deployment_root(applicationRoot, environment);
    if (command === "location") {
      const result = canonical_package_locations(deploymentRoot);
      console.log(JSON.stringify(result, null, 2));
      return result;
    }
    const options = { deploymentRoot, environment };
    return command === "pack" ? execute_pack(options) : execute_certification(options);
  }
  usage();
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); }
  catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
