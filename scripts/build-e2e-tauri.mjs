import { spawnSync } from "node:child_process";

const isWindows = process.platform === "win32";
const npmBin = isWindows ? "npm.cmd" : "npm";
const run = (command, args, env = {}) => {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: { ...process.env, ...env },
    // Windows cannot execute .cmd files directly through CreateProcess.
    // All commands and arguments in this script are fixed repository inputs.
    shell: isWindows,
  });

  if (result.error) {
    console.error(`[e2e-build] Failed to start ${command}: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
};

// Do not run the normal prebuild hook here: it downloads MediaPipe assets.
// DeterministicVisionClient is the only vision source in this compile-time mode.
run(npmBin, ["run", "check"]);
run(isWindows ? "node_modules/.bin/vite.cmd" : "./node_modules/.bin/vite", ["build"], {
  VITE_E2E_FIXTURES: "1",
});
const tauriArgs = [
  "build",
  "--config",
  "src-tauri/tauri.e2e.conf.json",
  "--features",
  "e2e",
];

// E2E launches the raw executable; installers are not needed and the macOS
// DMG bundler can fail in sandboxed/headless environments. Tauri CLI rejects
// an empty --bundles value, so only pass it when a platform bundle is wanted.
if (process.platform === "darwin") tauriArgs.push("--bundles", "app");

run(npmBin, ["exec", "tauri", "--", ...tauriArgs]);
