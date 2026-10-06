import { spawnSync } from "node:child_process";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const args = process.env.RENDER
  ? ["run", "start", "-w", "backend"]
  : ["run", "dev:workspaces"];

const result = spawnSync(npm, args, {
  stdio: "inherit",
  env: process.env,
  shell: process.platform === "win32"
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
