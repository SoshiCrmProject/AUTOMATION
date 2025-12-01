const { existsSync } = require("fs");
const { resolve } = require("path");
const { spawnSync } = require("child_process");

if (process.env.HUSKY === "0") {
  console.log("Skipping husky install because HUSKY=0");
  process.exit(0);
}

const huskyBin = resolve(
  __dirname,
  "..",
  "node_modules",
  ".bin",
  process.platform === "win32" ? "husky.cmd" : "husky"
);

if (!existsSync(huskyBin)) {
  console.log("Husky binary not found; skipping hook installation");
  process.exit(0);
}

const result = spawnSync(huskyBin, ["install"], { stdio: "inherit" });
process.exit(result.status ?? 0);
