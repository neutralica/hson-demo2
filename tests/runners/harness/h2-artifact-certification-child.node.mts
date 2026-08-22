import { h2c_terminal_certificate, inspect_h2c_artifacts } from "../../harness/runtimes/node/h2-artifact-certification";

export type H2CChildModule = true;

const [id, hsonLiveRoot, hsonDemo2Root] = process.argv.slice(2);
if (id === undefined || hsonLiveRoot === undefined || hsonDemo2Root === undefined) {
  throw new Error("H2C_INTERNAL_ARGUMENTS_MISSING");
}
const certificate = await inspect_h2c_artifacts({ id, hsonLiveRoot, hsonDemo2Root });
console.log(JSON.stringify(h2c_terminal_certificate(certificate)));
