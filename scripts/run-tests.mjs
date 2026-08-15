import { rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";

await rm(".test-dist", { recursive: true, force: true });

const tsc = spawnSync(
  process.platform === "win32" ? "tsc.cmd" : "tsc",
  ["-p", "tsconfig.test.json"],
  { stdio: "inherit" },
);

if (tsc.status !== 0) {
  process.exit(tsc.status ?? 1);
}

const tests = spawnSync(
  process.execPath,
  [
    "--test",
    ".test-dist/tests/temporal-gate.test.js",
    ".test-dist/tests/metrics.test.js",
    ".test-dist/tests/calibration.test.js",
    ".test-dist/tests/behavior-engine.test.js"
  ],
  { stdio: "inherit" },
);

process.exit(tests.status ?? 1);
