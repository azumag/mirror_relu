import { mkdirSync } from "node:fs";
import { browser } from "@wdio/globals";

const artifacts = "artifacts/e2e/renderer";
mkdirSync(artifacts, { recursive: true });

const viteCommand =
  process.platform === "win32"
    ? "set VITE_E2E_FIXTURES=1&& node_modules/.bin/vite.cmd --host 127.0.0.1 --port 1420"
    : "VITE_E2E_FIXTURES=1 ./node_modules/.bin/vite --host 127.0.0.1 --port 1420";

export const config = {
  runner: "local",
  specs: ["./specs/**/*.e2e.ts"],
  exclude: ["./specs/native-smoke.e2e.ts"],
  maxInstances: 1,
  framework: "mocha",
  reporters: ["spec"],
  logLevel: process.env.WDIO_LOG_LEVEL ?? "error",
  waitforTimeout: 10_000,
  connectionRetryTimeout: 120_000,
  connectionRetryCount: 1,
  services: [
    ["@wdio/tauri-service", {
      mode: "browser",
      devServerUrl: "http://127.0.0.1:1420",
      devServer: {
        command: viteCommand,
        timeoutMs: 60_000,
        reuseExistingServer: false,
      },
    }],
  ],
  capabilities: [{ browserName: "tauri", maxInstances: 1 }],
  mochaOpts: {
    timeout: 60_000,
    fullStackTrace: true,
  },
  afterTest: async (_test: unknown, _context: unknown, result: { passed: boolean; error?: Error }) => {
    if (!result.passed) {
      const name = `failure-${Date.now()}.png`;
      await browser.saveScreenshot(`${artifacts}/${name}`);
    }
  },
};
