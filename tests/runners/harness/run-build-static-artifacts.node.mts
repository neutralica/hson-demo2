import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validate_exact_output_tree, validate_required_package_files, validate_vite_output } from "../../harness/runtimes/node/build-static-artifact-validator";

const fixture = async (name: string): Promise<string> => mkdtemp(join(tmpdir(), `build-artifact-${name}-`));
const packageRoot = await fixture("package");
await mkdir(join(packageRoot, "dist/bin"), { recursive: true });
await writeFile(join(packageRoot, "dist/index.js"), "export {};");
await writeFile(join(packageRoot, "dist/index.d.ts"), "export {};");
await writeFile(join(packageRoot, "dist/bin/cli.js"), "#!/usr/bin/env node\n");
await chmod(join(packageRoot, "dist/bin/cli.js"), 0o755);
await validate_required_package_files(packageRoot, { runtime: ["dist/index.js"], declarations: ["dist/index.d.ts"], bins: ["dist/bin/cli.js"] });
await validate_exact_output_tree(packageRoot, "dist", ["bin/cli.js", "index.d.ts", "index.js"]);
await assert.rejects(validate_required_package_files(packageRoot, { runtime: ["dist/missing.js"], declarations: [], bins: [] }), /BUILD_ARTIFACT_REQUIRED_MISSING/);
await writeFile(join(packageRoot, "dist/stale.js"), "stale");
await assert.rejects(validate_exact_output_tree(packageRoot, "dist", ["bin/cli.js", "index.d.ts", "index.js"]), /BUILD_ARTIFACT_UNEXPECTED_OUTPUT/);

const vite = await fixture("vite");
await mkdir(join(vite, "dist/assets"), { recursive: true });
await writeFile(join(vite, "dist/index.html"), '<script src="/assets/app.js"></script>');
await writeFile(join(vite, "dist/assets/app.js"), 'import "./theme.css";');
await writeFile(join(vite, "dist/assets/theme.css"), 'body{background:url("./pixel.png")}');
await writeFile(join(vite, "dist/assets/pixel.png"), "png");
assert.equal((await validate_vite_output(vite)).assets.length, 3);
await writeFile(join(vite, "dist/index.html"), '<script src="/assets/missing.js"></script>');
await assert.rejects(validate_vite_output(vite), /BUILD_ARTIFACT_VITE_REFERENCE_MISSING/);
await writeFile(join(vite, "dist/index.html"), '<script src="/assets/app.js"></script>');
await writeFile(join(vite, "dist/assets/orphan.js"), "orphan");
await assert.rejects(validate_vite_output(vite), /BUILD_ARTIFACT_VITE_ASSET_UNREFERENCED/);
await writeFile(join(vite, "dist/index.html"), '<script src="../outside.js"></script>');
await assert.rejects(validate_vite_output(vite), /BUILD_ARTIFACT_PATH_ESCAPE/);

const symlinkRoot = await fixture("symlink");
await mkdir(join(symlinkRoot, "dist"));
await writeFile(join(symlinkRoot, "outside.js"), "outside");
await symlink(join(symlinkRoot, "outside.js"), join(symlinkRoot, "dist/link.js"));
await assert.rejects(validate_exact_output_tree(symlinkRoot, "dist", []), /BUILD_ARTIFACT_SYMLINK_REJECTED/);

console.log(JSON.stringify({ suite: "build-static-artifacts", checks: 9 }));
