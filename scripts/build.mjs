import { spawnSync } from "node:child_process";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const workspaces = process.env.RENDER ? ["backend"] : ["frontend", "backend"];

for (const workspace of workspaces) {
  console.log(`Building ${workspace} workspace...`);
  const result = spawnSync(npm, ["run", "build", "-w", workspace], {
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32"
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
