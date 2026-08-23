import { spawnSync } from "node:child_process";

const npmBin = process.platform === "win32" ? "npm.cmd" : "npm";
const run = (command, args, env = {}) => {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
};

// Do not run the normal prebuild hook here: it downloads MediaPipe assets.
// DeterministicVisionClient is the only vision source in this compile-time mode.
run(npmBin, ["run", "check"]);
run(process.platform === "win32" ? "node_modules/.bin/vite.cmd" : "./node_modules/.bin/vite", ["build"], {
  VITE_E2E_FIXTURES: "1",
});
run(npmBin, [
  "exec",
  "tauri",
  "--",
  "build",
  "--config",
  "src-tauri/tauri.e2e.conf.json",
  "--features",
  "e2e",
  // E2E launches the raw executable; installers are not needed and the macOS
  // DMG bundler can fail in sandboxed/headless environments.
  "--bundles",
  process.platform === "darwin" ? "app" : "",
]);
